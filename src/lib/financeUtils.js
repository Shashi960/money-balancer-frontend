// src/lib/financeUtils.js

export function getLocalToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getPastDateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatMonthLabel(ym) {
  if (!ym || !ym.includes("-")) return ym;
  const [y, m] = ym.split("-").map(Number);
  const dateObj = new Date(y, m - 1, 1);
  return dateObj.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function formatINR(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Safely evaluates simple arithmetic expressions like "43+28+12" or "954+15" or "100*2-15"
 * Returns number | null
 */
export function evaluateMathExpression(rawInput) {
  if (rawInput === null || rawInput === undefined) {
    return null;
  }
  const str = String(rawInput).trim();
  if (!str) return null;

  // Plain number check
  if (/^\d+(\.\d+)?$/.test(str)) {
    return parseFloat(str);
  }

  // Only allow digits, decimal points, +, -, *, /, (, ), and spaces
  if (!/^[\d+\-*/().\s]+$/.test(str)) {
    return null;
  }

  // Check if it actually contains an operator
  if (!/[+\-*/]/.test(str)) {
    return null;
  }

  try {
    // Safe evaluation using Function after strict character whitelist
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${str})`)();
    if (typeof result === "number" && Number.isFinite(result) && result >= 0) {
      return Math.round(result * 100) / 100;
    }
  } catch {
    return null;
  }
  return null;
}

// ---------- Daily Reminder & No-Spend Days Storage ----------
const REMINDER_KEY = "mb_reminder_settings";
const NO_SPEND_KEY = "mb_no_spend_days";
const LAST_NOTIFIED_KEY = "mb_last_notified_date";

export function getReminderSettings() {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : true,
        time: parsed.time || "21:00",
      };
    }
  } catch (e) {
    console.error("Failed to read reminder settings", e);
  }
  return { enabled: true, time: "21:00" };
}

export function saveReminderSettings(settings) {
  const clean = {
    enabled: Boolean(settings.enabled),
    time: settings.time || "21:00",
  };
  localStorage.setItem(REMINDER_KEY, JSON.stringify(clean));
  window.dispatchEvent(new Event("mb-reminder-updated"));
  return clean;
}

export function getNoSpendDays() {
  try {
    const raw = localStorage.getItem(NO_SPEND_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function markNoSpendDay(dateStr) {
  const current = getNoSpendDays();
  if (!current.includes(dateStr)) {
    const updated = [...current, dateStr].slice(-60); // keep last 60 days
    localStorage.setItem(NO_SPEND_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("mb-nospend-updated"));
    return updated;
  }
  return current;
}

export function unmarkNoSpendDay(dateStr) {
  const current = getNoSpendDays();
  const updated = current.filter((d) => d !== dateStr);
  localStorage.setItem(NO_SPEND_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("mb-nospend-updated"));
  return updated;
}

export function getLastNotifiedDate() {
  return localStorage.getItem(LAST_NOTIFIED_KEY) || "";
}

export function setLastNotifiedDate(dateStr) {
  localStorage.setItem(LAST_NOTIFIED_KEY, dateStr);
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error("Notification permission error:", e);
    return "denied";
  }
}

export async function triggerExpenseNotification(
  title = "💸 Daily Expense Reminder",
  body = "Don't forget to log today's expenses in Money Balancer!"
) {
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "daily-expense-reminder",
          renotify: true,
          data: { url: "/add-expense" },
        });
        return true;
      }
    }
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "daily-expense-reminder",
    });
    n.onclick = () => {
      window.focus();
      window.location.href = "/add-expense";
      n.close();
    };
    return true;
  } catch (e) {
    console.error("Failed to show notification:", e);
    return false;
  }
}

export function exportExpensesToCSV(expenses, filename = "expenses.csv") {
  if (!expenses || expenses.length === 0) return;
  const headers = ["Date", "Title", "Category", "Amount (INR)", "Payment Mode", "Notes"];
  const rows = expenses.map((e) => [
    e.date || "",
    `"${String(e.title || "").replace(/"/g, '""')}"`,
    e.category || "",
    Number(e.amount || 0).toFixed(2),
    e.payment_mode || "UPI",
    `"${String(e.notes || "").replace(/"/g, '""')}"`,
  ]);
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
