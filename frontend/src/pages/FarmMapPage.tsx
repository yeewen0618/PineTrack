import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { MapPin, Info } from "lucide-react";
import { toast } from "sonner";
import { listPlots } from "../lib/api";
import type { Plot } from "../lib/api";
import { calcHarvestProgressPercent } from "../lib/progress";
import { sortPlotsById } from "../lib/sortPlots";
import { FarmSatelliteMap } from "../components/FarmSatelliteMap";

interface FarmMapPageProps {
  onNavigate: (page: string, plotId?: string) => void;
}

type PlotVM = Plot & {
  progressPercent: number;
  lng: number | null;
  lat: number | null;
};

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function FarmMapPage({ onNavigate }: FarmMapPageProps) {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPlots = async () => {
      setLoading(true);
      try {
        const res = await listPlots();
        setPlots(sortPlotsById(res.data ?? []));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load plots";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    loadPlots();
  }, []);

  const plotsVM: PlotVM[] = useMemo(() => {
    return (plots ?? []).map((p) => {
      const lng = toNumber(p.location_x);
      const lat = toNumber(p.location_y);

      return {
        ...p,
        progressPercent: clamp(calcHarvestProgressPercent(p.planting_date), 0, 100),
        lng,
        lat,
      };
    });
  }, [plots]);

  const plotMarkers = useMemo(() => {
    return (plotsVM ?? [])
      .map((plot) => {
        const { lng, lat } = plot;
        if (lng === null || lat === null) return null;
        return { id: plot.id, name: plot.name, lng, lat, status: plot.status };
      })
      .filter(
        (plot): plot is { id: string; name: string; lng: number; lat: number; status: Plot["status"] } =>
          Boolean(plot)
      );
  }, [plotsVM]);

  const mapCenter = useMemo(() => {
    if (plotMarkers.length > 0) {
      return { lng: plotMarkers[0].lng, lat: plotMarkers[0].lat };
    }
    return { lng: 101.9758, lat: 4.2105 };
  }, [plotMarkers]);

  const mapZoom = useMemo(() => (plotMarkers.length > 0 ? 12 : 5), [plotMarkers.length]);

  // Only plots with usable coordinates
  const mappable = useMemo(() => plotsVM.filter((p) => p.lng !== null && p.lat !== null), [plotsVM]);

  const getStatusColor = (status: Plot["status"]) => {
    switch (status) {
      case "Proceed":
        return "bg-[#16A34A] hover:bg-[#15803D]";
      case "Pending":
        return "bg-[#CA8A04] hover:bg-[#B87A04]";
      case "Stop":
        return "bg-[#DC2626] hover:bg-[#B91C1C]";
      default:
        return "bg-[#6B7280]";
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
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-[#6B7280]" />
            <span className="text-sm text-[#6B7280]">Status Legend:</span>
          </div>

          <div className="flex gap-4 flex-wrap">
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

      <Card className="p-4 rounded-2xl bg-white">
        <FarmSatelliteMap
          center={mapCenter}
          zoom={mapZoom}
          plots={plotMarkers}
          onPlotClick={(plotId) => navigate(`/plots/${plotId}`)}
        />
      </Card>

      {/* Map Grid */}
      <Card className="p-8 rounded-2xl bg-white">
        {loading && (
          <div className="text-sm text-[#6B7280]">Loading plots from database…</div>
        )}

        {!loading && mappable.length === 0 && (
          <div className="text-sm text-[#6B7280]">
            No plots with coordinates found. Please ensure <b>location_x</b> and <b>location_y</b> are filled in
            the <b>plots</b> table.
          </div>
        )}

        {!loading && mappable.length > 0 && (
          <div
            className={`grid gap-6 ${
              plots.length > 8 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {mappable.map((plot) => (
              <div
                key={plot.id}
                className={`${getStatusColor(plot.status)} rounded-2xl p-6 text-white cursor-pointer transition-all transform hover:scale-105 shadow-lg`}
                onClick={() => onNavigate("plot-details", plot.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onNavigate("plot-details", plot.id);
                }}
                aria-label={`${plot.name}, status: ${plot.status}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[22px] font-semibold leading-snug mb-1">{plot.name}</h3>
                    <p className="text-base opacity-90">{plot.crop_type}</p>
                  </div>
                  <MapPin size={24} />
                </div>

                <div className="space-y-2 text-base opacity-90">
                  <p>{plot.area_ha} hectares</p>
                </div>

                {/* Progress (same idea as Plot Management) */}
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-base opacity-80">Progress</span>
                    <span className="text-lg font-semibold">{plot.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${plot.progressPercent}%` }}
                      role="progressbar"
                      aria-valuenow={plot.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
