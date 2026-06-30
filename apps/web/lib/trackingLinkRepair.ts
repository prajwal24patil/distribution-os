import { repairLegacyLocalTrackingText } from "@/lib/publicUrl";
import { createClient } from "@/lib/supabase/server";

type RepairableValue = string | null | undefined;
type RepairResult = {
  repaired: number;
  warnings: string[];
};

function repairValue(value: RepairableValue) {
  return typeof value === "string" ? repairLegacyLocalTrackingText(value) : value;
}

function hasChanged(before: RepairableValue, after: RepairableValue) {
  return typeof before === "string" && typeof after === "string" && before !== after;
}

async function repairTableRows<Row extends { id: string }>(
  rows: Row[],
  fields: Array<keyof Row>,
  updateRow: (
    id: string,
    patch: Partial<Omit<Row, "id">>,
  ) => PromiseLike<{ error: { message: string } | null }>,
) {
  let repaired = 0;
  const warnings: string[] = [];

  for (const row of rows) {
    const patch: Partial<Omit<Row, "id">> = {};

    for (const field of fields) {
      if (field === "id") continue;

      const before = row[field] as RepairableValue;
      const after = repairValue(before) as Omit<Row, "id">[keyof Omit<Row, "id">];

      if (hasChanged(before, after as RepairableValue)) {
        patch[field as keyof Omit<Row, "id">] = after;
      }
    }

    if (Object.keys(patch).length === 0) {
      continue;
    }

    const result = await updateRow(row.id, patch);

    if (result.error) {
      warnings.push(result.error.message);
      continue;
    }

    repaired += 1;
  }

  return { repaired, warnings };
}

export async function repairLegacyLocalTrackingLinks(projectId: string, ownerId?: string) {
  const supabase = await createClient();
  const warnings: string[] = [];
  let repaired = 0;

  const ownerFilter = <Query extends { eq: (column: string, value: string) => Query }>(
    query: Query,
  ) => (ownerId ? query.eq("owner_id", ownerId) : query);

  const [trackingLinks, publisherQueue, scheduledPosts, campaignItems, autopilotRuns, dailyRuns] =
    await Promise.all([
      ownerFilter(
        supabase.from("tracking_links").select("id, tracking_url").eq("project_id", projectId),
      ),
      ownerFilter(
        supabase
          .from("publisher_queue")
          .select(
            "id, title, content, tracking_url, posted_url, short_video_script, blog_outline, caption, landing_copy, referral_copy",
          )
          .eq("project_id", projectId),
      ),
      ownerFilter(
        supabase
          .from("scheduled_posts")
          .select("id, title, content, tracking_url, published_url")
          .eq("project_id", projectId),
      ),
      ownerFilter(
        supabase.from("campaign_items").select("id, content, utm_link").eq("project_id", projectId),
      ),
      ownerFilter(
        supabase.from("autopilot_runs").select("id, work_created").eq("project_id", projectId),
      ),
      ownerFilter(
        supabase
          .from("daily_autopilot_runs")
          .select("id, problem_found, fix_applied, next_step")
          .eq("project_id", projectId),
      ),
    ]);

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

  const trackingRepair = await repairTableRows(
    trackingLinks.data ?? [],
    ["tracking_url"],
    (id, patch) => supabase.from("tracking_links").update(patch).eq("id", id),
  );
  repaired += trackingRepair.repaired;
  warnings.push(...trackingRepair.warnings);

  const queueRepair = await repairTableRows(
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
    (id, patch) => supabase.from("publisher_queue").update(patch).eq("id", id),
  );
  repaired += queueRepair.repaired;
  warnings.push(...queueRepair.warnings);

  const scheduledRepair = await repairTableRows(
    scheduledPosts.data ?? [],
    ["title", "content", "tracking_url", "published_url"],
    (id, patch) => supabase.from("scheduled_posts").update(patch).eq("id", id),
  );
  repaired += scheduledRepair.repaired;
  warnings.push(...scheduledRepair.warnings);

  const campaignRepair = await repairTableRows(
    campaignItems.data ?? [],
    ["content", "utm_link"],
    (id, patch) => supabase.from("campaign_items").update(patch).eq("id", id),
  );
  repaired += campaignRepair.repaired;
  warnings.push(...campaignRepair.warnings);

  const autopilotRepair = await repairTableRows(
    autopilotRuns.data ?? [],
    ["work_created"],
    (id, patch) => supabase.from("autopilot_runs").update(patch).eq("id", id),
  );
  repaired += autopilotRepair.repaired;
  warnings.push(...autopilotRepair.warnings);

  const dailyRepair = await repairTableRows(
    dailyRuns.data ?? [],
    ["problem_found", "fix_applied", "next_step"],
    (id, patch) => supabase.from("daily_autopilot_runs").update(patch).eq("id", id),
  );
  repaired += dailyRepair.repaired;
  warnings.push(...dailyRepair.warnings);

  return {
    repaired,
    warnings: [...new Set(warnings.filter(Boolean))],
  } satisfies RepairResult;
}
