import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/projects";
import { requireUser } from "@/lib/auth";

export default async function Home() {
  const { supabase } = await requireUser();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-red-950">Dashboard failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{error.message}</p>
      </div>
    );
  }

  const activeProjects = projects.filter((project) => project.status === "active").length;
  const totalExperiments = projects.reduce((total, project) => total + project.experiments, 0);
  const totalContent = projects.reduce((total, project) => total + project.content_items, 0);
  const primaryProject = projects[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col gap-4 border-b border-neutral-300 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Dashboard
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-neutral-950">Growth command center</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-700">
            Track saved growth projects, their current momentum, and the next founder action.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex h-10 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Create Project
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Active Projects</p>
          <p className="mt-3 text-3xl font-semibold text-neutral-950">{activeProjects}</p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Experiments</p>
          <p className="mt-3 text-3xl font-semibold text-neutral-950">{totalExperiments}</p>
        </div>
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Content Items</p>
          <p className="mt-3 text-3xl font-semibold text-neutral-950">{totalContent}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-5 py-4">
            <h3 className="text-lg font-semibold">Current Projects</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {projects.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <h4 className="text-lg font-semibold text-neutral-950">No projects yet</h4>
                <p className="mt-2 text-sm text-neutral-600">
                  Create your first growth project to populate the dashboard.
                </p>
                <Link
                  href="/projects/new"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white"
                >
                  Create Project
                </Link>
              </div>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block px-5 py-4 transition hover:bg-neutral-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-neutral-950">{project.name}</h4>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">{project.summary}</p>
                    </div>
                    <div className="text-sm font-medium text-neutral-500">
                      <p>{project.channel}</p>
                      <p className="mt-1">{formatDate(project.updated_at)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded border border-neutral-300 bg-white p-5">
          {primaryProject ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Next Action</p>
                  <h3 className="mt-2 text-lg font-semibold text-neutral-950">
                    {primaryProject.name}
                  </h3>
                </div>
                <StatusBadge status={primaryProject.status} />
              </div>
              <p className="mt-5 text-sm leading-6 text-neutral-700">
                {primaryProject.next_action || "No next action set yet."}
              </p>
              <div className="mt-6 h-2 rounded bg-neutral-200">
                <div
                  className="h-2 rounded bg-neutral-950"
                  style={{ width: `${primaryProject.progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-neutral-500">{primaryProject.progress}% complete</p>
            </>
          ) : (
            <div>
              <p className="text-sm font-medium text-neutral-500">Next Action</p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-950">Create first project</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                Projects will appear here after they are saved in Supabase.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
