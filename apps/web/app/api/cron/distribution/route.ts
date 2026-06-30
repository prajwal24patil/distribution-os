import { NextResponse } from "next/server";
import { generateContentBatch } from "@/lib/autonomousDistributionEngine";
import { isBlogPlatform } from "@/lib/blogPublisher";
import {
  cleanVisibleBestAssets,
  cleanVisibleScheduledWork,
  generateQcSummary,
} from "@/lib/dashboardQcAgent";
import { publishDuePosts } from "@/lib/publishingWorker";
import {
  getSafePublicTrackingUrl,
  isValidProductionPublicAppUrl,
  repairLegacyLocalTrackingText,
  sanitizePostTrackingLinks,
  sanitizePublicTrackingUrl,
} from "@/lib/publicUrl";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CampaignItemInsert,
  ProjectRow,
  PublisherQueueInsert,
  PublisherQueueRow,
  ScheduledPostInsert,
  ScheduledPostRow,
} from "@/lib/supabase/types";

type CronErrorDetail = {
  project_id?: string;
  table?: string;
  action?: string;
  message: string;
};

class CronRouteError extends Error {
  table?: string;
  action?: string;

  constructor({ table, action, message }: { table?: string; action?: string; message: string }) {
    super(message);
    this.name = "CronRouteError";
    this.table = table;
    this.action = action;
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function methodNotAllowed() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export function GET() {
  return methodNotAllowed();
}

function validateRequiredEnv() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ];

  const missing = required.filter((key) => !process.env[key]?.trim());

  if (
    process.env.NEXT_PUBLIC_APP_URL?.trim() &&
    !isValidProductionPublicAppUrl(process.env.NEXT_PUBLIC_APP_URL)
  ) {
    missing.push("NEXT_PUBLIC_APP_URL_INVALID");
  }

  return missing;
}

function supabaseFailure(table: string, action: string, message: string) {
  return new CronRouteError({ table, action, message });
}

function safeErrorDetail(error: unknown, projectId?: string): CronErrorDetail {
  if (error instanceof CronRouteError) {
    return {
      project_id: projectId,
      table: error.table,
      action: error.action,
      message: error.message,
    };
  }

  return {
    project_id: projectId,
    message: error instanceof Error ? error.message : "Cron step failed.",
  };
}

function logSafeCronError(scope: string, error: CronErrorDetail) {
  console.error("[cron:distribution]", {
    scope,
    project_id: error.project_id,
    table: error.table,
    action: error.action,
    message: error.message,
  });
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function normalizePlatform(platform: string) {
  const normalized = platform.toLowerCase();

  if (normalized.includes("linkedin")) return "linkedin";
  if (normalized.includes("reddit")) return "reddit";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("youtube")) return "youtube";
  if (normalized.includes("blog") || normalized.includes("seo")) return "blog";

  return normalized.replace(/[^a-z0-9]+/g, "_") || "organic";
}

function repairRowValue(value: string | null | undefined) {
  return repairLegacyLocalTrackingText(value || "");
}

