import React from 'react';
import { Card } from './ui/card';
import { Cloud, CloudRain, Sun, CloudSun, Droplets, Wind } from 'lucide-react';

interface WeatherCardProps {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export function WeatherCard({ temperature, condition, humidity, windSpeed }: WeatherCardProps) {
  const getWeatherIcon = (condition: string) => {
    const iconClass = 'text-[#15803D]';
    switch (condition.toLowerCase()) {
      case 'sunny':
        return <Sun size={48} className={iconClass} />;
      case 'rainy':
        return <CloudRain size={48} className={iconClass} />;
      case 'partly cloudy':
        return <CloudSun size={48} className={iconClass} />;
      case 'cloudy':
        return <Cloud size={48} className={iconClass} />;
      default:
        return <CloudSun size={48} className={iconClass} />;
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-[#15803D] to-[#16A34A] text-white rounded-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-90 mb-1">Current Weather</p>
          <h2 className="text-4xl mb-2">{temperature}°C</h2>
          <p className="text-sm opacity-90">{condition}</p>
        </div>
        <div className="bg-white/20 rounded-2xl p-3">
          {getWeatherIcon(condition)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
        <div className="flex items-center gap-2">
          <Droplets size={20} className="opacity-80" />
          <div>
            <p className="text-xs opacity-80">Humidity</p>
            <p className="font-semibold">{humidity}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind size={20} className="opacity-80" />
          <div>
            <p className="text-xs opacity-80">Wind Speed</p>
            <p className="font-semibold">{windSpeed} km/h</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
