import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProject, generateNextRecommendation, updateProject } from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/projects";
import { requireUser } from "@/lib/auth";
import type { ExecutionLogRow, GrowthActionCategory, GrowthActionRow } from "@/lib/supabase/types";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type ResultAction = GrowthActionRow & {
  execution_logs?: ExecutionLogRow[];
};

function hasSuccessfulChannel(actions: ResultAction[], category: GrowthActionCategory) {
  return actions.some(
    (action) =>
      action.category === category &&
      (action.execution_logs ?? []).some((log) => log.result_status === "success"),
  );
}

function buildVisibleRecommendation(researchCount: number, actions: ResultAction[]) {
  const executionLogs = actions.flatMap((action) => action.execution_logs ?? []);
  const approvedActions = actions.filter((action) => action.status === "approved");
  const pendingAction = actions.find((action) => action.status === "pending");

  if (researchCount === 0) {
    return "Run Research to create the first audience, channel, and positioning analysis.";
  }

  if (actions.length === 0) {
    return "Generate Growth Actions from the latest research run.";
  }

  if (approvedActions.length === 0 && executionLogs.length === 0) {
    return pendingAction
      ? `Approve the top priority action: ${pendingAction.title}.`
      : "Approve one draft action before execution.";
  }

  if (approvedActions.length > 0 && executionLogs.length === 0) {
    return `Manually execute one approved action: ${approvedActions[0].title}.`;
  }

  if (executionLogs.some((log) => log.result_status === "pending")) {
    return "Check pending execution results after 24 hours and log the learning.";
  }

  if (hasSuccessfulChannel(actions, "linkedin_post")) {
    return "Generate more LinkedIn founder posts based on the winning angle.";
  }

  if (hasSuccessfulChannel(actions, "seo_blog")) {
    return "Generate more SEO blog ideas around the topic that worked.";
  }

  if (hasSuccessfulChannel(actions, "whatsapp_community")) {
    return "Run more community distribution using the message that resonated.";
  }

  if (executionLogs.some((log) => log.result_status === "failed")) {
    return "Change the angle or channel, then retry the failed action manually.";
  }

  return "Review the latest learning and choose the next approved action to execute.";
}

function getBestChannel(logs: ExecutionLogRow[]) {
  const successfulLogs = logs.filter((log) => log.result_status === "success");

  if (successfulLogs.length === 0) {
    return "No winning channel yet.";
  }

  const counts = successfulLogs.reduce<Record<string, number>>((accumulator, log) => {
    accumulator[log.channel] = (accumulator[log.channel] ?? 0) + 1;
    return accumulator;
  }, {});

  const [channel] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return channel;
}

