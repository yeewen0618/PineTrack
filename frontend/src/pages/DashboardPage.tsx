import React from 'react';
import { Card } from '../components/ui/card';
import { WeatherCard } from '../components/WeatherCard';
import { PlotCard } from '../components/PlotCard';
import { StatusBadge } from '../components/StatusBadge';
import { Sun, CloudSun, CloudRain, Cloud, AlertTriangle, Calendar, Users } from 'lucide-react';
import { mockPlots, mockTasks, currentWeather, weatherForecast } from '../lib/mockData';
import { Button } from '../components/ui/button';

interface DashboardPageProps {
  onNavigate: (page: string, plotId?: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const criticalTasks = mockTasks.filter((task) => task.status === 'Stop' || task.status === 'Pending');
  const upcomingTasks = mockTasks.filter((task) => {
    const taskDate = new Date(task.date);
    const today = new Date('2025-11-05');
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    return taskDate >= today && taskDate <= threeDaysFromNow && task.status === 'Proceed';
  });

  const recentReschedules = mockTasks.filter((task) => task.proposedDate).slice(0, 3);

  const getWeatherIcon = (icon: string) => {
    const iconProps = { size: 24, className: 'text-[#15803D]' };
    switch (icon) {
      case 'sun':
        return <Sun {...iconProps} />;
      case 'cloud-sun':
        return <CloudSun {...iconProps} />;
      case 'cloud-rain':
        return <CloudRain {...iconProps} />;
      case 'cloud':
        return <Cloud {...iconProps} />;
      default:
        return <CloudSun {...iconProps} />;
    }
  };

  const stats = [
    {
      label: 'Total Plots',
      value: mockPlots.length,
      icon: '🌱',
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Tasks Today',
      value: mockTasks.filter((t) => t.date === '2025-11-06').length,
      icon: '📋',
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Active Workers',
      value: 5,
      icon: '👷',
      color: 'from-purple-500 to-purple-600'
    },
    {
      label: 'Critical Actions',
      value: criticalTasks.length,
      icon: '⚠️',
      color: 'from-red-500 to-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl text-[#111827] mb-1">Farm Overview</h2>
        <p className="text-[#6B7280]">Monitor your plantation operations in real-time</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-5 rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">{stat.label}</p>
                <p className="text-3xl text-[#111827]">{stat.value}</p>
              </div>
              <div className="text-4xl">{stat.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weather Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Weather */}
        <div>
          <WeatherCard
            temperature={currentWeather.temperature}
            condition={currentWeather.condition}
            humidity={currentWeather.humidity}
            windSpeed={currentWeather.windSpeed}
          />
        </div>

        {/* 10-Day Forecast */}
        <Card className="lg:col-span-2 p-6 rounded-2xl bg-white">
          <h3 className="text-[#111827] mb-4">10-Day Forecast</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {weatherForecast.map((day, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-xl hover:bg-[#F9FAFB] transition-colors"
              >
                <span className="text-sm text-[#6B7280]">{day.day}</span>
                {getWeatherIcon(day.icon)}
                <span className="text-[#111827]">{day.temp}°C</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Farm Overview - Plots */}
        <Card className="lg:col-span-2 p-6 rounded-2xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#111827]">All Plots</h3>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => onNavigate('farm-map')}
            >
              View Map
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockPlots.map((plot) => (
              <PlotCard
                key={plot.id}
                plot={plot}
                onClick={() => onNavigate('plot-details', plot.id)}
              />
            ))}
          </div>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Critical Actions */}
          <Card className="p-6 rounded-2xl bg-white border-l-4 border-l-[#DC2626]">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-[#DC2626]" size={20} />
              <h3 className="text-[#111827]">Critical Actions</h3>
            </div>
            <div className="space-y-3">
              {criticalTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-[#F9FAFB] rounded-xl hover:bg-[#E5E7EB] transition-colors cursor-pointer"
                  onClick={() => onNavigate('reschedule')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onNavigate('reschedule');
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-[#111827]">{task.title}</p>
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                  <p className="text-xs text-[#6B7280]">{task.plotName}</p>
                  {task.reason && (
                    <p className="text-xs text-[#6B7280] mt-2 italic">{task.reason}</p>
                  )}
                </div>
              ))}
              {criticalTasks.length === 0 && (
                <p className="text-sm text-[#6B7280] text-center py-4">
                  No critical actions currently
                </p>
              )}
            </div>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="p-6 rounded-2xl bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-[#15803D]" size={20} />
              <h3 className="text-[#111827]">Next 3 Days</h3>
            </div>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#DCFCE7] rounded-xl flex flex-col items-center justify-center">
                    <span className="text-xs text-[#15803D]">
                      {new Date(task.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-[#15803D]">
                      {new Date(task.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111827] truncate">{task.title}</p>
                    <p className="text-xs text-[#6B7280]">{task.plotName}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Reschedules */}
          <Card className="p-6 rounded-2xl bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-[#2563EB]" size={20} />
              <h3 className="text-[#111827]">Recent Reschedules</h3>
            </div>
            <div className="space-y-3">
              {recentReschedules.map((task) => (
                <div key={task.id} className="text-sm">
                  <p className="text-[#111827] mb-1">{task.title}</p>
                  <p className="text-xs text-[#6B7280]">
                    {task.originalDate} → {task.proposedDate}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
