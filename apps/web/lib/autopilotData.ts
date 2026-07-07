import {
  cleanVisibleBestAssets,
  cleanVisibleScheduledWork,
  generateQcSummary,
  type DashboardQcResult,
} from "@/lib/dashboardQcAgent";
import { sanitizeCareerScoreCopy } from "@/lib/careerScoreCopy";
import { createClient } from "@/lib/supabase/server";
import type {
  CampaignItemRow,
  CampaignResultRow,
  ConversionEventRow,
  DailyAutopilotRunRow,
  DistributionCycleRow,
  ProjectRow,
  PublisherQueueRow,
  PublishingConnectionRow,
  ScheduledPostRow,
  SystemTestRunRow,
  TrackingLinkRow,
} from "@/lib/supabase/types";

export type AutopilotCampaignItem = CampaignItemRow & {
  campaign_results?: CampaignResultRow[];
  tracking_links?: TrackingLinkRow[];
};

export type ResultTotals = {
  clicks: number;
  signups: number;
  paidUsers: number;
  revenue: number;
  resumeUploads: number;
  freeScores: number;
  referralShares: number;
  eventsReceived: number;
  latestLearning: string;
};

export type AutopilotResultsSummary = {
  clicks: number;
  signups: number;
  paidUsers: number;
  revenue: number;
  resumeUploads: number;
  freeScores: number;
  referralShares: number;
  bestChannel: string;
  latestLearning: string;
  nextBestAction: string;
  bestHook: string;
  bestCta: string;
  bestAudience: string;
  bestAssetType: string;
  includesDemoData: boolean;
  eventsReceived: number;
  blogPublishedCount: number;
  lastCronRun: string;
  demo: ResultTotals;
};

export type XPublishDiagnostics = {
  xConnected: boolean;
  xAutoPublishReady: boolean;
  xAssetsFound: number;
  xPublishAttempted: boolean;
  xPublishStatus: string;
  xFailureReason: string;
  xPublishedUrl: string;
  publishedCount: number;
  manualRequiredCount: number;
};

