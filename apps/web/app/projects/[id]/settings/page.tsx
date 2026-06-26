import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { updateProject } from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireUser } from "@/lib/auth";
import { listPublishingConnections } from "@/lib/publisherConnections";
import { getPublicAppUrl } from "@/lib/publicUrl";

type SettingsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
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

function platformLabel(platform: string) {
  if (platform === "blog") return "Blog publishing";
  if (platform === "x") return "X";
  if (platform === "google_business_profile") return "Google Business Profile";
  return platform.replace(/_/g, " ");
}

export default async function ProjectSettingsPage({ params, searchParams }: SettingsPageProps) {
  const { id } = await params;
  const { error: actionError, success } = await searchParams;
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
          Settings saved.
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

        <div className="mt-5 grid gap-3">
          {connections.map((connection) => (
            <div
              key={connection.platform}
              className="flex flex-col gap-3 rounded border border-neutral-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold capitalize text-neutral-950">
                  {platformLabel(connection.platform)}
                </p>
                <p className="mt-1 text-sm text-neutral-700">{connection.explanation}</p>
                {connection.platform !== "blog" ? (
                  <p className="mt-1 text-sm text-neutral-700">
                    Setup required before auto-publishing.
                  </p>
                ) : null}
                <p className="mt-1 text-xs leading-5 text-neutral-500">{connection.setup_steps}</p>
              </div>
              <button
                className="h-9 w-fit rounded border border-neutral-300 px-3 text-sm font-semibold text-neutral-500"
                disabled
                type="button"
              >
                {connection.platform === "blog" ? "Auto-publish ready" : "Connect soon"}
              </button>
            </div>
          ))}
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
