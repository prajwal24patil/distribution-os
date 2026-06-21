import type {
  CampaignItemInsert,
  CampaignType,
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

type CampaignInput = ResearchInput & {
  campaignId: string;
  destinationUrl: string;
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

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function utmLink({
  baseUrl,
  source,
  medium,
  campaign,
  content,
}: {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
}) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
  });

  return `${baseUrl}${separator}${params.toString()}`;
}

export function buildResearchRun({ project, memory, ownerId }: ResearchInput): ResearchRunInsert {
  const name = productName(memory, project);
  const targetUsers = value(
    memory?.target_users,
    "the highest-intent users described in product memory",
  );
  const primaryProblem = value(memory?.primary_problem, "the main unresolved customer problem");
  const valueProposition = value(memory?.value_proposition, project.goal);
  const channels = value(memory?.preferred_channels, project.channel);
  const competitors = value(
    memory?.competitors,
    "direct alternatives, manual workflows, and status quo solutions",
  );
  const countries = value(memory?.target_countries, "current priority markets");
  const constraints = value(
    memory?.constraints,
    "solo-founder time and limited distribution bandwidth",
  );
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

function campaignItem({
  campaignType,
  channel,
  hook,
  content,
  targetAudience,
  cta,
  expectedOutcome,
}: {
  campaignType: CampaignType;
  channel: string;
  hook: string;
  content: string;
  targetAudience: string;
  cta: string;
  expectedOutcome: string;
}) {
  return {
    campaignType,
    channel,
    hook,
    content,
    targetAudience,
    cta,
    expectedOutcome,
  };
}

export function buildViralCampaignItems({
  project,
  memory,
  ownerId,
  campaignId,
  destinationUrl,
}: CampaignInput): CampaignItemInsert[] {
  const name = productName(memory, project);
  const targetUsers = value(memory?.target_users, "career-focused users");
  const websiteUrl = destinationUrl;
  const campaignSlug = slug(`${name} viral growth`);

  const items = [
    campaignItem({
      campaignType: "linkedin_founder_post",
      channel: "LinkedIn",
      hook: "Most freshers don't know why they're not getting shortlisted.",
      content: `Most freshers don't know why they're not getting shortlisted.\n\nThey keep applying, but their resume may be missing proof, skills, or the right positioning.\n\n${name} helps them check career readiness before applying again.`,
      targetAudience: targetUsers,
      cta: `Check your ${name} before your next application.`,
      expectedOutcome: "Founder-led impressions, comments, and qualified profile clicks.",
    }),
    campaignItem({
      campaignType: "seo_blog",
      channel: "SEO",
      hook: "Before applying to 100 jobs, check your CareerScore.",
      content: `Before applying to 100 jobs, check your CareerScore.\n\nLearn what your resume, skills, and job-readiness profile may be missing.`,
      targetAudience: targetUsers,
      cta: `Use ${name} to find the gap before applying again.`,
      expectedOutcome: "Compounding search clicks from high-intent problem queries.",
    }),
    campaignItem({
      campaignType: "whatsapp_community_share",
      channel: "WhatsApp / Community",
      hook: "Quick question for freshers applying to jobs",
      content: `Quick question - are you applying to jobs but not getting callbacks?\n\n${name} checks your career readiness and shows what gap to fix next.`,
      targetAudience: targetUsers,
      cta: `Check your score and share it with one friend who is job hunting.`,
      expectedOutcome: "Direct replies, objection language, and early referral loops.",
    }),
    campaignItem({
      campaignType: "reddit_community_reply",
      channel: "Reddit / Community",
      hook: "If you're applying a lot but not getting responses, the problem may not be effort.",
      content: `If you're applying a lot but not getting responses, the problem may not be effort. It may be positioning, missing proof, or unclear skill match.\n\nI built ${name} to help people see their career readiness score and next gaps to fix.`,
      targetAudience: targetUsers,
      cta: `Use ${name} if you want a clearer next step.`,
      expectedOutcome: "Credible community clicks and qualitative objections.",
    }),
    campaignItem({
      campaignType: "landing_page_headline",
      channel: "Landing Page",
      hook: "Know your CareerScore before the market judges your resume.",
      content: "Know your CareerScore before the market judges your resume.",
      targetAudience: targetUsers,
      cta: `Get your ${name} report.`,
      expectedOutcome: "Higher click-through from visitors already aware of the problem.",
    }),
    campaignItem({
      campaignType: "referral_campaign",
      channel: "Referral",
      hook: "Know a friend applying to jobs?",
      content: `Know someone applying to jobs but stuck? Send them ${name}.`,
      targetAudience: `${targetUsers} and people who advise them`,
      cta: `Invite one friend to check their ${name}.`,
      expectedOutcome: "Warm referral traffic and higher-intent signups.",
    }),
  ];

  return items.map((item) => {
    const utmSource = slug(item.channel);
    const utmMedium = "organic";
    const utmContent = slug(item.hook);

    return {
      campaign_id: campaignId,
      project_id: project.id,
      owner_id: ownerId,
      campaign_type: item.campaignType,
      channel: item.channel,
      hook: item.hook,
      content: item.content,
      target_audience: item.targetAudience,
      cta: item.cta,
      expected_outcome: item.expectedOutcome,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: campaignSlug,
      utm_content: utmContent,
      utm_link: utmLink({
        baseUrl: websiteUrl,
        source: utmSource,
        medium: utmMedium,
        campaign: campaignSlug,
        content: utmContent,
      }),
      status: "draft",
    };
  });
}
