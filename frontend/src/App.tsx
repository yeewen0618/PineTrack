import React, { useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FarmMapPage } from './pages/FarmMapPage';
import { PlotManagementPage } from './pages/PlotManagementPage';
import { PlotDetailsPage } from './pages/PlotDetailsPage';
import { SchedulePage } from './pages/SchedulePage';
import { RescheduleCenterPage } from './pages/RescheduleCenterPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { WorkersPage } from './pages/WorkersPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { ReportsPage } from './pages/ReportsPage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedPlotId, setSelectedPlotId] = useState<string | undefined>(undefined);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page: string, plotId?: string) => {
    setCurrentPage(page);
    setSelectedPlotId(plotId);
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'farm-map':
        return <FarmMapPage onNavigate={handleNavigate} />;
      case 'plots':
        return <PlotManagementPage onNavigate={handleNavigate} />;
      case 'plot-details':
        return selectedPlotId ? (
          <PlotDetailsPage plotId={selectedPlotId} onNavigate={handleNavigate} />
        ) : (
          <PlotManagementPage onNavigate={handleNavigate} />
        );
      case 'schedule':
        return <SchedulePage />;
      case 'reschedule':
        return <RescheduleCenterPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'workers':
        return <WorkersPage />;
      case 'settings':
        return <ConfigurationPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <AppLayout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
      </AppLayout>
      <Toaster position="top-right" />
    </>
  );
}
