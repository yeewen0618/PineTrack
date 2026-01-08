// src/lib/progress.ts

export const PINEAPPLE_CYCLE_DAYS = 420;

/**
 * Parse YYYY-MM-DD as a local date to avoid timezone shift
 */
function parseLocalDate(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00`);
}

export function calcHarvestProgressPercent(
  plantingDateISO: string,
  cycleDays: number = PINEAPPLE_CYCLE_DAYS
): number {
  if (!plantingDateISO) return 0;

  const start = parseLocalDate(plantingDateISO);
  if (Number.isNaN(start.getTime())) return 0;

  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const pct = (diffDays / cycleDays) * 100;
  return Math.round(Math.max(0, Math.min(100, pct)));
}
