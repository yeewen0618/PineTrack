import React from 'react';
import { Card } from '../components/ui/card';
import { StatusBadge } from '../components/StatusBadge';
import { mockPlots } from '../lib/mockData';
import { MapPin, Info } from 'lucide-react';

interface FarmMapPageProps {
  onNavigate: (page: string, plotId?: string) => void;
}

export function FarmMapPage({ onNavigate }: FarmMapPageProps) {
  const maxX = Math.max(...mockPlots.map((p) => p.location.x));
  const maxY = Math.max(...mockPlots.map((p) => p.location.y));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Proceed':
        return 'bg-[#16A34A] hover:bg-[#15803D]';
      case 'Pending':
        return 'bg-[#CA8A04] hover:bg-[#B87A04]';
      case 'Stop':
        return 'bg-[#DC2626] hover:bg-[#B91C1C]';
      default:
        return 'bg-[#6B7280]';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-[#111827] mb-1">Farm Map</h2>
        <p className="text-[#6B7280]">Interactive view of all plantation plots</p>
      </div>

      {/* Legend */}
      <Card className="p-4 rounded-2xl bg-white">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-[#6B7280]" />
            <span className="text-sm text-[#6B7280]">Status Legend:</span>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#16A34A] rounded" />
              <span className="text-sm text-[#111827]">Proceed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#CA8A04] rounded" />
              <span className="text-sm text-[#111827]">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#DC2626] rounded" />
              <span className="text-sm text-[#111827]">Stop</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Map Grid */}
      <Card className="p-8 rounded-2xl bg-white">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${maxX}, minmax(200px, 1fr))`,
            gridTemplateRows: `repeat(${maxY}, minmax(200px, 1fr))`
          }}
        >
          {mockPlots.map((plot) => (
            <div
              key={plot.id}
              className={`${getStatusColor(
                plot.status
              )} rounded-2xl p-6 text-white cursor-pointer transition-all transform hover:scale-105 shadow-lg`}
              style={{
                gridColumn: plot.location.x,
                gridRow: plot.location.y
              }}
              onClick={() => onNavigate('plot-details', plot.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onNavigate('plot-details', plot.id);
                }
              }}
              aria-label={`${plot.name}, status: ${plot.status}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl mb-1">{plot.name}</h3>
                  <p className="text-sm opacity-90">{plot.cropType}</p>
                </div>
                <MapPin size={24} />
              </div>

              <div className="space-y-2 text-sm opacity-90">
                <p>{plot.area} hectares</p>
                <p>{plot.growthStage}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-80">Health</span>
                  <span className="font-semibold">{plot.healthScore}%</span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${plot.healthScore}%` }}
                    role="progressbar"
                    aria-valuenow={plot.healthScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Plot Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockPlots.map((plot) => (
          <Card
            key={plot.id}
            className="p-5 rounded-2xl bg-white cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('plot-details', plot.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onNavigate('plot-details', plot.id);
              }
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-[#111827]">{plot.name}</h4>
                <p className="text-sm text-[#6B7280]">{plot.cropType}</p>
              </div>
              <StatusBadge status={plot.status} size="sm" />
            </div>
            <div className="flex items-center gap-4 text-sm text-[#6B7280]">
              <span>{plot.area} ha</span>
              <span>•</span>
              <span>Health: {plot.healthScore}%</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
