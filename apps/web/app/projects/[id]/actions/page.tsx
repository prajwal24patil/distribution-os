import Link from "next/link";
import { notFound } from "next/navigation";
import { generateGrowthActions, updateGrowthActionStatus } from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth";
import type { GrowthActionCategory, GrowthActionRow } from "@/lib/supabase/types";

type ActionsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const categoryLabels: Record<GrowthActionCategory, string> = {
  linkedin_post: "LinkedIn Post Ideas",
  seo_blog: "SEO Blog Ideas",
  whatsapp_community: "WhatsApp / Community Messages",
  landing_page: "Landing Page Improvements",
  founder_next_action: "Founder Next Actions",
};

const categories: GrowthActionCategory[] = [
  "linkedin_post",
  "seo_blog",
  "whatsapp_community",
  "landing_page",
  "founder_next_action",
];

function actionStatusStyle(status: GrowthActionRow["status"]) {
  if (status === "approved") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-neutral-300 bg-neutral-100 text-neutral-700";
}

function StatusButton({
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

export default async function ActionsPage({ params, searchParams }: ActionsPageProps) {
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
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-red-950">Actions failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
        >
          Back to project
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Action Generator
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              Generate deterministic growth actions from saved project, product memory, and the
              latest local research run. Generated actions start as pending drafts and move through
              the approval queue before manual execution.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/projects/${project.id}/approvals`}
              className="inline-flex h-10 items-center justify-center rounded border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
            >
              Approval Queue
            </Link>
            <form action={generateGrowthActions}>
              <input name="project_id" type="hidden" value={project.id} />
              <SubmitButton idleLabel="Generate Growth Actions" pendingLabel="Generating..." />
            </form>
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {success === "actions" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Growth actions generated.
        </div>
      ) : null}

      {success === "status" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Action status updated.
        </div>
      ) : null}

      {actions.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-lg font-semibold text-sky-950">No growth actions yet</h3>
          <p className="mt-2 text-sm leading-6 text-sky-800">
            Generate growth actions after running research or saving product memory.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-5">
          {categories.map((category) => {
            const groupedActions = actions.filter((action) => action.category === category);

            if (groupedActions.length === 0) {
              return null;
            }

            return (
              <div key={category} className="rounded border border-neutral-300 bg-white">
                <div className="border-b border-neutral-300 px-5 py-4">
                  <h3 className="text-lg font-semibold text-neutral-950">
                    {categoryLabels[category]}
                  </h3>
                </div>
                <div className="divide-y divide-neutral-200">
                  {groupedActions.map((action) => (
                    <div key={action.id} className="px-5 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-neutral-950">{action.title}</h4>
                            <span
                              className={`inline-flex h-7 items-center rounded border px-2.5 text-xs font-medium ${actionStatusStyle(
                                action.status,
                              )}`}
                            >
                              {action.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-neutral-700">
                            {action.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusButton
                            actionId={action.id}
                            label="Approve"
                            projectId={project.id}
                            status="approved"
                          />
                          <StatusButton
                            actionId={action.id}
                            label="Reject"
                            projectId={project.id}
                            status="rejected"
                          />
                          <StatusButton
                            actionId={action.id}
                            label="Complete"
                            projectId={project.id}
                            status="completed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
