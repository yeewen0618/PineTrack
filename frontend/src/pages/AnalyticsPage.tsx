import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
// Remove mockPlots import
import { getAnalyticsHistory, getAnalyticsForecast, getRecommendations } from '../lib/api';
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
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ForecastFilter } from '../components/ForecastFilter';

export function AnalyticsPage() {
  const [selectedPlot, setSelectedPlot] = useState<string>('all');
  const [forecastRange, setForecastRange] = useState<'1W'>('1W');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real data on mount and when forecast range changes
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // 1. Fetch History (Fixed window for now)
        const history = await getAnalyticsHistory(30);
        const processedHistory = history.map((item: any) => ({
          ...item,
          date: item.data_added,
          temperature_raw: item.temperature,
          temperature_clean: item.cleaned_temperature,
          moisture_raw: item.soil_moisture,
          moisture_clean: item.cleaned_soil_moisture,
          nitrogen_raw: item.nitrogen,
          nitrogen_clean: item.cleaned_nitrogen,
        }));
        setHistoricalData(processedHistory);

        // 2. Fetch Forecast
        const days = 7;
        // if (forecastRange === '3M') days = 90;
        // if (forecastRange === '1Y') days = 90;

        const forecast = await getAnalyticsForecast(days);
        // Process forecast if needed (dates are already ISO)
        setForecastData(forecast);

        // 3. Fetch Recommendations
        const recs = await getRecommendations(205);
        setRecommendations(recs);

      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [forecastRange]);


  // Calculate trends safely
  const calculateTrend = (key: string) => {
    if (historicalData.length < 2) return 0;
    const last = historicalData[historicalData.length - 1][key] || 0;
    const first = historicalData[0][key] || 0;
    return last - first;
  };

  const moistureTrend = calculateTrend('moisture_clean');
  const nitrogenTrend = calculateTrend('nitrogen_clean');

  // Format date for x-axis
  const formatXAxis = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
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
            {/* For now we just hardcode plot options as we transition from mock data */}
            <SelectItem value="plot-1">Plot 1</SelectItem>
            <SelectItem value="plot-2">Plot 2</SelectItem>
            <SelectItem value="plot-3">Plot 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">Moisture Trend</p>
            {moistureTrend > 0 ? (
              <TrendingUp className="text-[#16A34A]" size={20} />
            ) : (
              <TrendingDown className="text-[#DC2626]" size={20} />
            )}
          </div>
          <p className="text-[20px] text-[#111827] mb-1">
            {historicalData.length > 0 ? (historicalData[historicalData.length - 1].moisture_clean || 0).toFixed(1) : '--'}%
          </p>
          <p className={`text-[14px] ${moistureTrend > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {moistureTrend > 0 ? '+' : ''}
            {moistureTrend.toFixed(1)}% from start
          </p>
        </Card>

        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">Nitrogen Trend</p>
            {nitrogenTrend > 0 ? (
              <TrendingUp className="text-[#16A34A]" size={20} />
            ) : (
              <TrendingDown className="text-[#DC2626]" size={20} />
            )}
          </div>
          <p className="text-[20px] text-[#111827] mb-1">
            {historicalData.length > 0 ? (historicalData[historicalData.length - 1].nitrogen_clean || 0).toFixed(0) : '--'} mg/kg
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
    grid w-full grid-cols-3 gap-2
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
                      <linearGradient id="moistureCleanGradient" x1="0" y1="0" x2="0" y2="1">
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
                    <Legend verticalAlign="top" height={36}/>
                    {/* Render Cleaned Data FIRST (Background Area) */}
                    <Area
                      type="monotone"
                      dataKey="moisture_clean"
                      stroke="#16A34A"
                      fill="url(#moistureCleanGradient)"
                      strokeWidth={2}
                      name="Cleaned Data"
                    />
                    {/* Render Raw Data SECOND (Foreground Line) - Red for visibility */}
                    <Area
                      type="monotone"
                      dataKey="moisture_raw"
                      stroke="#DC2626"
                      fill="none"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      name="Raw Reading"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex flex-col mb-4">
                  <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7 Days)</h4>
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
                      dataKey="soil_moisture"
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



          <TabsContent value="nitrogen" className="mt-0">
            <h3 className="text-[20px] text-[#111827] mb-6">Nitrogen Content Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex items-start mb-4">
                  <h4 className="text-[18px] text-[#111827]">Historical Data (Last 20 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="nitrogenCleanGradient" x1="0" y1="0" x2="0" y2="1">
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
                      label={{ value: 'mg/kg', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                      labelStyle={{ color: '#111827' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    {/* Render Cleaned Data FIRST (Background Area) */}
                    <Area
                      type="monotone"
                      dataKey="nitrogen_clean"
                      stroke="#16A34A"
                      fill="url(#nitrogenCleanGradient)"
                      strokeWidth={2}
                      name="Cleaned Data"
                    />
                    {/* Render Raw Data SECOND (Foreground Line) - Red for visibility */}
                    <Area
                      type="monotone"
                      dataKey="nitrogen_raw"
                      stroke="#DC2626"
                      fill="none"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      name="Raw Reading"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex flex-col mb-4">
                  <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7 Days)</h4>
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
                      <linearGradient id="tempCleanGradient" x1="0" y1="0" x2="0" y2="1">
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
                    <Legend verticalAlign="top" height={36}/>
                    {/* Render Cleaned Data FIRST (Background Area) */}
                    <Area
                      type="monotone"
                      dataKey="temperature_clean"
                      stroke="#16A34A"
                      fill="url(#tempCleanGradient)"
                      strokeWidth={2}
                      name="Cleaned Data"
                    />
                    {/* Render Raw Data SECOND (Foreground Line) - Red for visibility */}
                    <Area
                      type="monotone"
                      dataKey="temperature_raw"
                      stroke="#DC2626"
                      fill="none"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      name="Raw Reading"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Data Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex flex-col mb-4">
                  <h4 className="text-[18px] text-[#111827] mb-2">Forecast Data (Next 7 Days)</h4>
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


        </Tabs>
      </Card>

      {/* AI Recommendations */}
      <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-[18px] font-semibold">AI Recommendations (Rule Based)</h3>
           <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">Updated Today</span>
        </div>
        
        <div className="space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((rec, idx) => (
              <div key={idx} className="bg-white/10 rounded-xl p-4 shadow-sm border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[16px] font-medium opacity-95">
                    {rec.category === 'Critical' && '🚨 '}
                    {rec.category === 'Warning' && '⚠️ '}
                    {rec.category === 'Action' && '⚡ '}
                    {rec.category === 'Info' && 'ℹ️ '}
                    {rec.parameter} Alert
                  </p>
                  {rec.priority <= 2 && (
                    <span className="text-[10px] bg-red-500/80 px-2 py-0.5 rounded text-white font-bold">HIGH PRIORITY</span>
                  )}
                </div>
                <p className="text-[14px] opacity-90 leading-relaxed font-light">
                  {rec.message}
                </p>
              </div>
            ))
          ) : (
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="opacity-90">✅ No critical actions required today.</p>
              <p className="text-sm opacity-70 mt-1">System monitoring active.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}