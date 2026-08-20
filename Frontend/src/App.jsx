import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { ActivityProvider } from './context/ActivityContext';
import { ToastProvider } from './context/ToastContext';

// Layout & Protected Route
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transfer from './pages/Transfer';
import Activity from './pages/Activity';
import SystemFunding from './pages/SystemFunding';
import Settings from './pages/Settings';

import Spinner from './components/common/Spinner';

// Public Route Guard (redirects already authenticated users to dashboard)
function PublicRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Spinner size={32} color="var(--text-primary)" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AccountProvider>
          <ActivityProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Auth Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  }
                />

                {/* Protected Banking App Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/transfer" element={<Transfer />} />
                    <Route path="/activity" element={<Activity />} />
                    <Route path="/system-funding" element={<SystemFunding />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Root & Fallback Redirection */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </ActivityProvider>
        </AccountProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
