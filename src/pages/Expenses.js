import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Edit,
  Trash2,
  Filter,
  Search,
  Download,
  Plus,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import {
  getLocalMonth,
  formatINR,
  formatDateDisplay,
  formatMonthLabel,
  exportExpensesToCSV,
} from "@/lib/financeUtils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  "All",
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Healthcare",
  "Education",
  "Other",
];

function getPreviousMonthStr() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export default function Expenses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryMonth = searchParams.get("month");

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState(queryMonth ? "specific_month" : "month");
  const [selectedMonth, setSelectedMonth] = useState(queryMonth || getLocalMonth());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  useEffect(() => {
    if (queryMonth) {
      setPeriod("specific_month");
      setSelectedMonth(queryMonth);
    }
  }, [queryMonth]);

  useEffect(() => {
    if (period !== "custom") {
      fetchExpenses();
    }
  }, [period, selectedMonth]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = `${API}/expenses`;

      if (period === "custom") {
        if (!fromDate || !toDate) {
          toast.error("Please select both From and To dates");
          setLoading(false);
          return;
        }
        url += `?from_date=${fromDate}&to_date=${toDate}`;
      } else if (period === "specific_month") {
        const ym = selectedMonth || getLocalMonth();
        url += `?from_date=${ym}-01&to_date=${ym}-31`;
      } else if (period === "last_month") {
        const lastYm = getPreviousMonthStr();
        url += `?from_date=${lastYm}-01&to_date=${lastYm}-31`;
      } else if (period === "all") {
        url += `?from_date=2000-01-01&to_date=2099-12-31`;
      } else {
        url += `?filter=${period}`;
      }

      const response = await axios.get(url);
      setExpenses(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await axios.delete(`${API}/expenses/${expenseId}`);
      toast.success("Expense deleted");
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const editExpense = (expense) => {
    navigate("/add-expense", { state: { expense } });
  };

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        if (selectedCategory !== "All" && e.category !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (e.title || "").toLowerCase().includes(q);
          const matchCat = (e.category || "").toLowerCase().includes(q);
          const matchAmt = String(e.amount || "").includes(q);
          const matchDate = (e.date || "").includes(q);
          return matchTitle || matchCat || matchAmt || matchDate;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") return (b.date || "").localeCompare(a.date || "");
        if (sortBy === "date_asc") return (a.date || "").localeCompare(b.date || "");
        if (sortBy === "amount_desc") return Number(b.amount) - Number(a.amount);
        if (sortBy === "amount_asc") return Number(a.amount) - Number(b.amount);
        return 0;
      });
  }, [expenses, selectedCategory, searchQuery, sortBy]);

  const totalAmount = filteredExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  // Category quick summary chips for current view
  const categoryTotals = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((e) => {
      const cat = e.category || "Other";
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  return (
    <div className="page-container" data-testid="expenses-page">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="page-title">All Expenses</h1>
          <p className="page-subtitle">
            Filter by month, custom date range, category, or search
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (filteredExpenses.length === 0) {
                toast.error("No expenses to export");
                return;
              }
              exportExpensesToCSV(
                filteredExpenses,
                `expenses-${period === "specific_month" ? selectedMonth : period}.csv`
              );
              toast.success("CSV downloaded!");
            }}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/add-expense")}
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Responsive Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-row">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1 1 180px" }}>
            <Filter size={18} style={{ color: "#667eea", flexShrink: 0 }} />
            <select
              className="form-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ padding: "0.6rem 0.75rem" }}
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="last_month">Last Month ({formatMonthLabel(getPreviousMonthStr())})</option>
              <option value="specific_month">Select Any Month...</option>
              <option value="custom">Custom Date Range...</option>
              <option value="all">All Time (Full History)</option>
            </select>
          </div>

          {period === "specific_month" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1 1 170px" }}>
              <Calendar size={18} style={{ color: "#667eea", flexShrink: 0 }} />
              <input
                type="month"
                className="form-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: "0.55rem 0.75rem" }}
              />
            </div>
          )}

          {period === "custom" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                flex: "2 1 320px",
              }}
            >
              <input
                type="date"
                className="form-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ flex: "1 1 130px", padding: "0.55rem 0.75rem" }}
              />
              <span style={{ color: "#64748b", fontSize: "0.85rem" }}>to</span>
              <input
                type="date"
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ flex: "1 1 130px", padding: "0.55rem 0.75rem" }}
              />
              <button
                className="btn btn-primary"
                disabled={!fromDate || !toDate}
                onClick={fetchExpenses}
                style={{ padding: "0.55rem 1rem" }}
              >
                Apply
              </button>
            </div>
          )}

          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search title, category, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "0.55rem 0.75rem 0.55rem 2.25rem" }}
            />
          </div>

          {/* Sort Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "0 1 170px" }}>
            <ArrowUpDown size={16} style={{ color: "#64748b", flexShrink: 0 }} />
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: "0.55rem 0.75rem" }}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="preset-chips" style={{ marginTop: "0.25rem" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Expenses Card */}
      <div className="card">
        <div
          style={{
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h3 className="card-title" style={{ fontSize: "1.25rem", color: "#1e293b" }}>
              Total: <span style={{ color: "#667eea" }}>₹{formatINR(totalAmount)}</span>
            </h3>
            {categoryTotals.length > 1 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginTop: "0.4rem",
                }}
              >
                {categoryTotals.slice(0, 4).map(([cat, amt]) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: "0.75rem",
                      color: "#475569",
                      background: "#f1f5f9",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "6px",
                    }}
                  >
                    {cat}: <strong>₹{formatINR(amt)}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
          <span
            style={{
              color: "#64748b",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: "#f8fafc",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              border: "1px solid #e2e8f0",
            }}
          >
            {filteredExpenses.length} expense(s)
          </span>
        </div>

        {loading ? (
          <p style={{ color: "#718096", textAlign: "center", padding: "2rem" }}>
            Loading expenses...
          </p>
        ) : filteredExpenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#718096" }}>
            <p style={{ marginBottom: "1rem" }}>No expenses found for this selection.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/add-expense")}
            >
              <Plus size={16} /> Add Expense
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-table-wrap table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td style={{ fontWeight: 500 }}>{expense.title}</td>
                      <td style={{ fontWeight: 700, color: "#667eea" }}>
                        ₹{formatINR(expense.amount)}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: "#f0f4ff",
                            color: "#667eea",
                          }}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td>{formatDateDisplay(expense.date)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.45rem 0.65rem" }}
                            onClick={() => editExpense(expense)}
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.45rem 0.65rem", color: "#ef4444" }}
                            onClick={() => deleteExpense(expense.id)}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="mobile-expense-list">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="mobile-expense-item">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#1e293b",
                        fontSize: "0.95rem",
                        marginBottom: "0.25rem",
                        wordBreak: "break-word",
                      }}
                    >
                      {expense.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        fontSize: "0.75rem",
                        color: "#64748b",
                      }}
                    >
                      <span
                        style={{
                          padding: "0.15rem 0.55rem",
                          borderRadius: "999px",
                          background: "#eef2ff",
                          color: "#4f46e5",
                          fontWeight: 600,
                        }}
                      >
                        {expense.category}
                      </span>
                      <span>{formatDateDisplay(expense.date)}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#667eea",
                        fontSize: "1rem",
                      }}
                    >
                      ₹{formatINR(expense.amount)}
                    </span>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.35rem 0.5rem" }}
                        onClick={() => editExpense(expense)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.35rem 0.5rem", color: "#ef4444" }}
                        onClick={() => deleteExpense(expense.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
