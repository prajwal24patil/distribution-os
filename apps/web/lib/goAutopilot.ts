import { createDailyContentFactory, runSpamRiskGuard } from "@/lib/dailyContentFactory";
import { ingestProductUrl } from "@/lib/autonomousDistributionEngine";
import { publishDuePosts } from "@/lib/publishingWorker";
import { scheduleApprovedAssets } from "@/lib/publishingScheduler";
import { toPublicUrl } from "@/lib/publicUrl";
import { createClient } from "@/lib/supabase/server";
import type {
  CampaignItemInsert,
  PublisherQueueInsert,
  TrackingLinkInsert,
} from "@/lib/supabase/types";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function queuePlatform(platform: string) {
  if (platform === "Google Business") return "Google Business";
  return platform;
}

function nextBestAction({
  manualShares,
  blogPublished,
  blocked,
}: {
  manualShares: number;
  blogPublished: number;
  blocked: number;
}) {
  if (manualShares > 0) {
    return "Pick the highest ranked manual-required post, copy it, publish it, then add the result.";
  }

  if (blogPublished > 0) {
    return "Share the new CareerScore blog post through one founder-led channel.";
  }

  if (blocked > 0) {
    return "Review blocked assets and rewrite the risky angle before queueing more work.";
  }

  return "Watch for CareerScore clicks and conversion events, then repeat the strongest channel.";
}

export type GoAutopilotSummary = {
  assetsCreated: number;
  approved: number;
  blocked: number;
  scheduled: number;
  blogPublished: number;
  manualShares: number;
  warnings: string[];
  nextBestAction: string;
};

export async function runGoAutopilot(projectId: string): Promise<GoAutopilotSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is required to run GO Autopilot.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message || "Project not found.");
  }

  const productUrl = await ingestProductUrl(projectId);
  const assets = createDailyContentFactory();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      name: `${project.customer || "CareerScore"} GO Autopilot`,
      campaign_type: "linkedin_founder_post",
      status: "active",
      next_action: "Review scheduled work, publish manual-required posts, and add results.",
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message || "GO Autopilot campaign could not be created.");
  }

  const campaignRows: CampaignItemInsert[] = assets.map((asset) => ({
    campaign_id: campaign.id,
    project_id: projectId,
    owner_id: user.id,
    campaign_type: asset.campaignType,
    channel: asset.platform,
    hook: asset.title,
    content: asset.content,
    target_audience: asset.targetAudience,
    cta: asset.cta,
    expected_outcome: asset.expectedOutcome,
    utm_source: slug(asset.platform),
    utm_medium: "organic",
    utm_campaign: "go-autopilot",
    utm_content: slug(`${asset.assetType}-${asset.angle}`),
    utm_link: productUrl,
    status: "draft",
  }));

  const { data: insertedItems, error: itemError } = await supabase
    .from("campaign_items")
    .insert(campaignRows)
    .select("id, project_id, owner_id, utm_source, utm_medium, utm_campaign, utm_content");

  if (itemError || !insertedItems) {
    throw new Error(itemError?.message || "GO Autopilot assets could not be created.");
  }

  const trackingRows: TrackingLinkInsert[] = insertedItems.map((item) => {
    const id = crypto.randomUUID();

    return {
      id,
      project_id: item.project_id,
      owner_id: item.owner_id,
      campaign_item_id: item.id,
      destination_url: productUrl,
      utm_source: item.utm_source,
      utm_medium: item.utm_medium,
      utm_campaign: item.utm_campaign,
      utm_content: item.utm_content,
      tracking_url: toPublicUrl(`/t/${id}`),
    };
  });

  const { error: trackingError } = await supabase.from("tracking_links").insert(trackingRows);

  if (trackingError) {
    throw new Error(trackingError.message);
  }

  const guarded = assets.map((asset, index) =>
    runSpamRiskGuard(asset, trackingRows[index]?.tracking_url || ""),
  );

  for (const [index, item] of insertedItems.entries()) {
    const asset = guarded[index];
    const { error } = await supabase
      .from("campaign_items")
      .update({
        content: asset.finalContent,
        hook: asset.title,
        cta: asset.cta,
        status: asset.qaStatus === "approved" ? "approved" : "failed",
      })
      .eq("id", item.id)
      .eq("owner_id", user.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  const approved = guarded.filter((asset) => asset.qaStatus === "approved");
  const blocked = guarded.filter((asset) => asset.qaStatus === "rejected");
  const queueRows: PublisherQueueInsert[] = approved.map((asset, index) => {
    const campaignItem = insertedItems[guarded.indexOf(asset)];

    return {
      project_id: projectId,
      owner_id: user.id,
      campaign_item_id: campaignItem?.id ?? null,
      platform: queuePlatform(asset.platform),
      content_type: asset.assetType,
      title: asset.title,
      content: asset.finalContent,
      tracking_url: asset.trackingUrl,
      status: "approved",
      asset_type: asset.assetType,
      format: asset.format,
      short_video_script: asset.shortVideoScript || "",
      blog_outline: asset.blogOutline || "",
      caption: asset.caption || "",
      referral_copy: asset.referralCopy || "",
      quality_score: asset.qualityScore - index * 0.1,
      qa_status: asset.qaStatus,
      qa_reason: asset.qaReason,
      predicted_rank_score: asset.predictedRankScore - index * 0.1,
      publishing_status:
        asset.platform === "Blog" ? "auto_publish_ready" : "manual_approval_required",
      result_summary: "Created by GO Autopilot. Awaiting publishing or manual result.",
    };
  });

  if (queueRows.length > 0) {
    const { error: queueError } = await supabase.from("publisher_queue").insert(queueRows);

    if (queueError) {
      throw new Error(queueError.message);
    }
  }

  const scheduled = await scheduleApprovedAssets(projectId);
  const publishResults = await publishDuePosts(20, { projectId, ownerId: user.id });
  const blogPublished = publishResults.filter((result) => result.status === "published").length;
  const manualShares =
    scheduled.manualRequired +
    publishResults.filter((result) => result.status === "manual_required").length;
  const warnings = [
    ...blocked.map((asset) => `${asset.title}: ${asset.qaReason}`),
    scheduled.created < approved.length
      ? "Schedule Optimizer limited output to avoid duplicate or too-fast posting."
      : "",
  ].filter(Boolean);
  const summary = {
    assetsCreated: assets.length,
    approved: approved.length,
    blocked: blocked.length,
    scheduled: scheduled.created,
    blogPublished,
    manualShares,
    warnings,
    nextBestAction: nextBestAction({ manualShares, blogPublished, blocked: blocked.length }),
  };

  await supabase.from("distribution_cycles").insert({
    project_id: projectId,
    owner_id: user.id,
    cycle_type: "daily",
    status: "completed",
    product_url: productUrl,
    strategy_summary:
      "GO Autopilot created a full daily CareerScore content batch, ran QC, queued safe assets, scheduled eligible work, and kept social publishing manual unless officially connected.",
    channels_selected:
      "LinkedIn, X, SEO blog, Reddit, Quora, WhatsApp, Instagram, YouTube, Google Business, Email, Referral",
    content_created_count: summary.assetsCreated,
    content_approved_count: summary.approved,
    content_rejected_count: summary.blocked,
    published_count: summary.blogPublished,
    queued_count: queueRows.length,
    learning_summary:
      summary.warnings.length > 0
        ? summary.warnings.slice(0, 3).join(" ")
        : "No real winner yet. Track clicks, signups, paid reports, and learning after posting.",
    next_cycle_plan: summary.nextBestAction,
  });

  return summary;
}
