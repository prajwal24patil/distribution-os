import { chooseBestPostingTime, learnBestPostingTimeFromResults } from "@/lib/platformTimingAgent";
import { getPublisherAdapter } from "@/lib/publisherAdapters";
import { sanitizePostTrackingLinks, sanitizePublicTrackingUrl } from "@/lib/publicUrl";
import { createClient } from "@/lib/supabase/server";
import type {
  ConversionEventRow,
  ProductMemoryRow,
  PublisherQueueRow,
  PublishingConnectionRow,
  ScheduledPostInsert,
  ScheduledPostRow,
} from "@/lib/supabase/types";

const MAX_ASSETS_PER_CYCLE = 12;
const MAX_PER_PLATFORM_PER_DAY = 3;
const MAX_SCHEDULED_PER_PROJECT_PER_DAY = 12;

function normalizePlatform(platform: string) {
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
  return normalized.replace(/[^a-z0-9]+/g, "_") || "organic";
}

function sameDay(left: Date, right: Date) {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function normalizedContentKey({
  platform,
  title,
  content,
}: {
  platform: string;
  title: string;
  content: string;
}) {
  return [platform, title, content]
    .map((value) => value.toLowerCase().replace(/\s+/g, " ").trim())
    .join("|");
}

function hasOfficialPublishing({
  connection,
  memory,
}: {
  connection: PublishingConnectionRow | undefined;
  memory: ProductMemoryRow | null;
}) {
  return (
    connection?.connection_status === "connected" &&
    memory?.publishing_mode === "official_auto_publish_ready"
  );
}

export async function scheduleOneAsset({
  item,
  connections,
  memory,
  events,
  failedPosts,
  existingPosts,
}: {
  item: PublisherQueueRow;
  connections: PublishingConnectionRow[];
  memory: ProductMemoryRow | null;
  events: ConversionEventRow[];
  failedPosts: ScheduledPostRow[];
  existingPosts: ScheduledPostRow[];
}): Promise<ScheduledPostInsert | null> {
  if (existingPosts.some((post) => post.publisher_queue_id === item.id)) {
    return null;
  }

  const platform = normalizePlatform(item.platform);
  const scheduledFor = chooseBestPostingTime({ platform, events, failedPosts });
  const dailyCount = existingPosts.filter((post) =>
    sameDay(new Date(post.scheduled_for), scheduledFor),
  ).length;

  if (dailyCount >= MAX_SCHEDULED_PER_PROJECT_PER_DAY) {
    return null;
  }

  const newContentKey = normalizedContentKey({
    platform,
    title: item.title,
    content: item.content,
  });
  const duplicateContentToday = existingPosts.some(
    (post) =>
      sameDay(new Date(post.scheduled_for), scheduledFor) &&
      normalizedContentKey({
        platform: normalizePlatform(post.platform),
        title: post.title,
        content: post.content,
      }) === newContentKey,
  );

  if (duplicateContentToday) {
    return null;
  }

  const dailyPlatformCount = existingPosts.filter(
    (post) =>
      normalizePlatform(post.platform) === platform &&
      sameDay(new Date(post.scheduled_for), scheduledFor),
  ).length;

  if (dailyPlatformCount >= MAX_PER_PLATFORM_PER_DAY) {
    return null;
  }

  const connection = connections.find((row) => row.platform === platform);
  const officialReady = hasOfficialPublishing({ connection, memory });
  const adapter = getPublisherAdapter(platform);
  const adapterStatus = adapter?.validateConnection(officialReady);
  const manualRequired =
    platform !== "blog" &&
    (!officialReady || adapterStatus?.status === "official_integration_not_implemented");

  return {
    project_id: item.project_id,
    owner_id: item.owner_id,
    publisher_queue_id: item.id,
    platform,
    content_type: item.content_type,
    title: item.title,
    content: sanitizePostTrackingLinks(item.content),
    tracking_url: sanitizePublicTrackingUrl(item.tracking_url),
    scheduled_for: scheduledFor.toISOString(),
    timezone: "Asia/Kolkata",
    status: manualRequired ? "manual_required" : "scheduled",
    publish_mode: officialReady ? "official_auto_publish" : "manual_approval",
    failure_reason:
      adapterStatus?.status === "official_integration_not_implemented" ? adapterStatus.reason : "",
  };
}

export async function scheduleApprovedAssets(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is required to schedule publishing work.");
  }

  const [queueResult, connectionsResult, memoryResult, eventsResult, postsResult] =
    await Promise.all([
      supabase
        .from("publisher_queue")
        .select("*")
        .eq("project_id", projectId)
        .eq("owner_id", user.id)
        .in("status", ["ready_for_approval", "approved"])
        .order("predicted_rank_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(MAX_ASSETS_PER_CYCLE),
      supabase
        .from("publishing_connections")
        .select("*")
        .eq("project_id", projectId)
        .eq("owner_id", user.id),
      supabase
        .from("product_memory")
        .select("*")
        .eq("project_id", projectId)
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase
        .from("conversion_events")
        .select("*")
        .eq("project_id", projectId)
        .eq("owner_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(20),
      supabase
        .from("scheduled_posts")
        .select("*")
        .eq("project_id", projectId)
        .eq("owner_id", user.id)
        .order("scheduled_for", { ascending: true })
        .limit(50),
    ]);

  if (queueResult.error) throw new Error(queueResult.error.message);
  if (connectionsResult.error) throw new Error(connectionsResult.error.message);
  if (memoryResult.error) throw new Error(memoryResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (postsResult.error) throw new Error(postsResult.error.message);

  const queueItems = (queueResult.data ?? []) as PublisherQueueRow[];
  const connections = (connectionsResult.data ?? []) as PublishingConnectionRow[];
  const events = (eventsResult.data ?? []) as ConversionEventRow[];
  const existingPosts = (postsResult.data ?? []) as ScheduledPostRow[];
  const failedPosts = existingPosts.filter((post) => post.status === "failed");
  const scheduledRows: ScheduledPostInsert[] = [];

  for (const item of queueItems) {
    const row = await scheduleOneAsset({
      item,
      connections,
      memory: (memoryResult.data ?? null) as ProductMemoryRow | null,
      events,
      failedPosts,
      existingPosts: [
        ...existingPosts,
        ...scheduledRows.map(
          (post) => ({ ...post, id: "", created_at: "", updated_at: "" }) as ScheduledPostRow,
        ),
      ],
    });

    if (row) {
      scheduledRows.push(row);
    }
  }

  if (scheduledRows.length === 0) {
    return { created: 0, manualRequired: 0, scheduled: 0 };
  }

  const { error } = await supabase.from("scheduled_posts").insert(scheduledRows);

  if (error) {
    throw new Error(error.message);
  }

  return {
    created: scheduledRows.length,
    manualRequired: scheduledRows.filter((row) => row.status === "manual_required").length,
    scheduled: scheduledRows.filter((row) => row.status === "scheduled").length,
  };
}

export async function getScheduledPosts(projectId: string, ownerId: string, limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ScheduledPostRow[];
}

export async function getNextPostsToPublish(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .lte("scheduled_for", new Date().toISOString())
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ScheduledPostRow[];
}

export async function markPostPublished(id: string, ownerId: string, publishedUrl = "") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status: "published", published_url: publishedUrl, failure_reason: "" })
    .eq("id", id)
    .eq("owner_id", ownerId);

  if (error) throw new Error(error.message);
}

export async function markPostFailed(id: string, ownerId: string, failureReason: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status: "failed", failure_reason: failureReason })
    .eq("id", id)
    .eq("owner_id", ownerId);

  if (error) throw new Error(error.message);
}

export async function skipUnsafePost(id: string, ownerId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status: "skipped", failure_reason: reason })
    .eq("id", id)
    .eq("owner_id", ownerId);

  if (error) throw new Error(error.message);
}

export function summarizePublishingPlan({
  posts,
  events = [],
}: {
  posts: ScheduledPostRow[];
  events?: ConversionEventRow[];
}) {
  const scheduled = posts.filter((post) => post.status === "scheduled").length;
  const published = posts.filter((post) => post.status === "published").length;
  const manualRequired = posts.filter((post) => post.status === "manual_required").length;

  return {
    scheduled,
    published,
    manualRequired,
    learning: learnBestPostingTimeFromResults(events),
  };
}
