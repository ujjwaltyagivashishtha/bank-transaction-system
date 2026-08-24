import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Zap, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/common/Spinner';

export default function Login() {
  const { login, loading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
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
      {/* ── Left Branding Panel ── */}
      <div className="auth-left-panel">
        <div className="auth-left-grid" />

        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Landmark size={22} />
          </div>
          <span className="auth-brand-name">TRANSACT</span>
        </div>

        <div className="auth-left-content">
          <h1 className="auth-left-headline">
            Banking at the<br />speed of thought.
          </h1>
          <p className="auth-left-sub">
            Immutable double-entry ledger. Real-time balances. Enterprise-grade security built for the modern era.
          </p>

          <div className="auth-feature-pills">
            {[
              { icon: <ShieldCheck size={16} />, color: '#10B981', bg: 'rgba(16,185,129,0.12)', text: 'End-to-end encrypted transactions' },
              { icon: <Zap size={16} />, color: '#6366F1', bg: 'rgba(99,102,241,0.12)', text: 'Real-time balance aggregations' },
              { icon: <Landmark size={16} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', text: 'Immutable audit ledger trail' },
            ].map(({ icon, color, bg, text }) => (
              <div className="auth-feature-pill" key={text}>
                <div className="auth-feature-pill-icon" style={{ background: bg, color }}>
                  {icon}
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-left-footer">
          <ShieldCheck size={13} />
          <span>256-bit AES encrypted · ACID-compliant ledger</span>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">Welcome back</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Sign in to access your secure banking dashboard.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--accent-red-bg)',
                color: 'var(--accent-red-light)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.83rem',
                border: '1px solid var(--accent-red-border)',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="form-input-container">
                <span className="form-input-prefix">
                  <Mail size={15} />
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
              <label className="form-label" htmlFor="password">Password</label>
              <div className="form-input-container">
                <span className="form-input-prefix">
                  <Lock size={15} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-prefix"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="form-input-action"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              style={{ marginTop: '4px' }}
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

          <div className="auth-footer-text">
            Don't have an account?{' '}
            <Link to="/register" className="auth-footer-link">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
