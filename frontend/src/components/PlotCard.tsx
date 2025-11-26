import React from 'react';
import { Card } from './ui/card';
import { StatusBadge } from './StatusBadge';
import { MapPin, Activity } from 'lucide-react';
import type { Plot } from '../lib/mockData';

interface PlotCardProps {
  plot: Plot;
  onClick?: () => void;
}

export function PlotCard({ plot, onClick }: PlotCardProps) {
  const statusColor = {
    Proceed: 'border-l-[#16A34A]',
    Pending: 'border-l-[#CA8A04]',
    Stop: 'border-l-[#DC2626]'
  };

  return (
    <Card
      className={`p-5 cursor-pointer hover:shadow-lg transition-all border-l-4 ${
        statusColor[plot.status]
      } rounded-2xl bg-white`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      aria-label={`View details for ${plot.name}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-[#111827]">{plot.name}</h3>
          <p className="text-sm text-[#6B7280]">{plot.cropType}</p>
        </div>
        <StatusBadge status={plot.status} size="sm" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <MapPin size={14} />
          <span>{plot.area} hectares</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Activity size={14} />
          <span>{plot.growthStage}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">Health Score</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  plot.healthScore >= 80
                    ? 'bg-[#16A34A]'
                    : plot.healthScore >= 60
                    ? 'bg-[#CA8A04]'
                    : 'bg-[#DC2626]'
                }`}
                style={{ width: `${plot.healthScore}%` }}
                role="progressbar"
                aria-valuenow={plot.healthScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Health score ${plot.healthScore}%`}
              />
            </div>
            <span className="text-sm text-[#111827]">{plot.healthScore}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