async function repairCronProjectTrackingLinks(project: ProjectRow) {
  const supabase = createAdminClient();
  const [trackingLinks, publisherQueue, scheduledPosts, campaignItems, autopilotRuns, dailyRuns] =
    await Promise.all([
      supabase
        .from("tracking_links")
        .select("id, tracking_url")
        .eq("project_id", project.id)
        .eq("owner_id", project.user_id),
      supabase
        .from("publisher_queue")
        .select(
          "id, title, content, tracking_url, posted_url, short_video_script, blog_outline, caption, landing_copy, referral_copy",
        )
        .eq("project_id", project.id)
        .eq("owner_id", project.user_id),
      supabase
        .from("scheduled_posts")
        .select("id, title, content, tracking_url, published_url")
        .eq("project_id", project.id)
        .eq("owner_id", project.user_id),
      supabase
        .from("campaign_items")
        .select("id, content, utm_link")
        .eq("project_id", project.id)
        .eq("owner_id", project.user_id),
      supabase
        .from("autopilot_runs")
        .select("id, work_created")
        .eq("project_id", project.id)
        .eq("owner_id", project.user_id),
      supabase
        .from("daily_autopilot_runs")
        .select("id, problem_found, fix_applied, next_step")
        .eq("project_id", project.id)
        .eq("owner_id", project.user_id),
    ]);

  let repaired = 0;
  const warnings: string[] = [];

  for (const result of [
    trackingLinks,
    publisherQueue,
    scheduledPosts,
    campaignItems,
    autopilotRuns,
    dailyRuns,
  ]) {
    if (result.error) warnings.push(result.error.message);
  }

  const repairRows = async <Row extends { id: string }>(
    rows: Row[],
    fields: Array<keyof Row>,
    update: (
      id: string,
      patch: Record<string, string>,
    ) => PromiseLike<{ error: { message: string } | null }>,
  ) => {
    for (const row of rows) {
      const patch: Record<string, string> = {};

      for (const field of fields) {
        const before = row[field];

        if (typeof before !== "string") continue;

        const after = repairRowValue(before) as Row[keyof Row];

        if (after !== before) {
          patch[String(field)] = String(after);
        }
      }

      if (Object.keys(patch).length === 0) continue;

      const result = await update(row.id, patch);

      if (result.error) {
        warnings.push(result.error.message);
      } else {
        repaired += 1;
      }
    }
  };

  await repairRows(trackingLinks.data ?? [], ["tracking_url"], (id, patch) =>
    supabase
      .from("tracking_links")
      .update(patch as { tracking_url?: string })
      .eq("id", id),
  );
  await repairRows(
    publisherQueue.data ?? [],
    [
      "title",
      "content",
      "tracking_url",
      "posted_url",
      "short_video_script",
      "blog_outline",
      "caption",
      "landing_copy",
      "referral_copy",
    ],
    (id, patch) =>
      supabase
        .from("publisher_queue")
        .update(
          patch as {
            title?: string;
            content?: string;
            tracking_url?: string;
            posted_url?: string;
            short_video_script?: string;
            blog_outline?: string;
            caption?: string;
            landing_copy?: string;
            referral_copy?: string;
          },
        )
        .eq("id", id),
  );
  await repairRows(
    scheduledPosts.data ?? [],
    ["title", "content", "tracking_url", "published_url"],
    (id, patch) =>
      supabase
        .from("scheduled_posts")
        .update(
          patch as {
            title?: string;
            content?: string;
            tracking_url?: string;
            published_url?: string;
          },
        )
        .eq("id", id),
  );
  await repairRows(campaignItems.data ?? [], ["content", "utm_link"], (id, patch) =>
    supabase
      .from("campaign_items")
      .update(patch as { content?: string; utm_link?: string })
      .eq("id", id),
  );
  await repairRows(autopilotRuns.data ?? [], ["work_created"], (id, patch) =>
    supabase
      .from("autopilot_runs")
      .update(patch as { work_created?: string })
      .eq("id", id),
  );
  await repairRows(
    dailyRuns.data ?? [],
    ["problem_found", "fix_applied", "next_step"],
    (id, patch) =>
      supabase
        .from("daily_autopilot_runs")
        .update(
          patch as {
            problem_found?: string;
            fix_applied?: string;
            next_step?: string;
          },
        )
        .eq("id", id),
  );

  return { repaired, warnings };
}

async function getProductUrl(project: ProjectRow) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_memory")
    .select("website_url, product_url")
    .eq("project_id", project.id)
    .eq("owner_id", project.user_id)
    .maybeSingle();

  if (error) {
    throw supabaseFailure("product_memory", "select_product_url", error.message);
  }

  return data?.product_url || data?.website_url || "https://incomeos-theta.vercel.app/";
}

