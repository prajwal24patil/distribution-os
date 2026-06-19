import type {
  GrowthActionCategory,
  GrowthActionInsert,
  ProductMemoryRow,
  ProjectRow,
  ResearchRunInsert,
} from "@/lib/supabase/types";

type ResearchInput = {
  project: ProjectRow;
  memory: ProductMemoryRow | null;
  ownerId: string;
};

type ActionInput = ResearchInput & {
  researchRunId: string | null;
};

function value(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function lines(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function productName(memory: ProductMemoryRow | null, project: ProjectRow) {
  return value(memory?.product_name, project.customer || project.name);
}

export function buildResearchRun({ project, memory, ownerId }: ResearchInput): ResearchRunInsert {
  const name = productName(memory, project);
  const targetUsers = value(memory?.target_users, "the highest-intent users described in product memory");
  const primaryProblem = value(memory?.primary_problem, "the main unresolved customer problem");
  const valueProposition = value(memory?.value_proposition, project.goal);
  const channels = value(memory?.preferred_channels, project.channel);
  const competitors = value(memory?.competitors, "direct alternatives, manual workflows, and status quo solutions");
  const countries = value(memory?.target_countries, "current priority markets");
  const constraints = value(memory?.constraints, "solo-founder time and limited distribution bandwidth");
  const confidenceScore = memory ? 74 : 52;

  return {
    project_id: project.id,
    owner_id: ownerId,
    audience_insights: lines([
      `${name} should prioritize ${targetUsers}.`,
      `The strongest initial segment is likely users already feeling ${primaryProblem}.`,
      `Messaging should qualify users by urgency, not broad awareness.`,
    ]),
    competitor_insights: lines([
      `Compare ${name} against ${competitors}.`,
      "Position against both direct competitors and the do-nothing/status quo path.",
      "Look for proof points that are faster, clearer, or easier to trust than alternatives.",
    ]),
    keyword_opportunities: lines([
      `${name} alternatives`,
      `${primaryProblem} solution`,
      `${targetUsers} career assessment`,
      `${valueProposition} guide`,
      `${countries} career growth tools`,
    ]),
    channel_opportunities: lines([
      `Use ${channels} for founder-led distribution first.`,
      "Turn repeated user questions into posts, briefs, and landing page sections.",
      "Prioritize channels where the founder can learn quickly before scaling volume.",
    ]),
    pain_points: lines([
      primaryProblem,
      "Users may not trust generic advice without a clear proof point.",
      "Users may need a specific next step rather than a broad product pitch.",
    ]),
    positioning_angles: lines([
      `${name} helps ${targetUsers} achieve ${valueProposition}.`,
      "Lead with the user outcome, then explain the mechanism.",
      "Use constraints as positioning filters so the offer feels focused.",
    ]),
    assumptions: lines([
      `Current constraints: ${constraints}.`,
      "Research is generated from saved project and product memory only.",
      "No external market data, RAG, OpenAI, or third-party APIs were used.",
    ]),
    confidence_score: confidenceScore,
  };
}

function action(category: GrowthActionCategory, title: string, description: string) {
  return { category, title, description };
}

export function buildGrowthActions({
  project,
  memory,
  ownerId,
  researchRunId,
}: ActionInput): GrowthActionInsert[] {
  const name = productName(memory, project);
  const targetUsers = value(memory?.target_users, "target users");
  const primaryProblem = value(memory?.primary_problem, "their most urgent career problem");
  const valueProposition = value(memory?.value_proposition, project.goal);
  const brandVoice = value(memory?.brand_voice, "clear, practical, founder-led");

  const actions = [
    action(
      "linkedin_post",
      `The hidden cost of ignoring ${primaryProblem}`,
      `Write a ${brandVoice} founder post for ${targetUsers} that reframes the problem and introduces ${name}.`,
    ),
    action(
      "linkedin_post",
      `What ${targetUsers} get wrong before choosing a career tool`,
      `Create a contrarian post that names the mistake, explains the consequence, and points to ${valueProposition}.`,
    ),
    action(
      "linkedin_post",
      `A simple checklist for ${targetUsers}`,
      `Draft a practical checklist that helps users self-diagnose whether ${name} is relevant now.`,
    ),
    action(
      "linkedin_post",
      `Before and after: from confusion to ${valueProposition}`,
      "Write a transformation-style post with a concrete starting pain and a specific end state.",
    ),
    action(
      "linkedin_post",
      `Why ${name} exists`,
      "Draft a founder-origin post that explains the problem, the insight, and the first user promise.",
    ),
    action(
      "seo_blog",
      `${primaryProblem}: causes, symptoms, and next steps`,
      "Create an SEO outline targeting users actively researching the problem.",
    ),
    action(
      "seo_blog",
      `${name} vs. manual career planning`,
      "Create a comparison post against the status quo rather than only named competitors.",
    ),
    action(
      "seo_blog",
      `Best tools for ${targetUsers}`,
      "Draft a listicle angle that can honestly explain where the product fits and does not fit.",
    ),
    action(
      "seo_blog",
      `How to evaluate career direction without guessing`,
      "Create an educational post that leads naturally into the product value proposition.",
    ),
    action(
      "seo_blog",
      `${valueProposition}: a practical guide`,
      "Build a guide that can become a landing-page support article.",
    ),
    action(
      "whatsapp_community",
      `Quick question for ${targetUsers}`,
      "Ask a short community question about the current pain point and invite replies.",
    ),
    action(
      "whatsapp_community",
      `Useful resource for ${primaryProblem}`,
      "Share a helpful non-sales message that gives one practical step and links to the product only if relevant.",
    ),
    action(
      "whatsapp_community",
      `Looking for 5 feedback calls`,
      "Invite a small number of target users to review the product promise and share objections.",
    ),
    action(
      "landing_page",
      "Sharpen the hero promise",
      `Rewrite the hero section around ${valueProposition} for ${targetUsers}.`,
    ),
    action(
      "landing_page",
      "Add objection handling",
      "Add a section that answers the top reasons users might hesitate before trying the product.",
    ),
    action(
      "landing_page",
      "Add proof-oriented next step",
      "Add a clear next action that lets visitors evaluate fit quickly.",
    ),
    action(
      "founder_next_action",
      "Interview three target users",
      `Ask ${targetUsers} about ${primaryProblem}, current alternatives, and buying triggers.`,
    ),
    action(
      "founder_next_action",
      "Publish one founder post",
      "Choose one LinkedIn idea, publish manually, and record qualitative response.",
    ),
    action(
      "founder_next_action",
      "Update product memory after learning",
      "Capture objections, phrasing, and channel signals in Product Memory before generating more actions.",
    ),
  ];

  return actions.map((item) => ({
    project_id: project.id,
    research_run_id: researchRunId,
    owner_id: ownerId,
    category: item.category,
    title: item.title,
    description: item.description,
    status: "pending",
  }));
}

