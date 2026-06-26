import type {
  CampaignItemRow,
  ConversionEventRow,
  PublisherQueueRow,
  PublishingConnectionPlatform,
  PublishingConnectionRow,
  ScheduledPostRow,
  TrackingLinkRow,
} from "@/lib/supabase/types";

export type RevenueAssetType =
  | "linkedin_founder_post"
  | "linkedin_short_post"
  | "x_post"
  | "x_thread"
  | "google_business_profile_post"
  | "reddit_helpful_reply"
  | "quora_answer"
  | "whatsapp_share"
  | "email_follow_up"
  | "instagram_caption"
  | "facebook_page_post"
  | "youtube_shorts_script"
  | "youtube_video_title_description"
  | "seo_blog_article"
  | "shareable_report_outline"
  | "short_video_production_brief";

export type RevenueAsset = {
  asset_type: RevenueAssetType;
  platform: PublishingConnectionPlatform;
  audience: string;
  pain: string;
  hook: string;
  offer: string;
  cta: string;
  title: string;
  content: string;
  tracking_link: string;
  status: "manual_required" | "auto_publish_ready";
  qc_status: "approved" | "rejected";
  qc_reason: string;
  last_shared_at: string;
};

export type RevenueBrain = {
  audiences: string[];
  pain_points: string[];
  objections: string[];
  offers: string[];
  hooks: string[];
  ctas: string[];
  platform_strategy: Record<string, string>;
  forbidden_claims: string[];
  compliance_rules: string[];
};

export const careerScoreRevenueBrain: RevenueBrain = {
  audiences: [
    "Freshers applying but no callback",
    "2023/2024/2025 passouts",
    "Gap-year candidates",
    "Data analyst aspirants",
    "Software job seekers",
    "Working professionals wanting salary jump",
    "Resume uploaded but not paid",
    "Paid users/referral candidates",
  ],
  pain_points: [
    "no callback",
    "resume not shortlisted",
    "unclear role target",
    "weak project positioning",
    "gap year fear",
    "missing skills",
    "low salary",
    "AI automation fear",
  ],
  objections: [
    "I do not know if a report will help",
    "I already applied to many jobs",
    "I am not sure what role fits me",
    "I do not want generic advice",
  ],
  offers: [
    "Free CareerScore preview",
    "INR 99 basic report",
    "INR 199 advanced roadmap",
    "INR 499 premium CV + roadmap later",
  ],
  hooks: [
    "Most freshers do not know why they are not getting shortlisted.",
    "Before applying to 100 jobs, check the gap first.",
    "Your resume may be working harder than your positioning.",
    "A gap year is easier to explain when your proof is clear.",
  ],
  ctas: [
    "Before applying to another 50 jobs, check your CareerScore.",
    "Start with the free preview",
    "See your career readiness gaps",
    "Unlock your roadmap",
  ],
  platform_strategy: {
    linkedin: "Founder-led career readiness posts and proof-based education.",
    x: "Short pain-led posts and safe trend angles.",
    google_business_profile: "Local/search-friendly CareerScore updates.",
    reddit: "Helpful replies only; no spam or fake engagement.",
    quora_manual: "Manual educational answers with clear disclosure.",
    whatsapp_manual: "Founder-approved share text only.",
    facebook_page: "Official Facebook Page posts only when connected.",
    instagram_business: "Short captions for reels/static posts.",
    youtube: "Short scripts and upload briefs for YouTube.",
    email_manual: "Manual email follow-up drafts only.",
    blog: "Auto-publish eligible SEO articles inside DistributionOS.",
  },
  forbidden_claims: [
    "guaranteed job",
    "guaranteed placement",
    "guaranteed salary",
    "fake likes",
    "fake retweets",
    "fake comments",
    "trend manipulation",
    "mass DM",
    "scraped personal data",
  ],
  compliance_rules: [
    "No fake guarantees.",
    "No scraped personal data.",
    "No fake trend manipulation.",
    "No fake likes, retweets, or comments.",
    "No mass DM spam.",
    "No illegal claims.",
    "No overpromising job placement.",
    "Respect platform connection status.",
    "Tracking link must be present.",
    "CTA must be present.",
  ],
};

const assetTemplates: Array<{
  asset_type: RevenueAssetType;
  platform: PublishingConnectionPlatform;
  title: string;
}> = [
  { asset_type: "linkedin_founder_post", platform: "linkedin", title: "Founder note" },
  { asset_type: "linkedin_short_post", platform: "linkedin", title: "Short LinkedIn post" },
  { asset_type: "x_post", platform: "x", title: "X post" },
  { asset_type: "x_thread", platform: "x", title: "X thread" },
  {
    asset_type: "google_business_profile_post",
    platform: "google_business_profile",
    title: "Google Business Profile post",
  },
  { asset_type: "reddit_helpful_reply", platform: "reddit", title: "Helpful Reddit reply" },
  { asset_type: "quora_answer", platform: "quora_manual", title: "Quora answer draft" },
  { asset_type: "whatsapp_share", platform: "whatsapp_manual", title: "WhatsApp share text" },
  { asset_type: "email_follow_up", platform: "email_manual", title: "Email follow-up draft" },
  { asset_type: "instagram_caption", platform: "instagram_business", title: "Instagram caption" },
  { asset_type: "facebook_page_post", platform: "facebook_page", title: "Facebook page post" },
  {
    asset_type: "youtube_shorts_script",
    platform: "youtube",
    title: "YouTube Shorts script",
  },
  {
    asset_type: "youtube_video_title_description",
    platform: "youtube",
    title: "YouTube video title and description",
  },
  { asset_type: "seo_blog_article", platform: "blog", title: "SEO blog article" },
  {
    asset_type: "shareable_report_outline",
    platform: "whatsapp_manual",
    title: "Shareable report outline",
  },
  {
    asset_type: "short_video_production_brief",
    platform: "youtube",
    title: "Short video production brief",
  },
];