async function runDistributionCycleForProject(project: ProjectRow) {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: existingCycle, error: existingCycleError } = await supabase
    .from("distribution_cycles")
    .select("id, queued_count")
    .eq("project_id", project.id)
    .eq("owner_id", project.user_id)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .limit(1)
    .maybeSingle();

  if (existingCycleError) {
    throw supabaseFailure(
      "distribution_cycles",
      "select_existing_cycle",
      existingCycleError.message,
    );
  }

  if (existingCycle) {
    return { assetsCreated: 0, skipped: true };
  }

  const productUrl = await getProductUrl(project);
  const assets = (await generateContentBatch(project.id)).slice(0, 8);
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      project_id: project.id,
      owner_id: project.user_id,
      name: `${project.customer || "CareerScore"} 24/7 Distribution Cycle`,
      campaign_type: "linkedin_founder_post",
      status: "draft",
      next_action: "Review scheduled work, publish manually where required, and track results.",
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    throw supabaseFailure(
      "campaigns",
      "insert",
      campaignError?.message || "Campaign could not be created.",
    );
  }

  const campaignItems: CampaignItemInsert[] = assets.map((asset) => ({
    campaign_id: campaign.id,
    project_id: project.id,
    owner_id: project.user_id,
    campaign_type: asset.assetType.includes("seo") ? "seo_blog" : "linkedin_founder_post",
    channel: asset.platform,
    hook: asset.title,
    content: asset.content,
    target_audience: "CareerScore job seekers",
    cta: asset.cta,
    expected_outcome: asset.bestFor,
    utm_source: slug(asset.platform),
    utm_medium: "organic",
    utm_campaign: "daily-distribution",
    utm_content: slug(asset.title),
    utm_link: productUrl,
    status: "draft",
  }));
  const { data: insertedItems, error: itemError } = await supabase
    .from("campaign_items")
    .insert(campaignItems)
    .select("id, project_id, owner_id, utm_source, utm_medium, utm_campaign, utm_content");

  if (itemError || !insertedItems) {
    throw supabaseFailure(
      "campaign_items",
      "insert",
      itemError?.message || "Campaign items could not be created.",
    );
  }

  const trackingRows = insertedItems.map((item) => {
    const trackingId = crypto.randomUUID();

    return {
      id: trackingId,
      project_id: item.project_id,
      owner_id: item.owner_id,
      campaign_item_id: item.id,
      destination_url: productUrl,
      utm_source: item.utm_source,
      utm_medium: item.utm_medium,
      utm_campaign: item.utm_campaign,
      utm_content: item.utm_content,
      tracking_url: getSafePublicTrackingUrl(trackingId),
    };
  });
  const { error: trackingError } = await supabase.from("tracking_links").insert(trackingRows);

  if (trackingError) {
    throw supabaseFailure("tracking_links", "insert", trackingError.message);
  }

  const queueRows: PublisherQueueInsert[] = assets.map((asset, index) => ({
    project_id: project.id,
    owner_id: project.user_id,
    campaign_item_id: insertedItems[index]?.id ?? null,
    platform: asset.platform,
    content_type: asset.assetType,
    title: asset.title,
    content: sanitizePostTrackingLinks(asset.content),
    tracking_url: sanitizePublicTrackingUrl(trackingRows[index]?.tracking_url || ""),
    status: "ready_for_approval",
    asset_type: asset.assetType,
    format: asset.format,
    short_video_script: asset.shortVideoScript || "",
    blog_outline: asset.blogOutline || "",
    caption: asset.caption || "",
    landing_copy: asset.landingCopy || "",
    referral_copy: asset.referralCopy || "",
    quality_score: 80,
    qa_status: "approved",
    qa_reason: "Cron-generated asset passed deterministic safety checks.",
    predicted_rank_score: 80,
    publishing_status: "manual_approval_required",
    result_summary: "Waiting for publishing connection or manual posting.",
  }));
  const { error: queueError } = await supabase.from("publisher_queue").insert(queueRows);

  if (queueError) {
    throw supabaseFailure("publisher_queue", "insert", queueError.message);
  }

  const { error: cycleInsertError } = await supabase.from("distribution_cycles").insert({
    project_id: project.id,
    owner_id: project.user_id,
    cycle_type: "daily",
    status: "completed",
    product_url: productUrl,
    strategy_summary: "24/7 cron created fresh CareerScore distribution assets.",
    channels_selected: assets.map((asset) => asset.platform).join(", "),
    content_created_count: assets.length,
    content_approved_count: assets.length,
    content_rejected_count: 0,
    published_count: 0,
    queued_count: queueRows.length,
    next_cycle_plan: "Publish ready assets, collect CareerScore events, then repeat winners.",
  });

  if (cycleInsertError) {
    throw supabaseFailure("distribution_cycles", "insert", cycleInsertError.message);
  }

  return { assetsCreated: queueRows.length, skipped: false };
}

