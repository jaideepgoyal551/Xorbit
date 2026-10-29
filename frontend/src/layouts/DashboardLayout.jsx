import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="dashboard-app flex h-screen bg-[#05070d] text-white transition-colors">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          user={user}
          onMenuClick={toggleSidebar}
          onLogout={handleLogout}
        />

        <main className="dashboard-main flex-1 overflow-y-auto custom-scrollbar bg-[#05070d] p-3 sm:p-4 xl:p-5 transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
