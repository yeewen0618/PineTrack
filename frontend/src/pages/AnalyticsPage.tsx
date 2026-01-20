import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
// Remove mockPlots import
import { getAnalyticsHistory, getAnalyticsForecast, getWeatherAnalytics, listTasks, getWeatherRescheduleSuggestions } from '../lib/api';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { SensorAnalyticsTabs } from '../components/analytics/SensorAnalyticsTabs';
import { InsightRecommendationsCard } from '../components/insights/InsightRecommendationsCard';
import type { AnalyticsData, WeatherAnalyticsItem, ForecastRange } from '../components/analytics/SensorAnalyticsTabs';

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
  const [forecastRange, setForecastRange] = useState<ForecastRange>('1W');
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


  // Calculate trends safely
  const calculateTrend = (key: string) => {
    if (historicalData.length < 2) return 0;
    const lastItem = historicalData[historicalData.length - 1];
    const firstItem = historicalData[0];
    
    // Explicitly cast to number to avoid TS arithmetic error on 'unknown'
    const last = Number(lastItem[key]) || 0;
    const first = Number(firstItem[key]) || 0;
    
    return last - first;
  };

  const moistureTrend = calculateTrend('moisture_clean');
  const nitrogenTrend = calculateTrend('nitrogen_clean');

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
        <SensorAnalyticsTabs
          historicalData={historicalData}
          forecastData={forecastData}
          weatherData={weatherData}
          forecastRange={forecastRange}
          onForecastRangeChange={setForecastRange}
        />
      </Card>
      {/* Insight Recommendation (Weather-based) */}
      <InsightRecommendationsCard
        variant="analytics"
        suggestions={weatherSuggestions}
      />
    </div>
  );
}
