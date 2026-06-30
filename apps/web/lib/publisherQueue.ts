import type {
  CampaignItemRow,
  PublisherQueueInsert,
  PublisherQueueRow,
} from "@/lib/supabase/types";
import { sanitizePostTrackingLinks, sanitizePublicTrackingUrl } from "@/lib/publicUrl";

export type QueueSourceItem = CampaignItemRow & {
  tracking_links?: Array<{ tracking_url: string }>;
};

function contentTypeForChannel(channel: string) {
  const normalized = channel.toLowerCase();

  if (normalized.includes("linkedin")) return "founder_post";
  if (normalized.includes("reddit")) return "community_reply";
  if (normalized.includes("whatsapp")) return "community_message";
  if (normalized.includes("seo")) return "blog_outline";
  if (normalized.includes("youtube")) return "short_script";
  return "short_caption";
}

export function createPublisherQueueItems(items: QueueSourceItem[]): PublisherQueueInsert[] {
  return items.map((item) => ({
    project_id: item.project_id,
    owner_id: item.owner_id,
    campaign_item_id: item.id,
    platform: item.channel,
    content_type: contentTypeForChannel(item.channel),
    title: item.hook,
    content: sanitizePostTrackingLinks(item.content),
    tracking_url: sanitizePublicTrackingUrl(item.tracking_links?.[0]?.tracking_url || ""),
    status: "ready_for_approval",
  }));
}

export function approvePublisherItem(item: PublisherQueueRow): PublisherQueueRow {
  return { ...item, status: "approved" };
}

export function markPublisherItemPosted(
  item: PublisherQueueRow,
  postedUrl = "",
): PublisherQueueRow {
  return { ...item, status: "posted", posted_url: postedUrl };
}

export function markPublisherItemFailed(
  item: PublisherQueueRow,
  resultNotes = "",
): PublisherQueueRow {
  return { ...item, status: "failed", result_notes: resultNotes };
}

export function getTodayPublisherQueue(items: PublisherQueueRow[], today: string) {
  return items.filter((item) => item.created_at.startsWith(today));
}

export function getPublisherSummary(items: PublisherQueueRow[]) {
  return {
    ready: items.filter((item) => item.status === "ready_for_approval").length,
    approved: items.filter((item) => item.status === "approved").length,
    posted: items.filter((item) => item.status === "posted").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
}
