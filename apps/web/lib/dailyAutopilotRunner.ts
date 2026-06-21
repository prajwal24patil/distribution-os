import { generatePlatformSpecificVariants } from "@/lib/aiContentEngine";
import { summarizeAutopilotResult, type AutopilotContext } from "@/lib/autopilotOrchestrator";
import { applySafeFixes } from "@/lib/growthProblemSolver";
import { createPublisherQueueItems, type QueueSourceItem } from "@/lib/publisherQueue";
import type { DailyAutopilotRunInsert, PublisherQueueInsert } from "@/lib/supabase/types";

export type DailyAutopilotOutput = {
  dailyRun: DailyAutopilotRunInsert;
  queueItems: PublisherQueueInsert[];
};

export function preventDuplicateDailyRun(existingRunDates: string[], today: string) {
  return existingRunDates.includes(today);
}

export function selectBestNextWork(items: QueueSourceItem[]) {
  return items.slice(0, 6);
}

export async function createDailyGrowthWork(items: QueueSourceItem[]) {
  const selected = selectBestNextWork(items);
  const queueItems = createPublisherQueueItems(selected);

  if (queueItems.length > 0) {
    return queueItems;
  }

  const variants = await generatePlatformSpecificVariants();

  return variants.map((variant) => ({
    project_id: "",
    owner_id: "",
    campaign_item_id: null,
    platform: variant.platform,
    content_type: "daily_growth_work",
    title: variant.platform,
    content: variant.content,
    tracking_url: "",
    status: "ready_for_approval" as const,
  }));
}

export function summarizeDailyAutopilotRun({
  context,
  workCount,
}: {
  context: AutopilotContext;
  workCount: number;
}) {
  const summary = summarizeAutopilotResult(context);
  const fix = applySafeFixes({
    type: "winning_channel_found",
    problem: summary.problem,
  });

  return {
    problemFound: summary.problem,
    fixApplied: summary.fix || fix.appliedFix,
    nextStep: summary.nextMove,
    workCreatedCount: workCount,
  };
}

export async function runDailyAutopilotForProject({
  context,
  today,
  existingRunDates,
}: {
  context: AutopilotContext;
  today: string;
  existingRunDates: string[];
}): Promise<DailyAutopilotOutput> {
  const campaignItems = context.campaigns.flatMap((campaign) => campaign.campaign_items ?? []);
  const duplicate = preventDuplicateDailyRun(existingRunDates, today);
  const queueItems = duplicate ? [] : await createDailyGrowthWork(campaignItems);
  const runSummary = summarizeDailyAutopilotRun({
    context,
    workCount: queueItems.length,
  });

  return {
    dailyRun: {
      project_id: context.project.id,
      owner_id: context.ownerId,
      run_date: today,
      status: duplicate ? "skipped" : "completed",
      problem_found: duplicate ? "Daily Autopilot already ran today." : runSummary.problemFound,
      fix_applied: duplicate ? "Skipped duplicate daily run." : runSummary.fixApplied,
      work_created_count: queueItems.length,
      next_step: duplicate ? "Review today's existing queue." : runSummary.nextStep,
    },
    queueItems,
  };
}
