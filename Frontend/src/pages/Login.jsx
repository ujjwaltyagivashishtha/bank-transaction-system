import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Landmark, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/common/Spinner';

export default function Login() {
  const { login, loading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.email.trim() || !formData.password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    const res = await login(formData);
    if (res.success) {
      showSuccess(`Welcome back, ${res.data?.user?.name || 'User'}!`);
      navigate('/dashboard');
    } else {
      setErrorMsg(res.error);
      showError(res.error);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="auth-brand-badge">
            <Landmark size={18} color="var(--accent-primary)" />
            <span>TRANSACT BANK</span>
          </div>
          <div className="sidebar-mac-dots" style={{ marginBottom: 0 }}>
            <span className="mac-dot red" />
            <span className="mac-dot yellow" />
            <span className="mac-dot green" />
          </div>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Sign in to your account</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Access your secure double-entry banking ledger and accounts.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--accent-red-bg)',
              color: 'var(--accent-red)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              border: '1px solid var(--accent-red-border)',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div className="form-input-container">
              <span className="form-input-prefix">
                <Mail size={16} />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input has-prefix"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="form-label">
              <label htmlFor="password">Password</label>
            </div>
            <div className="form-input-container">
              <span className="form-input-prefix">
                <Lock size={16} />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-prefix"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="form-input-action"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: '6px' }}
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <Spinner size={18} color="#FFFFFF" />
                Signing in...
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer-text">
          Don't have an account yet?{' '}
          <Link to="/register" className="auth-footer-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
