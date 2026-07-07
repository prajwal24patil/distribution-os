import { isBlogPlatform } from "@/lib/blogPublisher";
import { runRevenueAssetQc, type RevenueAsset } from "@/lib/careerScoreRevenueEngine";
import { sanitizePublicTrackingUrl } from "@/lib/publicUrl";
import type { PublishingConnectionPlatform, PublishingConnectionRow } from "@/lib/supabase/types";

export type PublishDecisionStatus =
  | "auto_publish_ready"
  | "manual_required"
  | "manual_review_required"
  | "blocked_by_qc"
  | "blocked_by_connection"
  | "blocked_by_platform_rules"
  | "blocked_by_rate_limit";

export type SocialPublishQueueStatus =
  | "draft"
  | "qc_pending"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "retry_scheduled"
  | "manual_required"
  | "manual_review_required"
  | "blocked";

export type SocialPublishQueueItem = {
  id: string;
  project_id: string;
  campaign_id: string;
  asset_id: string;
  platform: PublishingConnectionPlatform;
  status: SocialPublishQueueStatus;
  scheduled_for: string;
  attempt_count: number;
  max_attempts: number;
  last_attempt_at: string;
  published_at: string;
  published_url: string;
  tracking_link: string;
  error_code: string;
  safe_error_message: string;
  requires_manual_action: boolean;
  manual_instructions: string;
  created_at: string;
  updated_at: string;
};

function connectionFor(
  platform: PublishingConnectionPlatform,
  connections: PublishingConnectionRow[] = [],
) {
  return connections.find((connection) => connection.platform === platform) ?? null;
}

function hasScopes(connection: PublishingConnectionRow | null, scopes: string[]) {
  if (!connection) return false;
  const granted = `${connection.scopes} ${connection.permissions}`;
  return scopes.every((scope) => granted.includes(scope));
}

export function decideSocialDeployment(
  asset: RevenueAsset,
  connections: PublishingConnectionRow[] = [],
): {
  publish_decision: PublishDecisionStatus;
  connection_status: string;
  manual_instructions: string;
  warning: string;
} {
  const qc = runRevenueAssetQc(asset);
  const connection = connectionFor(asset.platform, connections);
  const connectionStatus = connection?.connection_status ?? "manual_required";

  if (qc.qc_status === "rejected") {
    return {
      publish_decision: "blocked_by_qc",
      connection_status: connectionStatus,
      manual_instructions: "Edit the asset until it passes QC.",
      warning: qc.qc_reason,
    };
  }

  if (connection?.connection_status === "rate_limited") {
    return {
      publish_decision: "blocked_by_rate_limit",
      connection_status: "rate_limited",
      manual_instructions: "Wait for the official platform rate limit window to reset.",
      warning: "Platform is rate limited.",
    };
  }

  if (isBlogPlatform(asset.platform, asset.asset_type)) {
    return {
      publish_decision: "auto_publish_ready",
      connection_status: "connected",
      manual_instructions: "Blog can publish through the internal blog publisher.",
      warning: "",
    };
  }

  if (
    asset.platform === "whatsapp_manual" ||
    asset.platform === "quora_manual" ||
    asset.platform === "email_manual"
  ) {
    return {
      publish_decision: "manual_required",
      connection_status: connectionStatus,
      manual_instructions: "Copy the asset and publish/send manually after founder approval.",
      warning: "Manual-only platform.",
    };
  }

  if (!connection || connection.connection_status !== "connected") {
    return {
      publish_decision: "manual_required",
      connection_status: connectionStatus,
      manual_instructions: "Copy and post manually, or connect the official platform API later.",
      warning: "Official account connection required for auto-publishing.",
    };
  }

  const requiredScopes: Record<PublishingConnectionPlatform, string[]> = {
    blog: [],
    linkedin: ["write"],
    x: ["tweet.write"],
    google_business_profile: ["business.manage"],
    reddit: ["submit"],
    facebook_page: ["pages_manage_posts"],
    instagram_business: ["instagram_content_publish"],
    youtube: ["youtube.upload"],
    whatsapp_manual: [],
    quora_manual: [],
    email_manual: [],
  };

  if (!hasScopes(connection, requiredScopes[asset.platform])) {
    return {
      publish_decision: "blocked_by_connection",
      connection_status: "permission_missing",
      manual_instructions: "Reconnect with the required official publishing permission.",
      warning: "Required publishing scope is missing.",
    };
  }

  if (asset.platform === "reddit" && !asset.content.toLowerCase().includes("helpful")) {
    return {
      publish_decision: "manual_review_required",
      connection_status: connectionStatus,
      manual_instructions: "Confirm subreddit rules allow this helpful reply before publishing.",
      warning: "Reddit community rules need manual confirmation.",
    };
  }

  return {
    publish_decision: "auto_publish_ready",
    connection_status: connectionStatus,
    manual_instructions: "",
    warning: "",
  };
}

export function createSocialPublishQueueItem({
  projectId,
  campaignId,
  asset,
  decision,
}: {
  projectId: string;
  campaignId: string;
  asset: RevenueAsset;
  decision: ReturnType<typeof decideSocialDeployment>;
}): SocialPublishQueueItem {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    project_id: projectId,
    campaign_id: campaignId,
    asset_id: asset.asset_type,
    platform: asset.platform,
    status:
      decision.publish_decision === "auto_publish_ready"
        ? "approved"
        : decision.publish_decision === "manual_review_required"
          ? "manual_review_required"
          : decision.publish_decision === "manual_required"
            ? "manual_required"
            : "blocked",
    scheduled_for: now,
    attempt_count: 0,
    max_attempts: 3,
    last_attempt_at: "",
    published_at: "",
    published_url: "",
    tracking_link: sanitizePublicTrackingUrl(asset.tracking_link),
    error_code: decision.warning ? decision.publish_decision : "",
    safe_error_message: decision.warning,
    requires_manual_action: decision.publish_decision !== "auto_publish_ready",
    manual_instructions: decision.manual_instructions,
    created_at: now,
    updated_at: now,
  };
}

export function recoverSocialDeploymentFailure(item: SocialPublishQueueItem) {
  if (!item.tracking_link) {
    return { status: "manual_review_required", recovered_issue: "missing tracking link" };
  }

  if (item.error_code === "blocked_by_rate_limit") {
    return { status: "retry_scheduled", recovered_issue: "rate limit rescheduled" };
  }

  if (item.error_code === "blocked_by_connection") {
    return { status: "manual_required", recovered_issue: "connection fallback to manual" };
  }

  return { status: item.status, recovered_issue: "" };
}
