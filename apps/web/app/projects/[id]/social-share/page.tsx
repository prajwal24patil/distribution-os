import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  createPainBasedCampaignAssets,
  generateXTrendAngles,
} from "@/lib/careerScoreRevenueEngine";
import { createSocialPublishQueueItem, decideSocialDeployment } from "@/lib/socialDeploymentEngine";
import {
  getPublicAppUrl,
  hasLocalTrackingUrl,
  isProductionRuntime,
  sanitizePostTrackingLinks,
  toPublicUrl,
} from "@/lib/publicUrl";
import { requireUser } from "@/lib/auth";
import type { PublishingConnectionRow, TrackingLinkRow } from "@/lib/supabase/types";

type SocialShareCenterProps = {
  params: Promise<{
    id: string;
  }>;
};

function statusLabel(status: string) {
  if (status === "auto_publish_ready") return "Auto-publish ready";
  return "Manual required";
}

function connectionStatusFor(platform: string, connections: PublishingConnectionRow[]) {
  return (
    connections.find((connection) => connection.platform === platform)?.connection_status ||
    "manual_required"
  );
}

export default async function SocialShareCenterPage({ params }: SocialShareCenterProps) {
  const { id } = await params;
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

  const [connectionsResult, linksResult] = await Promise.all([
    supabase
      .from("publishing_connections")
      .select("*")
      .eq("project_id", project.id)
      .eq("owner_id", user.id),
    supabase
      .from("tracking_links")
      .select("*")
      .eq("project_id", project.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const connections = (connectionsResult.data ?? []) as PublishingConnectionRow[];
  const trackingLink = (linksResult.data?.[0] ?? null) as TrackingLinkRow | null;
  const trackingUrl = trackingLink
    ? toPublicUrl(trackingLink.tracking_url, origin)
    : "Run Autopilot to create a tracking link.";
  const assets = createPainBasedCampaignAssets({
    trackingLink: trackingLink ? trackingUrl : "",
    connections,
  });
  const trendAngles = generateXTrendAngles(trackingLink ? trackingUrl : "");
  const hasUnsafeVisibleTrackingUrl =
    isProductionRuntime() &&
    assets.some((asset) =>
      hasLocalTrackingUrl(`${asset.title} ${asset.content} ${asset.tracking_link} ${trackingUrl}`),
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <Link
          href={`/projects/${project.id}/autopilot`}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
        >
          Back to Autopilot
        </Link>
        <div className="mt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Social Share Center
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
            Copy safe, tracked CareerScore growth assets. Social platforms stay manual-required
            until official OAuth/API connections are added. Blog remains auto-publish ready.
          </p>
        </div>
      </section>

      {linksResult.error || connectionsResult.error ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {linksResult.error?.message || connectionsResult.error?.message}
        </div>
      ) : null}

      {hasUnsafeVisibleTrackingUrl ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Local tracking links detected. Repair required before posting.
        </div>
      ) : (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Public tracking links OK.
        </div>
      )}

      <section className="rounded border border-neutral-300 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Ready-to-share assets
          </p>
        </div>
        <div className="divide-y divide-neutral-200">
          {assets.map((asset) => {
            const assetContent = sanitizePostTrackingLinks(asset.content);
            const copyValue = `${asset.title}\n\n${assetContent}`;
            const decision = decideSocialDeployment(asset, connections);
            const queueItem = createSocialPublishQueueItem({
              projectId: project.id,
              campaignId: "revenue-engine-preview",
              asset,
              decision,
            });

            return (
              <div key={asset.asset_type} className="px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold capitalize text-neutral-950">
                        {asset.platform.replace(/_/g, " ")}
                      </p>
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                        {statusLabel(asset.status)}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                        QC {asset.qc_status}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                        {decision.publish_decision.replace(/_/g, " ")}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-neutral-950">{asset.title}</h3>
                    <div className="mt-2 grid gap-2 text-sm leading-6 text-neutral-700 md:grid-cols-2">
                      <p>Asset type: {asset.asset_type.replace(/_/g, " ")}</p>
                      <p>Campaign: CareerScore revenue engine</p>
                      <p>Audience: {asset.audience}</p>
                      <p>CTA: {asset.cta}</p>
                      <p>Connection: {connectionStatusFor(asset.platform, connections)}</p>
                      <p>Scheduled: {queueItem.scheduled_for || "Not scheduled"}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                      {assetContent || "Add a tracking link by running Autopilot first."}
                    </p>
                    <p className="mt-3 break-all text-sm text-neutral-600">
                      Tracking link: {trackingUrl}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">
                      Last shared: {asset.last_shared_at || "Not shared yet"}
                    </p>
                    {queueItem.safe_error_message ? (
                      <p className="mt-2 text-sm text-amber-700">
                        Warning: {queueItem.safe_error_message}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-neutral-700">
                      Manual instructions:{" "}
                      {queueItem.manual_instructions || "No manual action required."}
                    </p>
                    {queueItem.published_url ? (
                      <p className="mt-2 break-all text-sm text-neutral-700">
                        Published URL: {queueItem.published_url}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton label="Copy Post" value={copyValue} />
                    {trackingLink ? <CopyButton label="Copy Link" value={trackingUrl} /> : null}
                    <button
                      className="h-8 rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-500"
                      disabled
                      type="button"
                    >
                      Retry
                    </button>
                    <button
                      className="h-8 rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-500"
                      disabled
                      type="button"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          X trend angles
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {trendAngles.slice(0, 4).map((trend) => (
            <div key={trend.topic} className="rounded border border-neutral-200 p-4">
              <p className="font-semibold text-neutral-950">{trend.topic}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{trend.angle}</p>
              <p className="mt-2 text-sm text-neutral-600">{trend.hashtags.join(" ")}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">
                {trend.safety_note}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
