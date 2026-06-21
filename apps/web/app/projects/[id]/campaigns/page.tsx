import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { generateViralCampaign, saveCampaignResult, updateCampaignItemStatus } from "@/app/actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/projects";
import { getPublicAppUrl, toPublicUrl } from "@/lib/publicUrl";
import type {
  CampaignItemRow,
  CampaignItemStatus,
  CampaignResultRow,
  CampaignRow,
  TrackingLinkRow,
} from "@/lib/supabase/types";

type CampaignsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type CampaignItemWithResults = CampaignItemRow & {
  campaign_results?: CampaignResultRow[];
  tracking_links?: TrackingLinkRow[];
};

type CampaignWithItems = CampaignRow & {
  campaign_items?: CampaignItemWithResults[];
};

type WinnerSummary = {
  bestChannel: string;
  bestHook: string;
  bestCta: string;
  bestCampaign: string;
  bestSource: string;
  bestCampaignItem: string;
  bestContentAngle: string;
  nextViralMove: string;
};

function resultScore(result: CampaignResultRow) {
  return result.clicks + result.signups * 10 + result.paid_users * 50 + Number(result.revenue);
}

function itemScore(item: CampaignItemWithResults) {
  return (
    trackingClicks(item) +
    (item.campaign_results ?? []).reduce((total, result) => total + resultScore(result), 0)
  );
}

function sumResults(items: CampaignItemWithResults[]) {
  return items.flatMap((item) => item.campaign_results ?? []);
}

function getWinnerSummary(campaigns: CampaignWithItems[]): WinnerSummary {
  const allItems = campaigns.flatMap((campaign) => campaign.campaign_items ?? []);
  const itemsWithResults = allItems.filter(
    (item) => (item.campaign_results ?? []).length > 0 || (item.tracking_links ?? []).length > 0,
  );
  const bestItem = [...itemsWithResults].sort((a, b) => itemScore(b) - itemScore(a))[0];
  const failedItem = allItems.find((item) => item.status === "failed");

  if (!bestItem) {
    return {
      bestChannel: "No winner yet",
      bestHook: "No hook winner yet",
      bestCta: "No CTA winner yet",
      bestCampaign: "No campaign winner yet",
      bestSource: "No source yet",
      bestCampaignItem: "No ready-to-use work yet",
      bestContentAngle: "No content angle yet",
      nextViralMove: failedItem
        ? `Change the ${failedItem.channel} angle and test a sharper hook.`
        : "Post one approved ready-to-use work item manually, then record results.",
    };
  }

  const bestCampaign =
    campaigns.find((campaign) => campaign.id === bestItem.campaign_id)?.name || "Viral campaign";
  const weakHook = allItems.find((item) => item.status === "failed" || itemScore(item) === 0);

  return {
    bestChannel: bestItem.channel,
    bestHook: bestItem.hook,
    bestCta: bestItem.cta,
    bestCampaign,
    bestSource: bestItem.tracking_links?.[0]?.utm_source || bestItem.channel,
    bestCampaignItem: bestItem.hook,
    bestContentAngle: bestItem.tracking_links?.[0]?.utm_content || bestItem.hook,
    nextViralMove: weakHook
      ? `Rewrite weak hooks, then create more ${bestItem.channel} items using the winning format.`
      : `Repeat winners by creating more ${bestItem.channel} campaigns with the same CTA pattern.`,
  };
}

function trackingClicks(item: CampaignItemWithResults) {
  return (item.tracking_links ?? []).reduce((total, link) => total + link.clicks, 0);
}

function displayStatus(status: string) {
  if (status === "ready_for_approval") return "Ready";
  if (status === "scheduled_manual") return "Ready";
  if (status === "approved") return "Approved";
  if (status === "posted") return "Posted";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return "Draft";
}

function StatusButton({
  projectId,
  itemId,
  status,
  label,
}: {
  projectId: string;
  itemId: string;
  status: CampaignItemStatus;
  label: string;
}) {
  return (
    <form action={updateCampaignItemStatus}>
      <input name="project_id" type="hidden" value={projectId} />
      <input name="campaign_item_id" type="hidden" value={itemId} />
      <input name="status" type="hidden" value={status} />
      <SubmitButton
        className="h-8 rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
        idleLabel={label}
        pendingLabel={label === "Posted" ? "Posted" : "Working..."}
      />
    </form>
  );
}

