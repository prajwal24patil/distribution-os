import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAutopilotPageData } from "@/lib/autopilotData";
import { requireUser } from "@/lib/auth";

type ResultsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

export default async function ProjectResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const data = await loadAutopilotPageData({
    supabase,
    projectId: id,
    ownerId: user.id,
  });

  if (data.error || !data.project) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Results</p>
        <h2 className="mt-2 text-3xl font-semibold text-neutral-950">CareerScore growth results</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
          Real production results show what happened after posting and webhook events. Demo/test
          data is separated below when it exists.
        </p>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Production Results
        </p>
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Clicks" value={data.results.clicks} />
          <Metric label="Signups" value={data.results.signups} />
          <Metric label="Paid reports" value={data.results.paidUsers} />
          <Metric label="Revenue" value={data.results.revenue.toFixed(2)} />
          <Metric label="Resume uploads" value={data.results.resumeUploads} />
          <Metric label="Free scores" value={data.results.freeScores} />
          <Metric label="Referral shares" value={data.results.referralShares} />
          <Metric label="Best channel" value={data.results.bestChannel} />
        </div>
      </section>

      {data.results.includesDemoData ? (
        <section className="rounded border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
            Demo/test data
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Demo data is only for testing dashboard behavior and is not included in production
            results above.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Metric label="Demo clicks" value={data.results.demo.clicks} />
            <Metric label="Demo signups" value={data.results.demo.signups} />
            <Metric label="Demo paid reports" value={data.results.demo.paidUsers} />
            <Metric label="Demo revenue" value={data.results.demo.revenue.toFixed(2)} />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Latest Learning
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-700">{data.results.latestLearning}</p>
        </div>

        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Next Best Action
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-700">{data.results.nextBestAction}</p>
        </div>
      </section>

      <Link
        href={`/projects/${data.project.id}/autopilot`}
        className="inline-flex h-10 w-fit items-center justify-center rounded border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
      >
        Back to Autopilot
      </Link>
    </div>
  );
}
