import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function Home() {
  const { supabase } = await requireUser();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (project) {
    redirect(`/projects/${project.id}/autopilot`);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center">
      <section className="rounded border border-neutral-300 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Autopilot</p>
        <h2 className="mt-2 text-3xl font-semibold text-neutral-950">
          Create your CareerScore growth project
        </h2>
        <p className="mt-3 text-sm leading-6 text-neutral-700">
          Add the CareerScore URL once, then DistributionOS can prepare tracked work for manual
          approval and posting.
        </p>
        {error ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error.message}
          </p>
        ) : null}
        <Link
          href="/projects/new"
          className="mt-6 inline-flex h-10 items-center justify-center rounded bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Create Project
        </Link>
      </section>
    </div>
  );
}
