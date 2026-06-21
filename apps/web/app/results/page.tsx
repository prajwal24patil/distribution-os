import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function ResultsEntryPage() {
  const { supabase } = await requireUser();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (project) {
    redirect(`/projects/${project.id}/results`);
  }

  return (
    <div className="mx-auto max-w-3xl rounded border border-neutral-300 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Results</p>
      <h2 className="mt-2 text-3xl font-semibold text-neutral-950">No project results yet</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-700">
        Create a project before DistributionOS can track CareerScore growth results.
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
    </div>
  );
}
