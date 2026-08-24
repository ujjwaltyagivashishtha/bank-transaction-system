import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  History,
  Settings,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function IconRail() {
  const location = useLocation();
  const { isSystemUser } = useAuth();

  const navItems = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/accounts',   icon: Wallet,           label: 'My Accounts' },
    { to: '/transfer',   icon: ArrowRightLeft,   label: 'Transfer Funds' },
    { to: '/activity',   icon: History,          label: 'Activity Log' },
  ];

  if (isSystemUser) {
    navItems.push({ to: '/system-funding', icon: Sparkles, label: 'System Funding' });
  }

  return (
    <aside className="rail-container" aria-label="Quick Navigation Rail">
      {/* Upper Nav Panel */}
      <div className="rail-upper">
        {/* Logo Mark */}
        <NavLink to="/dashboard" className="rail-logo-btn" title="TRANSACT Banking">
          <Landmark size={20} strokeWidth={2} />
        </NavLink>

        <div className="rail-divider" />

        {/* Nav Items */}
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
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.75} />
              </NavLink>
            );
          })}
        </div>

        <span className="rail-vertical-label">TRANSACT · 2025</span>
      </div>

      {/* Lower Settings Pod */}
      <div className="rail-lower">
        <NavLink
          to="/settings"
          className={`rail-settings-pod ${location.pathname === '/settings' ? 'active' : ''}`}
          title="Settings & Profile"
        >
          <Settings size={17} strokeWidth={1.8} />
        </NavLink>
      </div>
    </aside>
  );
}