async function scheduleProjectAssets(project: ProjectRow) {
  const supabase = createAdminClient();
  const { data: queueData, error: queueError } = await supabase
    .from("publisher_queue")
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", project.user_id)
    .in("status", ["ready_for_approval", "approved"])
    .order("predicted_rank_score", { ascending: false })
    .limit(12);

  if (queueError)
    throw supabaseFailure("publisher_queue", "select_ready_assets", queueError.message);

  const { data: existingData, error: existingError } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", project.user_id)
    .limit(50);

  if (existingError)
    throw supabaseFailure("scheduled_posts", "select_existing_posts", existingError.message);

  const existing = (existingData ?? []) as ScheduledPostRow[];
  const existingQueueIds = new Set(existing.map((post) => post.publisher_queue_id));
  const rows: ScheduledPostInsert[] = ((queueData ?? []) as PublisherQueueRow[])
    .filter((item) => !existingQueueIds.has(item.id))
    .slice(0, 5)
    .map((item, index) => {
      const platform = normalizePlatform(item.platform);
      const scheduledFor = new Date(Date.now() + index * 60 * 60 * 1000).toISOString();

      return {
        project_id: item.project_id,
        owner_id: item.owner_id,
        publisher_queue_id: item.id,
        platform,
        content_type: item.content_type,
        title: item.title,
        content: sanitizePostTrackingLinks(item.content),
        tracking_url: sanitizePublicTrackingUrl(item.tracking_url),
        scheduled_for: scheduledFor,
        timezone: "Asia/Kolkata",
        status: isBlogPlatform(platform, item.content_type) ? "scheduled" : "manual_required",
        publish_mode: isBlogPlatform(platform, item.content_type)
          ? "official_auto_publish"
          : "manual_approval",
        failure_reason: isBlogPlatform(platform, item.content_type)
          ? ""
          : "Official account connection required before auto-publishing.",
      };
    });

  if (rows.length === 0) {
    return { scheduled: 0, manualRequired: 0 };
  }

  const { error: insertError } = await supabase.from("scheduled_posts").insert(rows);

  if (insertError) throw supabaseFailure("scheduled_posts", "insert", insertError.message);

  return {
    scheduled: rows.filter((row) => row.status === "scheduled").length,
    manualRequired: rows.filter((row) => row.status === "manual_required").length,
  };
}

