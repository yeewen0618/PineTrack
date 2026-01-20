import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from "lucide-react";

export type InsightSuggestion = {
  type: string;
  task_name: string;
  task_id?: string;
  original_date: string;
  suggested_date: string;
  reason: string;
};

type InsightRecommendationsCardProps = {
  suggestions: InsightSuggestion[];
  variant: "dashboard" | "analytics";
  onSuggestionClick?: (suggestion: InsightSuggestion) => void;
  onViewAll?: () => void;
};

function getSuggestionIcon(type: string) {
  const iconClass = "w-4 h-4";
  switch (type) {
    case "DELAY":
      return <Clock className={iconClass} />;
    case "TIME_SHIFT":
      return <ArrowRight className={iconClass} />;
    case "TRIGGER":
      return <AlertTriangle className={iconClass} />;
    case "PRIORITY":
      return <CheckCircle2 className={iconClass} />;
    default:
      return null;
  }
}

function cleanTaskName(name: string) {
  return name.replace(/\s*\(ID:.*?\)\s*$/i, "").trim();
}

export function InsightRecommendationsCard({
  suggestions,
  variant,
  onSuggestionClick,
  onViewAll,
}: InsightRecommendationsCardProps) {
  const isDashboard = variant === "dashboard";
  const visibleSuggestions = isDashboard ? suggestions.slice(0, 3) : suggestions;
  const isInteractive = Boolean(onSuggestionClick);

  return (
    <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-semibold">Insight Recommendation</h3>
      </div>
      <div className="space-y-3">
        {visibleSuggestions.length > 0 ? (
          visibleSuggestions.map((sugg, idx) => {
            const icon = getSuggestionIcon(sugg.type);
            const title = cleanTaskName(sugg.task_name);
            return (
              <div
                key={idx}
                className={`bg-white/10 rounded-xl p-4 shadow-sm border border-white/10 backdrop-blur-sm${isInteractive ? " cursor-pointer hover:bg-white/20 transition-colors" : ""}`}
                onClick={() => onSuggestionClick?.(sugg)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {icon ? (
                    <span className="inline-flex items-center justify-center text-white/90">
                      {icon}
                    </span>
                  ) : null}
                  <p className="text-[16px] font-medium opacity-95">{title}</p>
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

      {isDashboard && suggestions.length > 3 && onViewAll && (
        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 text-xs w-full"
            onClick={onViewAll}
          >
            View all ({suggestions.length})
          </Button>
        </div>
      )}
    </Card>
  );
}
