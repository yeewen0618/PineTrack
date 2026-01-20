import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { getAnalyticsHistory, getWeatherAnalytics, listTasks, getWeatherRescheduleSuggestions } from '../lib/api';
import { GraphSection } from '../components/analytics/GraphSection';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface AnalyticsData {
  date: string;
  temperature_raw: number;
  temperature_clean: number;
  moisture_raw: number;
  moisture_clean: number;
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
  const [weatherSuggestions, setWeatherSuggestions] = useState<Suggestion[]>([]);
  const [sensorAlerts, setSensorAlerts] = useState<Suggestion[]>([]);

  useEffect(() => {
    async function fetchData() {
      const safeFetch = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await promise;
        } catch (e) {
          console.error('Partial fetch error:', e);
          return fallback;
        }
      };
      try {
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

        const weather = await safeFetch<WeatherAnalyticsItem[]>(getWeatherAnalytics(), []);

        const allTasksRes = await safeFetch(listTasks(), { ok: true, data: [] });
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        const tasksForTomorrow = allTasksRes.data.filter((t) => t.task_date === tomorrowStr);

        const weatherForecastForTomorrow = weather.filter((w: WeatherAnalyticsItem) => {
          const dateStr = w.date || w.time;
          return dateStr && dateStr.slice(0, 10) === tomorrowStr;
        });

        let sensorSummary = null;
        if (processedHistory.length > 0) {
          const latest = processedHistory[processedHistory.length - 1];
          sensorSummary = {
            avg_moisture: latest.moisture_clean,
            avg_temp: latest.temperature_clean
          };
        }

        let suggestions = [];
        try {
          const result = await getWeatherRescheduleSuggestions(tasksForTomorrow, weatherForecastForTomorrow, sensorSummary);
          const allSuggestions = result.suggestions ?? [];
          const alerts = allSuggestions.filter(s => s.affected_by === 'sensor_health');
          suggestions = allSuggestions.filter(s => s.affected_by !== 'sensor_health');
          setSensorAlerts(alerts);
        } catch (e) {
          console.error('Insight suggestion error:', e);
        }
        setWeatherSuggestions(suggestions);
      } catch (err) {
        console.error('Critical error in analytics:', err);
      }
    }
    fetchData();
  }, [selectedPlot]);

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
            <SelectItem value="plot-1">Plot 1</SelectItem>
            <SelectItem value="plot-2">Plot 2</SelectItem>
            <SelectItem value="plot-3">Plot 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <GraphSection
        plotId={selectedPlot !== 'all' ? selectedPlot : null}
        renderBetween={
          sensorAlerts.length > 0 ? (
            <div className="space-y-2">
              {sensorAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-[#FEE2E2] to-[#FECACA] border-l-4 border-[#DC2626] rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#DC2626] rounded-full flex items-center justify-center text-white">
                      <AlertTriangle className="w-4 h-4" />
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
          ) : null
        }
      />

      <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-semibold">Insight Recommendation</h3>
        </div>
        <div className="space-y-3">
          {weatherSuggestions.length > 0 ? (
            weatherSuggestions.map((sugg, idx) => {
              const iconMap: Record<string, React.ReactNode> = {
                DELAY: <Clock className="w-4 h-4" />,
                TIME_SHIFT: <ArrowRight className="w-4 h-4" />,
                TRIGGER: <AlertTriangle className="w-4 h-4" />,
                PRIORITY: <CheckCircle2 className="w-4 h-4" />
              };
              const icon = iconMap[sugg.type] ?? null;

              const cleanTaskName = sugg.task_name.replace(/\s*\(ID:.*?\)\s*$/i, '').trim();

              return (
                <div key={idx} className="bg-white/10 rounded-xl p-4 shadow-sm border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {icon ? (
                      <span className="inline-flex items-center justify-center text-white/90">
                        {icon}
                      </span>
                    ) : null}
                    <p className="text-[16px] font-medium opacity-95">
                      {cleanTaskName}
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
