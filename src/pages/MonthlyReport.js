import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  Award,
  Receipt,
  ArrowRight,
  Download,
} from "lucide-react";
import {
  formatMonthLabel,
  formatINR,
  formatDateDisplay,
  exportExpensesToCSV,
} from "@/lib/financeUtils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_COLORS = {
  Food: "#667eea",
  Travel: "#4facfe",
  Bills: "#764ba2",
  Education: "#f093fb",
  Shopping: "#43e97b",
  Entertainment: "#f59e0b",
  Healthcare: "#ef4444",
  Other: "#64748b",
};

export default function MonthlyReport() {
  const navigate = useNavigate();
  const [allExpenses, setAllExpenses] = useState([]);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Using from_date=2000-01-01&to_date=2099-12-31 works on both old and new backend versions to fetch ALL historical expenses!
      const [expRes, limitRes] = await Promise.all([
        axios.get(`${API}/expenses?from_date=2000-01-01&to_date=2099-12-31`),
        axios.get(`${API}/limit`).catch(() => ({ data: { monthly_limit: 0 } })),
      ]);
      const data = Array.isArray(expRes.data) ? expRes.data : [];
      setAllExpenses(data);
      setMonthlyLimit(Number(limitRes.data?.monthly_limit) || 0);
    } catch (err) {
      console.error("Failed to load monthly report data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group all expenses by YYYY-MM
  const monthlyGroups = useMemo(() => {
    const map = {};
    for (const exp of allExpenses) {
      if (!exp.date || exp.date.length < 7) continue;
      const ym = exp.date.slice(0, 7);
      const amt = Number(exp.amount) || 0;
      const cat = exp.category || "Other";

      if (!map[ym]) {
        map[ym] = {
          month: ym,
          label: formatMonthLabel(ym),
          shortLabel: new Date(
            Number(ym.split("-")[0]),
            Number(ym.split("-")[1]) - 1,
            1
          ).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          total: 0,
          count: 0,
          categories: {},
          expenses: [],
          highestExpense: null,
        };
      }
      map[ym].total += amt;
      map[ym].count += 1;
      map[ym].categories[cat] = (map[ym].categories[cat] || 0) + amt;
      map[ym].expenses.push(exp);
      if (!map[ym].highestExpense || amt > Number(map[ym].highestExpense.amount)) {
        map[ym].highestExpense = exp;
      }
    }

    const list = Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
    return list;
  }, [allExpenses]);

  useEffect(() => {
    if (!selectedMonth && monthlyGroups.length > 0) {
      setSelectedMonth(monthlyGroups[0].month);
    }
  }, [monthlyGroups, selectedMonth]);

  const activeMonthData = useMemo(() => {
    return (
      monthlyGroups.find((m) => m.month === selectedMonth) || monthlyGroups[0] || null
    );
  }, [monthlyGroups, selectedMonth]);

  const chartData = useMemo(() => {
    return [...monthlyGroups].reverse().slice(-12);
  }, [monthlyGroups]);

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Loading Monthly Analytics...</h1>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="monthly-report-page">
      <div className="page-header-flex">
        <div>
          <h1 className="page-title">Monthly Expenses</h1>
          <p className="page-subtitle">
            Track your month-by-month spending trends and category breakdown
          </p>
        </div>

        {activeMonthData && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <select
              className="form-select"
              style={{ width: "auto", minWidth: "200px", fontWeight: 600 }}
              value={activeMonthData.month}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthlyGroups.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.label} (₹{formatINR(m.total)})
                </option>
              ))}
            </select>

            <button
              className="btn btn-secondary"
              onClick={() =>
                exportExpensesToCSV(
                  activeMonthData.expenses,
                  `expenses-${activeMonthData.month}.csv`
                )
              }
            >
              <Download size={18} />
              Export Month CSV
            </button>
          </div>
        )}
      </div>

      {monthlyGroups.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <Calendar size={48} style={{ color: "#667eea", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            No Monthly Data Yet
          </h3>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            Start adding your daily expenses to see month-over-month comparisons.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/add-expense")}>
            Add Your First Expense
          </button>
        </div>
      ) : (
        <>
          {/* Selected Month Summary Stats */}
          {activeMonthData && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <Calendar size={22} />
                  </div>
                </div>
                <div className="card-title">{activeMonthData.label} Total</div>
                <div className="card-value">₹{formatINR(activeMonthData.total)}</div>
                {monthlyLimit > 0 && (
                  <div className="card-subtitle">
                    {activeMonthData.total <= monthlyLimit ? (
                      <span style={{ color: "#10b981", fontWeight: 600 }}>
                        ₹{formatINR(monthlyLimit - activeMonthData.total)} under budget
                      </span>
                    ) : (
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>
                        ₹{formatINR(activeMonthData.total - monthlyLimit)} over budget
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <TrendingUp size={22} />
                  </div>
                </div>
                <div className="card-title">Daily Average</div>
                <div className="card-value">
                  ₹{formatINR(activeMonthData.total / 30)}
                </div>
                <div className="card-subtitle">
                  Across {activeMonthData.count} transaction(s)
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <Award size={22} />
                  </div>
                </div>
                <div className="card-title">Highest Expense</div>
                <div className="card-value" style={{ fontSize: "1.45rem" }}>
                  ₹{formatINR(activeMonthData.highestExpense?.amount || 0)}
                </div>
                <div className="card-subtitle">
                  {activeMonthData.highestExpense?.title || "-"} (
                  {formatDateDisplay(activeMonthData.highestExpense?.date)})
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <Receipt size={22} />
                  </div>
                </div>
                <div className="card-title">All-Time Total</div>
                <div className="card-value">
                  ₹
                  {formatINR(
                    monthlyGroups.reduce((acc, item) => acc + item.total, 0)
                  )}
                </div>
                <div className="card-subtitle">
                  Across {monthlyGroups.length} active month(s)
                </div>
              </div>
            </div>
          )}

          {/* Month-over-Month Trend Chart & Category Breakdown */}
          <div className="charts-grid">
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: "1rem" }}>
                Month-by-Month Spending Trend (Click bar to inspect)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`₹${formatINR(value)}`, "Total Spent"]}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.label || label
                    }
                  />
                  <Bar
                    dataKey="total"
                    radius={[8, 8, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => {
                      if (data && data.month) setSelectedMonth(data.month);
                    }}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.month}
                        fill={
                          entry.month === activeMonthData?.month
                            ? "#764ba2"
                            : "#667eea"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {activeMonthData && (
              <div className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h3 className="card-title" style={{ marginBottom: 0 }}>
                    {activeMonthData.label} Categories
                  </h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      navigate(`/expenses?month=${activeMonthData.month}`)
                    }
                  >
                    View Transactions <ArrowRight size={14} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {Object.entries(activeMonthData.categories)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amt]) => {
                      const pct =
                        activeMonthData.total > 0
                          ? (amt / activeMonthData.total) * 100
                          : 0;
                      const color = CATEGORY_COLORS[cat] || "#667eea";
                      return (
                        <div key={cat}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              marginBottom: "0.25rem",
                            }}
                          >
                            <span style={{ color: "#1e293b" }}>{cat}</span>
                            <span style={{ color: "#475569" }}>
                              ₹{formatINR(amt)} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="progress-track" style={{ margin: 0 }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                background: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* All Months History Table / Cards */}
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
              All Months History
            </h3>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Transactions</th>
                    <th>Top Category</th>
                    <th>Total Spent</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyGroups.map((m) => {
                    const topCatEntry = Object.entries(m.categories).sort(
                      (a, b) => b[1] - a[1]
                    )[0];
                    const isSelected = m.month === activeMonthData?.month;
                    return (
                      <tr
                        key={m.month}
                        style={{
                          background: isSelected ? "#f0f4ff" : undefined,
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedMonth(m.month)}
                      >
                        <td style={{ fontWeight: 700 }}>{m.label}</td>
                        <td>{m.count} expense(s)</td>
                        <td>
                          {topCatEntry ? (
                            <span
                              style={{
                                padding: "0.25rem 0.65rem",
                                borderRadius: "999px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                background: "#eef2ff",
                                color: "#4f46e5",
                              }}
                            >
                              {topCatEntry[0]} (₹{formatINR(topCatEntry[1])})
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: "#667eea" }}>
                          ₹{formatINR(m.total)}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/expenses?month=${m.month}`);
                            }}
                          >
                            See List <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
