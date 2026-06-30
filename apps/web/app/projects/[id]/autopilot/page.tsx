import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { goAutopilotAction, markScheduledPostPosted, runFullSystemTestAction } from "@/app/actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { loadAutopilotPageData } from "@/lib/autopilotData";
import { requireUser } from "@/lib/auth";
import {
  buildRevenueDashboardSummary,
  createPainBasedCampaignAssets,
} from "@/lib/careerScoreRevenueEngine";
import { buildAgentHealthDashboard, runMasterAgentSupervisor } from "@/lib/agentSupervisor";
import { sanitizeCareerScoreCopy, sanitizeCareerScoreTitle } from "@/lib/careerScoreCopy";
import {
  getPublicAppUrl,
  hasLocalTrackingUrl,
  isProductionRuntime,
  sanitizePostTrackingLinks,
  toPublicUrl,
} from "@/lib/publicUrl";
import { isBlogPlatform } from "@/lib/blogPublisher";
import type { DashboardQcResult } from "@/lib/dashboardQcAgent";
import type { PublisherQueueRow, ScheduledPostRow, SystemTestRunRow } from "@/lib/supabase/types";

type AutopilotPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const NO_REAL_WINNER =
  "No real winner yet. Connect CareerScore events or add a real result after posting.";

const advancedLinks = [
  { label: "Product Memory", path: "memory" },
  { label: "Research", path: "research" },
  { label: "Actions", path: "actions" },
  { label: "Approvals", path: "approvals" },
  { label: "Campaigns", path: "campaigns" },
  { label: "Social Share Center", path: "social-share" },
];

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function SystemHealthCard({
  projectId,
  latestSystemTest,
  dashboardQc,
}: {
  projectId: string;
  latestSystemTest: SystemTestRunRow | null;
  dashboardQc: DashboardQcResult;
}) {
  const isWorking = latestSystemTest?.status === "pass" || latestSystemTest?.status === "warning";
  const failures = (latestSystemTest?.results_json ?? [])
    .filter((item) => item.status === "fail")
    .slice(0, 3);

  return (
    <section className="rounded border border-neutral-300 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            System Health
          </p>
          <h3 className="mt-2 text-xl font-semibold text-neutral-950">
            {latestSystemTest ? (isWorking ? "Working" : "Needs Fix") : "Not checked yet"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
            {latestSystemTest?.summary ||
              "Run a full system test when you want to verify setup, scheduling, tracking, results, and safe publishing."}
          </p>
        </div>
        <form action={runFullSystemTestAction}>
          <input name="project_id" type="hidden" value={projectId} />
          <SubmitButton
            idleLabel="Run Full System Test"
            pendingLabel="Testing..."
            className="h-10 rounded border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-100"
          />
        </form>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric
          label="Status"
          value={latestSystemTest ? (isWorking ? "Working" : "Needs Fix") : "Pending"}
        />
        <Metric
          label="Dashboard QC"
          value={dashboardQc.status === "pass" ? "Passed" : "Needs Fix"}
        />
        <Metric label="Failed" value={latestSystemTest?.failed ?? 0} />
        <Metric label="Warnings" value={latestSystemTest?.warnings ?? 0} />
      </div>

      {dashboardQc.warnings.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {dashboardQc.warnings.slice(0, 3).map((warning) => (
            <div key={warning} className="rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-950">Dashboard QC</p>
              <p className="mt-1 text-sm text-amber-800">{warning}</p>
            </div>
          ))}
        </div>
      ) : null}

      {failures.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {failures.map((failure) => (
            <div key={failure.name} className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-950">{failure.name}</p>
              <p className="mt-1 text-sm text-red-800">{failure.message}</p>
              <p className="mt-2 text-sm text-red-800">
                {failure.fix_instruction || "Ask Codex to fix this failed system test."}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const trackingPlaceholderPattern = /(\{tracking_link\}|\[tracking link\])/gi;

function cleanCareerScoreText(value: string) {
  return sanitizeCareerScoreCopy(value).replace(/\bna\b/gi, NO_REAL_WINNER);
}

function cleanScheduledTitle(post: ScheduledPostRow) {
  return sanitizeCareerScoreTitle(post.title, `${post.platform} ${post.content_type}`);
}

function contentWithTrackingLink(content: string, trackingUrl: string) {
  const cleaned = sanitizePostTrackingLinks(cleanCareerScoreText(content));

  if (!trackingUrl) {
    return cleaned.replace(
      trackingPlaceholderPattern,
      "Add CareerScore URL to create tracking links.",
    );
  }

  const withLink = cleaned.replace(trackingPlaceholderPattern, trackingUrl);

  if (withLink.includes(trackingUrl)) {
    return withLink;
  }

  return `${withLink}\n\n${trackingUrl}`;
}

function scheduledScore(post: ScheduledPostRow, readyItems: PublisherQueueRow[]) {
  const source = readyItems.find((item) => item.id === post.publisher_queue_id);
  return source?.predicted_rank_score || source?.quality_score || 0;
}

function uniqueScheduledPosts(posts: ScheduledPostRow[], readyItems: PublisherQueueRow[]) {
  const seenContent = new Set<string>();
  const seenPlatforms = new Set<string>();
  const sorted = [...posts].sort((a, b) => {
    const scoreDiff = scheduledScore(b, readyItems) - scheduledScore(a, readyItems);

    if (scoreDiff !== 0) return scoreDiff;

    return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
  });
  const unique = sorted.filter((post) => {
    const key = [
      post.platform.toLowerCase(),
      cleanScheduledTitle(post).toLowerCase(),
      cleanCareerScoreText(post.content).toLowerCase(),
    ].join("|");

    if (seenContent.has(key)) {
      return false;
    }

    seenContent.add(key);
    return true;
  });
  const platformFirst: ScheduledPostRow[] = [];

  for (const post of unique) {
    const platform = post.platform.toLowerCase();

    if (!seenPlatforms.has(platform)) {
      platformFirst.push(post);
      seenPlatforms.add(platform);
    }

    if (platformFirst.length === 5) return platformFirst;
  }

  for (const post of unique) {
    if (!platformFirst.some((item) => item.id === post.id)) {
      platformFirst.push(post);
    }

    if (platformFirst.length === 5) break;
  }

  return platformFirst;
}

function ScheduledPostCard({ post, origin }: { post: ScheduledPostRow; origin: string }) {
  const trackingText = post.tracking_url
    ? toPublicUrl(post.tracking_url, origin)
    : "Add CareerScore URL to create tracking links.";
  const normalizedContent =
    post.tracking_url && trackingText
      ? post.content.replaceAll(post.tracking_url, trackingText)
      : post.content;
  const content = contentWithTrackingLink(normalizedContent, post.tracking_url ? trackingText : "");

  return (
    <div className="rounded border border-neutral-200 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold capitalize text-neutral-950">{post.platform}</p>
            <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
              {isBlogPlatform(post.platform, post.content_type)
                ? "Auto-publish ready"
                : post.status === "manual_required"
                  ? "Manual required"
                  : post.status}
            </span>
          </div>
          <h4 className="mt-3 font-semibold text-neutral-950">{cleanScheduledTitle(post)}</h4>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Scheduled
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-700">
            {new Date(post.scheduled_for).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Post
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{content}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Tracking link
          </p>
          <p className="mt-1 break-all text-sm leading-6 text-neutral-700">{trackingText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="Copy Post" value={content} />
          {post.tracking_url ? <CopyButton label="Copy Link" value={trackingText} /> : null}
          <form action={markScheduledPostPosted}>
            <input name="project_id" type="hidden" value={post.project_id} />
            <input name="scheduled_post_id" type="hidden" value={post.id} />
            <SubmitButton
              className="h-8 rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
              idleLabel="Mark Posted"
              pendingLabel="Working..."
            />
          </form>
          <Link
            className="flex h-8 items-center rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
            href={`/projects/${post.project_id}/campaigns`}
          >
            Add Result
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function AutopilotPage({ params, searchParams }: AutopilotPageProps) {
  const { id } = await params;
  const { error: actionError, success } = await searchParams;
  const { supabase, user } = await requireUser();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const origin = getPublicAppUrl(host ? `${protocol}://${host}` : "");
  const data = await loadAutopilotPageData({
    supabase,
    projectId: id,
    ownerId: user.id,
  });

  if (data.error || !data.project) {
    notFound();
  }

  const project = data.project;
  const scheduledPosts = uniqueScheduledPosts(data.scheduledPosts, data.readyItems);
  const hasUnsafeVisibleTrackingUrl =
    isProductionRuntime() &&
    [...data.scheduledPosts, ...data.readyItems].some((item) =>
      hasLocalTrackingUrl(`${item.title} ${item.content} ${item.tracking_url}`),
    );
  const nextMove =
    data.distributionCycle?.next_cycle_plan ||
    data.dailyRun?.next_step ||
    data.results.nextBestAction;
  const revenueTrackingUrl = toPublicUrl(
    data.readyItems.find((item) => item.tracking_url)?.tracking_url ||
      data.scheduledPosts.find((post) => post.tracking_url)?.tracking_url ||
      "",
    origin,
  );
  const revenueAssets = createPainBasedCampaignAssets({
    trackingLink: revenueTrackingUrl,
    connections: data.publishingConnections,
  });
  const revenueSummary = buildRevenueDashboardSummary({
    assets: revenueAssets,
    scheduledPosts: data.scheduledPosts,
    conversionEvents: data.conversionEvents,
  });
  const supervisor = runMasterAgentSupervisor({
    project,
    connections: data.publishingConnections,
    trackingLink: revenueTrackingUrl,
  });
  const agentHealth = buildAgentHealthDashboard(supervisor);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Autopilot
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-neutral-950">
              DistributionOS for CareerScore
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              GO Autopilot runs one safe Autopilot cycle: create assets, QC them, schedule the
              approved work, publish eligible blog posts, and keep social work manual until official
              accounts are connected.
            </p>
          </div>
          <form action={goAutopilotAction}>
            <input name="project_id" type="hidden" value={project.id} />
            <SubmitButton
              idleLabel="GO Autopilot"
              pendingLabel="Working..."
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

      {success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success === "system-test"
            ? "Full system test completed."
            : success === "go-autopilot"
              ? "GO Autopilot completed."
              : "Autopilot updated."}
        </div>
      ) : null}

      {hasUnsafeVisibleTrackingUrl ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Local tracking links detected. Run link repair before posting.
        </div>
      ) : null}

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          24/7 Engine Status
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric label="Status" value={process.env.CRON_SECRET ? "Ready" : "Cron setup needed"} />
          <Metric
            label="Last cron run"
            value={
              data.results.lastCronRun
                ? new Date(data.results.lastCronRun).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Not run yet"
            }
          />
          <Metric label="CareerScore events" value={data.results.eventsReceived} />
          <Metric label="Blog published" value={data.results.blogPublishedCount} />
        </div>
        {data.distributionCycle ? (
          <div className="mt-5 rounded border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              GO Summary
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Metric label="Assets created" value={data.distributionCycle.content_created_count} />
              <Metric label="Approved" value={data.distributionCycle.content_approved_count} />
              <Metric label="Blocked" value={data.distributionCycle.content_rejected_count} />
              <Metric label="Manual shares" value={data.distributionCycle.queued_count} />
              <Metric label="Scheduled" value={data.scheduledPosts.length} />
              <Metric label="Blog published" value={data.distributionCycle.published_count} />
              <Metric
                label="Warnings"
                value={cleanCareerScoreText(data.distributionCycle.learning_summary)}
              />
              <Metric
                label="Next action"
                value={cleanCareerScoreText(data.distributionCycle.next_cycle_plan)}
              />
            </div>
          </div>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-neutral-700">
          Blog publishing is auto-publish ready. LinkedIn, X, Reddit, Google, Instagram, WhatsApp,
          Quora, and YouTube remain manual-required until official accounts are connected.
        </p>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Best Next Action
        </p>
        <h3 className="mt-2 text-xl font-semibold text-neutral-950">
          {cleanCareerScoreText(data.results.nextBestAction)}
        </h3>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            CareerScore Revenue Engine
          </p>
          <h3 className="text-xl font-semibold text-neutral-950">
            {revenueSummary.todays_revenue_move}
          </h3>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Metric label="Best audience" value={revenueSummary.best_audience_to_target} />
          <Metric label="Assets today" value={revenueSummary.assets_created_today} />
          <Metric label="Social ready" value={revenueSummary.social_assets_ready} />
          <Metric label="Blog auto-published" value={data.results.blogPublishedCount} />
          <Metric label="Manual shares" value={revenueSummary.manual_social_shares_pending} />
          <Metric label="X angles ready" value={revenueSummary.x_trend_angles_ready} />
          <Metric label="Referral campaign" value={revenueSummary.referral_campaign_ready} />
          <Metric label="Weakest funnel" value={revenueSummary.weakest_funnel_step} />
          <Metric label="Next action" value={revenueSummary.next_best_action} />
        </div>
      </section>

      <SystemHealthCard
        dashboardQc={data.dashboardQc}
        latestSystemTest={data.latestSystemTest}
        projectId={project.id}
      />

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Agent Health
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric label="System status" value={agentHealth.system_status} />
          <Metric label="Agent health" value={agentHealth.agent_health} />
          <Metric label="Failed agents" value={agentHealth.failed_agents.length} />
          <Metric label="Recovered issues" value={agentHealth.recovered_issues.length} />
          <Metric label="Warnings" value={agentHealth.warnings_before_crash.length} />
          <Metric label="Manual actions" value={agentHealth.manual_actions_needed.length} />
          <Metric label="Tracking status" value={revenueTrackingUrl ? "Ready" : "Needs link"} />
          <Metric
            label="Queue status"
            value={revenueSummary.manual_social_shares_pending > 0 ? "Manual pending" : "Ready"}
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-neutral-700">
          Next safe action: {agentHealth.next_safe_action}
        </p>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Growth Results
          </p>
          {data.results.includesDemoData ? (
            <p className="text-sm text-amber-700">
              Production results are shown here. Demo/test data is separated below.
            </p>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric label="Clicks" value={data.results.clicks} />
          <Metric label="Signups" value={data.results.signups} />
          <Metric label="Paid reports" value={data.results.paidUsers} />
          <Metric label="Revenue" value={data.results.revenue.toFixed(2)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Metric label="Best channel" value={cleanCareerScoreText(data.results.bestChannel)} />
          <Metric
            label="Latest learning"
            value={cleanCareerScoreText(data.results.latestLearning)}
          />
        </div>
        {data.results.includesDemoData ? (
          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Demo/test data</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Metric label="Demo clicks" value={data.results.demo.clicks} />
              <Metric label="Demo signups" value={data.results.demo.signups} />
              <Metric label="Demo paid reports" value={data.results.demo.paidUsers} />
              <Metric label="Demo revenue" value={data.results.demo.revenue.toFixed(2)} />
            </div>
            <p className="mt-3 text-sm text-amber-800">
              Demo data is only for testing dashboard behavior.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Scheduled Work
          </p>
          <p className="text-sm leading-6 text-neutral-700">
            Top 5 scheduled assets. Copy one post, publish it manually, then come back to mark it
            posted and add the result.
          </p>
        </div>
        {scheduledPosts.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-700">
            Run Autopilot to prepare tracked CareerScore work.
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            {scheduledPosts.map((post) => (
              <ScheduledPostCard key={post.id} origin={origin} post={post} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Next Move</p>
        <p className="mt-3 text-sm leading-6 text-neutral-700">{cleanCareerScoreText(nextMove)}</p>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Advanced</p>
        <p className="mt-2 text-sm leading-6 text-neutral-700">
          Internal pages remain available for admin and debugging.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/projects/${project.id}/results`}
            className="inline-flex h-9 items-center rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
          >
            Results
          </Link>
          <Link
            href={`/projects/${project.id}/settings`}
            className="inline-flex h-9 items-center rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
          >
            Settings
          </Link>
          {advancedLinks.map((item) => (
            <Link
              key={item.path}
              href={`/projects/${project.id}/${item.path}`}
              className="inline-flex h-9 items-center rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
