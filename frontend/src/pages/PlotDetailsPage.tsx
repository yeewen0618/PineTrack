import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Navigate } from "react-router-dom";
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import {
  mockObservations,
  generateMockSensorData,
  generateMockForecastData
} from '../lib/mockData';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ArrowLeft, Calendar as CalendarIcon, Droplets, FlaskConical, Leaf, ThermometerSun } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../components/ui/tooltip';
import { ForecastFilter } from '../components/ForecastFilter';
import { getPlotById, getTasksByPlotId } from "../lib/api";
import type { Plot, Task } from "../lib/api";
import { calcHarvestProgressPercent } from '../lib/progress';
import { apiFetch } from "../lib/api";
import { listTasks } from '../lib/api';

type PlotDetailsPageProps = {
  onNavigate: (page: string, plotId?: string) => void;
};

export function PlotDetailsPage({ onNavigate }: PlotDetailsPageProps) {
  const { plotId } = useParams<{ plotId: string }>();
  const id = plotId?.trim();

  // If user somehow lands here without plotId, send them back
  if (!plotId) return <Navigate to="/plots" replace />;

  // Current date set to November 13, 2025
  const TODAY = new Date();

  // DB-backed
  const [plot, setPlot] = useState<Plot | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  // mock-backed
  const [newObservation, setNewObservation] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [forecastRange, setForecastRange] = useState<'1W' | '3M' | '1Y'>('1W');

  const historicalData = useMemo(() => generateMockSensorData(20), []);

  const forecastData = useMemo(() => {
    const days = forecastRange === '1W' ? 7 : forecastRange === '3M' ? 90 : 365;
    return generateMockForecastData(days);
  }, [forecastRange]);

  const plotObservations = useMemo(() => {
    if (!id) return [];
    return mockObservations.filter((o) => o.plotId === id);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        // ✅ Use the helper function from api.ts
        const plotData = await getPlotById(id);
        setPlot(plotData);

        // ✅ Tasks from DB (plot filtered)
        const tasksRes = await listTasks({ plot_id: id });
        setTasks(tasksRes.data ?? []);

        // keep context
        sessionStorage.setItem("last_plot_id", id);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load plot details");
        setPlot(null);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (!id) return <div>Plot not found</div>;
  if (loading && !plot) return <div>Loading...</div>;
  if (!plot) return <div>Plot not found</div>;

  // ✅ consistent progress from DB planting_date
  const progress = calcHarvestProgressPercent(plot.planting_date);

  // ✅ normalize tasks to the format your UI expects
  // If your UI expects fields like `date` + `status`, map here.
  const uiTasks = tasks.map((t: any) => ({
    ...t,
    date: t.task_date,
    status: t.decision ?? t.status, // supports both until all pages migrated
  }));

  // Generate calendar for current month (November 2025)
  const year = TODAY.getFullYear();
  const month = TODAY.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return uiTasks.filter((task) => task.date === dateStr);
  };

  const handleAddObservation = () => {
    if (newObservation.trim()) {
      toast.success('Observation added successfully');
      setNewObservation('');
    }
  };

  const isToday = (day: number) => {
    return day === TODAY.getDate();
  };

  const getTaskColor = (status: string) => {
    if (status === 'Proceed') return 'bg-[#86EFAC] text-[#111827]';
    if (status === 'Pending') return 'bg-[#FDE68A] text-[#111827]';
    return 'bg-[#FCA5A5] text-[#111827]';
  };

  // Format date for x-axis
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => onNavigate('plots')}
            aria-label="Back to plots"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-[20px] text-[#111827]">{plot.name}</h2>
            <p className="text-[16px] text-[#374151]">{plot.crop_type}</p>
          </div>
        </div>
        <StatusBadge status={plot.status} />
      </div>

      {/* Plot Summary Card */}
      <Card className="p-6 rounded-2xl bg-white shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[14px] text-[#6B7280] mb-1">Area</p>
            <p className="text-[18px] text-[#111827]">{plot.area_ha} hectares</p>
          </div>
          <div>
            <p className="text-[14px] text-[#6B7280] mb-1">Planting Date</p>
            <p className="text-[18px] text-[#111827]">
              {new Date(plot.planting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-[14px] text-[#6B7280] mb-1">Growth Stage</p>
            <p className="text-[18px] text-[#111827]">{plot.growth_stage}</p>
          </div>
          <div>
            <p className="text-[14px] text-[#6B7280] mb-1">Progress</p>
            <div className="flex items-center gap-2">
              <p className="text-[18px] text-[#111827]">{progress}%</p>
              <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${progress >= 80 ? 'bg-[#2563eb]' : progress >= 60 ? 'bg-[#2563eb]' : 'bg-[#2563eb]'
                    }`}
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sensor Data Charts */}
          <Card className="p-6 rounded-2xl bg-white shadow-sm">
            <Tabs defaultValue="moisture" className="w-full">
              <TabsList
                className="
        grid w-full grid-cols-4 gap-2
        rounded-2xl mb-6 bg-transparent
      "
              >
                <TabsTrigger
                  value="moisture"
                  className="
          inline-flex items-center justify-center gap-2
          rounded-xl px-3 py-2 text-sm
          text-[#6B7280]
          hover:bg-[#F3FFF7]
          data-[state=active]:bg-[#DCFCE7]
          data-[state=active]:text-[#15803D]
          data-[state=active]:shadow-sm
          transition-colors
        "
                >
                  <Droplets size={16} />
                  Moisture
                </TabsTrigger>

                <TabsTrigger
                  value="ph"
                  className="
          inline-flex items-center justify-center gap-2
          rounded-xl px-3 py-2 text-sm
          text-[#6B7280]
          hover:bg-[#F3FFF7]
          data-[state=active]:bg-[#DCFCE7]
          data-[state=active]:text-[#15803D]
          data-[state=active]:shadow-sm
          transition-colors
        "
                >
                  <FlaskConical size={16} />
                  pH
                </TabsTrigger>

                <TabsTrigger
                  value="nitrogen"
                  className="
          inline-flex items-center justify-center gap-2
          rounded-xl px-3 py-2 text-sm
          text-[#6B7280]
          hover:bg-[#F3FFF7]
          data-[state=active]:bg-[#DCFCE7]
          data-[state=active]:text-[#15803D]
          data-[state=active]:shadow-sm
          transition-colors
        "
                >
                  <Leaf size={16} />
                  Nitrogen
                </TabsTrigger>

                <TabsTrigger
                  value="temp"
                  className="
          inline-flex items-center justify-center gap-2
          rounded-xl px-3 py-2 text-sm
          text-[#6B7280]
          hover:bg-[#F3FFF7]
          data-[state=active]:bg-[#DCFCE7]
          data-[state=active]:text-[#15803D]
          data-[state=active]:shadow-sm
          transition-colors
        "
                >
                  <ThermometerSun size={16} />
                  Temperature
                </TabsTrigger>
              </TabsList>

              <TabsContent value="moisture" className="mt-0">
                <h3 className="text-[20px] text-[#111827] mb-6">Soil Moisture Levels</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Historical Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex items-start mb-4">
                      <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={historicalData}>
                        <defs>
                          <linearGradient id="moistureHistGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="moisture"
                          stroke="#16A34A"
                          fill="url(#moistureHistGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 bg-[#16A34A]"></div>
                      <span>● Historical (solid)</span>
                    </div>
                  </div>

                  {/* Forecast Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex flex-col mb-4">
                      <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7–365 Days)</h4>
                      <ForecastFilter selected={forecastRange} onChange={setForecastRange} />
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={forecastData} key={forecastRange}>
                        <defs>
                          <linearGradient id="moistureForeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#86EFAC" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#86EFAC" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="moisture"
                          stroke="#86EFAC"
                          fill="url(#moistureForeGradient)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 border-t-2 border-dashed border-[#86EFAC]"></div>
                      <span>▬ ▬ Forecast (dashed)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ph" className="mt-0">
                <h3 className="text-[20px] text-[#111827] mb-6">Soil pH Levels</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Historical Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex items-start mb-4">
                      <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          domain={[4, 8]}
                          label={{ value: 'pH', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Line type="monotone" dataKey="ph" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 bg-[#16A34A]"></div>
                      <span>● Historical (solid)</span>
                    </div>
                  </div>

                  {/* Forecast Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex flex-col mb-4">
                      <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7–365 Days)</h4>
                      <ForecastFilter selected={forecastRange} onChange={setForecastRange} />
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={forecastData} key={forecastRange}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          domain={[4, 8]}
                          label={{ value: 'pH', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ph"
                          stroke="#86EFAC"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 border-t-2 border-dashed border-[#86EFAC]"></div>
                      <span>▬ ▬ Forecast (dashed)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="nitrogen" className="mt-0">
                <h3 className="text-[20px] text-[#111827] mb-6">Nitrogen Content</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Historical Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex items-start mb-4">
                      <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          label={{ value: 'mg/kg', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Line type="monotone" dataKey="nitrogen" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 bg-[#16A34A]"></div>
                      <span>● Historical (solid)</span>
                    </div>
                  </div>

                  {/* Forecast Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex flex-col mb-4">
                      <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7–365 Days)</h4>
                      <ForecastFilter selected={forecastRange} onChange={setForecastRange} />
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={forecastData} key={forecastRange}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          label={{ value: 'mg/kg', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="nitrogen"
                          stroke="#86EFAC"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 border-t-2 border-dashed border-[#86EFAC]"></div>
                      <span>▬ ▬ Forecast (dashed)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="temp" className="mt-0">
                <h3 className="text-[20px] text-[#111827] mb-6">Temperature</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Historical Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex items-start mb-4">
                      <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={historicalData}>
                        <defs>
                          <linearGradient id="tempHistGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Area type="monotone" dataKey="temperature" stroke="#16A34A" fill="url(#tempHistGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 bg-[#16A34A]"></div>
                      <span>● Historical (solid)</span>
                    </div>
                  </div>

                  {/* Forecast Data Chart */}
                  <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                    <div className="h-[60px] flex flex-col mb-4">
                      <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7–365 Days)</h4>
                      <ForecastFilter selected={forecastRange} onChange={setForecastRange} />
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={forecastData} key={forecastRange}>
                        <defs>
                          <linearGradient id="tempForeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#86EFAC" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#86EFAC" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={formatXAxis}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={12}
                          label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                          labelStyle={{ color: '#111827' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="temperature"
                          stroke="#86EFAC"
                          fill="url(#tempForeGradient)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                      <div className="w-4 h-0.5 border-t-2 border-dashed border-[#86EFAC]"></div>
                      <span>▬ ▬ Forecast (dashed)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Calendar View */}
          <Card className="p-6 rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] text-[#111827]">Task Calendar - November 2025</h3>
              <CalendarIcon size={20} className="text-[#6B7280]" />
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                <div key={day} className="text-center py-2 px-3 bg-[#EBF8EF] rounded-lg">
                  <span className="text-[14px] text-[#111827]">{day.slice(0, 3)}</span>
                </div>
              ))}
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-[100px] bg-[#F9FAFB] rounded-lg" />;
                }

                const tasks = getTasksForDate(day);
                const isTodayCell = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                    className={`min-h-[100px] p-2 rounded-lg border transition-all ${isTodayCell
                      ? 'border-[#15803D] bg-[#DCFCE7] border-2'
                      : 'border-[#E5E7EB] hover:border-[#15803D] hover:bg-[#F9FAFB]'
                      }`}
                    aria-label={`Day ${day}, ${tasks.length} tasks`}
                  >
                    <div className="text-[14px] text-[#111827] mb-1">{day}</div>
                    <div className="space-y-0.5">
                      {tasks.slice(0, 2).map((task) => (
                        <TooltipProvider key={task.id}>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`text-[11px] p-1 rounded truncate cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${getTaskColor(task.status)}`}
                                style={{ fontWeight: 500 }}
                              >
                                {task.title}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="text-[14px]">{task.title}</p>
                                <p className="text-[12px] text-[#6B7280]">Worker: {task.assignedWorker}</p>
                              </div>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      ))}
                      {tasks.length > 2 && (
                        <div className="text-[10px] text-[#6B7280] text-center">+{tasks.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Tasks for Plot */}
          <Card className="p-6 rounded-2xl bg-white shadow-sm">
            <h3 className="text-[18px] text-[#111827] mb-4">Scheduled Tasks</h3>
            <div className="space-y-3">
              {uiTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="p-3 bg-[#F9FAFB] rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[14px] text-[#111827]">{task.title}</p>
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                  <p className="text-[14px] text-[#6B7280] mb-1">{new Date(task.date).toLocaleDateString()}</p>
                  <p className="text-[14px] text-[#6B7280]">Worker: {task.assignedWorker}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Observations */}
          <Card className="p-6 rounded-2xl bg-white shadow-sm">
            <h3 className="text-[18px] text-[#111827] mb-4">Observations</h3>
            <div className="space-y-4 mb-4">
              {plotObservations.map((obs) => (
                <div key={obs.id} className="border-l-2 border-[#15803D] pl-3">
                  <p className="text-[14px] text-[#6B7280] mb-1">
                    {obs.author} • {new Date(obs.date).toLocaleDateString()}
                  </p>
                  <p className="text-[14px] text-[#111827]">{obs.note}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Add a new observation..."
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                className="rounded-xl border-[#E5E7EB] min-h-[80px]"
                aria-label="New observation"
              />
              <Button
                onClick={handleAddObservation}
                className="w-full bg-[#15803D] hover:bg-[#16A34A] rounded-xl"
                disabled={!newObservation.trim()}
              >
                Add Observation
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

