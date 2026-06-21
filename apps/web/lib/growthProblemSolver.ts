export type GrowthProblemType =
  | "no_product_memory"
  | "no_research"
  | "no_campaign"
  | "no_ready_content"
  | "no_clicks"
  | "clicks_no_signups"
  | "signups_no_paid_users"
  | "paid_users_no_sharing"
  | "failed_channel"
  | "winning_channel_found";

export type GrowthProblem = {
  type: GrowthProblemType;
  problem: string;
};

export type GrowthSolverContext = {
  hasProductMemory: boolean;
  researchCount: number;
  campaignCount: number;
  readyToPostCount: number;
  clicks: number;
  signups: number;
  paidUsers: number;
  failedChannel?: string;
  winningChannel?: string;
  hasReferralWork: boolean;
};

export type GrowthFix = {
  problem: GrowthProblem;
  appliedFix: string;
  readyWork: string[];
  nextStep: string;
  status: "ready" | "needs_input" | "applied";
};

const careerscoreAngles = [
  "Most freshers do not know why they are not getting shortlisted.",
  "You may be underpricing yourself without knowing it.",
  "Your resume may look complete but still miss job-winning proof.",
  "CareerScore is like a CIBIL score for your career readiness.",
  "Before applying to 100 jobs, know your career score.",
];

const strongerCtas = [
  "Check your CareerScore before your next application.",
  "Find the one gap blocking your shortlist chances.",
  "Get your career readiness score today.",
  "See whether your resume proves what recruiters need.",
  "Know what to fix before applying again.",
];

export function detectGrowthProblems(context: GrowthSolverContext): GrowthProblem[] {
  const problems: GrowthProblem[] = [];

  if (!context.hasProductMemory) {
    problems.push({
      type: "no_product_memory",
      problem: "DistributionOS does not understand CareerScore.",
    });
  }

  if (context.researchCount === 0) {
    problems.push({ type: "no_research", problem: "No growth direction." });
  }

  if (context.campaignCount === 0) {
    problems.push({ type: "no_campaign", problem: "No distribution assets." });
  }

  if (context.campaignCount > 0 && context.readyToPostCount === 0) {
    problems.push({ type: "no_ready_content", problem: "Nothing to post." });
  }

  if (context.campaignCount > 0 && context.clicks === 0) {
    problems.push({ type: "no_clicks", problem: "Content is not attracting attention." });
  }

  if (context.clicks > 0 && context.signups === 0) {
    problems.push({ type: "clicks_no_signups", problem: "Landing page or offer is weak." });
  }

  if (context.signups > 0 && context.paidUsers === 0) {
    problems.push({ type: "signups_no_paid_users", problem: "Payment conversion is weak." });
  }

  if (context.paidUsers > 0 && !context.hasReferralWork) {
    problems.push({ type: "paid_users_no_sharing", problem: "No viral loop." });
  }

  if (context.failedChannel) {
    problems.push({
      type: "failed_channel",
      problem: `${context.failedChannel} underperformed.`,
    });
  }

  if (context.winningChannel) {
    problems.push({
      type: "winning_channel_found",
      problem: `Winning channel found: ${context.winningChannel}.`,
    });
  }

  return problems;
}

export function recommendFixes(problem: GrowthProblem): string {
  const fixes: Record<GrowthProblemType, string> = {
    no_product_memory: "Show required memory fields and send the founder to Product Memory.",
    no_research: "Run internal research using existing Product Memory.",
    no_campaign: "Generate today's growth campaign with tracking links.",
    no_ready_content: "Generate LinkedIn, WhatsApp, Reddit, SEO, and referral content.",
    no_clicks:
      "Generate stronger hooks, curiosity-based headlines, sharper CTAs, and new campaign variants.",
    clicks_no_signups:
      "Generate landing page fixes: headline, subheadline, CTA, trust section, pricing explanation, and free preview copy.",
    signups_no_paid_users: "Generate pricing and upsell fixes for INR 99 and INR 199 reports.",
    paid_users_no_sharing: "Generate share and referral assets.",
    failed_channel: "Generate an alternative angle or channel.",
    winning_channel_found: "Generate more content in the winning pattern.",
  };

  return fixes[problem.type];
}

