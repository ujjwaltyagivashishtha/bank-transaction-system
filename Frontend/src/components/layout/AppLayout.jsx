import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import CreateAccountModal from '../accounts/CreateAccountModal';

export default function AppLayout() {
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Main Sidebar */}
      <Sidebar onOpenCreateAccount={() => setIsCreateAccountModalOpen(true)} />

      {/* Dashboard / Main Content Canvas */}
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
