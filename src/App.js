import React, { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import AddExpense from "@/pages/AddExpense";
import Expenses from "@/pages/Expenses";
import Debts from "@/pages/Debts";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import { Toaster } from "@/components/ui/sonner";
import { Wallet, Plus, Receipt, HandCoins, Settings as SettingsIcon, LogOut } from "lucide-react";

function Navigation({ onLogout }) {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: Wallet, label: "Dashboard" },
    { path: "/add-expense", icon: Plus, label: "Add Expense" },
    { path: "/expenses", icon: Receipt, label: "Expenses" },
    { path: "/debts", icon: HandCoins, label: "Debts" },
    { path: "/settings", icon: SettingsIcon, label: "Settings" },
  ];
  
  return (
    <nav className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="sidebar-header">
        <Wallet className="sidebar-logo" size={32} />
        <h1 className="sidebar-title">Money Balancer</h1>
      </div>
      <div className="nav-links" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
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
            marginTop: 'auto',
            background: 'none',
            border: 'none',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            padding: '1rem 1.25rem'
          }}
          data-testid="nav-logout"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
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