import Link from "next/link";
import { notFound } from "next/navigation";
import { runResearch } from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { sanitizeCareerScoreCopy } from "@/lib/careerScoreCopy";
import { formatDate } from "@/lib/projects";
import { requireUser } from "@/lib/auth";

type ResearchPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type InsightCardProps = {
  title: string;
  body: string;
};

function InsightCard({ title, body }: InsightCardProps) {
  return (
    <div className="rounded border border-neutral-300 bg-white p-5">
      <h3 className="text-lg font-semibold text-neutral-950">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
        {sanitizeCareerScoreCopy(body)}
      </p>
    </div>
  );
}

export default async function ResearchPage({ params, searchParams }: ResearchPageProps) {
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

  const { data: researchRuns, error } = await supabase
    .from("research_runs")
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-red-950">Research failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{error.message}</p>
      </div>
    );
  }

  const latestRun = researchRuns[0];

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
              Research Engine
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
              Generate deterministic research from saved project and product memory. No external
              APIs, OpenAI, or RAG are used.
            </p>
          </div>
          <form action={runResearch}>
            <input name="project_id" type="hidden" value={project.id} />
            <SubmitButton idleLabel="Run Research" pendingLabel="Running..." />
          </form>
        </div>
      </section>

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {success === "research" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Research run created.
        </div>
      ) : null}

      {!latestRun ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-lg font-semibold text-sky-950">No research runs yet</h3>
          <p className="mt-2 text-sm leading-6 text-sky-800">
            Run research after saving Product Memory to get stronger deterministic insights.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded border border-neutral-300 bg-white p-5">
            <p className="text-sm font-medium text-neutral-500">Latest run</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-700">{formatDate(latestRun.created_at)}</p>
              <p className="text-sm font-semibold text-neutral-950">
                Confidence: {latestRun.confidence_score}/100
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InsightCard title="Audience Insights" body={latestRun.audience_insights} />
            <InsightCard title="Competitor Insights" body={latestRun.competitor_insights} />
            <InsightCard title="Keyword Opportunities" body={latestRun.keyword_opportunities} />
            <InsightCard title="Channel Opportunities" body={latestRun.channel_opportunities} />
            <InsightCard title="Pain Points" body={latestRun.pain_points} />
            <InsightCard title="Positioning Angles" body={latestRun.positioning_angles} />
            <InsightCard title="Assumptions" body={latestRun.assumptions} />
          </section>
        </>
      )}
    </div>
  );
}
