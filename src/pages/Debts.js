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
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);

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
      setDebts(response.data || []);
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
        await axios.patch(`${API}/debts/${editingDebt.id}`, payload);
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
      toast.error("Failed to save debt entry");
    }
  };

  const updateStatus = async (debtId, status) => {
    try {
      await axios.patch(`${API}/debts/${debtId}`, { status });
      toast.success(`Marked as ${status}`);
      fetchDebts();
    } catch (error) {
      console.error("Error updating debt:", error);
      toast.error("Failed to update debt");
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
      toast.error("Failed to delete debt");
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
              <th>Amount</th>
              <th>Reason</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((debt) => (
              <tr key={debt.id} data-testid={`debt-${type}-${debt.id}`}>
                <td style={{ fontWeight: 600 }}>{debt.name}</td>
                <td
                  style={{
                    fontWeight: 700,
                    color: type === "gave" ? "#10b981" : "#ef4444",
                  }}
                >
                  ₹{formatINR(debt.amount)}
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
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {debt.status === "pending" ? (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.45rem 0.6rem", color: "#10b981" }}
                        onClick={() => updateStatus(debt.id, "paid")}
                        title="Mark as Paid"
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

                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.45rem 0.6rem" }}
                      onClick={() => openEditModal(debt)}
                      title="Edit / Partial Payment"
                    >
                      <Edit size={15} />
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.45rem 0.6rem", color: "#ef4444" }}
                      onClick={() => deleteDebt(debt.id)}
                      title="Delete"
                      data-testid={`delete-debt-${debt.id}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
            Manage money you've lent or borrowed (supports partial payment edits)
          </p>
        </div>
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
                  ? "Update amount (e.g., type 1600-500 for partial payment), reason, or person"
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
                  placeholder="Person's name"
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
                    Supports math (e.g., 1600-500)
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  placeholder="0.00 or 1600-500"
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
                  placeholder="What was it for?"
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