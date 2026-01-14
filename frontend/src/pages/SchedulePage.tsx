import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/StatusBadge';
import { ChevronLeft, ChevronRight, Filter, Calendar as CalendarIcon, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import { useParams } from "react-router-dom";
import { listPlots, listTasks } from '../lib/api';
import type { Plot } from '../lib/api';

type ViewMode = "month" | "week" | "day";

type ScheduleTaskVM = {
  id: string;
  title: string;
  status: "Proceed" | "Pending" | "Stop";
  date: string; // YYYY-MM-DD
  plotId: string;
  plotName: string;
  description?: string | null;
  assignedWorker?: string | null;
  reason?: string | null;
};

export function SchedulePage() {
  const [filterPlot, setFilterPlot] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [plots, setPlots] = useState<Plot[]>([]);
  const [tasks, setTasks] = useState<ScheduleTaskVM[]>([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [plotsRes, tasksRes] = await Promise.all([
          listPlots(),
          listTasks(), // ✅ all tasks
        ]);

        const plotsData = plotsRes.data ?? [];
        setPlots(plotsData);

        const nameById = new Map(plotsData.map((p) => [p.id, p.name]));

        const vm: ScheduleTaskVM[] = (tasksRes.data ?? []).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.decision ?? t.status,
          date: t.task_date,
          plotId: t.plot_id,
          plotName: nameById.get(t.plot_id) ?? t.plot_id,
          description: t.description ?? null,
          assignedWorker: t.assigned_worker_name ?? null,
          reason: t.reason ?? null,
        }));

        setTasks(vm);

        // ✅ ensure default filter stays global
        setFilterPlot("all");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load schedule data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);


  // Generate calendar days for month view
  const getMonthCalendarDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    return days;
  };

  const getTasksForDate = (dateStr: string) => {
    let tasksForDate = tasks.filter((task) => task.date === dateStr);

    if (filterPlot !== 'all') {
      tasksForDate = tasksForDate.filter((task) => task.plotId === filterPlot);
    }
    if (filterStatus !== 'all') {
      tasksForDate = tasksForDate.filter((task) => task.status === filterStatus);
    }

    return tasksForDate;
  };

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return getTasksForDate(selectedDate);
  }, [selectedDate, tasks, filterPlot, filterStatus]);

  const getTasksForDay = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return getTasksForDate(dateStr);
  };

  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month - 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month + 1);
    setCurrentDate(newDate);
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(day - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(day + 7);
    setCurrentDate(newDate);
  };

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(day - 1);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(day + 1);
    setCurrentDate(newDate);
  };

  const formatDateDisplay = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(day - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Get tasks for current day (day view)
  const getDayTasks = () => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return getTasksForDate(dateStr);
  };

  // Get tasks for current week (week view)
  const getWeekTasks = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(day - startOfWeek.getDay());

    const weekTasks: { date: string; dayName: string; dayNumber: number; tasks: ScheduleTaskVM[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      weekTasks.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        tasks: getTasksForDate(dateStr)
      });
    }

    return weekTasks;
  };

  const days = useMemo(() => getMonthCalendarDays(), [year, month, tasks, filterPlot, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] text-[#111827]">Farm Schedule</h2>
          <p className="text-[16px] text-[#374151]">View and manage all scheduled tasks</p>
        </div>
        <div className="flex items-center gap-2 text-[#6B7280] text-[14px]">
          <CalendarIcon size={16} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 rounded-2xl bg-white shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-[#6B7280]" />
              <span className="text-[14px] text-[#6B7280]">Filters:</span>
            </div>

            <Select value={filterPlot} onValueChange={setFilterPlot}>
              <SelectTrigger className="w-[180px] rounded-xl" aria-label="Filter by plot">
                <SelectValue placeholder="All Plots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plots</SelectItem>
                {plots.map((plot) => (
                  <SelectItem key={plot.id} value={plot.id}>
                    {plot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] rounded-xl" aria-label="Filter by status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Proceed">Proceed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Stop">Stop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex rounded-xl bg-[#F3F4F6] p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg text-[14px] ${viewMode === 'month' ? 'bg-[#DCFCE7] text-[#166534]' : 'text-[#6B7280]'}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg text-[14px] ${viewMode === 'week' ? 'bg-[#DCFCE7] text-[#166534]' : 'text-[#6B7280]'}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg text-[14px] ${viewMode === 'day' ? 'bg-[#DCFCE7] text-[#166534]' : 'text-[#6B7280]'}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
        </div>
      </Card>

      {/* Calendar Container */}
      <Card className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => {
              if (viewMode === 'month') previousMonth();
              if (viewMode === 'week') previousWeek();
              if (viewMode === 'day') previousDay();
            }}
          >
            <ChevronLeft size={18} />
          </Button>

          <h3 className="text-[18px] text-[#111827] font-medium">{formatDateDisplay()}</h3>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => {
              if (viewMode === 'month') nextMonth();
              if (viewMode === 'week') nextWeek();
              if (viewMode === 'day') nextDay();
            }}
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Loading hint */}
        {loading && (
          <div className="p-4 text-sm text-[#6B7280]">
            Loading schedule from database…
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName) => (
                <div key={dayName} className="text-center text-[14px] text-[#374151] font-medium py-2 bg-[#ECFDF5] rounded-xl">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((d, index) => {
                if (d === null) {
                  return <div key={`empty-${index}`} className="h-[84px] border border-transparent" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayTasks = getTasksForDay(d);
                const maxVisible = 1;

                return (
                  <div
                    key={d}
                    className="h-[84px] border border-[#E5E7EB] rounded-xl bg-white p-2 relative cursor-pointer"
                    onClick={() => setSelectedDate(dateStr)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedDate(dateStr);
                    }}
                  >
                    <div className="text-[14px] text-[#111827]">{d}</div>

                    <div className="mt-1 space-y-1">
                      {dayTasks.slice(0, maxVisible).map((task) => (
                        <TooltipProvider key={task.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`text-[12px] px-2 py-1 rounded-lg cursor-pointer ${task.status === 'Proceed'
                                  ? 'bg-[#DCFCE7] text-[#166534]'
                                  : task.status === 'Pending'
                                    ? 'bg-[#FEF3C7] text-[#92400E]'
                                    : 'bg-[#FEE2E2] text-[#991B1B]'
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTask(task);
                                }}
                              >
                                <p className="truncate">{task.title}</p>
                                <p className="text-[10px] text-[#6B7280] truncate">
                                  {task.assignedWorker ?? 'Unassigned'}
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[220px]">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-[#6B7280]">{task.plotName} • {task.date}</p>
                              <p className="text-xs text-[#6B7280]">Worker: {task.assignedWorker ?? 'Unassigned'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}

                      {dayTasks.length > maxVisible && (
                        <Badge className="absolute top-2 right-2 bg-[#111827] text-white text-[11px] rounded-full px-2">
                          {dayTasks.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View (Month-style, one row) */}
        {viewMode === 'week' && (
          <div className="p-4">
            {/* Day headers (Mon → Sun) */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((dayName) => (
                <div
                  key={dayName}
                  className="text-center text-[14px] text-[#374151] font-medium py-2 bg-[#ECFDF5] rounded-xl"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* One-row week grid */}
            <div className="grid grid-cols-7 gap-2">
              {(() => {
                const week = getWeekTasks();

                // Reorder to Mon → Sun (in case your getWeekTasks() is Sun → Sat)
                const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const weekOrdered = [...week].sort(
                  (a, b) => order.indexOf(a.dayName) - order.indexOf(b.dayName)
                );

                const maxVisible = 1;

                return weekOrdered.map((dayData) => {
                  const dayTasks = dayData.tasks ?? [];

                  return (
                    <div
                      key={dayData.date}
                      className="h-[84px] border border-[#E5E7EB] rounded-xl bg-white p-2 relative cursor-pointer"
                      onClick={() => setSelectedDate(dayData.date)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedDate(dayData.date);
                      }}
                    >
                      {/* Day number (same style as month view) */}
                      <div className="text-[14px] text-[#111827]">{dayData.dayNumber}</div>

                      <div className="mt-1 space-y-1">
                        {dayTasks.slice(0, maxVisible).map((task) => (
                          <TooltipProvider key={task.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`text-[12px] px-2 py-1 rounded-lg cursor-pointer ${task.status === 'Proceed'
                                    ? 'bg-[#DCFCE7] text-[#166534]'
                                    : task.status === 'Pending'
                                      ? 'bg-[#FEF3C7] text-[#92400E]'
                                      : 'bg-[#FEE2E2] text-[#991B1B]'
                                    }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTask(task);
                                  }}
                                >
                                  <p className="truncate">{task.title}</p>
                                  <p className="text-[10px] text-[#6B7280] truncate">
                                    {task.assignedWorker ?? 'Unassigned'}
                                  </p>
                                </div>
                              </TooltipTrigger>

                              <TooltipContent className="max-w-[220px]">
                                <p className="font-medium">{task.title}</p>
                                <p className="text-xs text-[#6B7280]">
                                  {task.plotName} • {task.date}
                                </p>
                                <p className="text-xs text-[#6B7280]">Worker: {task.assignedWorker ?? 'Unassigned'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}

                        {dayTasks.length > maxVisible && (
                          <Badge className="absolute top-2 right-2 bg-[#111827] text-white text-[11px] rounded-full px-2">
                            {dayTasks.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}



        {/* Day View */}
        {viewMode === 'day' && (
          <div className="p-4">
            <div className="space-y-3">
              {getDayTasks().map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTask(task);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* LEFT */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] text-[#111827] font-medium truncate">
                        {task.title}
                      </p>
                      <p className="text-[12px] text-[#6B7280] truncate">
                        {task.plotName} • {task.date}
                      </p>
                      <p className="text-[12px] text-[#6B7280] truncate">
                        Worker: {task.assignedWorker ?? 'Unassigned'}
                      </p>
                    </div>

                    {/* RIGHT */}
                    <div className="shrink-0">
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                </div>
              ))}

              {getDayTasks().length === 0 && (
                <p className="text-[12px] text-[#9CA3AF]">No tasks scheduled for this day</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Task Details Dialog */}
      <Dialog
        key={selectedTask?.id ?? 'task-dialog'}
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >


        <DialogContent
          className="rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >

          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.plotName} • {selectedTask?.date}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Status</span>
              <StatusBadge status={selectedTask?.status} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Assigned</span>
              <span>{selectedTask?.assignedWorker ?? 'Unassigned'}</span>
            </div>

            {selectedTask?.description && (
              <div>
                <p className="text-[#6B7280] mb-1">Description</p>
                <p className="text-[#111827]">{selectedTask.description}</p>
              </div>
            )}

            {selectedTask?.reason && (
              <div>
                <p className="text-[#6B7280] mb-1">Reason</p>
                <p className="text-[#111827]">{selectedTask.reason}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Details Dialog */}
      <Dialog
        key={selectedDate ?? 'date-dialog'}
        open={!!selectedDate}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
      >
        <DialogContent
          className="rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
                : 'Selected Date'}
            </DialogTitle>
            <DialogDescription>
              {selectedDateTasks.length} task{selectedDateTasks.length === 1 ? '' : 's'} matching current filters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedDateTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-[#E5E7EB] bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-[#111827] font-medium truncate">
                      {task.title}
                    </p>
                    <p className="text-[12px] text-[#6B7280] truncate">
                      {task.plotName} ({task.plotId})
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                <div className="mt-2 text-[12px] text-[#6B7280]">
                  <p>Date: {task.date}</p>
                  <p>Worker: {task.assignedWorker ?? 'Unassigned'}</p>
                </div>
              </div>
            ))}

            {selectedDateTasks.length === 0 && (
              <p className="text-[12px] text-[#9CA3AF]">No tasks for this date under current filters.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
