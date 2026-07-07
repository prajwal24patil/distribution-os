import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { disconnectPublishingConnection, updateProject } from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireUser } from "@/lib/auth";
import { listPublishingConnections } from "@/lib/publisherConnections";
import { getPublicAppUrl } from "@/lib/publicUrl";
import type { PublishingConnectionStatus } from "@/lib/supabase/types";

type SettingsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    connected?: string;
    error?: string;
    success?: string;
  }>;
};

const advancedLinks = [
  { label: "Product Memory", path: "memory" },
  { label: "Research", path: "research" },
  { label: "Actions", path: "actions" },
  { label: "Approvals", path: "approvals" },
  { label: "Campaigns", path: "campaigns" },
  { label: "Social Share Center", path: "social-share" },
];

const officialConnectionPlatforms = [
  "linkedin",
  "x",
  "google_business_profile",
  "reddit",
  "youtube",
  "instagram_business",
  "facebook_page",
];

function platformLabel(platform: string) {
  if (platform === "blog") return "Blog publishing";
  if (platform === "x") return "X";
  if (platform === "google_business_profile") return "Google Business Profile";
  return platform.replace(/_/g, " ");
}

function connectionUiState({
  platform,
  status,
}: {
  platform: string;
  status: PublishingConnectionStatus;
}) {
  if (platform === "blog") {
    return {
      label: "Auto-publish ready",
      helper: "Internal blog publishing is available now.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (status === "connected") {
    return {
      label: "Manual-required",
      helper:
        "OAuth foundation is ready, but auto-posting stays disabled until the official adapter is implemented.",
      className: "border-blue-200 bg-blue-50 text-blue-800",
    };
  }

  if (status === "expired" || status === "permission_missing") {
    return {
      label: "Reconnect required",
      helper:
        "Reconnect the official account and confirm publishing permissions before enabling auto-posting.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (status === "rate_limited" || status === "disabled") {
    return {
      label: status === "rate_limited" ? "Rate limited" : "Disabled",
      helper: "Keep using copy/manual publishing until the platform is healthy again.",
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  return {
    label: "Manual-required",
    helper: "Copy the prepared asset and publish manually until the official account is connected.",
    className: "border-neutral-200 bg-neutral-50 text-neutral-700",
  };
}

export default async function ProjectSettingsPage({ params, searchParams }: SettingsPageProps) {
  const { id } = await params;
  const { connected, error: actionError, success } = await searchParams;
  const { supabase, user } = await requireUser();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const publicAppUrl = getPublicAppUrl(host ? `${protocol}://${host}` : "");
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const connections = await listPublishingConnections(project.id);
  const officialConnections = connections.filter((connection) =>
    officialConnectionPlatforms.includes(connection.platform),
  );
  const blogConnection = connections.find((connection) => connection.platform === "blog");
  const xConnection = connections.find((connection) => connection.platform === "x");
  const manualRequiredPlatforms = officialConnections
    .filter((connection) => connection.platform !== "x")
    .map((connection) => platformLabel(connection.platform))
    .join(", ");
  const { data: memory } = await supabase
    .from("product_memory")
    .select("website_url, product_url")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .maybeSingle();
  const careerScoreUrl =
    memory?.product_url || memory?.website_url || "Add CareerScore URL in Product Memory";
  const hasWebhookSecret = Boolean(process.env.CAREERSCORE_WEBHOOK_SECRET);
  const hasCronSecret = Boolean(process.env.CRON_SECRET);
  const [trackingResult, cycleResult, publisherResult] = await Promise.all([
    supabase
      .from("tracking_links")
      .select("id")
      .eq("project_id", project.id)
      .eq("owner_id", user.id)
      .limit(1),
    supabase
      .from("distribution_cycles")
      .select("status, created_at, learning_summary")
      .eq("project_id", project.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("scheduled_posts")
      .select("platform, status, failure_reason, updated_at")
      .eq("project_id", project.id)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);
  const latestCycle = cycleResult.data?.[0];
  const latestPublisherResult = publisherResult.data?.[0];
  const xEnvConfigured = Boolean(
    process.env.X_CLIENT_ID &&
      process.env.X_CLIENT_SECRET &&
      process.env.X_REDIRECT_URI &&
      process.env.PLATFORM_TOKEN_ENCRYPTION_KEY,
  );
  const xTokenConnected = Boolean(xConnection?.token_connected);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Settings</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-neutral-950">{project.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              Manage the CareerScore growth workspace without changing the underlying engine.
            </p>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success === "disconnected" ? "Platform disconnected." : "Settings saved."}
        </div>
      ) : null}

      {connected === "x" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          X connected. Auto-publish is ready for approved X assets.
        </div>
      ) : null}

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Production Automation
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">DistributionOS public URL</p>
            <p className="mt-2 break-all text-sm text-neutral-700">
              {publicAppUrl || "Set NEXT_PUBLIC_APP_URL"}
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">CareerScore destination URL</p>
            <p className="mt-2 break-all text-sm text-neutral-700">{careerScoreUrl}</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">CareerScore webhook</p>
            <p className="mt-2 text-sm text-neutral-700">
              {hasWebhookSecret ? "Configured" : "Add CAREERSCORE_WEBHOOK_SECRET"}
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Cron status</p>
            <p className="mt-2 text-sm text-neutral-700">
              {hasCronSecret ? "Configured" : "Add CRON_SECRET"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Audit / Health
          </p>
          <h3 className="text-xl font-semibold text-neutral-950">Production readiness status</h3>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Supabase connected</p>
            <p className="mt-2 text-sm text-neutral-700">yes</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Cron configured</p>
            <p className="mt-2 text-sm text-neutral-700">{hasCronSecret ? "yes" : "no"}</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Tracking links OK</p>
            <p className="mt-2 text-sm text-neutral-700">
              {(trackingResult.data ?? []).length > 0 ? "yes" : "needs Autopilot run"}
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">CareerScore webhook</p>
            <p className="mt-2 text-sm text-neutral-700">{hasWebhookSecret ? "yes" : "no"}</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Blog publishing ready</p>
            <p className="mt-2 text-sm text-neutral-700">yes</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">X env configured</p>
            <p className="mt-2 text-sm text-neutral-700">{xEnvConfigured ? "yes" : "no"}</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">X account connected</p>
            <p className="mt-2 text-sm text-neutral-700">{xTokenConnected ? "yes" : "no"}</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">X publish test status</p>
            <p className="mt-2 text-sm text-neutral-700">
              {latestPublisherResult?.platform === "x"
                ? latestPublisherResult.status
                : "not run yet"}
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Last Autopilot run</p>
            <p className="mt-2 text-sm text-neutral-700">
              {latestCycle?.created_at
                ? new Date(latestCycle.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "not run yet"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Last errors</p>
            <p className="mt-2 text-sm text-neutral-700">
              {latestPublisherResult?.failure_reason || latestCycle?.learning_summary || "none"}
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-950">Manual-required platforms</p>
            <p className="mt-2 text-sm text-neutral-700">
              {manualRequiredPlatforms || "none"}
            </p>
          </div>
        </div>
        <Link
          className="mt-4 inline-flex h-9 items-center rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
          href={`/api/debug/platform-status?projectId=${project.id}`}
        >
          View safe debug status
        </Link>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Platform Connections
          </p>
          <h3 className="text-xl font-semibold text-neutral-950">
            Official API/OAuth setup foundation
          </h3>
          <p className="text-sm leading-6 text-neutral-700">
            Social platforms stay manual-required until official accounts, permissions, and
            production adapters are connected. No browser bots or fake published states are used.
          </p>
        </div>

        {blogConnection ? (
          <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-950">BlogPublisherAdapter</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Auto-publish ready through the existing internal DistributionOS blog publisher.
                </p>
              </div>
              <span className="w-fit rounded border border-emerald-300 px-3 py-1 text-sm font-semibold text-emerald-800">
                Auto-publish ready
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {officialConnections.map((connection) => {
            const baseUi = connectionUiState({
              platform: connection.platform,
              status: connection.connection_status,
            });
            const ui =
              connection.platform === "x" && connection.auto_publish_status === "auto_publish_ready"
                ? {
                    label: "Auto-publish ready",
                    helper:
                      "X Connected. Approved X assets can publish through the official X API.",
                    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
                  }
                : connection.platform === "x" &&
                    connection.auto_publish_status === "connect_available"
                  ? {
                      label: "Connect available",
                      helper: "X env is configured. Connect the official CareerScore X account.",
                      className: "border-blue-200 bg-blue-50 text-blue-800",
                    }
                  : connection.platform === "x"
                    ? {
                        label: "X setup incomplete",
                        helper: `Missing env: ${connection.missing_env.join(", ")}`,
                        className: "border-amber-200 bg-amber-50 text-amber-800",
                      }
                    : baseUi;

            return (
              <div
                key={connection.platform}
                className="flex flex-col gap-3 rounded border border-neutral-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold capitalize text-neutral-950">
                    {platformLabel(connection.platform)}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">
                    Status: {connection.connection_status}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">{ui.helper}</p>
                  {connection.platform === "x" ? (
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-neutral-600">
                      <p>X env configured: {connection.env_configured ? "yes" : "no"}</p>
                      <p>X token connected: {connection.token_connected ? "yes" : "no"}</p>
                      <p>
                        X auto-publish ready:{" "}
                        {connection.auto_publish_status === "auto_publish_ready" ? "yes" : "no"}
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {connection.setup_steps}
                  </p>
                  {connection.platform === "x" && connection.token_connected ? (
                    <p className="mt-1 text-sm text-neutral-700">
                      X Connected account: {connection.account_name || "X account"}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <span
                    className={`w-fit rounded border px-3 py-1 text-sm font-semibold ${ui.className}`}
                  >
                    {ui.label}
                  </span>
                  {connection.platform === "x" ? (
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Link
                        className="inline-flex h-8 items-center rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
                        href={`/api/oauth/x/start?projectId=${project.id}`}
                      >
                        {connection.token_connected ? "Reconnect" : "Connect X"}
                      </Link>
                      {connection.token_connected ? (
                        <form action={disconnectPublishingConnection}>
                          <input name="project_id" type="hidden" value={project.id} />
                          <input name="platform" type="hidden" value="x" />
                          <SubmitButton
                            idleLabel="Disconnect"
                            pendingLabel="Working..."
                            className="h-8 rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
                          />
                        </form>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      {connection.platform === "blog" ? "Ready now." : "Connect soon"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <form action={updateProject} className="rounded border border-neutral-300 bg-white p-5">
        <input name="id" type="hidden" value={project.id} />
        <input name="customer" type="hidden" value={project.customer} />
        <input name="owner" type="hidden" value={project.owner} />
        <input name="experiments" type="hidden" value={project.experiments} />
        <input name="content_items" type="hidden" value={project.content_items} />
        <input
          name="return_to"
          type="hidden"
          value={`/projects/${project.id}/settings?success=1`}
        />

        <h3 className="text-lg font-semibold text-neutral-950">Project settings</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Project name</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue={project.name}
              name="name"
              required
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Channel</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue={project.channel}
              name="channel"
              required
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Status</span>
            <select
              className="h-10 rounded border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue={project.status}
              name="status"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Progress</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue={project.progress}
              max={100}
              min={0}
              name="progress"
              type="number"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Goal</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue={project.goal}
              name="goal"
              required
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Summary</span>
            <textarea
              className="min-h-28 rounded border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
              defaultValue={project.summary}
              name="summary"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Next action</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue={project.next_action}
              name="next_action"
              type="text"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-neutral-200 pt-5">
          <SubmitButton
            idleLabel="Save Settings"
            pendingLabel="Saving..."
            className="h-10 rounded bg-neutral-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-500"
          />
          <Link
            href={`/projects/${project.id}/autopilot`}
            className="inline-flex h-10 items-center justify-center rounded border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Back to Autopilot
          </Link>
        </div>
      </form>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Advanced</p>
        <p className="mt-2 text-sm leading-6 text-neutral-700">
          Internal pages remain available for debugging and admin work.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {advancedLinks.map((item) => (
            <Link
              key={item.path}
              href={`/projects/${project.id}/${item.path}`}
              className="inline-flex h-9 items-center rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/projects"
            className="inline-flex h-9 items-center rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
          >
            Project List
          </Link>
        </div>
      </section>
    </div>
  );
}
