import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicUrl } from "@/lib/publicUrl";
import type { ScheduledPostRow } from "@/lib/supabase/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

export function isBlogPlatform(platform: string, contentType = "") {
  const value = `${platform} ${contentType}`.toLowerCase();
  return value.includes("blog") || value.includes("seo");
}

export function publicationSlug(post: ScheduledPostRow) {
  const titleSlug = slugify(post.title) || "careerscore-growth-note";
  return `${titleSlug}-${post.id}`;
}

export function publicationUrl(post: ScheduledPostRow) {
  return toPublicUrl(`/publications/${publicationSlug(post)}`);
}

export function extractPostIdFromPublicationSlug(slug: string) {
  const match = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);

  return match?.[1] ?? slug;
}

export async function publishInternalBlogPost(post: ScheduledPostRow) {
  const supabase = createAdminClient();
  const publishedUrl = publicationUrl(post);

  const { error: postError } = await supabase
    .from("scheduled_posts")
    .update({
      status: "published",
      publish_attempts: post.publish_attempts + 1,
      published_url: publishedUrl,
      failure_reason: "",
    })
    .eq("id", post.id)
    .eq("owner_id", post.owner_id);

  if (postError) {
    throw new Error(postError.message);
  }

  const { error: queueError } = await supabase
    .from("publisher_queue")
    .update({
      publishing_status: "published",
      published_url: publishedUrl,
      posted_url: publishedUrl,
    })
    .eq("id", post.publisher_queue_id)
    .eq("owner_id", post.owner_id);

  if (queueError) {
    throw new Error(queueError.message);
  }

  return publishedUrl;
}
