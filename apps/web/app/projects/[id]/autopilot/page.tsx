import Link from "next/link";
import { notFound } from "next/navigation";
import {
  generateGrowthActions,
  generateNextRecommendation,
  runResearch,
} from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth";
import type {
  ExecutionLogRow,
  GrowthActionCategory,
  GrowthActionRow,
  ProductMemoryRow,
} from "@/lib/supabase/types";

type AutopilotPageProps = {
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

type AutopilotStatus =
  | "Not ready"
  | "Ready for research"
  | "Ready for action"
  | "Execution active"
  | "Learning mode";

function isMemoryCompleted(memory: ProductMemoryRow | null) {
  return Boolean(memory?.product_name && memory.product_summary);
}

function hasResultOrLearning(logs: ExecutionLogRow[]) {
  return logs.some(
    (log) =>
      log.learning ||
      log.result_metric ||
      log.result_value ||
      ["success", "failed", "needs_follow_up"].includes(log.result_status),
  );
}

function getGrowthScore({
  memoryCompleted,
  researchExists,
  actionsGenerated,
  approvedActionExists,
  executedActionExists,
  resultOrLearningRecorded,
}: {
  memoryCompleted: boolean;
  researchExists: boolean;
  actionsGenerated: boolean;
  approvedActionExists: boolean;
  executedActionExists: boolean;
  resultOrLearningRecorded: boolean;
}) {
  return (
    (memoryCompleted ? 20 : 0) +
    (researchExists ? 20 : 0) +
    (actionsGenerated ? 20 : 0) +
    (approvedActionExists ? 15 : 0) +
    (executedActionExists ? 15 : 0) +
    (resultOrLearningRecorded ? 10 : 0)
  );
}

function getAutopilotStatus({
  memoryCompleted,
  researchExists,
  actionsGenerated,
  approvedActionExists,
  executedActionExists,
  resultOrLearningRecorded,
}: {
  memoryCompleted: boolean;
  researchExists: boolean;
  actionsGenerated: boolean;
  approvedActionExists: boolean;
  executedActionExists: boolean;
  resultOrLearningRecorded: boolean;
}): AutopilotStatus {
  if (!memoryCompleted) {
    return "Not ready";
  }

  if (!researchExists) {
    return "Ready for research";
  }

  if (!actionsGenerated || !approvedActionExists) {
    return "Ready for action";
  }

  if (!resultOrLearningRecorded || !executedActionExists) {
    return "Execution active";
  }

  return "Learning mode";
}

function getCategoryLabel(category: GrowthActionCategory) {
  const labels: Record<GrowthActionCategory, string> = {
    linkedin_post: "LinkedIn",
    seo_blog: "SEO",
    whatsapp_community: "WhatsApp / Community",
    landing_page: "Landing Page",
    founder_next_action: "Founder Action",
  };

  return labels[category];
}

function getExpectedOutcome(category: GrowthActionCategory) {
  const outcomes: Record<GrowthActionCategory, string> = {
    linkedin_post: "Increase founder-led reach and audience signal.",
    seo_blog: "Create durable discovery for high-intent searches.",
    whatsapp_community: "Test direct community resonance and replies.",
    landing_page: "Improve conversion clarity for visitors.",
    founder_next_action: "Move the growth loop forward manually today.",
  };

  return outcomes[category];
}

function getNextRecommendation(researchCount: number, actions: ActionWithLogs[]) {
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

  if (
    actions.some(
      (action) =>
        action.category === "linkedin_post" &&
        (action.execution_logs ?? []).some((log) => log.result_status === "success"),
    )
  ) {
    return "Generate more LinkedIn founder posts based on the winning angle.";
  }

  if (
    actions.some(
      (action) =>
        action.category === "seo_blog" &&
        (action.execution_logs ?? []).some((log) => log.result_status === "success"),
    )
  ) {
    return "Generate more SEO blog ideas around the topic that worked.";
  }

  if (
    actions.some(
      (action) =>
        action.category === "whatsapp_community" &&
        (action.execution_logs ?? []).some((log) => log.result_status === "success"),
    )
  ) {
    return "Run more community distribution using the message that resonated.";
  }

  if (executionLogs.some((log) => log.result_status === "failed")) {
    return "Change the angle or channel, then retry the failed action manually.";
  }

  return "Review the latest learning and choose the next approved action to execute.";
}

function StatusItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={ready ? "mt-2 text-sm font-semibold text-emerald-700" : "mt-2 text-sm font-semibold text-neutral-500"}>
        {ready ? "Ready" : "Needs input"}
      </p>
    </div>
  );
}

function MainCta({
  projectId,
  memoryCompleted,
  researchExists,
  actionsGenerated,
  approvedActionExists,
  executedActionExists,
  resultOrLearningRecorded,
}: {
  projectId: string;
  memoryCompleted: boolean;
  researchExists: boolean;
  actionsGenerated: boolean;
  approvedActionExists: boolean;
  executedActionExists: boolean;
  resultOrLearningRecorded: boolean;
}) {
  const buttonClass =
    "inline-flex h-11 items-center justify-center rounded bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800";

  if (!memoryCompleted) {
    return (
      <Link className={buttonClass} href={`/projects/${projectId}/memory`}>
        Complete Product Memory
      </Link>
    );
  }

  if (!researchExists) {
    return (
      <form action={runResearch}>
        <input name="project_id" type="hidden" value={projectId} />
        <SubmitButton idleLabel="Run Research" pendingLabel="Running..." className={buttonClass} />
      </form>
    );
  }

  if (!actionsGenerated) {
    return (
      <form action={generateGrowthActions}>
        <input name="project_id" type="hidden" value={projectId} />
        <SubmitButton
          idleLabel="Generate Growth Actions"
          pendingLabel="Generating..."
          className={buttonClass}
        />
      </form>
    );
  }

  if (!approvedActionExists) {
    return (
      <Link className={buttonClass} href={`/projects/${projectId}/approvals`}>
        Approve Best Actions
      </Link>
    );
  }

  if (!executedActionExists) {
    return (
      <Link className={buttonClass} href={`/projects/${projectId}/approvals`}>
        Execute Approved Action
      </Link>
    );
  }

  if (!resultOrLearningRecorded) {
    return (
      <Link className={buttonClass} href={`/projects/${projectId}/approvals`}>
        Add Result
      </Link>
    );
  }

  return (
    <form action={generateNextRecommendation}>
      <input name="project_id" type="hidden" value={projectId} />
      <input name="return_to" type="hidden" value={`/projects/${projectId}/autopilot`} />
      <SubmitButton
        idleLabel="Generate Next Recommendation"
        pendingLabel="Generating..."
        className={buttonClass}
      />
    </form>
  );
}