export type AutopilotPageData = {
  project: ProjectRow | null;
  dailyRun: DailyAutopilotRunRow | null;
  distributionCycle: DistributionCycleRow | null;
  readyItems: PublisherQueueRow[];
  scheduledPosts: ScheduledPostRow[];
  publishingConnections: PublishingConnectionRow[];
  conversionEvents: ConversionEventRow[];
  latestSystemTest: SystemTestRunRow | null;
  dashboardQc: DashboardQcResult;
  campaignItems: AutopilotCampaignItem[];
  results: AutopilotResultsSummary;
  xDiagnostics: XPublishDiagnostics;
  error: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const NO_REAL_WINNER =
  "No real winner yet. Connect CareerScore events or add a real result after posting.";
const PENDING_SCHEDULED_STATUSES = new Set([
  "scheduled",
  "ready",
  "manual_required",
  "auto_publish_ready",
]);

function buildXDiagnostics({
  connections,
  xQueueItems,
  xPost,
  scheduledPosts,
  distributionCycle,
}: {
  connections: PublishingConnectionRow[];
  xQueueItems: PublisherQueueRow[];
  xPost: ScheduledPostRow | null;
  scheduledPosts: ScheduledPostRow[];
  distributionCycle: DistributionCycleRow | null;
}): XPublishDiagnostics {
  const xConnection = connections.find((connection) => connection.platform === "x");
  const xConnected = Boolean(xConnection?.access_token_encrypted);
  const xAutoPublishReady =
    xConnection?.connection_status === "connected" && Boolean(xConnection?.access_token_encrypted);
  const xPublishAttempted = Boolean(
    xPost && !["scheduled", "ready", "auto_publish_ready"].includes(xPost.status),
  );

  return {
    xConnected,
    xAutoPublishReady,
    xAssetsFound: xQueueItems.length,
    xPublishAttempted,
    xPublishStatus: xPost?.status || "not_attempted",
    xFailureReason: xPost?.failure_reason || "",
    xPublishedUrl: xPost?.published_url || "",
    publishedCount: distributionCycle?.published_count ?? 0,
    manualRequiredCount: scheduledPosts.filter((post) => post.status === "manual_required").length,
  };
}

function itemScore(item: AutopilotCampaignItem) {
  const results = (item.campaign_results ?? []).reduce(
    (total, result) =>
      total + result.signups * 10 + result.paid_users * 50 + Number(result.revenue),
    0,
  );

  return results;
}

function buildNextBestAction({
  readyItems,
  campaignItems,
  bestChannel,
}: {
  readyItems: PublisherQueueRow[];
  campaignItems: AutopilotCampaignItem[];
  bestChannel: string;
}) {
  const pendingResult = campaignItems.some((item) => item.status === "posted");
  const failedItem = campaignItems.find((item) => item.status === "failed");

  if (readyItems.length > 0) {
    return sanitizeCareerScoreCopy(
      `Post one ${readyItems[0].platform} item manually, then add the result.`,
    );
  }

  if (pendingResult) {
    return "Add the result for a posted item so DistributionOS can learn what worked.";
  }

  if (bestChannel !== NO_REAL_WINNER) {
    return `Create more ${bestChannel} work using the strongest message.`;
  }

  if (failedItem) {
    return sanitizeCareerScoreCopy(
      `Rewrite the ${failedItem.channel} angle and try a clearer hook.`,
    );
  }

  return "Run Autopilot to create the next ready-to-post item.";
}

function summarizeResults({
  readyItems,
  campaignItems,
  results,
  links,
  conversionEvents,
  scheduledPosts,
  distributionCycle,
}: {
  readyItems: PublisherQueueRow[];
  campaignItems: AutopilotCampaignItem[];
  results: CampaignResultRow[];
  links: TrackingLinkRow[];
  conversionEvents: ConversionEventRow[];
  scheduledPosts: ScheduledPostRow[];
  distributionCycle: DistributionCycleRow | null;
}) {
  const isDemoResult = (result: CampaignResultRow) =>
    /demo|system_test/i.test(result.learning || "");
  const isDemoLink = (link: TrackingLinkRow) =>
    /demo|system_test/i.test(`${link.utm_source} ${link.utm_campaign}`);
  const isDemoEvent = (event: ConversionEventRow) =>
    /demo|system_test/i.test(`${event.source} ${event.platform}`);
  const realResults = results.filter((result) => !/demo|system_test/i.test(result.learning || ""));
  const demoResults = results.filter(isDemoResult);
  const realLinks = links.filter((link) => !isDemoLink(link));
  const demoLinks = links.filter(isDemoLink);
  const realConversionEvents = conversionEvents.filter((event) => !isDemoEvent(event));
  const demoConversionEvents = conversionEvents.filter(isDemoEvent);
  const realItems = campaignItems.filter(
    (item) =>
      !/system_test|demo/i.test(`${item.hook} ${item.content} ${item.utm_campaign}`) &&
      (item.campaign_results ?? []).some(
        (result) => !/demo|system_test/i.test(result.learning || ""),
      ),
  );
  const bestRealItem = [...realItems].sort((a, b) => itemScore(b) - itemScore(a))[0];
  const bestChannel =
    bestRealItem && itemScore(bestRealItem) > 0 ? bestRealItem.channel : NO_REAL_WINNER;
  const latestRealLearning = [...realResults].reverse().find((result) => result.learning)?.learning;
  const includesDemoData =
    demoResults.length > 0 || demoLinks.length > 0 || demoConversionEvents.length > 0;

  const summarizeTotals = ({
    scopedResults,
    scopedLinks,
    scopedEvents,
  }: {
    scopedResults: CampaignResultRow[];
    scopedLinks: TrackingLinkRow[];
    scopedEvents: ConversionEventRow[];
  }): ResultTotals => ({
    clicks: scopedLinks.reduce((total, link) => total + link.clicks, 0),
    signups:
      scopedResults.reduce((total, result) => total + result.signups, 0) +
      scopedEvents.filter((event) => event.event_type === "signup").length,
    paidUsers:
      scopedResults.reduce((total, result) => total + result.paid_users, 0) +
      scopedEvents.filter((event) => event.event_type === "paid_report").length,
    revenue:
      scopedResults.reduce((total, result) => total + Number(result.revenue), 0) +
      scopedEvents
        .filter((event) => event.event_type === "paid_report" || event.event_type === "revenue")
        .reduce((total, event) => total + Number(event.event_value), 0),
    resumeUploads: scopedEvents.filter((event) => event.event_type === "resume_upload").length,
    freeScores: scopedEvents.filter((event) => event.event_type === "free_score_generated").length,
    referralShares: scopedEvents.filter((event) => event.event_type === "referral_share").length,
    eventsReceived: scopedEvents.length,
    latestLearning: sanitizeCareerScoreCopy(
      [...scopedResults].reverse().find((result) => result.learning)?.learning || NO_REAL_WINNER,
    ),
  });
  const realTotals = summarizeTotals({
    scopedResults: realResults,
    scopedLinks: realLinks,
    scopedEvents: realConversionEvents,
  });
  const demoTotals = summarizeTotals({
    scopedResults: demoResults,
    scopedLinks: demoLinks,
    scopedEvents: demoConversionEvents,
  });

  return {
    clicks: realTotals.clicks,
    signups: realTotals.signups,
    paidUsers: realTotals.paidUsers,
    revenue: realTotals.revenue,
    resumeUploads: realTotals.resumeUploads,
    freeScores: realTotals.freeScores,
    referralShares: realTotals.referralShares,
    bestChannel,
    bestHook:
      bestRealItem && itemScore(bestRealItem) > 0
        ? sanitizeCareerScoreCopy(bestRealItem.hook)
        : NO_REAL_WINNER,
    bestCta:
      bestRealItem && itemScore(bestRealItem) > 0
        ? sanitizeCareerScoreCopy(bestRealItem.cta)
        : NO_REAL_WINNER,
    bestAudience:
      bestRealItem && itemScore(bestRealItem) > 0
        ? sanitizeCareerScoreCopy(bestRealItem.target_audience)
        : NO_REAL_WINNER,
    bestAssetType:
      bestRealItem && itemScore(bestRealItem) > 0
        ? bestRealItem.campaign_type.replace(/_/g, " ")
        : NO_REAL_WINNER,
    latestLearning: sanitizeCareerScoreCopy(latestRealLearning || NO_REAL_WINNER),
    nextBestAction: buildNextBestAction({ readyItems, campaignItems, bestChannel }),
    includesDemoData,
    eventsReceived: realTotals.eventsReceived,
    blogPublishedCount: scheduledPosts.filter(
      (post) =>
        post.status === "published" && /blog|seo/i.test(`${post.platform} ${post.content_type}`),
    ).length,
    lastCronRun: distributionCycle?.created_at || "",
    demo: demoTotals,
  };
}

function isPendingScheduledPost(post: ScheduledPostRow) {
  return PENDING_SCHEDULED_STATUSES.has(post.status);
}

export async function loadAutopilotPageData({
  supabase,
  projectId,
  ownerId,
}: {
  supabase: SupabaseClient;
  projectId: string;
  ownerId: string;
}): Promise<AutopilotPageData> {
  const startedAt = performance.now();
  const [
    projectResult,
    dailyRunResult,
    cycleResult,
    readyItemsResult,
    scheduledPostsResult,
    connectionsResult,
    conversionEventsResult,
    systemTestResult,
    campaignItemsResult,
    resultsResult,
    linksResult,
    xQueueResult,
    xPostResult,
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase
      .from("daily_autopilot_runs")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("distribution_cycles")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("publisher_queue")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .in("status", ["draft", "ready_for_approval", "approved", "scheduled_manual"])
      .order("predicted_rank_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("scheduled_posts")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("scheduled_for", { ascending: true })
      .limit(20),
    supabase
      .from("publishing_connections")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId),
    supabase
      .from("conversion_events")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase
      .from("system_test_runs")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("campaign_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("campaign_results")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tracking_links")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("publisher_queue")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .eq("platform", "x")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("scheduled_posts")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .eq("platform", "x")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (projectResult.error || !projectResult.data) {
    return {
      project: null,
      dailyRun: null,
      distributionCycle: null,
      readyItems: [],
      scheduledPosts: [],
      publishingConnections: [],
      conversionEvents: [],
      latestSystemTest: null,
      dashboardQc: {
        status: "fail",
        issues_found: 1,
        issues_fixed: 0,
        warnings: [projectResult.error?.message || "Project not found."],
        fixes: [],
      },
      campaignItems: [],
      results: summarizeResults({
        readyItems: [],
        campaignItems: [],
        results: [],
        links: [],
        conversionEvents: [],
        scheduledPosts: [],
        distributionCycle: null,
      }),
      xDiagnostics: buildXDiagnostics({
        connections: [],
        xQueueItems: [],
        xPost: null,
        scheduledPosts: [],
        distributionCycle: null,
      }),
      error: projectResult.error?.message || "Project not found.",
    };
  }

  const rawReadyItems = (readyItemsResult.data ?? []) as PublisherQueueRow[];
  const rawScheduledPosts = (scheduledPostsResult.data ?? []) as ScheduledPostRow[];
  const readyItems = cleanVisibleBestAssets(rawReadyItems);
  const scheduledPosts =
    cleanVisibleScheduledWork(rawScheduledPosts).filter(isPendingScheduledPost);
  const publishingConnections = (connectionsResult.data ?? []) as PublishingConnectionRow[];
  const conversionEvents = (conversionEventsResult.data ?? []) as ConversionEventRow[];
  const latestSystemTest = (systemTestResult.data ?? null) as SystemTestRunRow | null;
  const campaignItems = (campaignItemsResult.data ?? []) as AutopilotCampaignItem[];
  const results = (resultsResult.data ?? []) as CampaignResultRow[];
  const links = (linksResult.data ?? []) as TrackingLinkRow[];
  const xQueueItems = (xQueueResult.data ?? []) as PublisherQueueRow[];
  const latestXPost = (xPostResult.data ?? null) as ScheduledPostRow | null;
  const includesDemoData =
    results.some((result) => /demo|system_test/i.test(result.learning || "")) ||
    links.some((link) => /demo|system_test/i.test(`${link.utm_source} ${link.utm_campaign}`)) ||
    conversionEvents.some((event) => /demo|system_test/i.test(`${event.source} ${event.platform}`));
  const dashboardQc = generateQcSummary({
    rawScheduledWork: rawScheduledPosts,
    rawBestAssets: rawReadyItems,
    scheduledWork: scheduledPosts,
    bestAssets: readyItems,
    includesDemoData,
  });

  for (const item of campaignItems) {
    item.campaign_results = results.filter((result) => result.campaign_item_id === item.id);
    item.tracking_links = links.filter((link) => link.campaign_item_id === item.id);
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[autopilot] data load ${Math.round(performance.now() - startedAt)}ms`);
  }

  return {
    project: projectResult.data,
    dailyRun: (dailyRunResult.data ?? null) as DailyAutopilotRunRow | null,
    distributionCycle: (cycleResult.data ?? null) as DistributionCycleRow | null,
    readyItems,
    scheduledPosts,
    publishingConnections,
    conversionEvents,
    latestSystemTest,
    dashboardQc,
    campaignItems,
    results: summarizeResults({
      readyItems,
      campaignItems,
      results,
      links,
      conversionEvents,
      scheduledPosts: rawScheduledPosts,
      distributionCycle: (cycleResult.data ?? null) as DistributionCycleRow | null,
    }),
    xDiagnostics: buildXDiagnostics({
      connections: publishingConnections,
      xQueueItems,
      xPost: latestXPost,
      scheduledPosts: rawScheduledPosts,
      distributionCycle: (cycleResult.data ?? null) as DistributionCycleRow | null,
    }),
    error:
      dailyRunResult.error?.message ||
      readyItemsResult.error?.message ||
      scheduledPostsResult.error?.message ||
      connectionsResult.error?.message ||
      conversionEventsResult.error?.message ||
      systemTestResult.error?.message ||
      campaignItemsResult.error?.message ||
      resultsResult.error?.message ||
      linksResult.error?.message ||
      xQueueResult.error?.message ||
      xPostResult.error?.message ||
      null,
  };
}
