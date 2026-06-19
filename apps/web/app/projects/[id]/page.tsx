import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProject, updateProject } from "@/app/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/projects";
import { requireUser } from "@/lib/auth";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { id } = await params;
  const { error: actionError } = await searchParams;
  const { supabase } = await requireUser();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

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
            <Link
              href={`/projects/${project.id}/memory`}
              className="inline-flex h-10 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Product Memory
            </Link>
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
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
