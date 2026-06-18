import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/projects";
import { requireUser } from "@/lib/auth";

export default async function ProjectsPage() {
  const { supabase } = await requireUser();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-red-950">Projects failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="flex flex-col gap-4 border-b border-neutral-300 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Projects</p>
          <h2 className="mt-2 text-3xl font-semibold text-neutral-950">Project pipeline</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-700">
            Saved growth initiatives from Supabase.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex h-10 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          New Project
        </Link>
      </section>

      <section className="overflow-hidden rounded border border-neutral-300 bg-white">
        <div className="hidden grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr_0.5fr] gap-4 border-b border-neutral-300 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 md:grid">
          <span>Name</span>
          <span>Channel</span>
          <span>Status</span>
          <span>Updated</span>
          <span>Progress</span>
        </div>

        <div className="divide-y divide-neutral-200">
          {projects.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <h3 className="text-lg font-semibold text-neutral-950">No projects found</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Create a project to start tracking real data in Supabase.
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="grid gap-4 px-5 py-4 transition hover:bg-neutral-50 md:grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr_0.5fr] md:items-center"
              >
                <div>
                  <p className="font-semibold text-neutral-950">{project.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">{project.customer}</p>
                </div>
                <p className="text-sm font-medium text-neutral-700">{project.channel}</p>
                <StatusBadge status={project.status} />
                <p className="text-sm text-neutral-600">{formatDate(project.updated_at)}</p>
                <p className="text-sm font-semibold text-neutral-950">{project.progress}%</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
