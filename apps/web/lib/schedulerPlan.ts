export function shouldRunDailyCycle(lastRunDate?: string, today = new Date()) {
  if (!lastRunDate) return true;

  return lastRunDate.slice(0, 10) !== today.toISOString().slice(0, 10);
}

export function shouldRunWeeklyReview(lastReviewDate?: string, today = new Date()) {
  if (!lastReviewDate) return true;

  const last = new Date(lastReviewDate);
  const diffMs = today.getTime() - last.getTime();

  return diffMs >= 7 * 24 * 60 * 60 * 1000;
}

export function planDailyDistributionCycle() {
  return {
    cycleType: "daily" as const,
    focus: "Create the next best approved assets, queue them safely, and learn from new results.",
    maxAssets: 12,
    visibleAssets: 5,
  };
}

export function planWeeklyDistributionReview() {
  return {
    cycleType: "weekly" as const,
    focus: "Review winning channels, hooks, CTAs, revenue influence, and next experiments.",
    output: "One next cycle plan with the strongest repeated pattern.",
  };
}
