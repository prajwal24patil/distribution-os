import { isBlogPlatform, publishInternalBlogPost } from "@/lib/blogPublisher";
import { getPublisherAdapter } from "@/lib/publisherAdapters";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PublishingConnectionPlatform,
  PublishingConnectionRow,
  ScheduledPostRow,
} from "@/lib/supabase/types";

const MAX_ATTEMPTS = 3;

function normalizePlatform(platform: string): PublishingConnectionPlatform {
  const normalized = platform.toLowerCase();

  if (normalized.includes("linkedin")) return "linkedin";
  if (normalized.includes("reddit")) return "reddit";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("youtube")) return "youtube";
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

  const connection = await getConnection(post);
  const connected = connection?.connection_status === "connected";

  if (!connected) {
    return handlePublishFailure(
      post,
      "Official account connection required before auto-publishing.",
    );
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

  const supabase = createAdminClient();
  await supabase
    .from("scheduled_posts")
    .update({
      status: "published",
      publish_attempts: post.publish_attempts + 1,
      failure_reason: "",
    })
    .eq("id", post.id)
    .eq("owner_id", post.owner_id);

  return { status: "published", reason: "" };
}

export async function publishDuePosts(limit = 10) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .lte("scheduled_for", new Date().toISOString())
    .in("status", ["scheduled", "ready"])
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const results = [];

  for (const post of (data ?? []) as ScheduledPostRow[]) {
    results.push(await publishSinglePost(post));
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
