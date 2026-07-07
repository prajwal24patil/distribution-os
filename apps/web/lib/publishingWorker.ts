import { isBlogPlatform, publishInternalBlogPost } from "@/lib/blogPublisher";
import { getPublisherAdapter } from "@/lib/publisherAdapters";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishXPost } from "@/lib/xPublisherAdapter";
import type {
  PublishingConnectionPlatform,
  PublishingConnectionRow,
  ScheduledPostRow,
} from "@/lib/supabase/types";

const MAX_ATTEMPTS = 3;

function normalizePlatform(platform: string): PublishingConnectionPlatform {
  const normalized = platform.toLowerCase();

  if (normalized.includes("linkedin")) return "linkedin";
  if (normalized === "x" || normalized.includes("twitter")) return "x";
  if (normalized.includes("google")) return "google_business_profile";
  if (normalized.includes("reddit")) return "reddit";
  if (normalized.includes("facebook")) return "facebook_page";
  if (normalized.includes("instagram")) return "instagram_business";
  if (normalized.includes("youtube")) return "youtube";
  if (normalized.includes("quora")) return "quora_manual";
  if (normalized.includes("whatsapp")) return "whatsapp_manual";
  if (normalized.includes("email")) return "email_manual";
  if (normalized.includes("blog") || normalized.includes("seo")) return "blog";
  return "linkedin";
}

async function getConnection(post: ScheduledPostRow) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("publishing_connections")
    .select("*")
    .eq("project_id", post.project_id)
    .eq("owner_id", post.owner_id)
    .eq("platform", normalizePlatform(post.platform))
    .maybeSingle();

  return data as PublishingConnectionRow | null;
}

async function updatePostFailure(post: ScheduledPostRow, reason: string) {
  const supabase = createAdminClient();
  const attempts = post.publish_attempts + 1;
  const status = attempts >= MAX_ATTEMPTS ? "failed" : "manual_required";

  await supabase
    .from("scheduled_posts")
    .update({ status, publish_attempts: attempts, failure_reason: reason })
    .eq("id", post.id)
    .eq("owner_id", post.owner_id);

  return { status, reason };
}

async function updatePostRetry(post: ScheduledPostRow, reason: string) {
  const supabase = createAdminClient();
  const attempts = post.publish_attempts + 1;
  const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const status = attempts >= MAX_ATTEMPTS ? "manual_required" : "retry_scheduled";

  await supabase
    .from("scheduled_posts")
    .update({
      status,
      publish_attempts: attempts,
      scheduled_for: retryAt,
      failure_reason: reason,
    })
    .eq("id", post.id)
    .eq("owner_id", post.owner_id);

  return { status, reason };
}

async function updatePostPublished(post: ScheduledPostRow, publishedUrl = "") {
  const supabase = createAdminClient();
  const publishedAt = new Date().toISOString();

  await supabase
    .from("scheduled_posts")
    .update({
      status: "published",
      publish_attempts: post.publish_attempts + 1,
      published_at: publishedAt,
      published_url: publishedUrl,
      failure_reason: "",
    })
    .eq("id", post.id)
    .eq("owner_id", post.owner_id);

  if (post.publisher_queue_id) {
    await supabase
      .from("publisher_queue")
      .update({
        status: "posted",
        publishing_status: "published",
        published_url: publishedUrl,
        posted_url: publishedUrl,
        result_summary: "Published through official X API.",
      })
      .eq("id", post.publisher_queue_id)
      .eq("owner_id", post.owner_id);
  }

  return { status: "published", reason: "", publishedUrl };
}

export async function handlePublishFailure(post: ScheduledPostRow, reason: string) {
  return updatePostFailure(post, reason);
}

export async function publishSinglePost(post: ScheduledPostRow) {
  if (post.publish_attempts >= MAX_ATTEMPTS) {
    return handlePublishFailure(post, "Maximum publish attempts reached.");
  }

  if (isBlogPlatform(post.platform, post.content_type)) {
    const publishedUrl = await publishInternalBlogPost(post);
    return { status: "published", reason: "", publishedUrl };
  }

  if (post.status === "manual_required") {
    return {
      status: "manual_required",
      reason: "Official account connection required before auto-publishing.",
    };
  }

  const connection = await getConnection(post);
  const connected = connection?.connection_status === "connected";

  if (connection?.connection_status === "rate_limited") {
    return updatePostRetry(post, "Platform rate limit active.");
  }

  if (!connected) {
    return handlePublishFailure(
      post,
      "Official account connection required before auto-publishing.",
    );
  }

  if (normalizePlatform(post.platform) === "x") {
    const result = await publishXPost(post, connection);

    if (result.status === "published") {
      return updatePostPublished(post, result.publishedUrl);
    }

    if (result.status === "retry_scheduled") {
      return updatePostRetry(post, result.reason);
    }

    return handlePublishFailure(post, result.reason);
  }

  const adapter = getPublisherAdapter(post.platform);
  const result = adapter?.publishPost(
    {
      title: post.title,
      content: post.content,
      trackingUrl: post.tracking_url,
    },
    true,
  );

  if (result?.status === "official_integration_not_implemented") {
    return handlePublishFailure(post, `${result.reason} ${result.exact_setup_needed}`);
  }

  if (result?.status !== "published") {
    return handlePublishFailure(
      post,
      result ? `${result.reason} ${result.exact_setup_needed}` : "Publishing adapter missing.",
    );
  }

  return updatePostPublished(post);
}

export async function publishDuePosts(
  limit = 10,
  filters: { projectId?: string; ownerId?: string; platform?: PublishingConnectionPlatform } = {},
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("scheduled_posts")
    .select("*")
    .lte("scheduled_for", new Date().toISOString())
    .in("status", [
      "scheduled",
      "ready",
      "manual_required",
      "retry_scheduled",
      "auto_publish_ready",
    ])
    .order("scheduled_for", { ascending: true });

  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  if (filters.platform) {
    query = query.eq("platform", filters.platform);
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const results = [];

  for (const post of (data ?? []) as ScheduledPostRow[]) {
    const result = await publishSinglePost(post);
    results.push({ ...result, platform: normalizePlatform(post.platform), postId: post.id });
  }

  return results;
}

export async function collectPublishedPostMetrics(projectId: string, ownerId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("conversion_events")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .order("occurred_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function runPublishingWorker() {
  const results = await publishDuePosts();

  return {
    checked: results.length,
    published: results.filter((result) => result.status === "published").length,
    manualRequired: results.filter((result) => result.status === "manual_required").length,
    failed: results.filter((result) => result.status === "failed").length,
  };
}