export default async function AutopilotPage({ params, searchParams }: AutopilotPageProps) {
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

  const { data: memory, error: memoryError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  const { count: researchCount, error: researchError } = await supabase
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

  const typedActions = (actions ?? []) as ActionWithLogs[];
  const executionLogs = typedActions.flatMap((action) => action.execution_logs ?? []);
  const memoryCompleted = isMemoryCompleted(memory);
  const researchExists = (researchCount ?? 0) > 0;
  const actionsGenerated = typedActions.length > 0;
  const approvedActionExists = typedActions.some((action) => action.status === "approved");
  const executedActionExists = executionLogs.length > 0;
  const resultOrLearningRecorded = hasResultOrLearning(executionLogs);
  const growthScore = getGrowthScore({
    memoryCompleted,
    researchExists,
    actionsGenerated,
    approvedActionExists,
    executedActionExists,
    resultOrLearningRecorded,
  });
  const autopilotStatus = getAutopilotStatus({
    memoryCompleted,
    researchExists,
    actionsGenerated,
    approvedActionExists,
    executedActionExists,
    resultOrLearningRecorded,
  });
  const nextBestAction =
    project.next_recommendation || getNextRecommendation(researchCount ?? 0, typedActions);
  const planActions = typedActions
    .filter((action) => action.status !== "rejected")
    .sort((a, b) => {
      const priority = { approved: 0, pending: 1, completed: 2, rejected: 3 };
      return priority[a.status] - priority[b.status];
    })
    .slice(0, 3);

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
              CareerScore Growth Autopilot
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              One manual control center for memory, research, action, approval, execution,
            learning, and the next best growth move.
            </p>
          </div>
          <MainCta
            approvedActionExists={approvedActionExists}
            actionsGenerated={actionsGenerated}
            executedActionExists={executedActionExists}
            memoryCompleted={memoryCompleted}
            projectId={project.id}
            researchExists={researchExists}
            resultOrLearningRecorded={resultOrLearningRecorded}
          />
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {success === "recommendation" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Next recommendation generated.
        </div>
      ) : null}

      {memoryError || researchError || actionsError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Autopilot failed to load:{" "}
          {memoryError?.message || researchError?.message || actionsError?.message}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Growth Score
          </p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-5xl font-semibold text-neutral-950">{growthScore}</p>
            <p className="pb-2 text-sm font-semibold text-neutral-500">/ 100</p>
          </div>
          <div className="mt-5 h-2 rounded bg-neutral-200">
            <div className="h-2 rounded bg-neutral-950" style={{ width: `${growthScore}%` }} />
          </div>
          <p className="mt-5 text-sm font-semibold text-neutral-950">{autopilotStatus}</p>
        </div>

        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Next Best Action
          </p>
          <h3 className="mt-3 text-xl font-semibold leading-7 text-neutral-950">
            {nextBestAction}
          </h3>
          <p className="mt-4 text-sm leading-6 text-neutral-700">
            Autopilot only recommends and routes the next manual step. It does not post, email, or
            call external services.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatusItem label="Product Memory status" ready={memoryCompleted} />
        <StatusItem label="Research status" ready={researchExists} />
        <StatusItem label="Actions status" ready={actionsGenerated} />
        <StatusItem label="Approval status" ready={approvedActionExists} />
        <StatusItem label="Execution status" ready={executedActionExists} />
        <StatusItem label="Results status" ready={resultOrLearningRecorded} />
      </section>

      <section className="rounded border border-neutral-300 bg-white">
        <div className="border-b border-neutral-300 px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Growth Plan Today
          </p>
          <h3 className="mt-2 text-xl font-semibold text-neutral-950">Top 3 actions</h3>
        </div>

        {planActions.length === 0 ? (
          <div className="px-5 py-6 text-sm leading-6 text-neutral-700">
            Generate growth actions to create the plan for today.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {planActions.map((action) => (
              <div key={action.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {getCategoryLabel(action.category)}
                  </p>
                  <h4 className="mt-1 font-semibold text-neutral-950">{action.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">{action.description}</p>
                </div>
                <div className="grid gap-3 text-sm leading-6 text-neutral-700">
                  <p>
                    <span className="font-semibold text-neutral-950">Reason:</span>{" "}
                    {action.status === "approved"
                      ? "Approved and ready for controlled manual execution."
                      : "High-leverage generated action from the current growth workflow."}
                  </p>
                  <p>
                    <span className="font-semibold text-neutral-950">Expected outcome:</span>{" "}
                    {getExpectedOutcome(action.category)}
                  </p>
                  <p>
                    <span className="font-semibold text-neutral-950">Status:</span>{" "}
                    {action.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
