import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Landmark, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
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

    // Validations
    if (!formData.name.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const res = await register({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
    });

    if (res.success) {
      showSuccess(`Account registered! Welcome to TRANSACT, ${res.data?.user?.name || ''}`);
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
          <h1 className="auth-title">Create your account</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Start managing immutable accounts and transactions securely.
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
            <label className="form-label" htmlFor="name">
              Full Legal Name
            </label>
            <div className="form-input-container">
              <span className="form-input-prefix">
                <User size={16} />
              </span>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input has-prefix"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>
          </div>

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
            <label className="form-label" htmlFor="password">
              Password (min 6 characters)
            </label>
            <div className="form-input-container">
              <span className="form-input-prefix">
                <Lock size={16} />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-prefix"
                placeholder="Choose password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
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

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="form-input-container">
              <span className="form-input-prefix">
                <Lock size={16} />
              </span>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-prefix"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: '6px' }}
            id="register-submit-btn"
          >
            {loading ? (
              <>
                <Spinner size={18} color="#FFFFFF" />
                Registering account...
              </>
            ) : (
              <>
                <span>Create Bank Profile</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-footer-link">
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