function ResultForm({ item }: { item: CampaignItemWithResults }) {
  return (
    <form action={saveCampaignResult} className="mt-4 rounded border border-neutral-200 p-4">
      <input name="project_id" type="hidden" value={item.project_id} />
      <input name="campaign_id" type="hidden" value={item.campaign_id} />
      <input name="campaign_item_id" type="hidden" value={item.id} />
      <div className="grid gap-3 md:grid-cols-3">
        {["views", "clicks", "signups", "paid_users", "revenue"].map((field) => (
          <label key={field} className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {field.replace("_", " ")}
            </span>
            <input
              className="h-9 rounded border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
              min={0}
              name={field}
              type="number"
            />
          </label>
        ))}
        <label className="flex flex-col gap-2 md:col-span-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Learning
          </span>
          <textarea
            className="min-h-20 rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-950"
            name="learning"
            placeholder="What worked, what failed, and what should change next?"
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <SubmitButton idleLabel="Save Result" pendingLabel="Saving..." />
      </div>
    </form>
  );
}

function ResultList({ results }: { results: CampaignResultRow[] }) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Manual results
      </p>
      <div className="mt-3 grid gap-3">
        {results.map((result) => (
          <div key={result.id} className="text-sm leading-6 text-neutral-700">
            <p className="font-semibold text-neutral-950">{formatDate(result.created_at)}</p>
            <p>
              Views {result.views} / Clicks {result.clicks} / Signups {result.signups} / Paid{" "}
              {result.paid_users} / Revenue {Number(result.revenue).toFixed(2)}
            </p>
            {result.learning ? <p>Learning: {result.learning}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignItemCard({ item, origin }: { item: CampaignItemWithResults; origin: string }) {
  const results = item.campaign_results ?? [];
  const trackingLink = item.tracking_links?.[0] ?? null;
  const trackingUrl = trackingLink ? toPublicUrl(trackingLink.tracking_url, origin) : "";
  const copyValue = [
    item.hook,
    "",
    item.content,
    "",
    `CTA: ${item.cta}`,
    trackingUrl ? `Tracking link: ${trackingUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div id={`campaign-item-${item.id}`} className="px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {item.channel} / {displayStatus(item.status)}
          </p>
          <h4 className="mt-1 font-semibold text-neutral-950">{item.hook}</h4>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{item.content}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={copyValue} />
          {trackingUrl ? <CopyButton label="Copy Tracking Link" value={trackingUrl} /> : null}
          <StatusButton
            itemId={item.id}
            label="Approve"
            projectId={item.project_id}
            status="approved"
          />
          <StatusButton
            itemId={item.id}
            label="Posted"
            projectId={item.project_id}
            status="posted"
          />
          <StatusButton
            itemId={item.id}
            label="Failed"
            projectId={item.project_id}
            status="failed"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-neutral-700 md:grid-cols-2">
        <p>
          <span className="font-semibold text-neutral-950">Target audience:</span>{" "}
          {item.target_audience}
        </p>
        <p>
          <span className="font-semibold text-neutral-950">CTA:</span> {item.cta}
        </p>
        <p>
          <span className="font-semibold text-neutral-950">Expected outcome:</span>{" "}
          {item.expected_outcome}
        </p>
        <p>
          <span className="font-semibold text-neutral-950">Tracking link:</span>{" "}
          <span className="break-all">{trackingUrl || "Not created yet."}</span>
        </p>
        <p>
          <span className="font-semibold text-neutral-950">Tracked clicks:</span>{" "}
          {trackingClicks(item)}
        </p>
      </div>

      <ResultForm item={item} />
      <ResultList results={results} />
    </div>
  );
}

export default async function CampaignsPage({ params, searchParams }: CampaignsPageProps) {
  const { id } = await params;
  const { error: actionError, success } = await searchParams;
  const { supabase, user } = await requireUser();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const origin = getPublicAppUrl(host ? `${protocol}://${host}` : "");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: campaignItems, error: itemError } = await supabase
    .from("campaign_items")
    .select("*, campaign_results(*), tracking_links(*)")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || itemError) {
    return (
      <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-red-950">Campaigns failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">
          {error?.message || itemError?.message}
        </p>
      </div>
    );
  }

  const topItems = (campaignItems ?? []) as CampaignItemWithResults[];
  const typedCampaigns = ((campaigns ?? []) as CampaignRow[]).map((campaign) => ({
    ...campaign,
    campaign_items: topItems.filter((item) => item.campaign_id === campaign.id),
  })) as CampaignWithItems[];
  const allItems = topItems;
  const allResults = sumResults(allItems);
  const allTrackingLinks = allItems.flatMap((item) => item.tracking_links ?? []);
  const totalClicks = allTrackingLinks.reduce((total, link) => total + link.clicks, 0);
  const winnerSummary = getWinnerSummary(typedCampaigns);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
        >
          Back to project
        </Link>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Viral Growth Engine
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              Generate organic campaign assets, approve them manually, copy for posting, and record
              results after execution.
            </p>
          </div>
          <form action={generateViralCampaign}>
            <input name="project_id" type="hidden" value={project.id} />
            <label className="mb-3 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                CareerScore destination URL
              </span>
              <input
                className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
                name="destination_url"
                placeholder="https://careerscore..."
                type="url"
              />
            </label>
            <SubmitButton
              idleLabel="Generate Viral Campaign"
              pendingLabel="Generating..."
              className="h-11 rounded bg-neutral-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-500"
            />
          </form>
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {success === "campaign" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Viral campaign generated.
        </div>
      ) : null}
      {success === "status" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Ready-to-use work status updated.
        </div>
      ) : null}
      {success === "result" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Campaign result saved.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Campaigns created</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">{typedCampaigns.length}</p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Posts ready</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">
            {
              allItems.filter((item) => item.status === "approved" || item.status === "posted")
                .length
            }
          </p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Tracked clicks</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">{totalClicks}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Signups</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">
            {allResults.reduce((total, result) => total + result.signups, 0)}
          </p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Paid users</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">
            {allResults.reduce((total, result) => total + result.paid_users, 0)}
          </p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Revenue</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">
            {allResults.reduce((total, result) => total + Number(result.revenue), 0).toFixed(2)}
          </p>
        </div>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          What worked
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-950">Best channel:</span>{" "}
            {winnerSummary.bestChannel}
          </p>
          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-950">Best hook:</span>{" "}
            {winnerSummary.bestHook}
          </p>
          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-950">Best CTA:</span>{" "}
            {winnerSummary.bestCta}
          </p>
          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-950">Best campaign:</span>{" "}
            {winnerSummary.bestCampaign}
          </p>
          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-950">Best source:</span>{" "}
            {winnerSummary.bestSource}
          </p>
          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-950">Best ready-to-use work:</span>{" "}
            {winnerSummary.bestCampaignItem}
          </p>
          <p className="text-sm leading-6 text-neutral-700">
            <span className="font-semibold text-neutral-950">Best content angle:</span>{" "}
            {winnerSummary.bestContentAngle}
          </p>
        </div>
        <div className="mt-4 border-t border-neutral-200 pt-4">
          <p className="text-sm font-semibold text-neutral-950">Next action</p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{winnerSummary.nextViralMove}</p>
        </div>
      </section>

      {typedCampaigns.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-lg font-semibold text-sky-950">No campaigns yet</h3>
          <p className="mt-2 text-sm leading-6 text-sky-800">
            Generate a viral campaign to create channel-specific drafts with tracking links.
          </p>
        </div>
      ) : (
        <section className="grid gap-5">
          {typedCampaigns.map((campaign) => (
            <div key={campaign.id} className="rounded border border-neutral-300 bg-white">
              <div className="border-b border-neutral-300 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {displayStatus(campaign.status)}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-neutral-950">{campaign.name}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{campaign.next_action}</p>
              </div>
              <div className="divide-y divide-neutral-200">
                {(campaign.campaign_items ?? []).map((item) => (
                  <CampaignItemCard key={item.id} item={item} origin={origin} />
                ))}
              </div>
              {allItems.length >= 10 ? (
                <p className="border-t border-neutral-200 px-5 py-4 text-sm text-neutral-600">
                  Showing the latest 10 items. View more later.
                </p>
              ) : null}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