function getLatestLearning(logs: ExecutionLogRow[]) {
  const latestLog = [...logs]
    .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
    .find((log) => log.learning || log.notes);

  return latestLog?.learning || latestLog?.notes || "No learning logged yet.";
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { id } = await params;
  const { error: actionError, success } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const { count: researchCount, error: researchCountError } = await supabase
    .from("research_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id)
    .eq("owner_id", user.id);

  const { data: actions, error: actionsError } = await supabase
    .from("growth_actions")
    .select("*, execution_logs(*)")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const typedActions = (actions ?? []) as ResultAction[];
  const executionLogs = typedActions.flatMap((action) => action.execution_logs ?? []);
  const successfulActionIds = new Set(
    typedActions.filter((action) => action.status === "completed").map((action) => action.id),
  );
  const failedActionIds = new Set<string>();

  for (const log of executionLogs) {
    if (log.result_status === "success") {
      successfulActionIds.add(log.growth_action_id);
    }

    if (log.result_status === "failed") {
      failedActionIds.add(log.growth_action_id);
    }
  }

  const visibleRecommendation =
    project.next_recommendation || buildVisibleRecommendation(researchCount ?? 0, typedActions);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <Link
          href="/projects"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
        >
          Back to projects
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {project.customer}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">{project.summary}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <StatusBadge status={project.status} />
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Link
                href={`/projects/${project.id}/autopilot`}
                className="inline-flex h-10 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Autopilot
              </Link>
              <Link
                href={`/projects/${project.id}/results`}
                className="inline-flex h-10 items-center justify-center rounded border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Results
              </Link>
              <Link
                href={`/projects/${project.id}/settings`}
                className="inline-flex h-10 items-center justify-center rounded border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Settings
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 text-xs md:justify-end">
              {["memory", "research", "actions", "approvals", "campaigns"].map((path) => (
                <Link
                  key={path}
                  href={`/projects/${project.id}/${path}`}
                  className="font-semibold capitalize text-neutral-500 hover:text-neutral-950"
                >
                  {path}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {success === "recommendation" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Next fix generated.
        </div>
      ) : null}

      {researchCountError || actionsError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Growth results failed to load: {researchCountError?.message || actionsError?.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Channel</p>
          <p className="mt-3 text-xl font-semibold text-neutral-950">{project.channel}</p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Experiments</p>
          <p className="mt-3 text-xl font-semibold text-neutral-950">{project.experiments}</p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Content Items</p>
          <p className="mt-3 text-xl font-semibold text-neutral-950">{project.content_items}</p>
        </div>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Growth Results
            </p>
            <h3 className="mt-2 text-xl font-semibold text-neutral-950">
              Current growth machine state
            </h3>
          </div>
          <form action={generateNextRecommendation}>
            <input name="project_id" type="hidden" value={project.id} />
            <SubmitButton
              idleLabel="Generate Next Fix"
              pendingLabel="Generating..."
              className="h-10 rounded bg-neutral-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-500"
            />
          </form>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Research runs
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{researchCount ?? 0}</p>
          </div>
          <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Actions generated
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{typedActions.length}</p>
          </div>
          <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Approved actions
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">
              {typedActions.filter((action) => action.status === "approved").length}
            </p>
          </div>
          <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Executed actions
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{executionLogs.length}</p>
          </div>
          <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Completed / success
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">
              {successfulActionIds.size}
            </p>
          </div>
          <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Failed actions
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{failedActionIds.size}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Best channel so far
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              {getBestChannel(executionLogs)}
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Latest learning
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              {getLatestLearning(executionLogs)}
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Next execution step
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-700">{visibleRecommendation}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Progress</p>
          <p className="mt-3 text-3xl font-semibold text-neutral-950">{project.progress}%</p>
          <div className="mt-5 h-2 rounded bg-neutral-200">
            <div className="h-2 rounded bg-neutral-950" style={{ width: `${project.progress}%` }} />
          </div>
          <p className="mt-5 text-sm text-neutral-600">Owner: {project.owner}</p>
          <p className="mt-2 text-sm text-neutral-600">Updated: {formatDate(project.updated_at)}</p>
        </div>

        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Goal</p>
          <h3 className="mt-3 text-xl font-semibold text-neutral-950">{project.goal}</h3>
          <div className="mt-6 border-t border-neutral-200 pt-5">
            <p className="text-sm font-medium text-neutral-500">Next Action</p>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              {project.next_action || "No next action set yet."}
            </p>
          </div>
        </div>
      </section>

      <form action={updateProject} className="rounded border border-neutral-300 bg-white p-5">
        <input name="id" type="hidden" value={project.id} />
        <input name="customer" type="hidden" value={project.customer} />
        <input name="owner" type="hidden" value={project.owner} />
        <input name="experiments" type="hidden" value={project.experiments} />
        <input name="content_items" type="hidden" value={project.content_items} />
        <h3 className="text-lg font-semibold text-neutral-950">Edit project</h3>
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

        <div className="mt-6 flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-between">
          <button
            formAction={deleteProject}
            className="h-10 rounded border border-red-200 px-4 text-sm font-semibold text-red-700"
            type="submit"
          >
            Delete Project
          </button>
          <button
            className="h-10 rounded bg-neutral-950 px-4 text-sm font-semibold text-white"
            type="submit"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
