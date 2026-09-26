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
  const str = String(rawInput).replace(/\s+/g, "");
  if (!str) return null;

  // Plain number check
  if (/^\d+(\.\d+)?$/.test(str)) {
    return parseFloat(str);
  }

  // Only allow digits, decimal points, +, -, *, /
  if (!/^[\d+\-*/.]+$/.test(str)) {
    return null;
  }

  if (!/[+\-*/]/.test(str) || /[+\-*/.]$/.test(str)) {
    return null;
  }

  try {
    // Tokenize numbers and operators (+, -, *, /)
    const tokens = str.match(/(\d+(?:\.\d+)?|[+\-*/])/g);
    if (!tokens || tokens.join("") !== str) return null;

    // First pass: handle * and /
    const addSubStack = [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === "*" || token === "/") {
        const prev = Number(addSubStack.pop());
        const next = Number(tokens[i + 1]);
        if (isNaN(prev) || isNaN(next) || (token === "/" && next === 0)) return null;
        addSubStack.push(token === "*" ? prev * next : prev / next);
        i += 2;
      } else {
        addSubStack.push(token);
        i += 1;
      }
    }

    // Second pass: handle + and -
    let total = Number(addSubStack[0]);
    if (isNaN(total)) return null;
    for (let j = 1; j < addSubStack.length; j += 2) {
      const op = addSubStack[j];
      const val = Number(addSubStack[j + 1]);
      if (isNaN(val)) return null;
      if (op === "+") total += val;
      else if (op === "-") total -= val;
      else return null;
    }

    if (Number.isFinite(total) && total >= 0) {
      return Math.round(total * 100) / 100;
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

// ---------- Indian Bank / UPI SMS Debit Parser ----------
const CATEGORY_KEYWORDS = {
  Food: [
    "swiggy",
    "zomato",
    "food",
    "restaurant",
    "cafe",
    "coffee",
    "tea",
    "bakery",
    "hotel",
    "domino",
    "kfc",
    "mcdonald",
    "blinkit",
    "zepto",
    "bigbasket",
    "eatsure",
    "tiffin",
    "mess",
    "canteen",
    "milk",
  ],
  Travel: [
    "rapido",
    "uber",
    "ola",
    "irctc",
    "redbus",
    "bus",
    "metro",
    "bmtc",
    "petrol",
    "fuel",
    "hpcl",
    "bpcl",
    "iocl",
    "shell",
    "fastag",
    "toll",
    "auto",
    "cab",
    "train",
    "flight",
  ],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "ajio",
    "meesho",
    "dmart",
    "reliance",
    "zudio",
    "decathlon",
    "mall",
    "store",
    "mart",
    "supermarket",
    "grocer",
  ],
  Bills: [
    "jio",
    "airtel",
    "vodafone",
    "bsnl",
    "bescom",
    "electricity",
    "water",
    "gas",
    "broadband",
    "wifi",
    "recharge",
    "billdesk",
    "act fibernet",
    "tataplay",
    "bill",
  ],
  Entertainment: [
    "netflix",
    "spotify",
    "hotstar",
    "prime",
    "bookmyshow",
    "pvr",
    "inox",
    "youtube",
    "movie",
    "game",
  ],
  Healthcare: [
    "apollo",
    "medplus",
    "pharmacy",
    "hospital",
    "clinic",
    "doctor",
    "1mg",
    "pharmeasy",
    "medical",
    "health",
    "lab",
    "medicine",
  ],
  Education: [
    "udemy",
    "coursera",
    "college",
    "school",
    "fees",
    "book",
    "course",
    "tuition",
    "exam",
  ],
};

export function parseSingleBankSms(rawText) {
  if (!rawText || !String(rawText).trim()) return null;
  const text = String(rawText).trim();
  const lower = text.toLowerCase();

  // Ignore pure OTP messages
  if (
    (lower.includes("otp") || lower.includes("verification code")) &&
    !["debited", "spent", "paid", "deducted", "sent"].some((w) => lower.includes(w))
  ) {
    return null;
  }

  // Extract amount: Rs. 450.00, INR 1,250.50, ₹85, debited by 210.00
  const amountPatterns = [
    /(?:rs\.?|inr|₹|amt)\s*[:\-]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /debited\s+(?:by|with|for)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /spent\s+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /paid\s+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /sent\s+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  let amount = null;
  for (const pat of amountPatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0) {
        amount = Math.round(val * 100) / 100;
        break;
      }
    }
  }

  if (!amount) return null;

  // Extract payee / merchant
  let payee = null;
  const payeePatterns = [
    /(?:to\s+vpa|paid\s+to|sent\s+to|trf\s+to|towards|to|at)\s+([A-Za-z0-9_.\-@ &]{2,35}?)(?:\s+on\b|\s+ref\b|\s+upi\b|\s+via\b|\s+avl\b|\s+bal\b|\.|,|$)/i,
    /upi[\/\-][0-9]+[\/\-]([A-Za-z0-9_.\- ]{2,30}?)(?:[\/\-]|\.|\s|$)/i,
    /info\s*:\s*([A-Za-z0-9_.\-\/ ]{3,35}?)(?:\.|,|$)/i,
  ];

  for (const pat of payeePatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      let candidate = m[1].replace(/^[ .,\-:/]+|[ .,\-:/]+$/g, "");
      const cl = candidate.toLowerCase();
      if (
        candidate &&
        !cl.startsWith("a/c") &&
        !cl.startsWith("ac ") &&
        !cl.startsWith("account") &&
        !cl.startsWith("xx") &&
        !cl.startsWith("card")
      ) {
        if (candidate.includes("@")) {
          candidate = candidate.split("@")[0];
        }
        candidate = candidate.replace(/\s+/g, " ").trim();
        if (candidate.length >= 2) {
          payee = candidate
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
          break;
        }
      }
    }
  }

  if (!payee) {
    payee = "UPI / Bank Debit";
  }

  // Detect category
  const combined = `${payee} ${text}`.toLowerCase();
  let category = "Other";
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => combined.includes(w))) {
      category = cat;
      break;
    }
  }

  return {
    id: `local_sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: payee,
    amount,
    category,
    date: getLocalToday(),
    raw_text: text.slice(0, 400),
    source: "local",
  };
}

export function parseBankSmsBatch(rawInput) {
  if (!rawInput || !String(rawInput).trim()) return [];
  // Split multiple SMS messages separated by blank lines or common bank prefixes
  const chunks = String(rawInput)
    .split(/\n\s*\n|\r?\n(?=(?:Dear|Rs\.|INR|₹|Your\s+A\/c|Acct|A\/c|Sent\s+Rs|Paid\s+Rs|Debited))/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const results = [];
  for (const chunk of chunks) {
    const parsed = parseSingleBankSms(chunk);
    if (parsed) results.push(parsed);
  }
  if (results.length === 0) {
    const single = parseSingleBankSms(rawInput);
    if (single) results.push(single);
  }
  return results;
}

const LOCAL_SMS_KEY = "mb_local_pending_sms";

export function getLocalPendingSms() {
  try {
    const raw = localStorage.getItem(LOCAL_SMS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function addLocalPendingSms(items) {
  const existing = getLocalPendingSms();
  const list = Array.isArray(items) ? items : [items];
  const updated = [...list, ...existing].slice(0, 50);
  localStorage.setItem(LOCAL_SMS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("mb-sms-updated"));
  return updated;
}

export function removeLocalPendingSms(id) {
  const existing = getLocalPendingSms();
  const updated = existing.filter((item) => item.id !== id);
  localStorage.setItem(LOCAL_SMS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("mb-sms-updated"));
  return updated;
}

