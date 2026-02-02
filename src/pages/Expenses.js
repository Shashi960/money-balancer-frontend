import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Edit, Trash2, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Expenses() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [useDateRange, setUseDateRange] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [filter]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = `${API}/expenses`;

      if (useDateRange && fromDate && toDate) {
        url += `?from_date=${fromDate}&to_date=${toDate}`;
      } else {
        url += `?filter=${filter}`;
      }

      const response = await axios.get(url);
      setExpenses(response.data);
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
      fetchExpenses();
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const editExpense = (expense) => {
    navigate("/add-expense", { state: { expense } });
  };

  // ✅ FIXED total (floating point safe)
  const totalAmount = expenses
    .reduce((sum, e) => sum + Number(e.amount), 0)
    .toFixed(2);

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="expenses-page">
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h1 className="page-title">All Expenses</h1>
          <p className="page-subtitle">View and manage your expenses</p>
        </div>

        {/* 🔹 FILTER BAR (CSS PRESERVED) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Filter size={20} style={{ color: "#718096" }} />

          <Select
            value={filter}
            onValueChange={(value) => {
              setFilter(value);
              setUseDateRange(false);
              setFromDate("");
              setToDate("");
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <input
            type="date"
            className="input"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setUseDateRange(true);
            }}
          />

          <input
            type="date"
            className="input"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setUseDateRange(true);
            }}
          />

          <button
            className="btn btn-primary"
            disabled={!fromDate || !toDate}
            onClick={fetchExpenses}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: "2rem" }}>
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 className="card-title">Total: ₹{totalAmount}</h3>
          <span style={{ color: "#718096", fontSize: "0.875rem" }}>
            {expenses.length} expense(s)
          </span>
        </div>

        {expenses.length === 0 ? (
          <p style={{ color: "#718096", textAlign: "center", padding: "2rem" }}>
            No expenses found for this period
          </p>
        ) : (
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
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.title}</td>
                  <td style={{ fontWeight: 600, color: "#667eea" }}>
                    ₹{Number(expense.amount).toFixed(2)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.875rem",
                        background: "#f0f4ff",
                        color: "#667eea",
                      }}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => editExpense(expense)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ color: "#ef4444" }}
                        onClick={() => deleteExpense(expense.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
