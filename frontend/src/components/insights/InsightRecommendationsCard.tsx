import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { AlertTriangle } from "lucide-react";

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
  let icon = "dYO‹,?";
  if (type === "DELAY") icon = "ƒ?3";
  else if (type === "TIME_SHIFT") icon = "dY~";
  else if (type === "TRIGGER") icon = "dYs\"";
  else if (type === "PRIORITY") icon = "dY\"";
  return icon;
}

export function InsightRecommendationsCard({
  suggestions,
  variant,
  onSuggestionClick,
  onViewAll,
}: InsightRecommendationsCardProps) {
  if (variant === "dashboard") {
    return (
      <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm border-0">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-white" size={20} />
          <h3 className="text-white font-semibold">Insight Recommendations</h3>
        </div>

        <div className="space-y-3">
          {suggestions.length > 0 ? (
            suggestions.slice(0, 3).map((sugg, idx) => {
              const icon = getSuggestionIcon(sugg.type);
              return (
                <div
                  key={idx}
                  className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-sm cursor-pointer"
                  onClick={() => onSuggestionClick?.(sugg)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icon}</span>
                    <p className="text-sm font-medium text-white line-clamp-1">
                      {sugg.task_name}
                    </p>
                  </div>
                  <p className="text-xs text-white/90 font-light leading-snug">
                    {sugg.type === "TRIGGER" || sugg.type === "PRIORITY" ? (
                      <span>
                        Action: <b>{sugg.task_name}</b>
                      </span>
                    ) : (
                      <span>
                        Reschedule: <b>{sugg.original_date}</b> ƒ+'{" "}
                        <b>{sugg.suggested_date}</b>
                      </span>
                    )}
                    <br />
                    <span className="opacity-80 italic">{sugg.reason}</span>
                  </p>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center bg-white/10 rounded-xl">
              <p className="text-sm text-white/90">ƒo. No immediate actions required.</p>
            </div>
          )}
        </div>

        {suggestions.length > 3 && onViewAll && (
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

  return (
    <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-semibold">Insight Recommendation</h3>
      </div>
      <div className="space-y-3">
        {suggestions.length > 0 ? (
          suggestions.map((sugg, idx) => {
            const icon = getSuggestionIcon(sugg.type);
            return (
              <div
                key={idx}
                className="bg-white/10 rounded-xl p-4 shadow-sm border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[16px] font-medium opacity-95">
                    {icon} {sugg.task_name}{" "}
                    {sugg.task_id &&
                      !String(sugg.task_id).includes("trigger") &&
                      `(ID: ${sugg.task_id})`}
                  </p>
                </div>
                <p className="text-[14px] opacity-90 leading-relaxed font-light">
                  {sugg.type === "TRIGGER" || sugg.type === "PRIORITY" ? (
                    <span>
                      Action Required: <b>{sugg.task_name}</b>
                    </span>
                  ) : (
                    <span>
                      Suggest reschedule from <b>{sugg.original_date}</b> to{" "}
                      <b>{sugg.suggested_date}</b>.
                    </span>
                  )}
                  <br />
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
  );
}
