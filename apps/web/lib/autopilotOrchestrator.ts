import { buildGrowthActions, buildResearchRun, buildViralCampaignItems } from "@/lib/growthEngine";
import { applySafeFixes, detectGrowthProblems } from "@/lib/growthProblemSolver";
import type {
  CampaignItemRow,
  CampaignResultRow,
  CampaignRow,
  ProductMemoryInsert,
  ProductMemoryRow,
  ProjectRow,
  ResearchRunInsert,
  TrackingLinkRow,
} from "@/lib/supabase/types";

export type AutopilotContext = {
  project: ProjectRow;
  memory: ProductMemoryRow | null;
  ownerId: string;
  researchCount: number;
  actionCount: number;
  campaigns: Array<
    CampaignRow & {
      campaign_items?: Array<
        CampaignItemRow & {
          campaign_results?: CampaignResultRow[];
          tracking_links?: TrackingLinkRow[];
        }
      >;
    }
  >;
};

export type AutopilotSummary = {
  status: string;
  growthScore: number;
  problem: string;
  fix: string;
  workCreated: string[];
  nextMove: string;
};

const careerscoreDefaults = {
  targetUsers: "freshers, job seekers, and early-career professionals",
  primaryProblem: "they do not know why they are not getting shortlisted",
  valueProposition: "a career readiness score that shows what to fix before applying",
  pricing: "INR 99 detailed report and INR 199 advanced report",
  channels: "LinkedIn, WhatsApp, Reddit, SEO blog, communities, YouTube shorts script",
};

export function buildProductMemoryFromUrl({
  project,
  ownerId,
  productUrl,
}: {
  project: ProjectRow;
  ownerId: string;
  productUrl: string;
}): ProductMemoryInsert {
  return {
    project_id: project.id,
    owner_id: ownerId,
    product_name: project.customer || project.name,
    website_url: productUrl,
    product_url: productUrl,
    product_summary:
      "CareerScore helps people understand career readiness before applying for jobs.",
    target_users: careerscoreDefaults.targetUsers,
    target_audience:
      "freshers, job seekers, career switchers, students, working professionals wanting higher salary",
    primary_problem: careerscoreDefaults.primaryProblem,
    value_proposition: careerscoreDefaults.valueProposition,
    pricing: careerscoreDefaults.pricing,
    offer: "free CareerScore preview, INR 99 detailed report, INR 199 advanced report",
    current_stage: "MVP growth validation",
    primary_goal: project.goal || "Get paying users",
    product_goal: project.goal || "get paying users",
    target_countries: "India first",
    preferred_channels: careerscoreDefaults.channels,
    allowed_channels: careerscoreDefaults.channels,
    competitors: "resume review services, career coaches, job boards, manual self-assessment",
    brand_voice: "direct, helpful, practical, founder-led",
    brand_tone: "direct, practical, no fake motivation",
    primary_cta: "Check your CareerScore before applying again",
    publishing_mode: "manual_approval",
    constraints: "manual posting only; no unsafe automation; no fake metrics",
  };
}

export function runResearchIfMissing(context: AutopilotContext): ResearchRunInsert | null {
  if (context.researchCount > 0 || !context.memory) {
    return null;
  }

  return buildResearchRun({
    project: context.project,
    memory: context.memory,
    ownerId: context.ownerId,
  });
}

export function generateCampaignIfMissing(context: AutopilotContext, campaignId: string) {
  if (context.campaigns.length > 0 || !context.memory?.website_url) {
    return [];
  }

  return buildViralCampaignItems({
    project: context.project,
    memory: context.memory,
    ownerId: context.ownerId,
    campaignId,
    destinationUrl: context.memory.website_url,
  });
}

export function generateTrackingLinksIfMissing(
  items: Array<{
    id: string;
    project_id: string;
    owner_id: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
  }>,
  destinationUrl: string,
) {
  return items.map((item) => {
    const trackingId = crypto.randomUUID();

    return {
      id: trackingId,
      project_id: item.project_id,
      owner_id: item.owner_id,
      campaign_item_id: item.id,
      destination_url: destinationUrl,
      utm_source: item.utm_source,
      utm_medium: item.utm_medium,
      utm_campaign: item.utm_campaign,
      utm_content: item.utm_content,
      tracking_url: `/t/${trackingId}`,
    };
  });
}