function hasOfficialConnection(
  platform: PublishingConnectionPlatform,
  connections: PublishingConnectionRow[] = [],
) {
  if (platform === "blog") return true;
  return connections.some(
    (connection) =>
      connection.platform === platform && connection.connection_status === "connected",
  );
}

export function runRevenueAssetQc(asset: Pick<RevenueAsset, "content" | "cta" | "tracking_link">) {
  const lower = `${asset.content} ${asset.cta}`.toLowerCase();
  const forbidden = careerScoreRevenueBrain.forbidden_claims.find((claim) => lower.includes(claim));

  if (forbidden) {
    return { qc_status: "rejected" as const, qc_reason: `Rejected forbidden claim: ${forbidden}` };
  }

  if (!asset.tracking_link) {
    return { qc_status: "rejected" as const, qc_reason: "Tracking link is required." };
  }

  if (!asset.cta) {
    return { qc_status: "rejected" as const, qc_reason: "CTA is required." };
  }

  return { qc_status: "approved" as const, qc_reason: "Passed revenue safety guardrails." };
}

export function createPainBasedCampaignAssets({
  trackingLink,
  connections = [],
}: {
  trackingLink: string;
  connections?: PublishingConnectionRow[];
}) {
  return assetTemplates.map((template, index): RevenueAsset => {
    const audience =
      careerScoreRevenueBrain.audiences[index % careerScoreRevenueBrain.audiences.length];
    const pain =
      careerScoreRevenueBrain.pain_points[index % careerScoreRevenueBrain.pain_points.length];
    const hook = careerScoreRevenueBrain.hooks[index % careerScoreRevenueBrain.hooks.length];
    const offer = careerScoreRevenueBrain.offers[index % careerScoreRevenueBrain.offers.length];
    const cta = careerScoreRevenueBrain.ctas[index % careerScoreRevenueBrain.ctas.length];
    const content = [
      hook,
      "",
      `Audience: ${audience}`,
      `Pain: ${pain}`,
      `Offer: ${offer}`,
      `CTA: ${cta}`,
      `Link: ${trackingLink}`,
    ].join("\n");
    const qc = runRevenueAssetQc({ content, cta, tracking_link: trackingLink });

    return {
      ...template,
      audience,
      pain,
      hook,
      offer,
      cta,
      content,
      tracking_link: trackingLink,
      status: hasOfficialConnection(template.platform, connections)
        ? "auto_publish_ready"
        : "manual_required",
      last_shared_at: "",
      ...qc,
    };
  });
}

export function generateXTrendAngles(trackingLink: string) {
  return [
    "fresher jobs",
    "layoffs",
    "AI skills",
    "data analyst jobs",
    "resume tips",
    "MNC hiring",
    "salary growth",
    "job gap",
    "interview rejection",
    "resume shortlist",
  ].map((topic) => ({
    topic,
    angle: `Use ${topic} to explain why job seekers should check readiness before applying again.`,
    hashtags: ["#CareerScore", "#JobSearch", `#${topic.replace(/\s+/g, "")}`],
    x_post: `Many candidates follow ${topic} conversations, but the useful next step is checking their own readiness gaps. ${trackingLink}`,
    safety_note: "No fake engagement, no spam replies, no promise to trend.",
  }));
}

export function generateLinkedInGrowthAssets(trackingLink: string) {
  return {
    founder_story_post: `I built CareerScore for candidates applying repeatedly without knowing the gap. Start here: ${trackingLink}`,
    pain_based_post: `Not getting shortlisted is painful. CareerScore helps identify readiness gaps before the next application. ${trackingLink}`,
    poll_idea:
      "What blocks job callbacks most: resume proof, skills, role clarity, or interview readiness?",
    carousel_script:
      "Slide 1: No callbacks? Slide 2: Check proof. Slide 3: Check skills. Slide 4: Check role fit. Slide 5: Check CareerScore.",
    comment_reply_draft: `Useful point. The safest next step is to diagnose the gap before applying again: ${trackingLink}`,
    connection_note_draft: "I share practical notes on career readiness and shortlisting gaps.",
    proof_post: "Proof post should use real metrics only. Status: needs data.",
  };
}

