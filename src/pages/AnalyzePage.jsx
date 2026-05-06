import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardTopbar from './dashboard/DashboardTopbar';
import DashboardSidebar from './dashboard/DashboardSidebar';
import ReelAnalyzer from '../components/ai/ReelAnalyzer';

export default function AnalyzePage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardTopbar searchQuery="" setSearchQuery={() => {}} onNavigate={navigate} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <DashboardSidebar pathname={pathname} onNavigate={navigate} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <ReelAnalyzer />
        </main>
      </div>
    </div>
  );
}
