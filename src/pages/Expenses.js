import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Edit, Trash2, Filter } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Expenses() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [useDateRange, setUseDateRange] = useState(false);

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line
  }, [filter]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = `${API}/expenses`;

      if (useDateRange && fromDate && toDate) {
        url += `?from_date=${fromDate}&to_date=${toDate}`;
      } else {
        url += `?filter=${filter}`;
      }

      const res = await axios.get(url);
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Confirm delete?")) return;
    await axios.delete(`${API}/expenses/${id}`);
    fetchExpenses();
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) return <h2>Loading...</h2>;

  return (
    <div>
      <h2>Expenses</h2>

      {/* FILTER BAR */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Filter size={18} />

        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setUseDateRange(false);
            setFromDate("");
            setToDate("");
          }}
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setUseDateRange(true);
          }}
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setUseDateRange(true);
          }}
        />

        <button
          disabled={!fromDate || !toDate}
          onClick={fetchExpenses}
        >
          Apply
        </button>
      </div>

      <h3>Total: ₹{total.toFixed(2)}</h3>

      {expenses.length === 0 ? (
        <p>No expenses</p>
      ) : (
        <table>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>₹{e.amount}</td>
                <td>{e.category}</td>
                <td>{e.date}</td>
                <td>
                  <Edit
                    size={16}
                    onClick={() =>
                      navigate("/add-expense", { state: { expense: e } })
                    }
                  />
                  <Trash2
                    size={16}
                    onClick={() => deleteExpense(e.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
