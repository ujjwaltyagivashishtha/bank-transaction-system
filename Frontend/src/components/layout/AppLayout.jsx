import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import IconRail from './IconRail';
import Sidebar from './Sidebar';
import CreateAccountModal from '../accounts/CreateAccountModal';

export default function AppLayout() {
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* 1. Left Vertical Icon Rail */}
      <IconRail />

      {/* 2. Main Sidebar */}
      <Sidebar onOpenCreateAccount={() => setIsCreateAccountModalOpen(true)} />

      {/* 3. Dashboard / Main Content Canvas */}
      <main className="dashboard-canvas" id="main-content" role="main">
        <Outlet context={{ openCreateAccountModal: () => setIsCreateAccountModalOpen(true) }} />
      </main>

      {/* Global Account Creation Modal */}
      <CreateAccountModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
      />
    </div>
  );
}
