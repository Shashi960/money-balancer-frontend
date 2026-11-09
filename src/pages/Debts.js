import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  Check,
  RotateCcw,
  Trash2,
  Edit,
  Search,
  Calculator,
  HandCoins,
  History,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getLocalToday,
  formatINR,
  formatDateDisplay,
  evaluateMathExpression,
} from "@/lib/financeUtils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Debt Modal State
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);

  // Record Repayment Modal State
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    date: getLocalToday(),
    notes: "",
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Payment History / Ledger Modal State
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [activeDebtForHistory, setActiveDebtForHistory] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    reason: "",
    date: getLocalToday(),
    debt_type: "gave",
  });

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const response = await axios.get(`${API}/debts`);
      const data = response.data || [];
      setDebts(data);

      // Keep active history debt in sync if currently open
      if (activeDebtForHistory) {
        const refreshed = data.find((d) => d.id === activeDebtForHistory.id);
        if (refreshed) {
          setActiveDebtForHistory(refreshed);
        }
      }
    } catch (error) {
      console.error("Error fetching debts:", error);
      toast.error("Failed to fetch debts");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingDebt(null);
    setFormData({
      name: "",
      amount: "",
      reason: "",
      date: getLocalToday(),
      debt_type: "gave",
    });
  };

  const openEditModal = (debt) => {
    setEditingDebt(debt);
    setFormData({
      name: debt.name,
      amount: String(debt.amount),
      reason: debt.reason,
      date: debt.date,
      debt_type: debt.debt_type,
    });
    setOpenDialog(true);
  };

  const rawAmountStr = String(formData.amount || "").trim();
  const hasMathOperator = /[+\-*/]/.test(rawAmountStr.replace(/^-/, ""));
  const calculatedAmount = evaluateMathExpression(rawAmountStr);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalAmount =
      calculatedAmount !== null ? calculatedAmount : parseFloat(formData.amount);

    if (!formData.name.trim() || !finalAmount || isNaN(finalAmount) || !formData.reason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        amount: finalAmount,
        reason: formData.reason.trim(),
        date: formData.date,
        debt_type: formData.debt_type,
      };

      if (editingDebt) {
        const targetDebtId = editingDebt.id || editingDebt._id;
        await axios.patch(`${API}/debts/${targetDebtId}`, payload);
        toast.success("Debt entry updated!");
      } else {
        await axios.post(`${API}/debts`, payload);
        toast.success("Debt entry added successfully!");
      }

      setOpenDialog(false);
      resetForm();
      fetchDebts();
    } catch (error) {
      console.error("Error saving debt:", error);
      toast.error(error.response?.data?.detail || "Failed to save debt entry");
    }
  };

  const updateStatus = async (debtId, status) => {
    try {
      await axios.patch(`${API}/debts/${debtId}`, { status });
      toast.success(`Marked as ${status}`);
      fetchDebts();
    } catch (error) {
      console.error("Error updating debt:", error);
      toast.error(error.response?.data?.detail || "Failed to update debt");
    }
  };

  const deleteDebt = async (debtId) => {
    if (!window.confirm("Are you sure you want to delete this debt entry?")) {
      return;
    }

    try {
      await axios.delete(`${API}/debts/${debtId}`);
      toast.success("Debt entry deleted");
      fetchDebts();
    } catch (error) {
      console.error("Error deleting debt:", error);
      toast.error(error.response?.data?.detail || "Failed to delete debt");
    }
  };

  // ----- Payment / Repayment Modal Handlers -----
  const openPaymentModal = (debt) => {
    setActiveDebtForPayment(debt);
    setPaymentFormData({
      amount: "",
      date: getLocalToday(),
      notes: "",
    });
    setOpenPaymentDialog(true);
  };

  const rawPayAmountStr = String(paymentFormData.amount || "").trim();
  const hasPayMathOperator = /[+\-*/]/.test(rawPayAmountStr.replace(/^-/, ""));
  const calculatedPayAmount = evaluateMathExpression(rawPayAmountStr);
  const activePayAmountNum =
    calculatedPayAmount !== null ? calculatedPayAmount : parseFloat(rawPayAmountStr) || 0;

  const activeRemainingBalance = activeDebtForPayment ? Number(activeDebtForPayment.amount) || 0 : 0;
  const previewRemainingBalance = Math.max(
    0,
    Math.round((activeRemainingBalance - activePayAmountNum) * 100) / 100
  );

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!activeDebtForPayment) return;

    if (!activePayAmountNum || activePayAmountNum <= 0 || isNaN(activePayAmountNum)) {
      toast.error("Please enter a valid payment amount greater than 0");
      return;
    }

    if (!paymentFormData.date) {
      toast.error("Please select the payment date");
      return;
    }

    setPaymentSubmitting(true);
    try {
      const response = await axios.post(`${API}/debts/${activeDebtForPayment.id}/payments`, {
        amount: activePayAmountNum,
        date: paymentFormData.date,
        notes: paymentFormData.notes ? paymentFormData.notes.trim() : "",
      });

      const updated = response.data;
      if (updated.status === "paid" || updated.amount <= 0) {
        toast.success(
          `Recorded payment of ₹${formatINR(activePayAmountNum)}. Debt fully settled and marked as Paid!`
        );
      } else {
        toast.success(
          `Payment of ₹${formatINR(activePayAmountNum)} deducted. Remaining balance: ₹${formatINR(
            updated.amount
          )}`
        );
      }

      setOpenPaymentDialog(false);
      fetchDebts();
    } catch (error) {
      console.error("Error recording repayment:", error);
      toast.error(error.response?.data?.detail || "Failed to record payment");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // ----- Payment History Handlers -----
  const openHistoryModal = (debt) => {
    setActiveDebtForHistory(debt);
    setOpenHistoryDialog(true);
  };

  const handleDeletePayment = async (debtId, paymentId) => {
    if (
      !window.confirm(
        "Revert this repayment? The amount will be added back to the outstanding balance."
      )
    ) {
      return;
    }

    try {
      const res = await axios.delete(`${API}/debts/${debtId}/payments/${paymentId}`);
      toast.success("Repayment reverted successfully. Amount restored to balance.");
      setActiveDebtForHistory(res.data);
      fetchDebts();
    } catch (error) {
      console.error("Error deleting repayment:", error);
      toast.error(error.response?.data?.detail || "Failed to revert repayment");
    }
  };

  // Summary calculations (pending)
  const pendingGaveTotal = debts
    .filter((d) => d.debt_type === "gave" && d.status === "pending")
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const pendingOweTotal = debts
    .filter((d) => d.debt_type === "owe" && d.status === "pending")
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const netPosition = pendingGaveTotal - pendingOweTotal;

  const filterDebtList = (list) => {
    return list.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (d.name || "").toLowerCase().includes(q) ||
          (d.reason || "").toLowerCase().includes(q) ||
          String(d.amount || "").includes(q)
        );
      }
      return true;
    });
  };

  const moneyGave = filterDebtList(debts.filter((d) => d.debt_type === "gave"));
  const moneyOwe = filterDebtList(debts.filter((d) => d.debt_type === "owe"));

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Loading...</h1>
      </div>
    );
  }

  const renderDebtTable = (list, type) => {
    if (list.length === 0) {
      return (
        <p style={{ color: "#718096", textAlign: "center", padding: "2rem" }}>
          No matching entries found
        </p>
      );
    }

    return (
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Remaining Amount</th>
              <th>Reason</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((debt) => {
              const payments = debt.payments || [];
              const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
              const originalAmount =
                debt.original_amount !== undefined && debt.original_amount !== null
                  ? Number(debt.original_amount)
                  : Number(debt.amount) + totalPaid;

              return (
                <tr key={debt.id} data-testid={`debt-${type}-${debt.id}`}>
                  <td style={{ fontWeight: 600 }}>{debt.name}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: type === "gave" ? "#10b981" : "#ef4444",
                        }}
                      >
                        ₹{formatINR(debt.amount)}
                      </span>
                      {payments.length > 0 && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>Orig: ₹{formatINR(originalAmount)}</span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => openHistoryModal(debt)}
                            style={{
                              background: "#e0e7ff",
                              color: "#4338ca",
                              border: "none",
                              borderRadius: "6px",
                              padding: "1px 6px",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                            title="Click to view payment timeline"
                          >
                            Paid: ₹{formatINR(totalPaid)} ({payments.length})
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{debt.reason}</td>
                  <td>{formatDateDisplay(debt.date)}</td>
                  <td>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        background: debt.status === "paid" ? "#d1fae5" : "#fef3c7",
                        color: debt.status === "paid" ? "#065f46" : "#92400e",
                      }}
                    >
                      {debt.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      {/* Record Repayment Button (when pending) */}
                      {debt.status === "pending" && (
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "0.4rem 0.65rem",
                            color: "#047857",
                            background: "#ecfdf5",
                            borderColor: "#a7f3d0",
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          onClick={() => openPaymentModal(debt)}
                          title={
                            type === "gave"
                              ? "Record money paid back (deduct from balance)"
                              : "Record repayment made (deduct from balance)"
                          }
                          data-testid={`pay-debt-${debt.id}`}
                        >
                          <HandCoins size={14} />
                          <span>- Pay</span>
                        </button>
                      )}

                      {/* Mark Paid / Reopen Status */}
                      {debt.status === "pending" ? (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.45rem 0.6rem", color: "#10b981" }}
                          onClick={() => updateStatus(debt.id, "paid")}
                          title="Mark as Fully Paid"
                          data-testid={`mark-paid-${debt.id}`}
                        >
                          <Check size={15} />
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.45rem 0.6rem", color: "#d97706" }}
                          onClick={() => updateStatus(debt.id, "pending")}
                          title="Reopen as Pending"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}

                      {/* Payment History View Button */}
                      {payments.length > 0 && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.45rem 0.6rem", color: "#4f46e5" }}
                          onClick={() => openHistoryModal(debt)}
                          title="View Payment History Ledger"
                          data-testid={`history-debt-${debt.id}`}
                        >
                          <History size={15} />
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.45rem 0.6rem" }}
                        onClick={() => openEditModal(debt)}
                        title="Edit Entry"
                      >
                        <Edit size={15} />
                      </button>

                      {/* Delete Button */}
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.45rem 0.6rem", color: "#ef4444" }}
                        onClick={() => deleteDebt(debt.id)}
                        title="Delete Entry"
                        data-testid={`delete-debt-${debt.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-container" data-testid="debts-page">
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
          <h1 className="page-title">Debts Tracker</h1>
          <p className="page-subtitle">
            Manage money you've lent or borrowed with partial payment tracking & ledger
          </p>
        </div>

        {/* Add Entry Button and Modal */}
        <Dialog
          open={openDialog}
          onOpenChange={(open) => {
            setOpenDialog(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="btn btn-primary"
              data-testid="add-debt-btn"
              onClick={() => resetForm()}
            >
              <Plus size={20} />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDebt ? "Edit Debt Entry" : "Add Debt Entry"}
              </DialogTitle>
              <DialogDescription>
                {editingDebt
                  ? "Update name, remaining amount, reason, or date"
                  : "Add a new money lent or borrowed entry"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select
                  className="form-select"
                  value={formData.debt_type}
                  onChange={(e) =>
                    setFormData({ ...formData, debt_type: e.target.value })
                  }
                  data-testid="debt-type-select"
                >
                  <option value="gave">Money I Gave (They owe me)</option>
                  <option value="owe">Money I Owe (I need to pay)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Person's name (e.g. Vidyadhar)"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  data-testid="debt-name-input"
                />
              </div>

              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.35rem",
                  }}
                >
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Amount (₹) *
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "#667eea" }}>
                    <Calculator size={12} style={{ display: "inline", marginRight: "3px" }} />
                    Supports math (e.g., 10000-500)
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  data-testid="debt-amount-input"
                />
                {hasMathOperator && calculatedAmount !== null && (
                  <div
                    style={{
                      marginTop: "0.35rem",
                      fontSize: "0.8rem",
                      color: "#059669",
                      fontWeight: 600,
                    }}
                  >
                    = ₹{formatINR(calculatedAmount)}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Reason *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What was it for? (e.g., Laptop, Urgent)"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  data-testid="debt-reason-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  data-testid="debt-date-input"
                />
              </div>

              <Button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                data-testid="submit-debt-btn"
              >
                {editingDebt ? "Save Changes" : "Add Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Record Repayment Modal */}
      <Dialog
        open={openPaymentDialog}
        onOpenChange={(open) => {
          setOpenPaymentDialog(open);
          if (!open) setActiveDebtForPayment(null);
        }}
      >
        <DialogContent style={{ maxWidth: "460px" }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <HandCoins size={22} style={{ color: "#059669" }} />
              <span>
                {activeDebtForPayment?.debt_type === "gave"
                  ? `Record Payment from ${activeDebtForPayment?.name}`
                  : `Record Payment to ${activeDebtForPayment?.name}`}
              </span>
            </DialogTitle>
            <DialogDescription>
              {activeDebtForPayment?.debt_type === "gave"
                ? "Enter the amount received to minus it from the remaining balance."
                : "Enter the amount paid to deduct it from what you owe."}
            </DialogDescription>
          </DialogHeader>

          {activeDebtForPayment && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.85rem 1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                  color: "#64748b",
                  marginBottom: "0.35rem",
                }}
              >
                <span>Original Reason:</span>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {activeDebtForPayment.reason}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.4rem",
                  borderTop: "1px dashed #cbd5e1",
                }}
              >
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>
                  Current Outstanding:
                </span>
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: activeDebtForPayment.debt_type === "gave" ? "#059669" : "#dc2626",
                  }}
                >
                  ₹{formatINR(activeDebtForPayment.amount)}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handlePaymentSubmit}>
            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.35rem",
                }}
              >
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Amount Given / Paid (₹) *
                </label>
                <span style={{ fontSize: "0.75rem", color: "#667eea" }}>
                  <Calculator size={12} style={{ display: "inline", marginRight: "3px" }} />
                  Supports math
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                placeholder="e.g. 500"
                value={paymentFormData.amount}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, amount: e.target.value })
                }
                autoFocus
                required
              />

              {/* Quick shortcut chips */}
              {activeDebtForPayment && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    flexWrap: "wrap",
                    marginTop: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    className="chip-btn"
                    style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
                    onClick={() =>
                      setPaymentFormData({
                        ...paymentFormData,
                        amount: String(activeDebtForPayment.amount),
                      })
                    }
                  >
                    Full (₹{formatINR(activeDebtForPayment.amount)})
                  </button>
                  {activeDebtForPayment.amount > 200 && (
                    <button
                      type="button"
                      className="chip-btn"
                      style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
                      onClick={() =>
                        setPaymentFormData({
                          ...paymentFormData,
                          amount: String(Math.round(activeDebtForPayment.amount / 2)),
                        })
                      }
                    >
                      Half (₹{formatINR(Math.round(activeDebtForPayment.amount / 2))})
                    </button>
                  )}
                  {activeDebtForPayment.amount >= 500 && (
                    <button
                      type="button"
                      className="chip-btn"
                      style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
                      onClick={() =>
                        setPaymentFormData({ ...paymentFormData, amount: "500" })
                      }
                    >
                      ₹500
                    </button>
                  )}
                  {activeDebtForPayment.amount >= 1000 && (
                    <button
                      type="button"
                      className="chip-btn"
                      style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
                      onClick={() =>
                        setPaymentFormData({ ...paymentFormData, amount: "1000" })
                      }
                    >
                      ₹1,000
                    </button>
                  )}
                </div>
              )}

              {/* Calculation Preview Banner */}
              {activePayAmountNum > 0 && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: previewRemainingBalance === 0 ? "#ecfdf5" : "#f0fdf4",
                    border: `1px solid ${
                      previewRemainingBalance === 0 ? "#a7f3d0" : "#bbf7d0"
                    }`,
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#166534",
                      fontWeight: 600,
                    }}
                  >
                    <span>Remaining after payment:</span>
                    <span>₹{formatINR(previewRemainingBalance)}</span>
                  </div>
                  {previewRemainingBalance === 0 && (
                    <div
                      style={{
                        marginTop: "0.3rem",
                        fontSize: "0.78rem",
                        color: "#047857",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={14} />
                      <span>This payment will fully clear the debt & mark it Paid!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-input"
                value={paymentFormData.date}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, date: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Notes / Mode (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. GPay, Cash, UPI, Part payment"
                value={paymentFormData.notes}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                }
              />
            </div>

            <Button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "0.5rem" }}
              disabled={paymentSubmitting}
            >
              {paymentSubmitting ? "Saving..." : "Deduct & Save Payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History / Ledger Modal */}
      <Dialog
        open={openHistoryDialog}
        onOpenChange={(open) => {
          setOpenHistoryDialog(open);
          if (!open) setActiveDebtForHistory(null);
        }}
      >
        <DialogContent style={{ maxWidth: "520px" }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <History size={20} style={{ color: "#4f46e5" }} />
              <span>Payment History — {activeDebtForHistory?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Complete repayment log and remaining balance calculation
            </DialogDescription>
          </DialogHeader>

          {activeDebtForHistory && (
            <div>
              {/* Summary Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "0.6rem",
                  background: "#f8fafc",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "1rem",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Original Loan</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#334155" }}>
                    ₹
                    {formatINR(
                      activeDebtForHistory.original_amount !== undefined &&
                        activeDebtForHistory.original_amount !== null
                        ? activeDebtForHistory.original_amount
                        : Number(activeDebtForHistory.amount) +
                            (activeDebtForHistory.payments || []).reduce(
                              (s, p) => s + (Number(p.amount) || 0),
                              0
                            )
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Total Repaid</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#059669" }}>
                    ₹
                    {formatINR(
                      (activeDebtForHistory.payments || []).reduce(
                        (s, p) => s + (Number(p.amount) || 0),
                        0
                      )
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Balance Left</div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color:
                        activeDebtForHistory.debt_type === "gave" ? "#10b981" : "#ef4444",
                    }}
                  >
                    ₹{formatINR(activeDebtForHistory.amount)}
                  </div>
                </div>
              </div>

              {/* Payments Timeline / List */}
              <div style={{ maxHeight: "280px", overflowY: "auto", marginBottom: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {/* Initial Debt Event */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.6rem 0.8rem",
                      background: "#f1f5f9",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#334155" }}>
                        Initial Debt Created ({activeDebtForHistory.reason})
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {formatDateDisplay(activeDebtForHistory.date)}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: "#475569" }}>
                      +₹
                      {formatINR(
                        activeDebtForHistory.original_amount !== undefined &&
                          activeDebtForHistory.original_amount !== null
                          ? activeDebtForHistory.original_amount
                          : Number(activeDebtForHistory.amount) +
                              (activeDebtForHistory.payments || []).reduce(
                                (s, p) => s + (Number(p.amount) || 0),
                                0
                              )
                      )}
                    </span>
                  </div>

                  {/* Payment entries */}
                  {(activeDebtForHistory.payments || []).length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: "1rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      No partial repayments recorded yet. Use the "- Pay" button to deduct an amount.
                    </p>
                  ) : (
                    activeDebtForHistory.payments.map((payment, idx) => (
                      <div
                        key={payment.id || idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.6rem 0.8rem",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#059669",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <span>Payment #{idx + 1}</span>
                            {payment.notes && (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 500,
                                  color: "#64748b",
                                  background: "#f1f5f9",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {payment.notes}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {formatDateDisplay(payment.date)}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontWeight: 700, color: "#059669", fontSize: "0.9rem" }}>
                            -₹{formatINR(payment.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeletePayment(activeDebtForHistory.id, payment.id)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "3px",
                            }}
                            title="Undo / Delete this repayment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer action */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                {activeDebtForHistory.status === "pending" && (
                  <Button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setOpenHistoryDialog(false);
                      openPaymentModal(activeDebtForHistory);
                    }}
                  >
                    <HandCoins size={16} />
                    Record Another Payment
                  </Button>
                )}
                <Button
                  className="btn btn-secondary"
                  onClick={() => setOpenHistoryDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="card">
          <span className="card-title">People Owe Me (Pending)</span>
          <div className="stat-value" style={{ color: "#10b981", marginTop: "0.35rem" }}>
            ₹{formatINR(pendingGaveTotal)}
          </div>
        </div>
        <div className="card">
          <span className="card-title">I Owe Others (Pending)</span>
          <div className="stat-value" style={{ color: "#ef4444", marginTop: "0.35rem" }}>
            ₹{formatINR(pendingOweTotal)}
          </div>
        </div>
        <div className="card">
          <span className="card-title">Net Balance</span>
          <div
            className="stat-value"
            style={{
              color: netPosition >= 0 ? "#10b981" : "#ef4444",
              marginTop: "0.35rem",
            }}
          >
            {netPosition >= 0 ? "+" : "-"}₹{formatINR(Math.abs(netPosition))}
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="filter-toolbar">
        <div className="filter-row">
          <div style={{ position: "relative", flex: "1 1 220px" }}>
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
              placeholder="Search person name, reason, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "0.55rem 0.75rem 0.55rem 2.25rem" }}
            />
          </div>
          <div className="preset-chips">
            {[
              { id: "all", label: "All Entries" },
              { id: "pending", label: "Pending Only" },
              { id: "paid", label: "Paid / Settled" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`chip-btn ${statusFilter === tab.id ? "active" : ""}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Money I Gave Section */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.35rem",
            fontWeight: 600,
            marginBottom: "0.85rem",
            color: "#2d3748",
          }}
          data-testid="money-gave-section"
        >
          💸 Money I Gave (People owe me) ({moneyGave.length})
        </h2>
        <div className="card">{renderDebtTable(moneyGave, "gave")}</div>
      </div>

      {/* Money I Owe Section */}
      <div style={{ marginTop: "2rem" }}>
        <h2
          style={{
            fontSize: "1.35rem",
            fontWeight: 600,
            marginBottom: "0.85rem",
            color: "#2d3748",
          }}
          data-testid="money-owe-section"
        >
          🤝 Money I Owe (I need to pay) ({moneyOwe.length})
        </h2>
        <div className="card">{renderDebtTable(moneyOwe, "owe")}</div>
      </div>
    </div>
  );
}
