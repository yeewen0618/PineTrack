import React from "react";
import { Calendar, Sprout } from "lucide-react";

type PlotDatesVariant = "light" | "dark";

export function formatPlotDate(value?: string | null): string {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface PlotDatesProps {
  startPlantingDate?: string | null;
  harvestDate?: string | null;
  variant?: PlotDatesVariant;
  className?: string;
}

export function PlotDates({
  startPlantingDate,
  harvestDate,
  variant = "light",
  className,
}: PlotDatesProps) {
  const baseText =
    variant === "dark" ? "text-white/80" : "text-[#6B7280]";
  const labelText =
    variant === "dark" ? "text-white/90 font-semibold" : "text-[#374151] font-semibold";
  const valueText = variant === "dark" ? "text-white" : "text-[#111827] font-normal";
  const iconClass = variant === "dark" ? "text-white/70" : "text-[#9CA3AF]";

  return (
    <div className={`space-y-1 text-sm leading-tight ${baseText} ${className ?? ""}`.trim()}>
      <div className="flex items-center gap-2">
        <Calendar size={14} className={iconClass} />
        <span className={labelText}>Start Planting:</span>
        <span className={valueText}>{formatPlotDate(startPlantingDate)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Sprout size={14} className={iconClass} />
        <span className={labelText}>Harvest (Est.):</span>
        <span className={valueText}>{formatPlotDate(harvestDate)}</span>
      </div>
    </div>
  );
}
