import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  HandCoins,
  BellRing,
  CheckCircle2,
  Plus,
  Calendar,
  ArrowRight,
  MessageSquarePlus,
  Clipboard,
  Check,
  X,
} from "lucide-react";
import {
  getLocalToday,
  getPastDateStr,
  formatShortDate,
  formatDateDisplay,
  formatINR,
  getNoSpendDays,
  markNoSpendDay,
  parseBankSmsBatch,
  getLocalPendingSms,
  addLocalPendingSms,
  removeLocalPendingSms,
} from "@/lib/financeUtils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Healthcare",
  "Education",
  "Other",
];

const COLORS = [
  "#667eea",
  "#764ba2",
  "#4facfe",
  "#43e97b",
  "#f59e0b",
  "#ef4444",
  "#f093fb",
  "#64748b",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [noSpendDays, setNoSpendDays] = useState(getNoSpendDays());
  const [pendingSms, setPendingSms] = useState(getLocalPendingSms());
  const [showSmsScanner, setShowSmsScanner] = useState(false);
  const [smsInputText, setSmsInputText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const handleNoSpendChange = () => setNoSpendDays(getNoSpendDays());
    const handleSmsChange = () => setPendingSms((prev) => {
      const serverItems = prev.filter((i) => i.source !== "local");
      return [...getLocalPendingSms(), ...serverItems];
    });
    window.addEventListener("mb-nospend-updated", handleNoSpendChange);
    window.addEventListener("mb-sms-updated", handleSmsChange);
    return () => {
      window.removeEventListener("mb-nospend-updated", handleNoSpendChange);
      window.removeEventListener("mb-sms-updated", handleSmsChange);
    };
  }, []);

  const fetchData = async () => {
    try {
      const from35DaysAgo = getPastDateStr(35);
      const todayStr = getLocalToday();
      const [summaryRes, expensesRes, smsRes] = await Promise.all([
        axios.get(`${API}/summary`),
        axios.get(`${API}/expenses?from_date=${from35DaysAgo}&to_date=${todayStr}`),
        axios.get(`${API}/pending-sms`).catch(() => ({ data: [] })),
      ]);
      setSummary(summaryRes.data);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      const serverSms = Array.isArray(smsRes.data) ? smsRes.data : [];
      const localSms = getLocalPendingSms();
      setPendingSms([...localSms, ...serverSms]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSmsText = (textToScan) => {
    const raw = textToScan !== undefined ? textToScan : smsInputText;
    if (!raw || !raw.trim()) {
      toast.error("Please paste or provide a bank/UPI SMS message first");
      return;
    }
    const parsedItems = parseBankSmsBatch(raw);
    if (parsedItems.length === 0) {
      toast.error("No debit amount found in the SMS text (e.g., Rs. 250 debited...)");
      return;
    }
    addLocalPendingSms(parsedItems);
    setSmsInputText("");
    setShowSmsScanner(false);
    toast.success(
      `Detected ${parsedItems.length} debit(s)! Review below to add to expenses.`
    );
  };

  const handleReadClipboardSms = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error("Clipboard access not supported — please paste into the box below.");
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        toast.error("Clipboard is empty. Copy a bank SMS first!");
        return;
      }
      setSmsInputText(clipText);
      handleScanSmsText(clipText);
    } catch {
      toast.info("Please long-press and paste your SMS in the text box below.");
    }
  };

  const handleApproveSmsItem = async (item) => {
    try {
      await axios.post(`${API}/expenses`, {
        title: item.title || "UPI / Bank Debit",
        amount: Number(item.amount),
        date: item.date || getLocalToday(),
        category: item.category || "Other",
      });
      if (item.source === "local" || String(item.id).startsWith("local_sms_")) {
        removeLocalPendingSms(item.id);
      } else {
        await axios.delete(`${API}/pending-sms/${item.id}`).catch(() => {});
      }
      setPendingSms((prev) => prev.filter((x) => x.id !== item.id));
      toast.success(`Added ₹${formatINR(item.amount)} (${item.title}) to expenses!`);
      fetchData();
    } catch (err) {
      console.error("Failed to approve SMS expense:", err);
      toast.error("Failed to add expense");
    }
  };

  const handleIgnoreSmsItem = async (item) => {
    if (item.source === "local" || String(item.id).startsWith("local_sms_")) {
      removeLocalPendingSms(item.id);
    } else {
      await axios.delete(`${API}/pending-sms/${item.id}`).catch(() => {});
    }
    setPendingSms((prev) => prev.filter((x) => x.id !== item.id));
    toast.info("Ignored SMS entry");
  };

  const updatePendingSmsField = (id, field, value) => {
    setPendingSms((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const todayStr = getLocalToday();
  const currentMonthPrefix = todayStr.slice(0, 7);

  // Filter expenses for current month for category breakdown
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date && e.date.startsWith(currentMonthPrefix));
  }, [expenses, currentMonthPrefix]);

  // Prepare category data for pie chart
  const categoryData = useMemo(() => {
    const map = {};
    for (const expense of monthExpenses) {
      const cat = expense.category || "Other";
      map[cat] = (map[cat] || 0) + Number(expense.amount || 0);
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  // Prepare weekly data for bar chart (last 7 days in local time)
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = getPastDateStr(i);
      const parts = dateStr.split("-").map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayExpenses = expenses.filter((e) => e.date === dateStr);
      const total = dayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      days.push({
        date: dateStr,
        day: dateObj.toLocaleDateString("en-IN", { weekday: "short" }),
        fullLabel: formatShortDate(dateStr),
        amount: Math.round(total * 100) / 100,
        count: dayExpenses.length,
      });
    }
    return days;
  }, [expenses]);

  // Detect unlogged days in the last 7 days (where count === 0 and not marked as no-spend)
  const missedDays = useMemo(() => {
    return last7Days
      .filter((d) => d.count === 0 && !noSpendDays.includes(d.date))
      .reverse();
  }, [last7Days, noSpendDays]);

  const todayLogged = useMemo(() => {
    const todayEntry = last7Days.find((d) => d.date === todayStr);
    return (todayEntry && todayEntry.count > 0) || noSpendDays.includes(todayStr);
  }, [last7Days, todayStr, noSpendDays]);

  const handleMarkNoSpend = (dateStr) => {
    markNoSpendDay(dateStr);
    setNoSpendDays(getNoSpendDays());
    toast.success(`Marked ${formatShortDate(dateStr)} as a ₹0 spend day!`);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Loading Dashboard...</h1>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  // Compute local today total as fallback if UTC on server differed
  const localTodayTotal =
    last7Days.find((d) => d.date === todayStr)?.amount ?? summary.total_today;

  const weeklyPercent =
    summary.weekly_limit > 0
      ? Math.min((summary.total_week / summary.weekly_limit) * 100, 100)
      : 0;
  const monthlyPercent =
    summary.monthly_limit > 0
      ? Math.min((summary.total_month / summary.monthly_limit) * 100, 100)
      : 0;

  return (
    <div className="page-container" data-testid="dashboard">
      <div className="page-header-flex">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your financial overview at a glance</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            style={{ borderColor: "#667eea", color: "#4f46e5" }}
            onClick={() => setShowSmsScanner((prev) => !prev)}
          >
            <MessageSquarePlus size={18} />
            Scan Bank SMS
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/monthly")}
          >
            <Calendar size={18} />
            Monthly Report
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/add-expense")}
          >
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {/* 📲 Quick Bank / UPI SMS Scanner Drawer */}
      {showSmsScanner && (
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            border: "1.5px solid #c7d2fe",
            background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ fontWeight: 700, color: "#312e81", fontSize: "1rem" }}>
              📲 Scan Bank / UPI Debit SMS
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleReadClipboardSms}
              >
                <Clipboard size={15} /> Read Copied SMS
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const sample =
                    "Rs. 185.00 debited from A/c XX4821 on 26-09-26 to VPA swiggy@axisbank (UPI Ref 6269184712).";
                  setSmsInputText(sample);
                  handleScanSmsText(sample);
                }}
              >
                ✨ Try Sample SMS
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSmsScanner(false)}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <p style={{ fontSize: "0.825rem", color: "#475569", marginBottom: "0.75rem" }}>
            Copy one or multiple debit SMS messages from your phone and tap{" "}
            <strong>Read Copied SMS</strong> (or paste below). Want 100% automatic background detection? Configure Auto-SMS in{" "}
            <span
              onClick={() => navigate("/settings")}
              style={{ color: "#4f46e5", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              Settings
            </span>
            .
          </p>

          <textarea
            className="form-input"
            rows={3}
            placeholder="Paste bank/UPI SMS here, e.g.: Sent Rs. 120.00 from HDFC Bank A/C *1234 to rapido@ybl on 26-09-26..."
            value={smsInputText}
            onChange={(e) => setSmsInputText(e.target.value)}
            style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleScanSmsText()}
            >
              Detect & Ask to Add
            </button>
          </div>
        </div>
      )}

      {/* 💬 Detected Bank / UPI SMS Debits Waiting for User Approval */}
      {pendingSms.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            border: "2px solid #667eea",
            background: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)",
          }}
          data-testid="pending-sms-banner"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#312e81",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                📲 Bank / UPI Debit SMS Detected ({pendingSms.length}) — Add to Expenses?
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Review the detected amount, edit the title/category if needed, and tap{" "}
                <strong>Add</strong>.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pendingSms.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "0.9rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      flexWrap: "wrap",
                      flex: "1 1 260px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        color: "#4f46e5",
                        minWidth: "90px",
                      }}
                    >
                      ₹{formatINR(item.amount)}
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      value={item.title}
                      onChange={(e) =>
                        updatePendingSmsField(item.id, "title", e.target.value)
                      }
                      style={{
                        flex: "1 1 140px",
                        padding: "0.4rem 0.65rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                      }}
                      placeholder="Expense Title"
                    />
                    <select
                      className="form-select"
                      value={item.category}
                      onChange={(e) =>
                        updatePendingSmsField(item.id, "category", e.target.value)
                      }
                      style={{
                        flex: "0 1 130px",
                        padding: "0.4rem 0.65rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApproveSmsItem(item)}
                    >
                      <Check size={15} /> Add to Expenses
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: "#ef4444" }}
                      onClick={() => handleIgnoreSmsItem(item)}
                    >
                      <X size={15} /> Ignore
                    </button>
                  </div>
                </div>

                {item.raw_text && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      background: "#f8fafc",
                      padding: "0.35rem 0.6rem",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      wordBreak: "break-word",
                    }}
                  >
                    SMS: "{item.raw_text}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔔 Smart Daily Expense Reminder & Missed Days Tracker */}
      {missedDays.length > 0 && (
        <div className="reminder-banner" data-testid="daily-reminder-banner">
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 700,
                color: "#92400e",
                fontSize: "1rem",
                marginBottom: "0.35rem",
              }}
            >
              <BellRing size={20} style={{ color: "#d97706" }} />
              {!todayLogged
                ? "Did you spend anything today?"
                : `You have ${missedDays.length} unlogged day(s) this week!`}
            </div>
            <p style={{ fontSize: "0.875rem", color: "#78350f", marginBottom: "0.75rem" }}>
              {!todayLogged
                ? "You haven't logged any expenses for today yet. Tap below to add an expense or mark today as a ₹0 spend day."
                : "Tap any missed day below to log forgotten expenses for that date, or dismiss it as a ₹0 spend day."}
            </p>

            {/* Missed Day Chips */}
            <div className="chip-row">
              {missedDays.map((d) => {
                const isToday = d.date === todayStr;
                return (
                  <div
                    key={d.date}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "white",
                      border: "1px solid #fcd34d",
                      borderRadius: "999px",
                      padding: "0.2rem 0.3rem 0.2rem 0.75rem",
                      gap: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#92400e",
                    }}
                  >
                    <span
                      onClick={() => navigate(`/add-expense?date=${d.date}`)}
                      style={{ cursor: "pointer", textDecoration: "underline" }}
                      title="Click to log expense for this date"
                    >
                      + {isToday ? "Today" : d.fullLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMarkNoSpend(d.date)}
                      title="Mark as ₹0 Spend Day"
                      style={{
                        background: "#fef3c7",
                        border: "none",
                        borderRadius: "999px",
                        padding: "0.15rem 0.45rem",
                        fontSize: "0.72rem",
                        color: "#b45309",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      ₹0 Day ✓
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {!todayLogged && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/add-expense?date=${todayStr}`)}
              >
                <Plus size={16} /> Log Today
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleMarkNoSpend(todayStr)}
              >
                <CheckCircle2 size={16} /> No Spend Today
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" data-testid="stat-today">
          <div className="stat-header">
            <div className="stat-icon">
              <DollarSign size={22} />
            </div>
            {todayLogged && (
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "#d1fae5",
                  color: "#065f46",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "999px",
                  fontWeight: 600,
                }}
              >
                Logged ✓
              </span>
            )}
          </div>
          <div className="card-title">Today's Spending</div>
          <div className="card-value">₹{formatINR(localTodayTotal)}</div>
          <div className="card-subtitle">{formatDateDisplay(todayStr)}</div>
        </div>

        <div className="stat-card" data-testid="stat-week">
          <div className="stat-header">
            <div className="stat-icon">
              <TrendingUp size={22} />
            </div>
            {summary.weekly_warning === "yellow" && (
              <span className="warning-badge warning-yellow">
                <AlertCircle size={14} /> 80% Used
              </span>
            )}
            {summary.weekly_warning === "red" && (
              <span className="warning-badge warning-red">
                <AlertCircle size={14} /> Exceeded
              </span>
            )}
          </div>
          <div className="card-title">This Week</div>
          <div className="card-value">₹{formatINR(summary.total_week)}</div>
          {summary.weekly_limit > 0 && (
            <>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${weeklyPercent}%`,
                    background:
                      summary.weekly_warning === "red"
                        ? "#ef4444"
                        : summary.weekly_warning === "yellow"
                        ? "#f59e0b"
                        : "#10b981",
                  }}
                />
              </div>
              <div className="card-subtitle">
                {summary.remaining_week >= 0 ? (
                  <span>
                    ₹{formatINR(summary.remaining_week)} left of ₹
                    {formatINR(summary.weekly_limit)}
                  </span>
                ) : (
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>
                    ₹{formatINR(Math.abs(summary.remaining_week))} over weekly limit
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="stat-card" data-testid="stat-month">
          <div className="stat-header">
            <div className="stat-icon">
              <Wallet size={22} />
            </div>
            {summary.monthly_warning === "yellow" && (
              <span className="warning-badge warning-yellow">
                <AlertCircle size={14} /> 80% Used
              </span>
            )}
            {summary.monthly_warning === "red" && (
              <span className="warning-badge warning-red">
                <AlertCircle size={14} /> Exceeded
              </span>
            )}
          </div>
          <div className="card-title">This Month</div>
          <div className="card-value">₹{formatINR(summary.total_month)}</div>
          {summary.monthly_limit > 0 && (
            <>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${monthlyPercent}%`,
                    background:
                      summary.monthly_warning === "red"
                        ? "#ef4444"
                        : summary.monthly_warning === "yellow"
                        ? "#f59e0b"
                        : "#667eea",
                  }}
                />
              </div>
              <div className="card-subtitle">
                {summary.remaining_month >= 0 ? (
                  <span>
                    ₹{formatINR(summary.remaining_month)} left of ₹
                    {formatINR(summary.monthly_limit)}
                  </span>
                ) : (
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>
                    ₹{formatINR(Math.abs(summary.remaining_month))} over monthly limit
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div
          className="stat-card"
          data-testid="stat-debts"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/debts")}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <HandCoins size={22} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "#667eea", fontWeight: 600 }}>
              Manage →
            </span>
          </div>
          <div className="card-title">Money Tracking</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#10b981" }}>
              <TrendingDown
                size={18}
                style={{ display: "inline", marginRight: "0.35rem" }}
              />
              ₹{formatINR(summary.money_gave)} Lent
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ef4444" }}>
              <TrendingUp
                size={18}
                style={{ display: "inline", marginRight: "0.35rem" }}
              />
              ₹{formatINR(summary.money_owe)} Owe
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Bar Chart - Last 7 Days Spending */}
        <div className="card" data-testid="weekly-chart">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 className="card-title" style={{ marginBottom: 0 }}>
              Last 7 Days Spending
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Tap a bar to log for that day
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                formatter={(value) => [`₹${formatINR(value)}`, "Spent"]}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.fullLabel || label
                }
              />
              <Bar
                dataKey="amount"
                fill="#667eea"
                radius={[8, 8, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  if (data && data.date) {
                    navigate(`/add-expense?date=${data.date}`);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart + Clean Category Breakdown List */}
        <div className="card" data-testid="category-chart">
          <h3 className="card-title">This Month by Category</h3>
          {categoryData.length === 0 ? (
            <p
              style={{
                color: "#64748b",
                textAlign: "center",
                padding: "3rem 1rem",
              }}
            >
              No expenses recorded this month yet.
            </p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₹${formatINR(val)}`} />
                </PieChart>
              </ResponsiveContainer>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                  maxHeight: "140px",
                  overflowY: "auto",
                }}
              >
                {categoryData.map((item, idx) => {
                  const pct =
                    summary.total_month > 0
                      ? ((item.value / summary.total_month) * 100).toFixed(1)
                      : 0;
                  return (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: COLORS[idx % COLORS.length],
                            display: "inline-block",
                          }}
                        />
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {item.name}
                        </span>
                      </div>
                      <span style={{ color: "#475569", fontWeight: 600 }}>
                        ₹{formatINR(item.value)} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Preview */}
      {expenses.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 className="card-title" style={{ marginBottom: 0 }}>
              Recent Expenses
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate("/expenses")}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {expenses.slice(0, 5).map((exp) => (
              <div
                key={exp.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#1e293b" }}>
                    {exp.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {exp.category} • {formatDateDisplay(exp.date)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: "#667eea" }}>
                  ₹{formatINR(exp.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}