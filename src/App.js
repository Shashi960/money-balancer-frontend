import React, { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import AddExpense from "@/pages/AddExpense";
import Expenses from "@/pages/Expenses";
import MonthlyReport from "@/pages/MonthlyReport";
import Debts from "@/pages/Debts";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  Receipt,
  Calendar,
  HandCoins,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import {
  getLocalToday,
  getReminderSettings,
  getNoSpendDays,
  getLastNotifiedDate,
  setLastNotifiedDate,
  triggerExpenseNotification,
} from "@/lib/financeUtils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const navItems = [
  { path: "/", icon: Wallet, label: "Dashboard", mobileLabel: "Home" },
  { path: "/add-expense", icon: Plus, label: "Add Expense", mobileLabel: "Add" },
  { path: "/monthly", icon: Calendar, label: "Monthly", mobileLabel: "Monthly" },
  { path: "/expenses", icon: Receipt, label: "Expenses", mobileLabel: "History" },
  { path: "/debts", icon: HandCoins, label: "Debts", mobileLabel: "Debts" },
  { path: "/settings", icon: SettingsIcon, label: "Settings", mobileLabel: "Settings" },
];

function Navigation({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Background check for daily reminder time
  useEffect(() => {
    const checkDailyReminder = async () => {
      try {
        const settings = getReminderSettings();
        if (!settings.enabled || !settings.time) return;

        const today = getLocalToday();
        if (getLastNotifiedDate() === today) return;

        const noSpend = getNoSpendDays();
        if (noSpend.includes(today)) return;

        const now = new Date();
        const currentHM = `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}`;

        if (currentHM >= settings.time) {
          // Check if any expense is logged today
          const res = await axios.get(
            `${API}/expenses?from_date=${today}&to_date=${today}`
          );
          const todayExpenses = res.data || [];
          setLastNotifiedDate(today);

          if (todayExpenses.length === 0) {
            await triggerExpenseNotification(
              "Money Balancer — Daily Expense Reminder 🔔",
              "You haven't logged any expenses for today yet. Tap to add today's spending!"
            );
            toast("Daily Reminder: Log today's expenses! 📝", {
              description: "You haven't recorded any expenses for today yet.",
              action: {
                label: "Add Now",
                onClick: () => navigate("/add-expense"),
              },
              duration: 10000,
            });
          }
        }
      } catch {
        // Ignore transient network errors during background check
      }
    };

    checkDailyReminder();
    const interval = setInterval(checkDailyReminder, 45000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        className="sidebar"
        style={{ display: "flex", flexDirection: "column", height: "100vh" }}
      >
        <div className="sidebar-header">
          <Wallet className="sidebar-logo" size={32} />
          <h1 className="sidebar-title">Money Balancer</h1>
        </div>
        <div
          className="nav-links"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            flex: 1,
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? "active" : ""}`}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={onLogout}
            className="nav-link"
            style={{
              marginTop: "auto",
              background: "none",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              padding: "0.875rem 1rem",
            }}
            data-testid="nav-logout"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <Link to="/" className="mobile-header-brand" style={{ textDecoration: "none" }}>
          <Wallet size={24} style={{ color: "#667eea" }} />
          <span className="mobile-header-title">Money Balancer</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => navigate("/add-expense")}
            className="btn btn-primary"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
          >
            <Plus size={15} /> Add
          </button>
          <button
            onClick={onLogout}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.6rem" }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (!token) {
    return (
      <>
        <Login onLogin={setToken} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Navigation onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-expense" element={<AddExpense />} />
            <Route path="/monthly" element={<MonthlyReport />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;