import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { mockPlots, generateMockSensorData, generateMockForecastData } from '../lib/mockData';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { ForecastFilter } from '../components/ForecastFilter';

export function AnalyticsPage() {
  const [selectedPlot, setSelectedPlot] = useState<string>('all');
  const [forecastRange, setForecastRange] = useState<'1W' | '3M' | '1Y'>('1W');

  const historicalData = useMemo(() => generateMockSensorData(20), []);

  const forecastData = useMemo(() => {
    const days = forecastRange === '1W' ? 7 : forecastRange === '3M' ? 90 : 365;
    return generateMockForecastData(days);
  }, [forecastRange]);

  // Calculate trends
  const moistureTrend = historicalData[historicalData.length - 1].moisture - historicalData[0].moisture;
  const phTrend = historicalData[historicalData.length - 1].ph - historicalData[0].ph;
  const nitrogenTrend = historicalData[historicalData.length - 1].nitrogen - historicalData[0].nitrogen;

  // Format date for x-axis
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] text-[#111827]">Analytics & Insights</h2>
          <p className="text-[16px] text-[#374151]">CropSense data analysis and forecasting</p>
        </div>

        <Select value={selectedPlot} onValueChange={setSelectedPlot}>
          <SelectTrigger className="w-[200px] rounded-xl" aria-label="Select plot">
            <SelectValue placeholder="Select Plot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plots (Average)</SelectItem>
            {mockPlots.map((plot) => (
              <SelectItem key={plot.id} value={plot.id}>
                {plot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">Moisture Trend (20d)</p>
            {moistureTrend > 0 ? (
              <TrendingUp className="text-[#16A34A]" size={20} />
            ) : (
              <TrendingDown className="text-[#DC2626]" size={20} />
            )}
          </div>
          <p className="text-[20px] text-[#111827] mb-1">
            {historicalData[historicalData.length - 1].moisture.toFixed(1)}%
          </p>
          <p className={`text-[14px] ${moistureTrend > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {moistureTrend > 0 ? '+' : ''}
            {moistureTrend.toFixed(1)}% from start
          </p>
        </Card>

        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">pH Trend (20d)</p>
            {Math.abs(phTrend) < 0.2 ? (
              <Activity className="text-[#2563EB]" size={20} />
            ) : phTrend > 0 ? (
              <TrendingUp className="text-[#16A34A]" size={20} />
            ) : (
              <TrendingDown className="text-[#DC2626]" size={20} />
            )}
          </div>
          <p className="text-[20px] text-[#111827] mb-1">
            {historicalData[historicalData.length - 1].ph.toFixed(2)}
          </p>
          <p className={`text-[14px] ${Math.abs(phTrend) < 0.2 ? 'text-[#2563EB]' : phTrend > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {phTrend > 0 ? '+' : ''}
            {phTrend.toFixed(2)} from start
          </p>
        </Card>

        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">Nitrogen Trend (20d)</p>
            {nitrogenTrend > 0 ? (
              <TrendingUp className="text-[#16A34A]" size={20} />
            ) : (
              <TrendingDown className="text-[#DC2626]" size={20} />
            )}
          </div>
          <p className="text-[20px] text-[#111827] mb-1">
            {historicalData[historicalData.length - 1].nitrogen.toFixed(0)} mg/kg
          </p>
          <p className={`text-[14px] ${nitrogenTrend > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {nitrogenTrend > 0 ? '+' : ''}
            {nitrogenTrend.toFixed(0)} mg/kg from start
          </p>
        </Card>
      </div>

      {/* Detailed Charts */}
      <Card className="p-6 rounded-2xl bg-white shadow-sm">
        <Tabs defaultValue="moisture" className="w-full">
          <TabsList
            className="
    grid w-full grid-cols-5 gap-2
    bg-transparent rounded-2xl mb-6
  "
          >
            <TabsTrigger
              value="moisture"
              className="
      rounded-xl px-3 py-2 text-sm
      text-[#6B7280]
      hover:bg-[#F3FFF7]
      data-[state=active]:bg-[#DCFCE7]
      data-[state=active]:text-[#15803D]
      data-[state=active]:shadow-sm
      transition-colors
    "
            >
              Moisture
            </TabsTrigger>

            <TabsTrigger
              value="ph"
              className="
      rounded-xl px-3 py-2 text-sm
      text-[#6B7280]
      hover:bg-[#F3FFF7]
      data-[state=active]:bg-[#DCFCE7]
      data-[state=active]:text-[#15803D]
      data-[state=active]:shadow-sm
      transition-colors
    "
            >
              pH Levels
            </TabsTrigger>

            <TabsTrigger
              value="nitrogen"
              className="
      rounded-xl px-3 py-2 text-sm
      text-[#6B7280]
      hover:bg-[#F3FFF7]
      data-[state=active]:bg-[#DCFCE7]
      data-[state=active]:text-[#15803D]
      data-[state=active]:shadow-sm
      transition-colors
    "
            >
              Nitrogen
            </TabsTrigger>

            <TabsTrigger
              value="temp"
              className="
      rounded-xl px-3 py-2 text-sm
      text-[#6B7280]
      hover:bg-[#F3FFF7]
      data-[state=active]:bg-[#DCFCE7]
      data-[state=active]:text-[#15803D]
      data-[state=active]:shadow-sm
      transition-colors
    "
            >
              Temperature
            </TabsTrigger>

            <TabsTrigger
              value="rainfall"
              className="
      rounded-xl px-3 py-2 text-sm
      text-[#6B7280]
      hover:bg-[#F3FFF7]
      data-[state=active]:bg-[#DCFCE7]
      data-[state=active]:text-[#15803D]
      data-[state=active]:shadow-sm
      transition-colors
    "
            >
              Rainfall
            </TabsTrigger>
          </TabsList>


          <TabsContent value="moisture" className="mt-0">
            <h3 className="text-[20px] text-[#111827] mb-6">Soil Moisture Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex items-start mb-4">
                  <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
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
                      name="Moisture (%)"
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
                <ResponsiveContainer width="100%" height={320}>
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
                      name="Moisture (%)"
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
            <h3 className="text-[20px] text-[#111827] mb-6">Soil pH Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex items-start mb-4">
                  <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
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
                    <Line
                      type="monotone"
                      dataKey="ph"
                      stroke="#16A34A"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="pH Level"
                    />
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
                <ResponsiveContainer width="100%" height={320}>
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
                      name="pH Level"
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
            <h3 className="text-[20px] text-[#111827] mb-6">Nitrogen Content Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex items-start mb-4">
                  <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={historicalData}>
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
                    <Bar
                      dataKey="nitrogen"
                      fill="#16A34A"
                      radius={[8, 8, 0, 0]}
                      name="Nitrogen (mg/kg)"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                  <div className="w-4 h-3 bg-[#16A34A] rounded-t"></div>
                  <span>● Historical (solid)</span>
                </div>
              </div>

              {/* Forecast Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex flex-col mb-4">
                  <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7–365 Days)</h4>
                  <ForecastFilter selected={forecastRange} onChange={setForecastRange} />
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={forecastData} key={forecastRange}>
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
                    <Bar
                      dataKey="nitrogen"
                      fill="#86EFAC"
                      radius={[8, 8, 0, 0]}
                      name="Nitrogen (mg/kg)"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                  <div className="w-4 h-3 bg-[#86EFAC] rounded-t"></div>
                  <span>▬ ▬ Forecast (lighter tone)</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="temp" className="mt-0">
            <h3 className="text-[20px] text-[#111827] mb-6">Temperature Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex items-start mb-4">
                  <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
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
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#16A34A"
                      fill="url(#tempHistGradient)"
                      strokeWidth={2}
                      name="Temperature (°C)"
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
                <ResponsiveContainer width="100%" height={320}>
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
                      name="Temperature (°C)"
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

          <TabsContent value="rainfall" className="mt-0">
            <h3 className="text-[20px] text-[#111827] mb-6">Rainfall Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex items-start mb-4">
                  <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={historicalData}>
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
                      label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                      labelStyle={{ color: '#111827' }}
                    />
                    <Bar
                      dataKey="rainfall"
                      fill="#16A34A"
                      radius={[8, 8, 0, 0]}
                      name="Rainfall (mm)"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                  <div className="w-4 h-3 bg-[#16A34A] rounded-t"></div>
                  <span>● Historical (solid)</span>
                </div>
              </div>

              {/* Forecast Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex flex-col mb-4">
                  <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7–365 Days)</h4>
                  <ForecastFilter selected={forecastRange} onChange={setForecastRange} />
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={forecastData} key={forecastRange}>
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
                      label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                      labelStyle={{ color: '#111827' }}
                    />
                    <Bar
                      dataKey="rainfall"
                      fill="#86EFAC"
                      radius={[8, 8, 0, 0]}
                      name="Rainfall (mm)"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                  <div className="w-4 h-3 bg-[#86EFAC] rounded-t"></div>
                  <span>▬ ▬ Forecast (lighter tone)</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* AI Recommendations */}
      <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#15803D] to-[#16A34A] text-white shadow-sm">
        <h3 className="text-[18px] mb-4">AI Recommendations</h3>
        <div className="space-y-3">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-[16px] opacity-90 mb-1">🌧️ Weather Alert</p>
            <p className="text-[14px] opacity-75">
              Heavy rainfall expected in 3 days. Consider postponing fertilizer application.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-[16px] opacity-90 mb-1">🧪 Soil Treatment</p>
            <p className="text-[14px] opacity-75">
              pH levels trending acidic in Plot B-1. Schedule lime treatment for optimal growth.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-[16px] opacity-90 mb-1">💧 Irrigation Optimization</p>
            <p className="text-[14px] opacity-75">
              Moisture levels stable. Current irrigation schedule is optimal.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}