import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  History,
  ShieldCheck,
  Settings,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function IconRail() {
  const location = useLocation();
  const { isSystemUser } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/accounts', icon: Wallet, label: 'My Accounts' },
    { to: '/transfer', icon: ArrowRightLeft, label: 'Transfer Funds' },
    { to: '/activity', icon: History, label: 'Activity' },
  ];

  if (isSystemUser) {
    navItems.push({ to: '/system-funding', icon: Sparkles, label: 'System Initial Funding' });
  }

  return (
    <aside className="rail-container" aria-label="Quick Navigation Rail">
      {/* Upper Charcoal Panel */}
      <div className="rail-upper">
        <NavLink to="/dashboard" className="rail-logo-btn" title="Ledger Bank Transact">
          <Landmark size={20} />
        </NavLink>

        <div className="rail-divider" />

        <div className="rail-nav-group">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`rail-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
              </NavLink>
            );
          })}
        </div>

        {/* Subtle vertical text matching reference */}
        <span className="rail-vertical-label">TRANSACT 2025 NAV</span>
      </div>

      {/* Lower Settings Pod */}
      <div className="rail-lower">
        <NavLink
          to="/settings"
          className={`rail-settings-pod ${location.pathname === '/settings' ? 'active' : ''}`}
          title="Settings & Profile"
        >
          <Settings size={18} strokeWidth={1.8} />
        </NavLink>
      </div>
    </aside>
  );
}
