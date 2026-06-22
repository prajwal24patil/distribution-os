import {
  hasBannedCareerScorePhrase,
  sanitizeCareerScoreCopy,
  sanitizeCareerScoreTitle,
} from "@/lib/careerScoreCopy";
import { createClient } from "@/lib/supabase/server";
import type { PublisherQueueRow, ScheduledPostRow } from "@/lib/supabase/types";

export type DashboardQcStatus = "pass" | "warning" | "fail";

export type DashboardQcResult = {
  status: DashboardQcStatus;
  issues_found: number;
  issues_fixed: number;
  warnings: string[];
  fixes: string[];
};

type VisibleAsset = {
  id: string;
  platform: string;
  title: string;
  content: string;
  tracking_url?: string;
  asset_type?: string;
  quality_score?: number;
  predicted_rank_score?: number;
};

const TRACKING_TOKEN_PATTERN = /(\{tracking_link\}|\[tracking link\])/gi;
const URL_PATTERN = /https?:\/\/\S+|\/t\/[a-zA-Z0-9-]+/;
const META_DESCRIPTION_PATTERN =
  /^(A short community message|A helpful non-spam community reply|A practical SEO article|A landing page headline)/i;
const MAX_VISIBLE_ITEMS = 5;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreAsset(asset: VisibleAsset) {
  return asset.predicted_rank_score || asset.quality_score || 0;
}

function isSystemTestAsset(asset: VisibleAsset) {
  return /system_test|system test|demo/i.test(
    `${asset.platform} ${asset.title} ${asset.content} ${asset.tracking_url ?? ""} ${asset.asset_type ?? ""}`,
  );
}

function templateFor(asset: VisibleAsset) {
  const platform = asset.platform.toLowerCase();
  const type = (asset.asset_type ?? "").toLowerCase();

  if (platform.includes("whatsapp") || platform.includes("community")) {
    return [
      "Quick question - are you applying to jobs but not getting callbacks?",
      "",
      "CareerScore checks your career readiness and shows what gap to fix next.",
      "",
      "Try it here: {tracking_link}",
    ].join("\n");
  }

  if (platform.includes("reddit")) {
    return [
      "If you're applying to many jobs and not getting responses, the problem may not be effort.",
      "It may be weak proof, unclear positioning, or missing skill match.",
      "",
      "CareerScore shows your career readiness score and the next gaps to fix.",
      "",
      "Link: {tracking_link}",
    ].join("\n");
  }

  if (platform.includes("youtube") || type.includes("short")) {
    return [
      "Hook: Applying everywhere but no callbacks?",
      "",
      "Problem: The issue may not be effort. It may be missing proof, unclear positioning, or the wrong role fit.",
      "",
      "Insight: Before applying again, check your career readiness.",
      "",
      "CTA: Check your CareerScore here: {tracking_link}",
    ].join("\n");
  }

  if (platform.includes("blog") || platform.includes("seo")) {
    return [
      "Before applying to 100 jobs, check your CareerScore.",
      "",
      "Learn what your resume, skills, and job-readiness profile may be missing.",
      "",
      "Start here: {tracking_link}",
    ].join("\n");
  }

  return [
    "Most freshers don't know why they're not getting shortlisted.",
    "",
    "They keep applying, but the problem is often not effort.",
    "It is missing proof, unclear positioning, or a skill gap the resume does not explain.",
    "",
    "CareerScore helps you check your career readiness before applying again.",
    "",
    "Try it here: {tracking_link}",
  ].join("\n");
}

export function replaceTrackingPlaceholders<T extends VisibleAsset>(input: T): T {
  const trackingUrl = input.tracking_url || "";
  const content = input.content || "";
  const cleaned = sanitizeCareerScoreCopy(content).replace(
    TRACKING_TOKEN_PATTERN,
    trackingUrl || "Add CareerScore URL to create tracking links.",
  );
  const shouldAppend = trackingUrl && !URL_PATTERN.test(cleaned);

  return {
    ...input,
    title: sanitizeCareerScoreTitle(input.title, `${input.platform} ${input.asset_type ?? ""}`),
    content: shouldAppend ? `${cleaned}\n\n${trackingUrl}` : cleaned,
  };
}

export function removeSystemTestAssetsFromRealView<T extends VisibleAsset>(input: T[]) {
  return input.filter((item) => !isSystemTestAsset(item));
}

