import React, { useState, useEffect } from 'react';
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
          nitrogen: number;
          cleaned_nitrogen: number;
          [key: string]: unknown;
        }

        const history = await safeFetch<RawBackendHistory[]>(getAnalyticsHistory(30) as unknown as Promise<RawBackendHistory[]>, []);
        const processedHistory: AnalyticsData[] = history.map((item) => ({
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
        const forecast = await safeFetch<unknown[]>(getAnalyticsForecast(days), []);
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
             avg_n: latest.nitrogen_clean,
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
            suggestions = result.suggestions ?? [];
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
  }, [forecastRange]);


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
        <SensorAnalyticsTabs
          historicalData={historicalData}
          forecastData={forecastData}
          weatherData={weatherData}
          forecastRange={forecastRange}
          onForecastRangeChange={setForecastRange}
        />
      </Card>

      {/* Insight Recommendation (Weather-based) */}
      <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-[18px] font-semibold">Insight Recommendation</h3>
        </div>
        <div className="space-y-3">
          {weatherSuggestions.length > 0 ? (
            weatherSuggestions.map((sugg, idx) => {
              let icon = '🌧️';
              if (sugg.type === 'DELAY') icon = '⏳';
              else if (sugg.type === 'TIME_SHIFT') icon = '🕘';
              else if (sugg.type === 'TRIGGER') icon = '🚨';
              else if (sugg.type === 'PRIORITY') icon = '🔥';

              return (
              <div key={idx} className="bg-white/10 rounded-xl p-4 shadow-sm border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[16px] font-medium opacity-95">
                    {icon} {sugg.task_name} {sugg.task_id && !String(sugg.task_id).includes('trigger') && `(ID: ${sugg.task_id})`}
                  </p>
                </div>
                <p className="text-[14px] opacity-90 leading-relaxed font-light">
                   {(sugg.type === 'TRIGGER' || sugg.type === 'PRIORITY') ? (
                     <span>Action Required: <b>{sugg.task_name}</b></span>
                   ) : (
                     <span>Suggest reschedule from <b>{sugg.original_date}</b> to <b>{sugg.suggested_date}</b>.</span>
                   )}
                  <br/>
                  Reason: {sugg.reason}
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
