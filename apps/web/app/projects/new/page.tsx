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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Magic URL Growth Autopilot
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-neutral-950">Start DistributionOS</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-700">
          Paste a product URL. DistributionOS creates growth work, tracks results, and repeats what
          works.
        </p>
      </section>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form action={createProject} className="rounded border border-neutral-300 bg-white p-5">
        <input name="customer" type="hidden" value="CareerScore" />
        <input name="channel" type="hidden" value="manual" />
        <input name="status" type="hidden" value="planning" />
        <input name="summary" type="hidden" value="Magic URL Growth Autopilot setup." />
        <input name="next_action" type="hidden" value="Start Growth Autopilot" />

        <div className="grid gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Product name</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue="CareerScore"
              name="name"
              required
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Product URL</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              name="product_url"
              placeholder="https://careerscore..."
              required
              type="url"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">Goal</span>
            <input
              className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
              defaultValue="Get paying users"
              name="goal"
              required
              type="text"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end border-t border-neutral-200 pt-5">
          <button className="h-10 rounded bg-neutral-950 px-4 text-sm font-semibold text-white">
            Start Autopilot
          </button>
        </div>
      </form>
    </div>
  );
}
