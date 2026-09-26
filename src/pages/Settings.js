import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Save,
  TrendingUp,
  Lock,
  Bell,
  CheckCircle2,
  Smartphone,
  Copy,
  Sparkles,
} from "lucide-react";
import {
  getReminderSettings,
  saveReminderSettings,
  requestNotificationPermission,
  triggerExpenseNotification,
  parseBankSmsBatch,
  addLocalPendingSms,
} from "@/lib/financeUtils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Settings() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    weekly_limit: "",
    monthly_limit: "",
  });
  const [reminder, setReminder] = useState(getReminderSettings());
  const [webhookKey, setWebhookKey] = useState("");
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [loading, setLoading] = useState(true);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetchLimit();
  }, []);

  const fetchLimit = async () => {
    try {
      const [limitRes, webhookRes] = await Promise.all([
        axios.get(`${API}/limit`),
        axios.get(`${API}/sms-webhook-info`).catch(() => ({ data: null })),
      ]);

      setFormData({
        weekly_limit: limitRes.data.weekly_limit || "",
        monthly_limit: limitRes.data.monthly_limit || "",
      });

      if (limitRes.data.reminder_time) {
        const synced = {
          enabled: limitRes.data.reminder_enabled ?? true,
          time: limitRes.data.reminder_time || "21:00",
        };
        setReminder(synced);
        saveReminderSettings(synced);
      }

      if (webhookRes?.data?.webhook_key) {
        setWebhookKey(webhookRes.data.webhook_key);
      } else {
        // Deterministic fallback for default user Shashi68 while backend restarts
        setWebhookKey("db0c9b11775a87a6");
      }
    } catch (error) {
      console.error("Error fetching limit:", error);
      setWebhookKey("db0c9b11775a87a6");
    } finally {
      setLoading(false);
    }
  };

  const handleReminderSave = async (e) => {
    e.preventDefault();
    saveReminderSettings(reminder);
    try {
      await axios.post(`${API}/limit`, {
        weekly_limit: parseFloat(formData.weekly_limit) || 0,
        monthly_limit: parseFloat(formData.monthly_limit) || 0,
        reminder_enabled: reminder.enabled,
        reminder_time: reminder.time,
      });
    } catch {
      // LocalStorage is already saved even if backend is still updating
    }
    if (reminder.enabled) {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
    }
    toast.success(`Daily reminder saved (${reminder.enabled ? reminder.time : "Off"})`);
  };

  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      await triggerExpenseNotification(
        "Money Balancer — Test Reminder 🔔",
        "Your daily expense reminder is active! Tap to log today's expenses."
      );
      toast.success("Test notification sent!");
    } else if (perm === "denied") {
      toast.error(
        "Browser notifications are blocked. Please allow notifications in your browser site settings."
      );
    } else {
      toast.info("In-app daily reminders and Missed-Day detection are active!");
    }
  };

  const webhookUrl = `${BACKEND_URL}/api/sms-webhook/${webhookKey || "db0c9b11775a87a6"}?text={sms_body}`;

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Auto-SMS Webhook URL copied to clipboard!");
    } catch {
      toast.error("Could not copy automatically — please select and copy the URL.");
    }
  };

  const handleSimulateBankSms = async () => {
    const sampleSms =
      "Rs. 240.00 debited from A/c XX4821 on 26-09-26 to VPA swiggy@axisbank (UPI Ref 6269184712).";
    try {
      await axios.get(
        `${API}/sms-webhook/${webhookKey || "db0c9b11775a87a6"}?text=${encodeURIComponent(
          sampleSms
        )}`
      );
    } catch {
      const parsed = parseBankSmsBatch(sampleSms);
      addLocalPendingSms(parsed);
    }
    toast.success("Simulated Bank SMS received! Redirecting to Dashboard...");
    setTimeout(() => navigate("/"), 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/limit`, {
        weekly_limit: parseFloat(formData.weekly_limit) || 0,
        monthly_limit: parseFloat(formData.monthly_limit) || 0,
        reminder_enabled: reminder.enabled,
        reminder_time: reminder.time,
      });
      toast.success("Spending limits updated successfully!");
    } catch (error) {
      console.error("Error updating limit:", error);
      toast.error("Failed to update limits");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      toast.success("Password updated successfully!");
      setPasswordData({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      const errMsg = error.response?.data?.detail || "Failed to update password";
      toast.error(errMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Configure daily reminders, automatic SMS debit detection, limits, and security
        </p>
      </div>

      {/* Daily Expense Reminder Card */}
      <div className="card" style={{ maxWidth: "600px", margin: "0 auto 2rem auto" }}>
        <h3
          className="card-title"
          style={{
            marginBottom: "1rem",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Bell size={20} style={{ color: "#667eea" }} />
          Daily Expense Reminder
        </h3>

        <div
          style={{
            background: "#f5f3ff",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.25rem",
            border: "1px solid #ddd6fe",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#4c1d95", lineHeight: "1.5" }}>
            Never forget to log your expenses! Get a daily notification at your chosen time, plus automatic <strong>Unlogged Days Detection</strong> on your Dashboard for the last 7 days.
          </p>
        </div>

        <form onSubmit={handleReminderSave}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 0",
              borderBottom: "1px solid #f1f5f9",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>
                Enable Daily Reminder
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Remind me if I haven't logged today's expenses
              </div>
            </div>
            <input
              type="checkbox"
              checked={reminder.enabled}
              onChange={(e) =>
                setReminder({ ...reminder, enabled: e.target.checked })
              }
              style={{ width: "20px", height: "20px", accentColor: "#667eea", cursor: "pointer" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reminder_time">
              Daily Reminder Time
            </label>
            <input
              id="reminder_time"
              type="time"
              className="form-input"
              value={reminder.time}
              onChange={(e) => setReminder({ ...reminder, time: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: "1 1 180px", justifyContent: "center" }}
            >
              <Save size={18} />
              Save Reminder
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestNotification}
              style={{ flex: "1 1 180px", justifyContent: "center" }}
            >
              <Bell size={18} />
              {notifPermission === "granted"
                ? "Test Notification"
                : "Enable Browser Alerts"}
            </button>
          </div>

          {notifPermission === "granted" && (
            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.8rem",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <CheckCircle2 size={14} /> Browser push notifications are enabled on this device.
            </div>
          )}
        </form>
      </div>

      {/* 📲 Automatic Bank / UPI SMS Debit Reader Card */}
      <div className="card" style={{ maxWidth: "600px", margin: "0 auto 2rem auto" }}>
        <h3
          className="card-title"
          style={{
            marginBottom: "1rem",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Smartphone size={20} style={{ color: "#667eea" }} />
          Auto-Read Bank & UPI Debit SMS (Mobile)
        </h3>

        <div
          style={{
            background: "#ecfdf5",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.25rem",
            border: "1px solid #a7f3d0",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#065f46", lineHeight: "1.55" }}>
            <strong>3 Easy Ways on Mobile:</strong>
            <br />
            1️⃣ <strong>1-Tap Copy/Paste:</strong> Copy any bank SMS and tap{" "}
            <strong>"Scan Bank SMS → Read Copied SMS"</strong> on your Dashboard.
            <br />
            2️⃣ <strong>Share from SMS App (Android):</strong> Tap browser menu{" "}
            <strong>"Add to Home Screen"</strong>. Then long-press any bank SMS →{" "}
            <strong>Share → Money Balancer</strong>!
            <br />
            3️⃣ <strong>100% Automatic in Background:</strong> Use the free{" "}
            <strong>MacroDroid</strong> app on Android (or <strong>Shortcuts</strong> on iPhone) with your personal Auto-SMS URL below!
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Your Personal Auto-SMS Webhook URL</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              readOnly
              className="form-input"
              value={webhookUrl}
              style={{
                flex: "1 1 240px",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                background: "#f8fafc",
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopyWebhook}
            >
              <Copy size={16} /> Copy URL
            </button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.4rem" }}>
            In <strong>MacroDroid</strong> (Android): Trigger = <em>SMS Received (Contains: debited / paid / sent)</em> → Action = <em>HTTP Request (GET)</em> → Paste this URL (replace <code>{"{sms_body}"}</code> with MacroDroid's <code>[sms_text]</code> tag).
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={handleSimulateBankSms}
        >
          <Sparkles size={18} />
          Simulate Incoming Bank Debit SMS Now
        </button>
      </div>

      {/* Spending Limits Card */}
      <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h3 className="card-title" style={{ marginBottom: "1.5rem", fontSize: "1rem" }}>
          <TrendingUp size={20} style={{ display: "inline", marginRight: "0.5rem", color: "#667eea" }} />
          Spending Limits
        </h3>

        <div
          style={{
            background: "#eff6ff",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            border: "1px solid #bfdbfe",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "#1e40af", lineHeight: "1.5" }}>
            Set your weekly and monthly spending limits. You'll receive a{" "}
            <strong>yellow warning</strong> at 80% and a <strong>red alert</strong> at 100%.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="weekly_limit">
              Weekly Limit (₹)
            </label>
            <input
              id="weekly_limit"
              type="number"
              step="0.01"
              className="form-input"
              placeholder="Enter weekly limit (e.g., 5000)"
              value={formData.weekly_limit}
              onChange={(e) =>
                setFormData({ ...formData, weekly_limit: e.target.value })
              }
              data-testid="weekly-limit-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="monthly_limit">
              Monthly Limit (₹)
            </label>
            <input
              id="monthly_limit"
              type="number"
              step="0.01"
              className="form-input"
              placeholder="Enter monthly limit (e.g., 20000)"
              value={formData.monthly_limit}
              onChange={(e) =>
                setFormData({ ...formData, monthly_limit: e.target.value })
              }
              data-testid="monthly-limit-input"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            data-testid="save-limits-btn"
          >
            <Save size={20} />
            Save Limits Settings
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="card" style={{ maxWidth: "600px", margin: "2rem auto 0 auto" }}>
        <h3 className="card-title" style={{ marginBottom: "1.5rem", fontSize: "1rem" }}>
          <Lock size={20} style={{ display: "inline", marginRight: "0.5rem", color: "#667eea" }} />
          Change Password
        </h3>

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="old_password">
              Current Password
            </label>
            <input
              id="old_password"
              type="password"
              className="form-input"
              required
              placeholder="Enter current password"
              value={passwordData.old_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, old_password: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new_password">
              New Password
            </label>
            <input
              id="new_password"
              type="password"
              className="form-input"
              required
              placeholder="Enter new password"
              value={passwordData.new_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, new_password: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm_password">
              Confirm New Password
            </label>
            <input
              id="confirm_password"
              type="password"
              className="form-input"
              required
              placeholder="Confirm new password"
              value={passwordData.confirm_password}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirm_password: e.target.value,
                })
              }
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={passwordLoading}
          >
            <Save size={20} />
            {passwordLoading ? "Saving..." : "Save New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}