export function generateFixTasks(problem: GrowthProblem): string[] {
  if (problem.type === "no_product_memory") {
    return [
      "Fill product name, website URL, product summary, target users, primary problem, value proposition, pricing, current stage, primary goal, preferred channels, competitors, brand voice, and constraints.",
    ];
  }

  if (problem.type === "no_research") {
    return [
      "Run research from saved Product Memory.",
      "Use research output to choose the first growth direction.",
    ];
  }

  if (problem.type === "no_campaign" || problem.type === "no_ready_content") {
    return careerscoreAngles.map(
      (angle, index) =>
        `Post ${index + 1}: ${angle}\nCTA: ${strongerCtas[index]}\nChannel: LinkedIn / WhatsApp / Reddit`,
    );
  }

  if (problem.type === "no_clicks") {
    return [
      ...careerscoreAngles.map((angle) => `Hook: ${angle}`),
      ...strongerCtas.map((cta) => `CTA: ${cta}`),
      "Variant: Turn the CIBIL analogy into a short founder story.",
      "Variant: Turn the urgency angle into a checklist post.",
      "Variant: Turn the skill gap angle into a Reddit/community reply.",
    ];
  }

  if (problem.type === "clicks_no_signups") {
    return [
      "Headline: Know your CareerScore before applying again.",
      "Subheadline: Find the gaps stopping your resume from becoming shortlist-ready.",
      "CTA: Check my CareerScore",
      "Trust section: Built for freshers and job seekers who need a clearer next step.",
      "Pricing explanation: Start free, then unlock deeper recommendations when ready.",
      "Free preview copy: See your top career readiness gap before paying.",
    ];
  }

  if (problem.type === "signups_no_paid_users") {
    return [
      "INR 99 report pitch: Unlock your core career readiness report and know what to fix first.",
      "INR 199 advanced report pitch: Get deeper proof gaps, resume signals, and priority fixes.",
      "Urgency copy: Do this before applying to another 100 jobs.",
      "Value comparison: One report can prevent weeks of blind applications.",
      "Trust copy: Your score explains what recruiters may notice before they call you.",
    ];
  }

  if (problem.type === "paid_users_no_sharing") {
    return [
      "LinkedIn badge copy: I checked my CareerScore before my next job push.",
      "Referral message: I found this useful for spotting career readiness gaps. Try it before applying again.",
      "Invite-friend copy: Help one friend find the gap blocking their shortlist chances.",
      "Share-to-unlock copy: Share CareerScore with a friend to unlock one extra improvement tip.",
      "Leaderboard idea: Weekly shortlist-readiness leaderboard for freshers.",
    ];
  }

  if (problem.type === "failed_channel") {
    return [
      "Change channel: Move the same offer from the failed channel to LinkedIn founder storytelling.",
      "Change angle: Replace broad advice with the CIBIL-for-careers analogy.",
      "Change CTA: Ask users to check one gap before applying again.",
    ];
  }

  return [
    "Repeat the winning channel with three new hooks.",
    "Create one stronger CTA using the same offer.",
    "Turn the winning content into a WhatsApp/community version.",
    "Turn the winning content into an SEO outline.",
  ];
}

export function applySafeFixes(problem: GrowthProblem): GrowthFix {
  const readyWork = generateFixTasks(problem);

  return {
    problem,
    appliedFix: recommendFixes(problem),
    readyWork,
    nextStep: getNextExecutionStep(problem),
    status: verifyFixReadiness(problem, readyWork) ? "applied" : "needs_input",
  };
}

export function verifyFixReadiness(problem: GrowthProblem, readyWork: string[]): boolean {
  return problem.type !== "no_product_memory" && readyWork.length > 0;
}

export function getNextExecutionStep(problem: GrowthProblem): string {
  const nextSteps: Record<GrowthProblemType, string> = {
    no_product_memory: "Complete Product Memory before DistributionOS applies growth fixes.",
    no_research: "Review the research, then run the solver again.",
    no_campaign:
      "Approve the strongest ready-to-use work and post it manually with the tracking link.",
    no_ready_content: "Post the first LinkedIn founder post today and use the tracking link.",
    no_clicks: "Post the strongest new hook today and compare tracked clicks.",
    clicks_no_signups:
      "Apply the landing page copy manually, then check signups after new clicks arrive.",
    signups_no_paid_users: "Test the INR 99 report pitch manually and record paid users.",
    paid_users_no_sharing: "Send the referral message to recent paid users manually.",
    failed_channel: "Move effort to the new angle or channel and record the result.",
    winning_channel_found: "Create more content in the same winning pattern.",
  };

  return nextSteps[problem.type];
}
