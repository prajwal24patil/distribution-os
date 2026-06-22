import Link from "next/link";
import { notFound } from "next/navigation";
import { markActionManuallyExecuted, updateGrowthActionStatus } from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { sanitizeCareerScoreCopy } from "@/lib/careerScoreCopy";
import { formatDate } from "@/lib/projects";
import { requireUser } from "@/lib/auth";
import type { ExecutionLogRow, GrowthActionRow, GrowthActionStatus } from "@/lib/supabase/types";

type ApprovalsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type ActionWithLogs = GrowthActionRow & {
  execution_logs?: ExecutionLogRow[];
};

const sections: Array<{
  status: GrowthActionStatus;
  title: string;
  description: string;
}> = [
  {
    status: "pending",
    title: "Draft actions waiting for approval",
    description: "Generated actions that need a founder decision before execution.",
  },
  {
    status: "approved",
    title: "Approved actions ready to execute",
    description: "Approved actions that can be executed manually and logged here.",
  },
  {
    status: "completed",
    title: "Completed actions",
    description: "Actions with completed execution status.",
  },
  {
    status: "rejected",
    title: "Rejected actions",
    description: "Actions intentionally removed from the execution path.",
  },
];

function ActionStatusButton({
  projectId,
  actionId,
  status,
  label,
}: {
  projectId: string;
  actionId: string;
  status: "approved" | "rejected" | "completed";
  label: string;
}) {
  return (
    <form action={updateGrowthActionStatus}>
      <input name="project_id" type="hidden" value={projectId} />
      <input name="action_id" type="hidden" value={actionId} />
      <input name="status" type="hidden" value={status} />
      <button
        className="h-8 rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function ExecutionForm({ projectId, action }: { projectId: string; action: GrowthActionRow }) {
  return (
    <form
      action={markActionManuallyExecuted}
      className="mt-4 rounded border border-neutral-200 p-4"
    >
      <input name="project_id" type="hidden" value={projectId} />
      <input name="action_id" type="hidden" value={action.id} />
      <input name="execution_type" type="hidden" value="manual" />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Channel
          </span>
          <input
            className="h-9 rounded border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
            defaultValue={action.category}
            name="channel"
            required
            type="text"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Executed by
          </span>
          <input
            className="h-9 rounded border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
            defaultValue="Founder"
            name="executed_by"
            required
            type="text"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Execution URL
          </span>
          <input
            className="h-9 rounded border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
            name="external_url"
            placeholder="https://..."
            type="url"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Result status
          </span>
          <select
            className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-950"
            name="result_status"
          >
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="needs_follow_up">Needs follow-up</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Result metric
          </span>
          <input
            className="h-9 rounded border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
            name="result_metric"
            placeholder="Replies, clicks, signups"
            type="text"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Result value
          </span>
          <input
            className="h-9 rounded border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
            name="result_value"
            placeholder="Manual value"
            type="text"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Notes
          </span>
          <textarea
            className="min-h-20 rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-950"
            name="notes"
            placeholder="What was done manually? What should be checked next?"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Learning
          </span>
          <textarea
            className="min-h-20 rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-950"
            name="learning"
            placeholder="What did this teach us?"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <SubmitButton idleLabel="Mark as manually executed" pendingLabel="Saving..." />
      </div>
    </form>
  );
}

function ExecutionLogs({ logs }: { logs: ExecutionLogRow[] }) {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Execution log
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {logs.map((log) => (
          <div key={log.id} className="text-sm leading-6 text-neutral-700">
            <p className="font-semibold text-neutral-950">
              {log.result_status} · {formatDate(log.executed_at)}
            </p>
            {log.external_url ? (
              <a
                className="text-neutral-950 underline"
                href={log.external_url}
                rel="noreferrer"
                target="_blank"
              >
                {log.external_url}
              </a>
            ) : null}
            {log.result_metric || log.result_value ? (
              <p>Result: {[log.result_metric, log.result_value].filter(Boolean).join(" - ")}</p>
            ) : null}
            {log.notes ? <p>{sanitizeCareerScoreCopy(log.notes)}</p> : null}
            {log.learning ? <p>Learning: {sanitizeCareerScoreCopy(log.learning)}</p> : null}
            {log.completed_at ? <p>Completed: {formatDate(log.completed_at)}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ action, projectId }: { action: ActionWithLogs; projectId: string }) {
  const logs = action.execution_logs ?? [];

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {action.category}
          </p>
          <h4 className="mt-1 font-semibold text-neutral-950">
            {sanitizeCareerScoreCopy(action.title)}
          </h4>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            {sanitizeCareerScoreCopy(action.description)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {action.status === "pending" ? (
            <>
              <ActionStatusButton
                actionId={action.id}
                label="Approve"
                projectId={projectId}
                status="approved"
              />
              <ActionStatusButton
                actionId={action.id}
                label="Reject"
                projectId={projectId}
                status="rejected"
              />
            </>
          ) : null}
          {action.status === "approved" ? (
            <ActionStatusButton
              actionId={action.id}
              label="Reject"
              projectId={projectId}
              status="rejected"
            />
          ) : null}
        </div>
      </div>

      {action.status === "approved" ? (
        <ExecutionForm action={action} projectId={projectId} />
      ) : null}
      <ExecutionLogs logs={logs} />
    </div>
  );
}

export default async function ApprovalsPage({ params, searchParams }: ApprovalsPageProps) {
  const { id } = await params;
  const { error: actionError, success } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: actions, error } = await supabase
    .from("growth_actions")
    .select("*, execution_logs(*)")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-red-950">Approval queue failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{error.message}</p>
      </div>
    );
  }

  const typedActions = actions as ActionWithLogs[];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
        >
          Back to project
        </Link>
        <div className="mt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Approval Queue
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
            Move generated growth actions through approval and manual execution tracking. Nothing is
            published, emailed, or sent automatically.
          </p>
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {success === "status" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Action status updated.
        </div>
      ) : null}

      {success === "executed" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Manual execution logged.
        </div>
      ) : null}

      {typedActions.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-lg font-semibold text-sky-950">No actions in the queue</h3>
          <p className="mt-2 text-sm leading-6 text-sky-800">
            Generate growth actions first, then return here to approve and track manual execution.
          </p>
        </div>
      ) : (
        <section className="grid gap-5">
          {sections.map((section) => {
            const sectionActions = typedActions.filter(
              (action) => action.status === section.status,
            );

            return (
              <div key={section.status} className="rounded border border-neutral-300 bg-white">
                <div className="border-b border-neutral-300 px-5 py-4">
                  <h3 className="text-lg font-semibold text-neutral-950">{section.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{section.description}</p>
                </div>

                {sectionActions.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-neutral-600">
                    No {section.status} actions.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200">
                    {sectionActions.map((action) => (
                      <ActionCard key={action.id} action={action} projectId={project.id} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
