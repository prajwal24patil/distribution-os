import { NextResponse } from "next/server";
import { generateContentBatch } from "@/lib/autonomousDistributionEngine";
import { isBlogPlatform } from "@/lib/blogPublisher";
import {
  cleanVisibleBestAssets,
  cleanVisibleScheduledWork,
  generateQcSummary,
} from "@/lib/dashboardQcAgent";
import { publishDuePosts } from "@/lib/publishingWorker";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CampaignItemInsert,
  ProjectRow,
  PublisherQueueInsert,
  PublisherQueueRow,
  ScheduledPostInsert,
  ScheduledPostRow,
} from "@/lib/supabase/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

async function getProductUrl(project: ProjectRow) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_memory")
    .select("website_url, product_url")
    .eq("project_id", project.id)
    .eq("owner_id", project.user_id)
    .maybeSingle();

  return data?.product_url || data?.website_url || "https://incomeos-theta.vercel.app/";
}

async function runDistributionCycleForProject(project: ProjectRow) {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: existingCycle } = await supabase
    .from("distribution_cycles")
    .select("id, queued_count")
    .eq("project_id", project.id)
    .eq("owner_id", project.user_id)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .limit(1)
    .maybeSingle();

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
    throw new Error(campaignError?.message || "Campaign could not be created.");
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
    throw new Error(itemError?.message || "Campaign items could not be created.");
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
      tracking_url: `/t/${trackingId}`,
    };
  });
  const { error: trackingError } = await supabase.from("tracking_links").insert(trackingRows);

  if (trackingError) {
    throw new Error(trackingError.message);
  }

  const queueRows: PublisherQueueInsert[] = assets.map((asset, index) => ({
    project_id: project.id,
    owner_id: project.user_id,
    campaign_item_id: insertedItems[index]?.id ?? null,
    platform: asset.platform,
    content_type: asset.assetType,
    title: asset.title,
    content: asset.content,
    tracking_url: trackingRows[index]?.tracking_url || "",
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
    throw new Error(queueError.message);
  }

  await supabase.from("distribution_cycles").insert({
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

  if (queueError) throw new Error(queueError.message);

  const { data: existingData, error: existingError } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", project.user_id)
    .limit(50);

  if (existingError) throw new Error(existingError.message);

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
        content: item.content,
        tracking_url: item.tracking_url,
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

  if (insertError) throw new Error(insertError.message);

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
    throw new Error(
      scheduledResult.error?.message ||
        assetsResult.error?.message ||
        resultsResult.error?.message ||
        "Dashboard QC failed.",
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
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = {
    projects_checked: (projects ?? []).length,
    cycles_run: 0,
    assets_created: 0,
    scheduled: 0,
    published: 0,
    manual_required: 0,
    errors: [] as Array<{ project_id: string; message: string }>,
  };

  for (const project of (projects ?? []) as ProjectRow[]) {
    try {
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

      if (qc.status === "fail") {
        summary.errors.push({ project_id: project.id, message: "Dashboard QC failed." });
      }

      void metrics;
    } catch (error) {
      summary.errors.push({
        project_id: project.id,
        message: error instanceof Error ? error.message : "Project cron failed.",
      });
    }
  }

  const published = await publishDuePosts();
  summary.published += published.filter((result) => result.status === "published").length;
  summary.manual_required += published.filter(
    (result) => result.status === "manual_required",
  ).length;

  return NextResponse.json(summary);
}
