import React, { useState } from 'react';
import { Wallet, LogIn, UserPlus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Registration Flow
        await axios.post(`${API}/auth/register`, {
          email,
          password,
          full_name: fullName || null,
        });
        
        toast.success('Registration successful! Logging in...');
        
        // Log in automatically after registration
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const loginRes = await axios.post(`${API}/auth/login`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        localStorage.setItem('token', loginRes.data.access_token);
        onLogin(loginRes.data.access_token);
      } else {
        // Sign In Flow
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const loginRes = await axios.post(`${API}/auth/login`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        localStorage.setItem('token', loginRes.data.access_token);
        onLogin(loginRes.data.access_token);
        toast.success('Logged in successfully!');
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.detail || 'Invalid email or password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ color: '#667eea', marginBottom: '1rem' }}>
            <Wallet size={48} />
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>Money Balancer</h1>
          <p className="page-subtitle" style={{ textAlign: 'center' }}>
            {isRegister ? 'Create an account to get started' : 'Sign in to manage your balances'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                placeholder="e.g. John Doe"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address / Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              placeholder="e.g. shashi789 or shashi@example.com"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem', height: '2.75rem' }}
          >
            {loading ? 'Processing...' : (
              <>
                {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
                <span style={{ marginLeft: '0.5rem' }}>{isRegister ? 'Sign Up' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#718096' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: '#667eea', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: '#667eea', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