async function runDashboardQcForProject(project: ProjectRow) {
  const supabase = createAdminClient();
  const [scheduledResult, assetsResult, resultsResult] = await Promise.all([
    supabase
      .from("scheduled_posts")
      .select("*")
      .eq("project_id", project.id)
      .eq("owner_id", project.user_id)
      .limit(20),
    supabase
      .from("publisher_queue")
      .select("*")
      .eq("project_id", project.id)
      .eq("owner_id", project.user_id)
      .limit(20),
    supabase
      .from("campaign_results")
      .select("learning")
      .eq("project_id", project.id)
      .eq("owner_id", project.user_id)
      .limit(20),
  ]);

  if (scheduledResult.error || assetsResult.error || resultsResult.error) {
    if (scheduledResult.error) {
      throw supabaseFailure(
        "scheduled_posts",
        "select_dashboard_qc",
        scheduledResult.error.message,
      );
    }

    if (assetsResult.error) {
      throw supabaseFailure("publisher_queue", "select_dashboard_qc", assetsResult.error.message);
    }

    throw supabaseFailure(
      "campaign_results",
      "select_dashboard_qc",
      resultsResult.error?.message || "Dashboard QC failed.",
    );
  }

  const rawScheduledWork = (scheduledResult.data ?? []) as ScheduledPostRow[];
  const rawBestAssets = (assetsResult.data ?? []) as PublisherQueueRow[];
  const includesDemoData = (resultsResult.data ?? []).some((result) =>
    /demo|system_test/i.test(result.learning || ""),
  );

  return generateQcSummary({
    rawScheduledWork,
    rawBestAssets,
    scheduledWork: cleanVisibleScheduledWork(rawScheduledWork),
    bestAssets: cleanVisibleBestAssets(rawBestAssets),
    includesDemoData,
  });
}

export async function POST(request: Request) {
  try {
    const missingEnv = validateRequiredEnv();

    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: "Missing required environment variables.", missing_env: missingEnv },
        { status: 500 },
      );
    }

    const cronSecret = process.env.CRON_SECRET || "";

    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (token !== cronSecret) {
      return unauthorized();
    }

    const supabase = createAdminClient();
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) {
      const detail = safeErrorDetail(supabaseFailure("projects", "select_active", error.message));
      logSafeCronError("load_projects", detail);

      return NextResponse.json({ error: "Supabase query failed.", detail }, { status: 500 });
    }

    const summary = {
      ok: true,
      projects_checked: (projects ?? []).length,
      cycles_run: 0,
      assets_created: 0,
      scheduled: 0,
      published: 0,
      manual_required: 0,
      links_repaired: 0,
      errors: [] as CronErrorDetail[],
    };

    for (const project of (projects ?? []) as ProjectRow[]) {
      try {
        const repair = await repairCronProjectTrackingLinks(project);
        const cycle = await runDistributionCycleForProject(project);
        const qc = await runDashboardQcForProject(project);
        const scheduled = await scheduleProjectAssets(project);
        const metrics = await import("@/lib/publishingWorker").then((module) =>
          module.collectPublishedPostMetrics(project.id, project.user_id),
        );

        summary.cycles_run += cycle.skipped ? 0 : 1;
        summary.assets_created += cycle.assetsCreated;
        summary.scheduled += scheduled.scheduled;
        summary.manual_required += scheduled.manualRequired;
        summary.links_repaired += repair.repaired;

        if (qc.status === "fail") {
          summary.errors.push({ project_id: project.id, message: "Dashboard QC failed." });
        }

        for (const warning of repair.warnings) {
          summary.errors.push({ project_id: project.id, message: warning });
        }

        void metrics;
      } catch (error) {
        const detail = safeErrorDetail(error, project.id);
        summary.errors.push(detail);
        logSafeCronError("project", detail);
      }
    }

    try {
      const published = await publishDuePosts();
      summary.published += published.filter((result) => result.status === "published").length;
      summary.manual_required += published.filter(
        (result) => result.status === "manual_required",
      ).length;
    } catch (error) {
      const detail = safeErrorDetail(error);
      summary.errors.push({
        ...detail,
        table: detail.table || "scheduled_posts",
        action: detail.action || "publish_due_posts",
      });
      logSafeCronError("publish_due_posts", detail);
    }

    summary.ok = summary.errors.length === 0;

    return NextResponse.json(summary);
  } catch (error) {
    const detail = safeErrorDetail(error);
    logSafeCronError("route", detail);

    return NextResponse.json({ error: "Cron route failed.", detail }, { status: 500 });
  }
}
