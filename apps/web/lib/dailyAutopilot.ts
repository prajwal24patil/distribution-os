export type DailyAutopilotPlan = {
  focus: string;
  tasks: string[];
  resultCheck: string;
};

export function selectProjectsForDailyRun(projectIds: string[]) {
  return projectIds;
}

export function createDailyGrowthPlan(): DailyAutopilotPlan {
  return {
    focus: "Create one trackable CareerScore growth asset today.",
    tasks: [
      "Pick the strongest ready-to-use work item.",
      "Post manually on the best available channel.",
      "Use the tracking link.",
      "Check clicks, signups, paid users, revenue, and learning tomorrow.",
    ],
    resultCheck: "Compare tracked clicks and manual outcome data before choosing the next move.",
  };
}

export function summarizeDailyResults({
  clicks,
  signups,
  paidUsers,
  revenue,
}: {
  clicks: number;
  signups: number;
  paidUsers: number;
  revenue: number;
}) {
  return `Today: ${clicks} clicks, ${signups} signups, ${paidUsers} paid users, ${revenue.toFixed(
    2,
  )} revenue.`;
}

export function planDailyAutopilotRun(projectIds: string[]) {
  return {
    projectIds: selectProjectsForDailyRun(projectIds),
    plan: createDailyGrowthPlan(),
  };
}
