import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/card';
import { WeatherCard } from '../components/WeatherCard';
import { PlotCard } from '../components/PlotCard';
import { StatusBadge } from '../components/StatusBadge';
import { Sun, CloudSun, CloudRain, Cloud, AlertTriangle, Calendar, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

import { calcHarvestProgressPercent } from '../lib/progress';

// ✅ Use real API
import { listPlots, listTasks } from '../lib/api';
import type { Plot, Task } from '../lib/api';

// ✅ Keep weather as mock for now (no weather DB yet)
import { currentWeather, weatherForecast } from '../lib/mockData';

interface DashboardPageProps {
  onNavigate: (page: string, plotId?: string) => void;
}

type TaskVM = {
  id: string;
  title: string;
  date: string; // normalized from task_date
  plotId: string;
  plotName: string;
  decision: "Proceed" | "Pending" | "Stop";

  // ✅ add these because Dashboard UI uses them
  reason?: string | null;
  original_date?: string | null;
  proposed_date?: string | null;
};


export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [tasks, setTasks] = useState<TaskVM[]>([]);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const threeDaysFromNow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // 1) Load plots
      const plotsRes = await listPlots();
      const plotsData = plotsRes.data ?? [];
      setPlots(plotsData);

      // 2) Load tasks (all tasks)
      const tasksRes = await listTasks();
      const tasksData = tasksRes.data ?? [];

      // 3) Enrich tasks with plot name
      const plotNameById = new Map<string, string>(
        plotsData.map((p) => [p.id, p.name]),
      );

      const enriched: TaskVM[] = tasksData.map((t: any) => ({
        id: t.id,
        title: t.title,
        date: t.task_date,
        plotId: t.plot_id,
        plotName: plotNameById.get(t.plot_id) ?? t.plot_id,
        decision: t.decision ?? t.status,

        reason: t.reason ?? null,
        original_date: t.original_date ?? null,
        proposed_date: t.proposed_date ?? null,
      }));


      setTasks(enriched);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Option A: progress is computed at frontend (not stored)
  const plotsWithProgress = useMemo(() => {
    return (plots ?? []).map((p) => ({
      plot: p,
      progressPercent: calcHarvestProgressPercent(p.planting_date),
    }));
  }, [plots]);

  const criticalTasks = useMemo(() => {
    return tasks.filter((t) => t.decision === 'Stop' || t.decision === 'Pending');
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.date;
      return d >= todayStr && d <= threeDaysFromNow && t.decision === 'Proceed';
    });
  }, [tasks, todayStr, threeDaysFromNow]);

  const recentReschedules = useMemo(() => {
    // Proposed reschedules: proposed_date exists
    // sort by created_at desc if you want, but backend already sorts task_date
    return tasks.filter((t) => t.proposed_date).slice(0, 3);
  }, [tasks]);

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

  const stats = useMemo(
    () => [
      {
        label: 'Total Plots',
        value: plotsWithProgress.length,
        icon: '🌱',
        color: 'from-blue-500 to-blue-600',
      },
      {
        label: 'Tasks Today',
        value: tasks.filter((t) => t.date === todayStr).length,
        icon: '📋',
        color: 'from-green-500 to-green-600',
      },
      {
        label: 'Active Workers',
        value: 5, // keep static for MVP unless you add /api/workers count
        icon: '👷',
        color: 'from-purple-500 to-purple-600',
      },
      {
        label: 'Critical Actions',
        value: criticalTasks.length,
        icon: '⚠️',
        color: 'from-red-500 to-red-600',
      },
    ],
    [plotsWithProgress.length, tasks, todayStr, criticalTasks.length],
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl text-[#111827] mb-1">Farm Overview</h2>
          <p className="text-[#6B7280]">Monitor your plantation operations in real-time</p>
        </div>

        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => loadDashboard()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
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

      {/* Weather Section (still mock) */}
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

          {loading && plotsWithProgress.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Loading plots...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plotsWithProgress.map(({ plot, progressPercent }) => (
                <PlotCard
                  key={plot.id}
                  plot={plot}
                  progressPercent={progressPercent}
                  onClick={() => onNavigate('plot-details', plot.id)}
                />
              ))}

              {plotsWithProgress.length === 0 && (
                <p className="text-sm text-[#6B7280]">No plots found.</p>
              )}
            </div>
          )}
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
                    if (e.key === 'Enter' || e.key === ' ') onNavigate('reschedule');
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-[#111827]">{task.title}</p>
                    <StatusBadge status={task.decision as 'Proceed' | 'Pending' | 'Stop'} size="sm" />
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
              {upcomingTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#DCFCE7] rounded-xl flex flex-col items-center justify-center">
                    <span className="text-xs text-[#15803D]">
                      {new Date(task.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-[#15803D]">{new Date(task.date).getDate()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111827] truncate">{task.title}</p>
                    <p className="text-xs text-[#6B7280]">{task.plotName}</p>
                  </div>
                </div>
              ))}

              {upcomingTasks.length === 0 && (
                <p className="text-sm text-[#6B7280] text-center py-4">No upcoming tasks</p>
              )}
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
                    {task.original_date ?? '—'} → {task.proposed_date ?? '—'}
                  </p>
                </div>
              ))}

              {recentReschedules.length === 0 && (
                <p className="text-sm text-[#6B7280] text-center py-4">
                  No reschedules recorded
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
