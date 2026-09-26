import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Edit, Calculator, Sparkles, RotateCcw, Clipboard, MessageSquarePlus } from "lucide-react";
import {
  getLocalToday,
  getPastDateStr,
  evaluateMathExpression,
  formatINR,
  formatDateDisplay,
  parseSingleBankSms,
} from "@/lib/financeUtils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Healthcare",
  "Education",
  "Other",
];

const QUICK_PRESETS = [
  { label: "☕ Coffee / Tea", title: "Coffee", category: "Food" },
  { label: "🍽️ Meal / Tiffin", title: "Food", category: "Food" },
  { label: "🛵 Rapido / Auto", title: "Rapido", category: "Travel" },
  { label: "🚌 Bus / Metro", title: "Bus", category: "Travel" },
  { label: "🛒 Groceries", title: "Groceries", category: "Shopping" },
  { label: "🥛 Milk / Curd", title: "Milk & Curd", category: "Food" },
  { label: "💊 Medical", title: "Medical", category: "Healthcare" },
  { label: "📱 Bill / Recharge", title: "Recharge", category: "Bills" },
];

export default function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editExpense = location.state?.expense;
  const prefilledDate = searchParams.get("date");
  const sharedText = searchParams.get("shared_text") || searchParams.get("shared_title");

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    date: prefilledDate || getLocalToday(),
    category: "Food",
  });
  const [smsPasteBox, setSmsPasteBox] = useState(false);
  const [smsRaw, setSmsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const applySmsToForm = (rawText) => {
    const parsed = parseSingleBankSms(rawText);
    if (!parsed) {
      toast.error("Could not detect a debit amount in that SMS");
      return false;
    }
    setFormData((prev) => ({
      ...prev,
      title: parsed.title,
      amount: String(parsed.amount),
      category: parsed.category,
    }));
    toast.success(`Auto-filled ₹${formatINR(parsed.amount)} (${parsed.title}) from SMS!`);
    setSmsPasteBox(false);
    setSmsRaw("");
    return true;
  };

  useEffect(() => {
    if (editExpense) {
      setFormData({
        title: editExpense.title,
        amount: String(editExpense.amount),
        date: editExpense.date,
        category: editExpense.category,
      });
    } else if (sharedText) {
      applySmsToForm(sharedText);
    } else if (prefilledDate) {
      setFormData((prev) => ({ ...prev, date: prefilledDate }));
    }
  }, [editExpense, prefilledDate, sharedText]);

  const rawAmountStr = String(formData.amount || "").trim();
  const hasMathOperator = /[+\-*/]/.test(rawAmountStr.replace(/^-/, ""));
  const calculatedAmount = evaluateMathExpression(rawAmountStr);

  // Detect if user typed math in title like "Rapido+Bus(43+28+12)"
  const titleMathMatch = formData.title.match(/\(([0-9+\-*/.\s]+)\)/);
  const titleMathExpr = titleMathMatch ? titleMathMatch[1] : null;
  const titleMathValue =
    titleMathExpr && /[+\-*/]/.test(titleMathExpr)
      ? evaluateMathExpression(titleMathExpr)
      : null;

  const handlePresetClick = (preset) => {
    setFormData((prev) => {
      const currentTitle = prev.title.trim();
      const nextTitle = currentTitle
        ? `${currentTitle} + ${preset.title}`
        : preset.title;
      return {
        ...prev,
        title: nextTitle,
        category: currentTitle ? prev.category : preset.category,
      };
    });
  };

  const saveExpense = async (stayOnPage = false) => {
    const finalAmount =
      calculatedAmount !== null ? calculatedAmount : parseFloat(formData.amount);

    if (!formData.title.trim() || !finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      toast.error("Please enter a valid title and amount");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        amount: finalAmount,
        date: formData.date,
        category: formData.category,
      };

      if (editExpense) {
        await axios.patch(`${API}/expenses/${editExpense.id}`, payload);
        toast.success("Expense updated successfully!");
        navigate("/expenses");
      } else {
        await axios.post(`${API}/expenses`, payload);
        toast.success(`Added ₹${formatINR(finalAmount)} (${payload.title})`);
        if (stayOnPage) {
          setFormData((prev) => ({
            ...prev,
            title: "",
            amount: "",
          }));
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveExpense(false);
  };

  const todayStr = getLocalToday();
  const yesterdayStr = getPastDateStr(1);

  return (
    <div className="page-container" data-testid="add-expense-page">
      <div className="page-header">
        <h1 className="page-title">{editExpense ? "Edit Expense" : "Add Expense"}</h1>
        <p className="page-subtitle">
          {prefilledDate
            ? `Logging expense for ${formatDateDisplay(prefilledDate)}`
            : "Quickly log your daily spending with built-in math calculator"}
        </p>
      </div>

      <div className="card" style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* 1-Tap Bank SMS Auto-Fill */}
        {!editExpense && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              background: "#f5f3ff",
              border: "1px solid #ddd6fe",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#4c1d95",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <MessageSquarePlus size={16} style={{ color: "#667eea" }} />
                Have a Bank / UPI Debit SMS?
              </span>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard && navigator.clipboard.readText) {
                        const txt = await navigator.clipboard.readText();
                        if (txt && txt.trim()) {
                          if (!applySmsToForm(txt)) {
                            setSmsRaw(txt);
                            setSmsPasteBox(true);
                          }
                          return;
                        }
                      }
                      setSmsPasteBox((p) => !p);
                    } catch {
                      setSmsPasteBox(true);
                    }
                  }}
                >
                  <Clipboard size={14} /> Read Copied SMS
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSmsPasteBox((p) => !p)}
                >
                  Paste Manually
                </button>
              </div>
            </div>

            {smsPasteBox && (
              <div style={{ marginTop: "0.75rem" }}>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Paste bank or UPI debit SMS here (e.g. Rs. 250 debited from A/c XX1234 to swiggy@axisbank)..."
                  value={smsRaw}
                  onChange={(e) => setSmsRaw(e.target.value)}
                  style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => applySmsToForm(smsRaw)}
                >
                  Auto-Fill Form from SMS
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Presets */}
        {!editExpense && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Sparkles size={14} style={{ color: "#667eea" }} />
                1-Tap Quick Add (tap multiple to combine)
              </span>
              {formData.title && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, title: "" }))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <RotateCcw size={12} /> Clear title
                </button>
              )}
            </div>
            <div className="preset-chips">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="chip-btn"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Title / Reason *
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="e.g., Rapido + Bus, Coffee, Groceries"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              data-testid="expense-title-input"
            />
            {titleMathValue !== null && String(formData.amount) !== String(titleMathValue) && (
              <div style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="chip-btn"
                  style={{
                    background: "#eef2ff",
                    borderColor: "#c7d2fe",
                    color: "#4338ca",
                    fontWeight: 600,
                  }}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, amount: String(titleMathValue) }))
                  }
                >
                  <Calculator size={14} /> Use calculated amount from title: ₹
                  {formatINR(titleMathValue)}
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label className="form-label" htmlFor="amount" style={{ marginBottom: 0 }}>
                Amount (₹) *
              </label>
              <span style={{ fontSize: "0.75rem", color: "#667eea", fontWeight: 500 }}>
                <Calculator size={13} style={{ display: "inline", marginRight: "4px" }} />
                Tip: You can type sums like <strong>43+28+12</strong>
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#718096",
                  fontSize: "1.2rem",
                  fontWeight: 600,
                }}
              >
                ₹
              </span>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                className="form-input"
                placeholder="0.00 or 43+28+12"
                style={{ paddingLeft: "2.75rem", fontSize: "1.1rem", fontWeight: 600 }}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                onBlur={() => {
                  if (hasMathOperator && calculatedAmount !== null) {
                    setFormData((prev) => ({
                      ...prev,
                      amount: `${ prev.title.includes("(") ? prev.amount : String(calculatedAmount) }`,
                    }));
                  }
                }}
                data-testid="expense-amount-input"
              />
            </div>

            {hasMathOperator && calculatedAmount !== null && (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.85rem",
                  color: "#065f46",
                }}
              >
                <span>
                  Calculated Total: <strong>₹{formatINR(calculatedAmount)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      title:
                        prev.title && !prev.title.includes("(")
                          ? `${prev.title} (${rawAmountStr})`
                          : prev.title,
                      amount: String(calculatedAmount),
                    }))
                  }
                  style={{
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Apply ₹{formatINR(calculatedAmount)}
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label className="form-label" htmlFor="date" style={{ marginBottom: 0 }}>
                Date *
              </label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className={`chip-btn ${formData.date === todayStr ? "active" : ""}`}
                  style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                  onClick={() => setFormData({ ...formData, date: todayStr })}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`chip-btn ${formData.date === yesterdayStr ? "active" : ""}`}
                  style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                  onClick={() => setFormData({ ...formData, date: yesterdayStr })}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              id="date"
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              data-testid="expense-date-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">
              Category *
            </label>
            <div className="preset-chips" style={{ marginBottom: "0.5rem" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`chip-btn ${formData.category === cat ? "active" : ""}`}
                  onClick={() => setFormData({ ...formData, category: cat })}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "1.75rem",
            }}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              data-testid="submit-expense-btn"
              style={{ flex: "1 1 180px", justifyContent: "center" }}
            >
              {editExpense ? (
                <>
                  <Edit size={18} /> Update Expense
                </>
              ) : (
                <>
                  <Plus size={18} /> Save Expense
                </>
              )}
            </button>

            {!editExpense && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => saveExpense(true)}
                style={{
                  flex: "1 1 160px",
                  justifyContent: "center",
                  borderColor: "#667eea",
                  color: "#667eea",
                }}
              >
                <Plus size={18} /> Save & Add Another
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
              data-testid="cancel-expense-btn"
              style={{ justifyContent: "center" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}