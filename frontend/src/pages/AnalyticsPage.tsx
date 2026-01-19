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
import { getAnalyticsHistory, getAnalyticsForecast, getWeatherAnalytics, listTasks, getWeatherRescheduleSuggestions } from '../lib/api';
import {
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

interface AnalyticsData {
  date: string;
  temperature_raw: number;
  temperature_clean: number;
  moisture_raw: number;
  moisture_clean: number;
  // allow other props for flexibility
  [key: string]: unknown;
}

interface WeatherAnalyticsItem {
   date: string;
   time?: string;
   type?: string;
   rain?: number;
   [key: string]: unknown;
}

interface Suggestion {
  type: string;
  task_name: string;
  task_id?: string;
  original_date: string;
  suggested_date: string;
  reason: string;
}

export function AnalyticsPage() {
  const [selectedPlot, setSelectedPlot] = useState<string>('all');
  const [forecastRange, setForecastRange] = useState<'1W'>('1W');
  const [historicalData, setHistoricalData] = useState<AnalyticsData[]>([]);
  const [forecastData, setForecastData] = useState<unknown[]>([]); // Forecast structure might vary
  const [weatherData, setWeatherData] = useState<WeatherAnalyticsItem[]>([]);
  const [weatherSuggestions, setWeatherSuggestions] = useState<Suggestion[]>([]);
  const [sensorAlerts, setSensorAlerts] = useState<Suggestion[]>([]);
  // const [loading, setLoading] = useState(true);

  // Fetch real data on mount and when forecast range changes
  useEffect(() => {
    async function fetchData() {
      // setLoading(true);
      const safeFetch = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await promise;
        } catch (e) {
          console.error("Partial fetch error:", e);
          return fallback;
        }
      };
      try {
        // 1. Fetch History
        interface RawBackendHistory {
          data_added: string;
          temperature: number;
          cleaned_temperature: number;
          soil_moisture: number;
          cleaned_soil_moisture: number;
          [key: string]: unknown;
        }

        const history = await safeFetch<RawBackendHistory[]>(
          getAnalyticsHistory(30, selectedPlot !== 'all' ? selectedPlot : undefined) as unknown as Promise<RawBackendHistory[]>, 
          []
        );
        const processedHistory: AnalyticsData[] = history.map((item) => ({
          ...item,
          date: item.data_added,
          temperature_raw: item.temperature,
          temperature_clean: item.cleaned_temperature,
          moisture_raw: item.soil_moisture,
          moisture_clean: item.cleaned_soil_moisture
        }));
        setHistoricalData(processedHistory);

        // 2. Fetch Forecast (filter by selected plot)
        const days = 7;
        const forecast = await safeFetch<unknown[]>(
          getAnalyticsForecast(days, selectedPlot !== 'all' ? selectedPlot : undefined), 
          []
        );
        setForecastData(forecast);

        // 3. Fetch Recommendations - Removed

        // 4. Fetch Weather Data
        const weather = await safeFetch<WeatherAnalyticsItem[]>(getWeatherAnalytics(), []);
        setWeatherData(weather);

        // 5. Fetch Tasks for Tomorrow (simulate for demo: all tasks with due_date = tomorrow)
        const allTasksRes = await safeFetch(listTasks(), { ok: true, data: [] });
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        // t is typed as any in original, but now listTasks is typed. use 'as any' if strictly needed or let TS infer
        // listTasks returns { data: Task[] }
        const tasksForTomorrow = allTasksRes.data.filter((t) => t.task_date === tomorrowStr);

        // 6. Prepare weather forecast for tomorrow (simulate: filter weatherData for tomorrow)
        const weatherForecastForTomorrow = weather.filter((w: WeatherAnalyticsItem) => {
          // Assume weatherData has 'date' or 'time' field
          const dateStr = w.date || w.time;
          return dateStr && dateStr.slice(0, 10) === tomorrowStr;
        });

        // 7. Calculate Sensor Summary (Last available data)
        let sensorSummary = null;
        if (processedHistory.length > 0) {
           const latest = processedHistory[processedHistory.length - 1];
           sensorSummary = {
             avg_moisture: latest.moisture_clean,
             avg_temp: latest.temperature_clean
           };
        }

        // 8. Fetch Insight Recommendations (Weather + Sensors)
        let suggestions = [];
        // We always try to fetch, even if no tasks, because we might have system triggers (drainage/sunburn)
        try {
            // Note: In real app, pass all tasks or filtered by range. 
            // For now passing tasksForTomorrow plus maybe today if needed, or just let backend decide.
            // But previous logic was specific to "tomorrow tasks", let's keep tasksForTomorrow 
            // but the new backend logic can handle generally.
            // Ideally we pass a broader range of tasks. 
            const result = await getWeatherRescheduleSuggestions(tasksForTomorrow, weatherForecastForTomorrow, sensorSummary);
            const allSuggestions = result.suggestions ?? [];
            
            // Separate sensor alerts from regular suggestions
            const alerts = allSuggestions.filter(s => s.affected_by === 'sensor_health');
            suggestions = allSuggestions.filter(s => s.affected_by !== 'sensor_health');
            
            setSensorAlerts(alerts);
        } catch (e) {
            console.error("Insight suggestion error:", e);
        }
        setWeatherSuggestions(suggestions);

      } catch (err) {
        console.error("Critical error in analytics:", err);
      } finally {
        // setLoading(false);
      }
    }
    fetchData();
  }, [forecastRange, selectedPlot]);


  // Get today's readings (latest available data)
  const getTodayReading = (key: string) => {
    if (historicalData.length === 0) return 0;
    const latest = historicalData[historicalData.length - 1];
    return Number(latest[key]) || 0;
  };

  const todayMoisture = getTodayReading('moisture_clean');
  const todayTemperature = getTodayReading('temperature_clean');

  // Get today's weather (sum of rain for latest day)
  const todayWeatherRain = useMemo(() => {
    if (weatherData.length === 0) return 0;
    
    // Get latest date from weather data
    const latestDate = weatherData
      .filter(d => d.time || d.date)
      .map(d => String(d.time || d.date).substring(0, 10))
      .sort()
      .reverse()[0];
    
    if (!latestDate) return 0;
    
    // Sum all rain for that day
    return weatherData
      .filter(d => String(d.time || d.date).substring(0, 10) === latestDate)
      .reduce((sum, item) => sum + (Number(item.rain) || 0), 0);
  }, [weatherData]);

  // Split and aggregate weather data for Historical (Daily Sum)
  const weatherHistorical = useMemo(() => {
    const rawData = weatherData.filter(d => d.type === 'Historical');
    
    // Aggregate by day
    const dailyMap = new Map<string, number>();
    
    rawData.forEach(item => {
      // Assuming item.time is ISO string like "2025-01-17T00:00"
      // Take first 10 chars (YYYY-MM-DD)
      const dateStr = String(item.time).substring(0, 10); 
      const rain = item.rain || 0;
      
      if (dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, dailyMap.get(dateStr)! + rain);
      } else {
        dailyMap.set(dateStr, rain);
      }
    });

    // Convert back to array
    const aggregated = Array.from(dailyMap.entries()).map(([date, rain]) => ({
      time: date,
      rain: rain
    })).sort((a, b) => a.time.localeCompare(b.time));

    console.log("Historical Weather (Daily):", aggregated); 
    return aggregated;
  }, [weatherData]);
  
  const weatherForecast = useMemo(() => {
    const data = weatherData.filter(d => d.type === 'Forecast');
    console.log("Forecast Weather:", data); // DEBUGGING
    return data;
  }, [weatherData]);

  // Format date for x-axis
  const formatXAxis = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    // Jan 12 (5PM)
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' }).replace(',', ' (').replace(/ AM| PM/, '') + (date.getHours() >= 12 ? 'PM)' : 'AM)');
  };

  const formatDailyAxis = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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

      {/* Today's Reading Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Moisture */}
        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">Soil Moisture</p>
            <div className="w-8 h-8 bg-[#16A34A] rounded-lg flex items-center justify-center text-white">
              💧
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#111827] mb-1">
            {todayMoisture.toFixed(1)}%
          </p>
          <p className="text-[12px] text-[#6B7280]">
            Latest reading
          </p>
        </Card>

        {/* Temperature */}
        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">Temperature</p>
            <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center text-white">
              🌡️
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#111827] mb-1">
            {todayTemperature.toFixed(1)}°C
          </p>
          <p className="text-[12px] text-[#6B7280]">
            Latest reading
          </p>
        </Card>

        {/* Weather (Rain) */}
        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-[#6B7280]">Rainfall Today</p>
            <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center text-white">
              🌧️
            </div>
          </div>
          <p className="text-[28px] font-semibold text-[#111827] mb-1">
            {todayWeatherRain.toFixed(1)} mm
          </p>
          <p className="text-[12px] text-[#6B7280]">
            Total rainfall
          </p>
        </Card>
      </div>

      {/* Sensor Health Alerts */}
      {sensorAlerts.length > 0 && (
        <div className="space-y-2">
          {sensorAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-r from-[#FEE2E2] to-[#FECACA] border-l-4 border-[#DC2626] rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#DC2626] rounded-full flex items-center justify-center text-white text-lg">
                  ⚠️
                </div>
                <div className="flex-1">
                  <h4 className="text-[16px] font-semibold text-[#991B1B] mb-1">
                    {alert.task_name}
                  </h4>
                  <p className="text-[14px] text-[#7C2D12] leading-relaxed">
                    {alert.reason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
              value="weather"
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
              Weather
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
                      labelFormatter={formatXAxis}
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
                      labelFormatter={formatXAxis}
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
                      labelFormatter={formatXAxis}
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
                      labelFormatter={formatXAxis}
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

          <TabsContent value="weather" className="mt-0">
            <h3 className="text-[20px] text-[#111827] mb-6">Local Weather Conditions (Open-Meteo)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Historical Weather Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex items-start mb-4">
                  <h4 className="text-[18px] text-[#111827]">Historical Rainfall (Daily Sum - Last 20 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={weatherHistorical}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="time"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={formatDailyAxis}
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
                      formatter={(value: unknown) => [`${Number(value).toFixed(1)} mm`, 'Rain']}
                      labelFormatter={formatDailyAxis}
                    />
                    <Legend verticalAlign="top" height={36}/>
                     <Bar
                      dataKey="rain"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                      name="Rain (mm)"
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>

              {/* Forecast Weather Chart */}
              <div className="bg-[#F9FAFB] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col">
                <div className="h-[60px] flex flex-col mb-4">
                  <h4 className="text-[18px] text-[#111827] mb-2">Rainfall Forecast (Next 7 Days)</h4>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={weatherForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="time"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={formatXAxis}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      domain={[0, 16]}
                      label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#6B7280' } }}
                    />
                    <Tooltip
                      labelFormatter={formatXAxis}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 14 }}
                      labelStyle={{ color: '#111827' }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                     <Bar
                      dataKey="rain"
                      fill="#93C5FD" 
                      radius={[4, 4, 0, 0]}
                      name="Rain (mm)"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-3 text-[14px] text-[#6B7280]">
                   {/* Legend description if needed, logic for 'Forecast (dashed)' removed as bar chart doesn't use dashes */}
                   <div className="w-4 h-4 bg-[#93C5FD] rounded-sm"></div>
                  <span>Forecast</span>
                </div>
             </div>

            </div>
          </TabsContent>


        </Tabs>
      </Card>

      {/* Insight Recommendation (Weather-based) */}
      <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-[18px] font-semibold">Insight Recommendation</h3>
        </div>
        <div className="space-y-3">
          {weatherSuggestions.length > 0 ? (
            weatherSuggestions.map((sugg, idx) => {
              let icon = '';
              if (sugg.type === 'DELAY') icon = '⏳';
              else if (sugg.type === 'TIME_SHIFT') icon = '🕘';
              else if (sugg.type === 'TRIGGER') icon = '🚨';
              else if (sugg.type === 'PRIORITY') icon = '🔥';

              // Clean up task name - remove ID portion if present
              const cleanTaskName = sugg.task_name.replace(/\s*\(ID:.*?\)\s*$/i, '').trim();

              return (
              <div key={idx} className="bg-white/10 rounded-xl p-4 shadow-sm border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[16px] font-medium opacity-95">
                    {icon} {cleanTaskName}
                  </p>
                </div>
                <p className="text-[14px] opacity-90 leading-relaxed font-light">
                  {sugg.reason}
                </p>
              </div>
              );
            })
          ) : (
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="opacity-90">No Actionable Insight Required</p>
              <p className="text-sm opacity-70 mt-1">All tasks are safe to proceed.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}