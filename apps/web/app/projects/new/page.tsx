import { createProject } from "@/app/actions";
import { requireUser } from "@/lib/auth";

type NewProjectPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Projects</p>
        <h2 className="mt-2 text-3xl font-semibold text-neutral-950">Create project</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-700">
          Save a growth project to Supabase.
        </p>
      </section>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form action={createProject} className="rounded border border-neutral-300 bg-white p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Project name</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              name="name"
              placeholder="CareerScore Launch Sprint"
              required
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Channel</span>
            <select
              className="h-10 rounded border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-neutral-950"
              name="channel"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="seo">SEO</option>
              <option value="email">Email</option>
              <option value="partnerships">Partnerships</option>
              <option value="manual">Manual</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Status</span>
            <select
              className="h-10 rounded border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-neutral-950"
              name="status"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Customer</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue="CareerScore"
              name="customer"
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Goal</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              name="goal"
              placeholder="Validate a weekly growth loop"
              required
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Summary</span>
            <textarea
              className="min-h-32 rounded border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
              name="summary"
              placeholder="Describe the campaign, audience, and expected outcome."
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Next action</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              name="next_action"
              placeholder="Choose the first experiment"
              type="text"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded border border-neutral-300 px-4 text-sm font-semibold text-neutral-700"
            type="reset"
          >
            Reset
          </button>
          <button
            className="h-10 rounded bg-neutral-950 px-4 text-sm font-semibold text-white"
            type="submit"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