export function generateGoogleSeoGrowthAssets(trackingLink: string) {
  return {
    google_business_profile_post: `Applying but not getting callbacks? Check your CareerScore before applying again. ${trackingLink}`,
    seo_blog_topic: "Why freshers do not get shortlisted after applying to many jobs",
    seo_title: "Before applying to 100 jobs, check your CareerScore",
    meta_description:
      "Learn how resume proof, skills, role clarity, and positioning affect shortlisting.",
    faq: [
      "Why am I not getting job callbacks?",
      "How can I check career readiness?",
      "What should freshers improve before applying again?",
    ],
    cta: `Check your CareerScore: ${trackingLink}`,
  };
}

export function generateShareableReportOutline(trackingLink: string) {
  return {
    title: "CareerScore readiness snapshot",
    insight_summary: "Summarize real CareerScore readiness patterns when enough data exists.",
    anonymous_aggregate_stat_placeholder: "needs real data",
    common_mistakes: ["unclear role target", "missing project proof", "weak skills positioning"],
    cta: `Check your CareerScore: ${trackingLink}`,
    suggested_platforms: ["LinkedIn", "WhatsApp", "Instagram", "Blog"],
  };
}

export function generateMediaShortsAsset(trackingLink: string) {
  return {
    title: "Why freshers are not getting shortlisted",
    caption: `Before applying again, check your CareerScore: ${trackingLink}`,
    hashtags: ["#CareerScore", "#Freshers", "#JobSearch"],
    scene_by_scene_outline: [
      "0-5s: Candidate applying repeatedly with no callback.",
      "5-15s: Show common gaps: proof, skills, role fit.",
      "15-25s: Explain CareerScore readiness check.",
      "25-30s: CTA with tracking link.",
    ],
    voiceover_text:
      "If you are applying again and again but not getting shortlisted, check your readiness gap before the next application.",
    cta: `Before applying to another 50 jobs, check your CareerScore: ${trackingLink}`,
    tracking_link: trackingLink,
    copyright_policy:
      "Do not use copyrighted media. Create original visuals or manual upload task.",
  };
}

export function buildProofBlocks(events: ConversionEventRow[] = []) {
  const paidReports = events.filter((event) => event.event_type === "paid_report").length;

  return {
    paid_reports: paidReports > 0 ? String(paidReports) : "needs data",
    aggregate_stat: "needs data",
    claim_policy: "Use real metrics only. Do not invent success claims.",
  };
}

export function generateReferralShareAsset(trackingLink: string) {
  return {
    referral_campaign: "Share CareerScore with friends who are applying but stuck.",
    share_message: `Know someone applying to jobs but not getting callbacks? Send them CareerScore: ${trackingLink}`,
    referral_cta: "Share your CareerScore with 3 friends and unlock a bonus roadmap section.",
    unlock_idea: "Bonus roadmap section after verified referrals.",
    tracking_link: trackingLink,
  };
}

export function buildConversionOptimizer({
  campaignItems = [],
  trackingLinks = [],
  conversionEvents = [],
}: {
  campaignItems?: CampaignItemRow[];
  trackingLinks?: TrackingLinkRow[];
  conversionEvents?: ConversionEventRow[];
}) {
  const hasWebhookData = conversionEvents.length > 0;
  const signups = conversionEvents.filter((event) => event.event_type === "signup").length;
  const paid = conversionEvents.filter((event) => event.event_type === "paid_report").length;
  const weakest = !hasWebhookData
    ? "Real CareerScore conversion data not connected yet."
    : signups === 0
      ? "click to signup"
      : paid === 0
        ? "signup to paid report"
        : "referral expansion";
  const bestItem = campaignItems[0];

  return {
    weakest_funnel_step: weakest,
    best_audience: bestItem?.target_audience || careerScoreRevenueBrain.audiences[0],
    best_hook: bestItem?.hook || careerScoreRevenueBrain.hooks[0],
    best_platform: bestItem?.channel || "linkedin",
    next_best_action: hasWebhookData
      ? "Create more assets for the best converting audience."
      : "Connect CareerScore conversion events or add real results after posting.",
    tracked_clicks: trackingLinks.reduce((total, link) => total + link.clicks, 0),
  };
}

export function buildRevenueDashboardSummary({
  assets,
  scheduledPosts = [],
  conversionEvents = [],
}: {
  assets: RevenueAsset[];
  scheduledPosts?: ScheduledPostRow[];
  conversionEvents?: ConversionEventRow[];
}) {
  const optimizer = buildConversionOptimizer({ conversionEvents });

  return {
    todays_revenue_move: "Push one paid-report CTA to the highest-intent audience.",
    best_audience_to_target: optimizer.best_audience,
    assets_created_today: assets.length,
    social_assets_ready: assets.filter((asset) => asset.platform !== "blog").length,
    blog_auto_published: scheduledPosts.filter((post) => post.status === "published").length,
    manual_social_shares_pending: assets.filter((asset) => asset.status === "manual_required")
      .length,
    x_trend_angles_ready: generateXTrendAngles(assets[0]?.tracking_link || "").length,
    referral_campaign_ready: "Ready",
    weakest_funnel_step: optimizer.weakest_funnel_step,
    next_best_action: optimizer.next_best_action,
  };
}