export function detectCurrentGrowthProblem(context: AutopilotContext) {
  const items = context.campaigns.flatMap((campaign) => campaign.campaign_items ?? []);
  const links = items.flatMap((item) => item.tracking_links ?? []);
  const results = items.flatMap((item) => item.campaign_results ?? []);
  const bestItem = [...items].sort((a, b) => scoreItem(b) - scoreItem(a))[0];
  const failedItem = items.find((item) => item.status === "failed");

  return (
    detectGrowthProblems({
      hasProductMemory: Boolean(context.memory?.product_name && context.memory.product_summary),
      researchCount: context.researchCount,
      campaignCount: context.campaigns.length,
      readyToPostCount: items.length,
      clicks: links.reduce((total, link) => total + link.clicks, 0),
      signups: results.reduce((total, result) => total + result.signups, 0),
      paidUsers: results.reduce((total, result) => total + result.paid_users, 0),
      failedChannel: failedItem?.channel,
      winningChannel: bestItem && scoreItem(bestItem) > 0 ? bestItem.channel : undefined,
      hasReferralWork: items.some((item) => item.campaign_type === "referral_campaign"),
    })[0] ?? {
      type: "winning_channel_found" as const,
      problem: "Winning channel found. Keep scaling what works.",
    }
  );
}

export function applySafeGrowthFix(context: AutopilotContext) {
  return applySafeFixes(detectCurrentGrowthProblem(context));
}

export function generateGrowthActionsIfMissing(context: AutopilotContext) {
  if (context.actionCount > 0 || !context.memory) {
    return [];
  }

  return buildGrowthActions({
    project: context.project,
    memory: context.memory,
    ownerId: context.ownerId,
    researchRunId: null,
  });
}

export function getNextWinningMove(context: AutopilotContext) {
  const items = context.campaigns.flatMap((campaign) => campaign.campaign_items ?? []);
  const bestItem = [...items].sort((a, b) => scoreItem(b) - scoreItem(a))[0];

  if (bestItem && scoreItem(bestItem) > 0) {
    return `Create more ${bestItem.channel} work using: ${bestItem.hook}`;
  }

  if (items.length > 0) {
    return "Copy/post the strongest ready-to-use work with its tracking link.";
  }

  return "Start Growth Autopilot to create the first ready-to-use work.";
}

export function summarizeAutopilotResult(context: AutopilotContext): AutopilotSummary {
  const problem = detectCurrentGrowthProblem(context);
  const fix = applySafeFixes(problem);
  const items = context.campaigns.flatMap((campaign) => campaign.campaign_items ?? []);
  const links = items.flatMap((item) => item.tracking_links ?? []);
  const results = items.flatMap((item) => item.campaign_results ?? []);
  const score =
    (context.memory ? 20 : 0) +
    (context.researchCount > 0 ? 20 : 0) +
    (context.actionCount > 0 ? 15 : 0) +
    (context.campaigns.length > 0 ? 20 : 0) +
    (links.length > 0 ? 15 : 0) +
    (results.length > 0 ? 10 : 0);

  return {
    status: context.campaigns.length > 0 ? "Running" : "Ready",
    growthScore: Math.min(score, 100),
    problem: problem.problem,
    fix: fix.appliedFix,
    workCreated: fix.readyWork,
    nextMove: getNextWinningMove(context),
  };
}

export function runAutopilotCycle(context: AutopilotContext): AutopilotSummary {
  return summarizeAutopilotResult(context);
}

export function startGrowthAutopilot(context: AutopilotContext): AutopilotSummary {
  return runAutopilotCycle(context);
}

function scoreItem(
  item: CampaignItemRow & {
    campaign_results?: CampaignResultRow[];
    tracking_links?: TrackingLinkRow[];
  },
) {
  const clicks = (item.tracking_links ?? []).reduce((total, link) => total + link.clicks, 0);
  const outcomes = (item.campaign_results ?? []).reduce(
    (total, result) =>
      total + result.signups * 10 + result.paid_users * 50 + Number(result.revenue),
    0,
  );

  return clicks + outcomes;
}
