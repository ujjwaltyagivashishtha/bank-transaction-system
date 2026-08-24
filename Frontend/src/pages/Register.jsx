import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, AlertCircle, ShieldCheck, Zap, Landmark, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/common/Spinner';

export default function Register() {
  const { register, loading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    if (!formData.name.trim()) { setErrorMsg('Full name is required.'); return; }
    if (!formData.email.trim()) { setErrorMsg('Email address is required.'); return; }
    if (formData.password.length < 6) { setErrorMsg('Password must be at least 6 characters long.'); return; }
    if (formData.password !== formData.confirmPassword) { setErrorMsg('Passwords do not match.'); return; }

    const res = await register({ name: formData.name.trim(), email: formData.email.trim(), password: formData.password });
    if (res.success) {
      showSuccess(`Account registered! Welcome to TRANSACT, ${res.data?.user?.name || ''}!`);
      navigate('/dashboard');
    } else {
      setErrorMsg(res.error);
      showError(res.error);
    }
  };

  const pwStrength = formData.password.length === 0 ? null : formData.password.length < 6 ? 'weak' : formData.password.length < 10 ? 'medium' : 'strong';

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
            Your digital<br />ledger awaits.
          </h1>
          <p className="auth-left-sub">
            Create your account in seconds. Open accounts, transfer funds, and track every transaction with precision.
          </p>

          <div className="auth-feature-pills">
            {[
              { icon: <CheckCircle2 size={16} />, color: '#10B981', bg: 'rgba(16,185,129,0.12)', text: 'Instant account creation' },
              { icon: <Zap size={16} />, color: '#6366F1', bg: 'rgba(99,102,241,0.12)', text: 'Real-time fund transfers' },
              { icon: <ShieldCheck size={16} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', text: 'JWT-secured authentication' },
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
          <span>Secure registration · No credit card required</span>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">Create account</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Start managing immutable accounts and transactions.
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
              <label className="form-label" htmlFor="name">Full Legal Name</label>
              <div className="form-input-container">
                <span className="form-input-prefix"><User size={15} /></span>
                <input
                  id="name" name="name" type="text"
                  className="form-input has-prefix"
                  placeholder="John Doe"
                  value={formData.name} onChange={handleChange}
                  autoComplete="name" required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="form-input-container">
                <span className="form-input-prefix"><Mail size={15} /></span>
                <input
                  id="email" name="email" type="email"
                  className="form-input has-prefix"
                  placeholder="name@example.com"
                  value={formData.email} onChange={handleChange}
                  autoComplete="email" required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <span>Password</span>
                {pwStrength && (
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: pwStrength === 'strong' ? 'var(--accent-green-light)' : pwStrength === 'medium' ? 'var(--accent-amber)' : 'var(--accent-red-light)',
                  }}>
                    {pwStrength.toUpperCase()}
                  </span>
                )}
              </label>
              <div className="form-input-container">
                <span className="form-input-prefix"><Lock size={15} /></span>
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-prefix"
                  placeholder="Min. 6 characters"
                  value={formData.password} onChange={handleChange}
                  autoComplete="new-password" required
                />
                <button type="button" className="form-input-action"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="form-input-container">
                <span className="form-input-prefix"><Lock size={15} /></span>
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-prefix"
                  placeholder="Repeat password"
                  value={formData.confirmPassword} onChange={handleChange}
                  autoComplete="new-password" required
                />
                {formData.confirmPassword && (
                  <span className="form-input-action" style={{
                    color: formData.password === formData.confirmPassword ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                    pointerEvents: 'none',
                  }}>
                    <CheckCircle2 size={15} />
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              style={{ marginTop: '4px' }}
              id="register-submit-btn"
            >
              {loading ? (
                <>
                  <Spinner size={18} color="#FFFFFF" />
                  Creating account...
                </>
              ) : (
                <>
                  <span>Create Bank Profile</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="auth-footer-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
