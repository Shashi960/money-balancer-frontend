import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Save, TrendingUp, Lock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Settings() {
  const [formData, setFormData] = useState({
    weekly_limit: '',
    monthly_limit: ''
  });
  const [loading, setLoading] = useState(true);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetchLimit();
  }, []);

  const fetchLimit = async () => {
    try {
      const response = await axios.get(`${API}/limit`);
      setFormData({
        weekly_limit: response.data.weekly_limit || '',
        monthly_limit: response.data.monthly_limit || ''
      });
    } catch (error) {
      console.error('Error fetching limit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/limit`, {
        weekly_limit: parseFloat(formData.weekly_limit) || 0,
        monthly_limit: parseFloat(formData.monthly_limit) || 0
      });
      toast.success('Spending limits updated successfully!');
    } catch (error) {
      console.error('Error updating limit:', error);
      toast.error('Failed to update limits');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      toast.success('Password updated successfully!');
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      const errMsg = error.response?.data?.detail || 'Failed to update password';
      toast.error(errMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container"><h1 className="page-title">Loading...</h1></div>;
  }

  return (
    <div className="page-container" data-testid="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Set your spending limits and preferences</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
          <TrendingUp size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Spending Limits
        </h3>
        
        <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.5' }}>
            Set your weekly and monthly spending limits. You'll receive a <strong>yellow warning</strong> at 80% and a <strong>red alert</strong> at 100%.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="weekly_limit">Weekly Limit (₹)</label>
            <input
              id="weekly_limit"
              type="number"
              step="0.01"
              className="form-input"
              placeholder="Enter weekly limit (e.g., 5000)"
              value={formData.weekly_limit}
              onChange={(e) => setFormData({ ...formData, weekly_limit: e.target.value })}
              data-testid="weekly-limit-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="monthly_limit">Monthly Limit (₹)</label>
            <input
              id="monthly_limit"
              type="number"
              step="0.01"
              className="form-input"
              placeholder="Enter monthly limit (e.g., 20000)"
              value={formData.monthly_limit}
              onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
              data-testid="monthly-limit-input"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} data-testid="save-limits-btn">
            <Save size={20} />
            Save Limits Settings
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto 0 auto' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
          <Lock size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Change Password
        </h3>
        
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="old_password">Current Password</label>
            <input
              id="old_password"
              type="password"
              className="form-input"
              required
              placeholder="Enter current password"
              value={passwordData.old_password}
              onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new_password">New Password</label>
            <input
              id="new_password"
              type="password"
              className="form-input"
              required
              placeholder="Enter new password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              type="password"
              className="form-input"
              required
              placeholder="Confirm new password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={passwordLoading}>
            <Save size={20} />
            {passwordLoading ? 'Saving...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}