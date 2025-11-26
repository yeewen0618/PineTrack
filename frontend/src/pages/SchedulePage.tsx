import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/StatusBadge';
import { mockTasks, mockPlots } from '../lib/mockData';
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
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../components/ui/tooltip';

type ViewMode = 'month' | 'week' | 'day';

// Actual current date (today) for highlighting purposes
const TODAY = new Date();

export function SchedulePage() {
  const [filterPlot, setFilterPlot] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // Base date that drives all calendar views - defaults to today
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();

  // Generate calendar days for month view
  const getMonthCalendarDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const calendarDays = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      calendarDays.push(d);
    }
    return calendarDays;
  };

  const getTasksForDate = (dateStr: string) => {
    let tasks = mockTasks.filter((task) => task.date === dateStr);

    if (filterPlot !== 'all') {
      tasks = tasks.filter((task) => task.plotId === filterPlot);
    }
    if (filterStatus !== 'all') {
      tasks = tasks.filter((task) => task.status === filterStatus);
    }

    return tasks;
  };

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
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handlePrevious = () => {
    if (viewMode === 'month') previousMonth();
    else if (viewMode === 'week') previousWeek();
    else previousDay();
  };

  const handleNext = () => {
    if (viewMode === 'month') nextMonth();
    else if (viewMode === 'week') nextWeek();
    else nextDay();
  };

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const startDate = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endDate = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `Week of ${startDate} – ${endDate}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const getWeekDays = () => {
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };

  const getDayTasks = () => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    return getTasksForDate(dateStr);
  };

  const getTaskColor = (status: string) => {
    if (status === 'Proceed') return 'bg-[#86EFAC] text-[#111827]';
    if (status === 'Pending') return 'bg-[#FDE68A] text-[#111827]';
    return 'bg-[#FCA5A5] text-[#111827]';
  };

  const openTaskModal = (task: any) => {
    setSelectedTask(task);
  };

  const isToday = (d: number, m: number, y: number) => {
    return d === TODAY.getDate() && m === TODAY.getMonth() && y === TODAY.getFullYear();
  };

  const isCurrentDate = (d: number, m: number, y: number) => {
    return d === currentDate.getDate() && m === currentDate.getMonth() && y === currentDate.getFullYear();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const handleDayClick = (d: number) => {
    const newDate = new Date(year, month, d);
    setCurrentDate(newDate);
  };

  const handleWeekDayClick = (date: Date) => {
    setCurrentDate(new Date(date));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FAFFFE] to-[#EBF8EF] space-y-6">
      {/* Header with current date */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] text-[#111827]">Farm Schedule</h2>
          <p className="text-[16px] text-[#374151]">View and manage all scheduled tasks</p>
        </div>
        <div className="flex items-center gap-2 text-[#6B7280]">
          <CalendarIcon size={18} />
          <span className="text-[14px]">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <Card className="p-4 rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
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
                {mockPlots.map((plot) => (
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

            {(filterPlot !== 'all' || filterStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-[14px]"
                onClick={() => {
                  setFilterPlot('all');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-xl p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg text-[14px] ${
                viewMode === 'month' 
                  ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] hover:text-[#15803D]' 
                  : 'hover:bg-white text-[#6B7280]'
              }`}
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg text-[14px] ${
                viewMode === 'week' 
                  ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] hover:text-[#15803D]' 
                  : 'hover:bg-white text-[#6B7280]'
              }`}
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg text-[14px] ${
                viewMode === 'day' 
                  ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] hover:text-[#15803D]' 
                  : 'hover:bg-white text-[#6B7280]'
              }`}
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-[20px] rounded-2xl bg-white shadow-sm">
        {/* Navigation */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={handlePrevious}
            aria-label={`Previous ${viewMode}`}
          >
            <ChevronLeft size={18} />
          </Button>
          <h3 className="text-[20px] text-[#111827] min-w-[300px] text-center">
            {getViewTitle()}
          </h3>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={handleNext}
            aria-label={`Next ${viewMode}`}
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName) => (
              <div key={dayName} className="text-center py-2 px-3 bg-[#EBF8EF] rounded-lg">
                <span className="text-[14px] text-[#111827]">{dayName}</span>
              </div>
            ))}

            {/* Calendar Days */}
            {getMonthCalendarDays().map((d, index) => {
              if (d === null) {
                return <div key={`empty-${index}`} className="min-h-[100px] bg-[#F9FAFB] rounded-lg" />;
              }

              const tasks = getTasksForDay(d);
              const isTodayCell = isToday(d, month, year);
              const isCurrentCell = isCurrentDate(d, month, year);

              // Group tasks by plot to show plot indicator
              const plotsWithTasks = [...new Set(tasks.map(t => t.plotId))];

              return (
                <div
                  key={d}
                  className={`min-h-[100px] p-2 rounded-lg border transition-all ${
                    isTodayCell
                      ? 'border-[#15803D] bg-[#DCFCE7] border-2'
                      : isCurrentCell
                        ? 'border-[#15803D] bg-[#DCFCE7] border-2'
                        : 'border-[#E5E7EB] bg-white hover:border-[#15803D] cursor-pointer'
                  }`}
                  onClick={() => handleDayClick(d)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[14px] ${isTodayCell ? 'text-[#15803D]' : 'text-[#111827]'}`}>
                      {d}
                    </span>
                    {plotsWithTasks.length > 0 && (
                      <div className="flex gap-0.5">
                        {plotsWithTasks.slice(0, 3).map((plotId) => {
                          const plotNum = plotId.replace('P00', '');
                          return (
                            <TooltipProvider key={plotId}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge 
                                    className="text-[10px] rounded-full h-4 w-4 p-0 flex items-center justify-center bg-[#374151] text-white border-0 hover:bg-[#374151]"
                                  >
                                    {plotNum}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Plot {plotId}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {tasks.slice(0, 2).map((task) => (
                      <TooltipProvider key={task.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`text-[12px] p-1 rounded truncate cursor-pointer transition-shadow hover:shadow-md ${getTaskColor(task.status)}`}
                              style={{ fontWeight: 500 }}
                              onClick={() => openTaskModal(task)}
                            >
                              {task.title}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="text-[14px]">{task.title}</p>
                              <p className="text-[12px] text-[#6B7280]">{task.plotName}</p>
                              <p className="text-[12px] text-[#6B7280]">Worker: {task.assignedWorker}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {tasks.length > 2 && (
                      <div className="text-[11px] text-[#6B7280] text-center">+{tasks.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays().map((date) => {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const tasks = getTasksForDate(dateStr);
                const isTodayCell = isSameDay(date, TODAY);
                const isSelectedDate = isSameDay(date, currentDate);

                return (
                  <div key={dateStr} className="space-y-2">
                    <div 
                      className={`text-center p-3 rounded-lg cursor-pointer transition-all ${
                        isTodayCell ? 'bg-[#DCFCE7] border-2 border-[#15803D]' : isSelectedDate ? 'bg-[#DCFCE7] border-2 border-[#15803D]' : 'bg-[#F3F4F6] hover:bg-[#EBF8EF]'
                      }`}
                      onClick={() => handleWeekDayClick(date)}
                    >
                      <div className="text-[12px] text-[#6B7280]">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className={`text-[16px] ${isTodayCell ? 'text-[#15803D]' : isSelectedDate ? 'text-[#15803D]' : 'text-[#111827]'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                    <div className="space-y-1 min-h-[200px]">
                      {tasks.map((task) => (
                        <TooltipProvider key={task.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`text-[12px] p-2 rounded-lg cursor-pointer transition-shadow hover:shadow-md ${getTaskColor(task.status)}`}
                                style={{ fontWeight: 500 }}
                                onClick={() => openTaskModal(task)}
                              >
                                <div className="truncate">{task.title}</div>
                                <div className="text-[10px] opacity-75 mt-0.5">{task.plotName}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="text-[14px]">{task.title}</p>
                                <p className="text-[12px] text-[#6B7280]">{task.plotName}</p>
                                <p className="text-[12px] text-[#6B7280]">Worker: {task.assignedWorker}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            <div className="bg-[#EBF8EF] rounded-lg p-4">
              <div className="text-center">
                <div className="text-[14px] text-[#374151]">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
                <div className="text-[32px] text-[#15803D] mt-1">
                  {currentDate.getDate()}
                </div>
                <div className="text-[14px] text-[#374151]">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {getDayTasks().length === 0 ? (
                <div className="text-center py-8 text-[#6B7280]">
                  <CalendarIcon size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-[16px]">No tasks scheduled for this day</p>
                </div>
              ) : (
                getDayTasks().map((task) => (
                  <Card
                    key={task.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] ${
                      task.status === 'Proceed' ? 'border-l-4 border-l-[#16A34A]' :
                      task.status === 'Pending' ? 'border-l-4 border-l-[#CA8A04]' :
                      'border-l-4 border-l-[#DC2626]'
                    }`}
                    onClick={() => openTaskModal(task)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-[16px] text-[#111827]">{task.title}</h4>
                          <StatusBadge status={task.status} />
                        </div>
                        <div className="space-y-1 text-[14px] text-[#6B7280]">
                          <p>📍 {task.plotName}</p>
                          <p>👤 {task.assignedWorker}</p>
                          <p>📋 {task.description}</p>
                          {task.reason && (
                            <p className="text-[#CA8A04]">⚠️ {task.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Legend */}
      <Card className="p-4 rounded-2xl bg-white shadow-sm">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-[14px] text-[#6B7280]">Task Status:</span>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#86EFAC] rounded" />
              <span className="text-[14px] text-[#111827]">Proceed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#FDE68A] rounded" />
              <span className="text-[14px] text-[#111827]">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#FCA5A5] rounded" />
              <span className="text-[14px] text-[#111827]">Stop</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Task Details Modal */}
      <Dialog open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[20px]">
              {selectedTask?.title}
              {selectedTask && <StatusBadge status={selectedTask.status} />}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              Task details and information
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[14px] text-[#6B7280] mb-1">Plot</p>
                  <p className="text-[16px] text-[#111827]">{selectedTask.plotName}</p>
                </div>
                <div>
                  <p className="text-[14px] text-[#6B7280] mb-1">Date</p>
                  <p className="text-[16px] text-[#111827]">
                    {new Date(selectedTask.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] text-[#6B7280] mb-1">Assigned Worker</p>
                  <p className="text-[16px] text-[#111827]">{selectedTask.assignedWorker}</p>
                </div>
                <div>
                  <p className="text-[14px] text-[#6B7280] mb-1">Task Type</p>
                  <p className="text-[16px] text-[#111827] capitalize">{selectedTask.type.replace('-', ' ')}</p>
                </div>
              </div>

              <div>
                <p className="text-[14px] text-[#6B7280] mb-1">Description</p>
                <p className="text-[16px] text-[#111827]">{selectedTask.description}</p>
              </div>

              {/* IoT Readings Section */}
              <div className="bg-[#EBF8EF] border border-[#DCFCE7] rounded-xl p-3">
                <p className="text-[14px] text-[#6B7280] mb-2">IoT Sensor Readings</p>
                <div className="grid grid-cols-2 gap-2 text-[14px]">
                  <div>
                    <p className="text-[#6B7280]">Soil Moisture:</p>
                    <p className="text-[#111827]">62%</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Temperature:</p>
                    <p className="text-[#111827]">28°C</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">pH Level:</p>
                    <p className="text-[#111827]">5.8</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Nitrogen:</p>
                    <p className="text-[#111827]">145 ppm</p>
                  </div>
                </div>
              </div>

              {/* Weather Forecast */}
              <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-3">
                <p className="text-[14px] text-[#6B7280] mb-2">Weather Forecast</p>
                <div className="grid grid-cols-2 gap-2 text-[14px]">
                  <div>
                    <p className="text-[#6B7280]">Condition:</p>
                    <p className="text-[#111827]">Partly Cloudy</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Rain Chance:</p>
                    <p className="text-[#111827]">15%</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Wind Speed:</p>
                    <p className="text-[#111827]">12 km/h</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Humidity:</p>
                    <p className="text-[#111827]">78%</p>
                  </div>
                </div>
              </div>

              {selectedTask.reason && (
                <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3">
                  <p className="text-[14px] text-[#6B7280] mb-1">Status Note</p>
                  <p className="text-[14px] text-[#92400E]">{selectedTask.reason}</p>
                </div>
              )}

              {selectedTask.originalDate && selectedTask.proposedDate && (
                <div className="bg-[#EBF8EF] border border-[#DCFCE7] rounded-xl p-3">
                  <p className="text-[14px] text-[#6B7280] mb-2">Rescheduling Information</p>
                  <div className="grid grid-cols-2 gap-2 text-[14px]">
                    <div>
                      <p className="text-[#6B7280]">Original Date:</p>
                      <p className="text-[#111827]">
                        {new Date(selectedTask.originalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#6B7280]">Proposed Date:</p>
                      <p className="text-[#111827]">
                        {new Date(selectedTask.proposedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button className="w-full rounded-xl bg-[#15803D] hover:bg-[#166534] text-[14px]">
                  Edit Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}