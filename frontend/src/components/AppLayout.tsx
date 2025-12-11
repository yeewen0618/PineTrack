import React, { useState } from 'react';
import {
  LayoutDashboard,
  Map,
  Grid3x3,
  Calendar,
  RefreshCcw,
  BarChart3,
  Users,
  Settings,
  FileText,
  Menu,
  X,
  Sprout
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'farm-map', label: 'Farm Map', icon: Map },
    { id: 'plots', label: 'Plot Management', icon: Grid3x3 },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'reschedule', label: 'Reschedule Center', icon: RefreshCcw },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Configuration', icon: Settings }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-white border-r border-[#E5E7EB] flex-shrink-0 transition-all duration-300 overflow-hidden`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 p-6 border-b border-[#E5E7EB]">
            <div className="w-10 h-10 bg-gradient-to-br from-[#15803D] to-[#16A34A] rounded-xl flex items-center justify-center">
              <Sprout className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-[#111827]">PineTrack</h1>
              <p className="text-xs text-[#6B7280]">AgroPlanner</p>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav>
              <ul className="space-y-1" role="list">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <li key={item.id}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start gap-3 h-11 rounded-xl ${
                          isActive
                            ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7]'
                            : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]'
                        }`}
                        onClick={() => onNavigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </ScrollArea>

          {/* User info */}
          <div className="p-4 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#15803D] rounded-full flex items-center justify-center text-white">
                FM
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#111827] truncate">Farm Manager</p>
                <p className="text-xs text-[#6B7280] truncate">manager@pinetrack.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center px-6 gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          <div className="flex-1">
            <h2 className="text-[#111827]">
              {menuItems.find((item) => item.id === currentPage)?.label || 'PineTrack'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-[#6B7280]">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 lg:p-10 space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
