import React from "react";
import { Card } from "./ui/card";
import { StatusBadge } from "./StatusBadge";
import type { Plot } from "../lib/api";

interface PlotCardProps {
  plot: Plot;
  progressPercent: number;
  onClick?: () => void;
}

const getAccentClass = (status?: string) => {
  switch (status) {
    case "Proceed":
      return "border-l-[#16A34A]"; // green
    case "Pending":
      return "border-l-[#CA8A04]"; // amber
    case "Stop":
      return "border-l-[#DC2626]"; // red
    default:
      return "border-l-[#E5E7EB]";
  }
};

export function PlotCard({ plot, progressPercent, onClick }: PlotCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white cursor-pointer hover:shadow-md transition
        border-l-4 ${getAccentClass(plot.status)}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-[#6B7280]">{plot.id}</p>
          <h4 className="text-lg font-semibold leading-snug text-[#111827]">{plot.name}</h4>
          <p className="text-base text-[#6B7280]">{plot.crop_type}</p>
        </div>
        <StatusBadge status={plot.status} size="sm" />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 gap-4 text-sm mb-4">
        <div>
          <p className="text-sm text-[#6B7280]">Area</p>
          <p className="text-base font-medium text-[#111827]">{plot.area_ha} ha</p>
        </div>
      </div>

      {/* Progress (same logic as Plot Management) */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-sm text-[#6B7280]">Progress</span>
          <span className="text-base font-semibold text-[#111827]">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3B82F6] rounded-full transition-all"
            style={{ width: `${Math.max(progressPercent, 3)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