export function dedupeAssets<T extends VisibleAsset>(
  input: T[],
  keyFor: (item: T) => string = (item) =>
    [item.platform, item.title, item.asset_type ?? "", item.content].map(normalizeText).join("|"),
) {
  const seen = new Set<string>();

  return [...input]
    .sort((a, b) => scoreAsset(b) - scoreAsset(a))
    .filter((item) => {
      const key = keyFor(item);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function preferUniquePlatforms<T extends VisibleAsset>(input: T[], limit = MAX_VISIBLE_ITEMS) {
  const selected: T[] = [];
  const platforms = new Set<string>();

  for (const item of input) {
    const platform = normalizeText(item.platform);

    if (!platforms.has(platform)) {
      selected.push(item);
      platforms.add(platform);
    }

    if (selected.length === limit) return selected;
  }

  for (const item of input) {
    if (!selected.some((selectedItem) => selectedItem.id === item.id)) {
      selected.push(item);
    }

    if (selected.length === limit) break;
  }

  return selected;
}

function convertMetaDescription<T extends VisibleAsset>(item: T): T {
  if (!META_DESCRIPTION_PATTERN.test(item.content)) {
    return item;
  }

  return {
    ...item,
    content: templateFor(item),
  };
}

export function cleanVisibleScheduledWork(input: ScheduledPostRow[]) {
  const cleaned = removeSystemTestAssetsFromRealView(input)
    .map(convertMetaDescription)
    .map(replaceTrackingPlaceholders);
  const deduped = dedupeAssets(cleaned, (item) =>
    [item.platform, item.title, item.content].map(normalizeText).join("|"),
  );

  return preferUniquePlatforms(deduped, MAX_VISIBLE_ITEMS);
}

export function cleanVisibleBestAssets(input: PublisherQueueRow[]) {
  const cleaned = removeSystemTestAssetsFromRealView(input)
    .map(convertMetaDescription)
    .map(replaceTrackingPlaceholders);
  const deduped = dedupeAssets(cleaned, (item) =>
    [item.platform, item.title, item.asset_type].map(normalizeText).join("|"),
  );

  return preferUniquePlatforms(deduped, MAX_VISIBLE_ITEMS);
}

export function validateReadyToPostContent(input: VisibleAsset[]) {
  const warnings: string[] = [];

  for (const item of input) {
    if (isSystemTestAsset(item)) warnings.push(`${item.title} is test/demo data.`);
    if (TRACKING_TOKEN_PATTERN.test(item.content))
      warnings.push(`${item.title} has a tracking placeholder.`);
    if (item.tracking_url && !item.content.includes(item.tracking_url)) {
      warnings.push(`${item.title} is missing the tracking URL in copy.`);
    }
    if (hasBannedCareerScorePhrase(item.content) || hasBannedCareerScorePhrase(item.title)) {
      warnings.push(`${item.title} has robotic CareerScore wording.`);
    }
    if (META_DESCRIPTION_PATTERN.test(item.content)) {
      warnings.push(`${item.title} is meta-description copy, not ready-to-post content.`);
    }
  }

  return warnings;
}

export function detectVisibleQualityIssues(input: {
  scheduledWork: ScheduledPostRow[];
  bestAssets: PublisherQueueRow[];
  includesDemoData?: boolean;
}) {
  const warnings = [
    ...validateReadyToPostContent(input.scheduledWork),
    ...validateReadyToPostContent(input.bestAssets),
  ];

  if (input.scheduledWork.length > MAX_VISIBLE_ITEMS) {
    warnings.push("Too many scheduled items are visible.");
  }

  if (input.includesDemoData) {
    warnings.push("Demo/test data exists and must be clearly labeled.");
  }

  return warnings;
}

export function generateQcSummary(input: {
  rawScheduledWork: ScheduledPostRow[];
  rawBestAssets: PublisherQueueRow[];
  scheduledWork: ScheduledPostRow[];
  bestAssets: PublisherQueueRow[];
  includesDemoData?: boolean;
}): DashboardQcResult {
  const rawIssues = detectVisibleQualityIssues({
    scheduledWork: input.rawScheduledWork,
    bestAssets: input.rawBestAssets,
    includesDemoData: input.includesDemoData,
  });
  const remainingIssues = detectVisibleQualityIssues({
    scheduledWork: input.scheduledWork,
    bestAssets: input.bestAssets,
    includesDemoData: false,
  });
  const fixes: string[] = [];

  if (input.rawScheduledWork.length !== input.scheduledWork.length) {
    fixes.push("Filtered test/demo or duplicate scheduled work.");
  }
  if (input.rawBestAssets.length !== input.bestAssets.length) {
    fixes.push("Filtered test/demo or duplicate best assets.");
  }
  if (rawIssues.some((issue) => /tracking placeholder|missing the tracking URL/i.test(issue))) {
    fixes.push("Tracking placeholders fixed before rendering.");
  }
  if (rawIssues.some((issue) => /meta-description/i.test(issue))) {
    fixes.push("Meta descriptions converted into ready-to-post copy.");
  }

  return {
    status: remainingIssues.length > 0 ? "warning" : "pass",
    issues_found: rawIssues.length,
    issues_fixed: Math.max(0, rawIssues.length - remainingIssues.length),
    warnings: remainingIssues,
    fixes,
  };
}

export async function runDashboardQc(projectId: string): Promise<DashboardQcResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "fail",
      issues_found: 1,
      issues_fixed: 0,
      warnings: ["User is required to run dashboard QC."],
      fixes: [],
    };
  }

  const [scheduledResult, assetsResult, resultsResult] = await Promise.all([
    supabase
      .from("scheduled_posts")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
      .order("scheduled_for", { ascending: true })
      .limit(20),
    supabase
      .from("publisher_queue")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
      .in("status", ["draft", "ready_for_approval", "approved", "scheduled_manual"])
      .order("predicted_rank_score", { ascending: false })
      .limit(20),
    supabase
      .from("campaign_results")
      .select("learning")
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (scheduledResult.error || assetsResult.error || resultsResult.error) {
    return {
      status: "fail",
      issues_found: 1,
      issues_fixed: 0,
      warnings: [
        scheduledResult.error?.message ||
          assetsResult.error?.message ||
          resultsResult.error?.message ||
          "Dashboard QC failed.",
      ],
      fixes: [],
    };
  }

  const rawScheduledWork = (scheduledResult.data ?? []) as ScheduledPostRow[];
  const rawBestAssets = (assetsResult.data ?? []) as PublisherQueueRow[];
  const includesDemoData = (resultsResult.data ?? []).some((result) =>
    /demo|system_test/i.test(result.learning || ""),
  );
  const scheduledWork = cleanVisibleScheduledWork(rawScheduledWork);
  const bestAssets = cleanVisibleBestAssets(rawBestAssets);

  return generateQcSummary({
    rawScheduledWork,
    rawBestAssets,
    scheduledWork,
    bestAssets,
    includesDemoData,
  });
}
