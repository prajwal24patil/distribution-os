import { qaContentAsset } from "@/lib/qaAgent";
import { decryptPlatformToken } from "@/lib/platformTokenVault";
import { sanitizePostTrackingLinks } from "@/lib/publicUrl";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublishingConnectionRow, ScheduledPostRow } from "@/lib/supabase/types";

export type XPublishStatus =
  | "published"
  | "manual_required"
  | "manual_review_required"
  | "retry_scheduled"
  | "failed";

export type XPublishResult = {
  status: XPublishStatus;
  reason: string;
  publishedUrl: string;
};

function hasRequiredScopes(connection: PublishingConnectionRow) {
  const scopes = `${connection.scopes} ${connection.permissions}`;
  return ["tweet.write", "users.read"].every((scope) => scopes.includes(scope));
}

function isApprovedForAutoPost(post: ScheduledPostRow) {
  return ["scheduled", "auto_publish_ready", "retry_scheduled"].includes(post.status);
}

function xPostText(post: ScheduledPostRow) {
  const content = sanitizePostTrackingLinks(post.content);

  if (content.includes(post.tracking_url)) {
    return content;
  }

  return `${content}\n\n${post.tracking_url}`;
}

async function hasDuplicateXPost(post: ScheduledPostRow) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("id")
    .eq("project_id", post.project_id)
    .eq("owner_id", post.owner_id)
    .eq("platform", "x")
    .eq("content", post.content)
    .eq("status", "published")
    .gte("updated_at", since)
    .neq("id", post.id)
    .limit(1);

  if (error) {
    return true;
  }

  return (data ?? []).length > 0;
}

function manualRequired(reason: string): XPublishResult {
  return { status: "manual_required", reason, publishedUrl: "" };
}

export function buildXPostText(post: ScheduledPostRow) {
  return xPostText(post);
}

export async function publishXPost(
  post: ScheduledPostRow,
  connection: PublishingConnectionRow | null,
): Promise<XPublishResult> {
  if (!isApprovedForAutoPost(post)) {
    return {
      status: "manual_review_required",
      reason: "Post is not approved for auto-posting.",
      publishedUrl: "",
    };
  }

  if (!connection) {
    return manualRequired("X OAuth not connected.");
  }

  if (connection.connection_status === "rate_limited") {
    return { status: "retry_scheduled", reason: "X rate limit active.", publishedUrl: "" };
  }

  if (connection.connection_status !== "connected") {
    return manualRequired("X OAuth not connected.");
  }

  if (!connection.access_token_encrypted) {
    return manualRequired("X access token is missing.");
  }

  if (!hasRequiredScopes(connection)) {
    return manualRequired("X OAuth permission missing: tweet.write and users.read are required.");
  }

  if (!post.tracking_url) {
    return {
      status: "manual_review_required",
      reason: "Tracking link is required before auto-posting.",
      publishedUrl: "",
    };
  }

  const text = xPostText(post);
  const qc = qaContentAsset({
    content: text,
    trackingLink: post.tracking_url,
    platform: "x",
  });

  if (qc.status !== "approved") {
    return { status: "manual_review_required", reason: qc.reason, publishedUrl: "" };
  }

  if (await hasDuplicateXPost(post)) {
    return {
      status: "manual_review_required",
      reason: "Duplicate X content was already published in the last 24 hours.",
      publishedUrl: "",
    };
  }

  let accessToken = "";

  try {
    accessToken = decryptPlatformToken(connection.access_token_encrypted);
  } catch {
    return manualRequired("X access token could not be decrypted.");
  }

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (response.status === 429) {
    return { status: "retry_scheduled", reason: "X rate limit active.", publishedUrl: "" };
  }

  if (!response.ok) {
    const responseBody = await response.text();

    return {
      status: "failed",
      reason: `X API publish failed (${response.status}): ${responseBody.slice(0, 500)}`,
      publishedUrl: "",
    };
  }

  const payload = (await response.json()) as { data?: { id?: string } };
  const postId = payload.data?.id || "";

  if (!postId) {
    return {
      status: "failed",
      reason: "X API did not return a post id.",
      publishedUrl: "",
    };
  }

  const account = connection.account_name ? connection.account_name.replace(/^@/, "") : "i";

  return {
    status: "published",
    reason: "",
    publishedUrl: `https://x.com/${account}/status/${postId}`,
  };
}

export const XPublisherAdapter = {
  publishPost: publishXPost,
};
