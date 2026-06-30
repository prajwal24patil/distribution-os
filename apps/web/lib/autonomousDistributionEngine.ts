import {
  bottleneckRecommendation,
  detectFunnelBottleneck,
  rankContentAssets,
  type ContentAsset,
} from "@/lib/contentSimulation";
import { qaContentAsset } from "@/lib/qaAgent";
import { generateShortVideoScript } from "@/lib/shortVideoEngine";
import { toSafeIntegerScore } from "@/lib/scoreSafety";
import { createClient } from "@/lib/supabase/server";
import type {
  CampaignItemInsert,
  CampaignType,
  ProductMemoryRow,
  ProjectRow,
  PublisherQueueInsert,
} from "@/lib/supabase/types";

const CAREERSCORE_URL = "https://incomeos-theta.vercel.app/";
const CAREERSCORE_AUDIENCE =
  "freshers, job seekers, career switchers, students, working professionals wanting higher salary";
const CAREERSCORE_OFFER =
  "free CareerScore preview, INR 99 detailed report, INR 199 advanced report";
const CAREERSCORE_CTA = "Check your CareerScore before applying again";
const CAREERSCORE_TONE = "direct, practical, no fake motivation";
const CHANNELS = "LinkedIn, Reddit, WhatsApp, SEO, YouTube Shorts, Instagram/Facebook, Referral";

export type DistributionAsset = ContentAsset & {
  format: string;
  bestFor: string;
  shortVideoScript?: string;
  blogOutline?: string;
  caption?: string;
  landingCopy?: string;
  referralCopy?: string;
  trackingLink?: string;
};

type LoadedContext = {
  project: ProjectRow;
  memory: ProductMemoryRow | null;
  ownerId: string;
  previousResults: {
    clicks: number;
    signups: number;
    paidUsers: number;
    revenue: number;
    latestLearning: string;
  };
};

function logTiming(label: string, startedAt: number) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[distribution] ${label} ${Math.round(performance.now() - startedAt)}ms`);
  }
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function campaignTypeForAsset(assetType: string): CampaignType {
  if (assetType.includes("seo")) return "seo_blog";
  if (assetType.includes("whatsapp")) return "whatsapp_community_share";
  if (assetType.includes("reddit")) return "reddit_community_reply";
  if (assetType.includes("landing")) return "landing_page_headline";
  if (assetType.includes("referral")) return "referral_campaign";
  return "linkedin_founder_post";
}

function publisherPlatform(asset: DistributionAsset) {
  if (asset.platform.includes("Instagram")) return "Instagram";
  if (asset.platform.includes("Facebook")) return "Facebook";
  return asset.platform;
}

async function loadContext(projectId: string): Promise<LoadedContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is required to run Distribution Engine.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message || "Project not found.");
  }

  const { data: memory } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: results } = await supabase
    .from("campaign_results")
    .select("clicks, signups, paid_users, revenue, learning")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    project,
    memory: memory as ProductMemoryRow | null,
    ownerId: user.id,
    previousResults: {
      clicks: (results ?? []).reduce((total, result) => total + result.clicks, 0),
      signups: (results ?? []).reduce((total, result) => total + result.signups, 0),
      paidUsers: (results ?? []).reduce((total, result) => total + result.paid_users, 0),
      revenue: (results ?? []).reduce((total, result) => total + Number(result.revenue), 0),
      latestLearning: (results ?? []).find((result) => result.learning)?.learning || "",
    },
  };
}

export async function ingestProductUrl(projectId: string) {
  const supabase = await createClient();
  const context = await loadContext(projectId);
  const productUrl = context.memory?.product_url || context.memory?.website_url || CAREERSCORE_URL;

  if (context.memory) {
    await supabase
      .from("product_memory")
      .update({
        product_url: productUrl,
        product_goal:
          context.memory.product_goal || context.memory.primary_goal || "get paying users",
        target_audience:
          context.memory.target_audience || context.memory.target_users || CAREERSCORE_AUDIENCE,
        offer: context.memory.offer || context.memory.pricing || CAREERSCORE_OFFER,
        primary_cta: context.memory.primary_cta || CAREERSCORE_CTA,
        brand_tone: context.memory.brand_tone || context.memory.brand_voice || CAREERSCORE_TONE,
        allowed_channels: context.memory.allowed_channels || CHANNELS,
        publishing_mode: context.memory.publishing_mode || "manual_approval",
      })
      .eq("id", context.memory.id)
      .eq("owner_id", context.ownerId);

    return productUrl;
  }

  await supabase.from("product_memory").insert({
    project_id: projectId,
    owner_id: context.ownerId,
    product_name: context.project.customer || "CareerScore",
    website_url: productUrl,
    product_url: productUrl,
    product_summary: "CareerScore helps people check career readiness before applying again.",
    target_users: CAREERSCORE_AUDIENCE,
    target_audience: CAREERSCORE_AUDIENCE,
    primary_problem: "Most freshers do not know why they are not getting shortlisted.",
    value_proposition: "Career readiness score, gap analysis, and next move before applying again.",
    pricing: CAREERSCORE_OFFER,
    offer: CAREERSCORE_OFFER,
    current_stage: "MVP growth validation",
    primary_goal: "get paying users",
    product_goal: "get paying users",
    target_countries: "India first",
    preferred_channels: CHANNELS,
    allowed_channels: CHANNELS,
    competitors: "resume review services, career coaches, job boards, manual self-assessment",
    brand_voice: CAREERSCORE_TONE,
    brand_tone: CAREERSCORE_TONE,
    primary_cta: CAREERSCORE_CTA,
    publishing_mode: "manual_approval",
    constraints: "No spam, no fake metrics, no auto-posting without official connected accounts.",
  });

  return productUrl;
}

export async function analyzeProductPositioning(projectId: string) {
  await ingestProductUrl(projectId);
  return "CareerScore is positioned as a CIBIL-like career readiness score before the market judges your resume.";
}

export async function analyzeAudiencePain(_projectId: string) {
  return [
    "Freshers apply repeatedly but do not know why they are not shortlisted.",
    "Career switchers may lack proof, positioning, or skill-match clarity.",
    "Working professionals may be underpricing themselves without readiness signals.",
  ];
}

export async function analyzeChannelOpportunities(_projectId: string) {
  return [
    "LinkedIn",
    "Reddit",
    "WhatsApp",
    "SEO",
    "YouTube Shorts",
    "Instagram/Facebook",
    "Referral",
  ];
}

export async function generateDistributionStrategy(projectId: string) {
  const [positioning, pains, channels] = await Promise.all([
    analyzeProductPositioning(projectId),
    analyzeAudiencePain(projectId),
    analyzeChannelOpportunities(projectId),
  ]);

  return `${positioning} Use ${channels.join(", ")} to test fresher-shortlist pain, proof gaps, and referral sharing. Main pain: ${pains[0]}`;
}

export async function generateContentBatch(_projectId: string): Promise<DistributionAsset[]> {
  const startedAt = performance.now();
  const assets = [
    {
      assetType: "linkedin_post",
      platform: "LinkedIn",
      format: "founder post",
      title: "Most freshers don't know why they're not getting shortlisted.",
      content:
        "Most freshers don't know why they're not getting shortlisted.\n\nThey keep applying, but their resume may be missing proof, skills, or the right positioning.\n\nCareerScore helps you check your career readiness before applying again.",
      cta: CAREERSCORE_CTA,
      bestFor: "Founder-led visibility and comments.",
    },
    {
      assetType: "linkedin_post",
      platform: "LinkedIn",
      format: "carousel outline",
      title: "Before applying to 100 jobs, check your CareerScore.",
      content:
        "Carousel: 1) No callbacks is a signal. 2) Resume proof matters. 3) Skills need role fit. 4) CareerScore shows the gap. 5) Apply again with a clearer next move.",
      cta: CAREERSCORE_CTA,
      bestFor: "LinkedIn educational carousel.",
    },
    {
      assetType: "reddit_reply",
      platform: "Reddit",
      format: "helpful reply",
      title: "If you're applying a lot but not getting responses, the problem may not be effort.",
      content:
        "If you're applying a lot but not getting responses, the problem may not be effort. It may be positioning, missing proof, or unclear skill match.\n\nI built CareerScore to help people see their career readiness score and the next gaps to fix.",
      cta: "Check CareerScore if you want a clearer next step.",
      bestFor: "Helpful community replies.",
    },
    {
      assetType: "whatsapp_message",
      platform: "WhatsApp",
      format: "community message",
      title: "Quick question - are you applying to jobs but not getting callbacks?",
      content:
        "Quick question - are you applying to jobs but not getting callbacks?\n\nCareerScore checks your career readiness and shows what gap to fix next.",
      cta: CAREERSCORE_CTA,
      bestFor: "Direct community sharing.",
    },
    {
      assetType: "seo_blog",
      platform: "SEO",
      format: "blog outline",
      title: "Before applying to 100 jobs, check your CareerScore.",
      content:
        "Before applying to 100 jobs, check your CareerScore.\n\nLearn what your resume, skills, and job-readiness profile may be missing.",
      blogOutline:
        "Intro: why no callbacks happen. Section 1: proof gaps. Section 2: skill-role match. Section 3: readiness score. CTA: check CareerScore.",
      cta: CAREERSCORE_CTA,
      bestFor: "Search traffic from high-intent job seekers.",
    },
    {
      assetType: "seo_blog",
      platform: "Blog",
      format: "article intro",
      title: "Why your resume may look complete but still miss proof",
      content:
        "A resume can look complete and still fail to prove readiness. CareerScore helps job seekers find the gap before sending another batch of applications.",
      cta: CAREERSCORE_CTA,
      bestFor: "Blog article draft intro.",
    },
    {
      assetType: "youtube_short_script",
      platform: "YouTube",
      format: "20-30 sec script",
      title: "Applying everywhere but no callbacks?",
      content: generateShortVideoScript().voiceover,
      shortVideoScript: JSON.stringify(generateShortVideoScript(), null, 2),
      cta: CAREERSCORE_CTA,
      bestFor: "YouTube Shorts and Reels testing.",
    },
    {
      assetType: "instagram_caption",
      platform: "Instagram/Facebook",
      format: "reel caption",
      title: "No callbacks? Find the gap first.",
      content:
        "No callbacks? Find the gap first. CareerScore shows your career readiness before your next application.",
      caption: "No callbacks? Check your CareerScore before applying again.",
      cta: CAREERSCORE_CTA,
      bestFor: "Short-form caption testing.",
    },
    {
      assetType: "facebook_post",
      platform: "Facebook",
      format: "post",
      title: "CareerScore is like a CIBIL score for career readiness.",
      content:
        "CareerScore is like a CIBIL score for career readiness. It helps you understand what your resume, skills, and job profile may be missing.",
      cta: CAREERSCORE_CTA,
      bestFor: "Community-friendly Facebook post.",
    },
    {
      assetType: "landing_page_copy",
      platform: "Landing Page",
      format: "headline test",
      title: "Know your CareerScore before the market judges your resume.",
      content: "Know your CareerScore before the market judges your resume.",
      landingCopy: "Know your CareerScore before the market judges your resume.",
      cta: CAREERSCORE_CTA,
      bestFor: "Hero headline test.",
    },
    {
      assetType: "referral_message",
      platform: "Referral",
      format: "share message",
      title: "Know someone applying to jobs but stuck?",
      content: "Know someone applying to jobs but stuck? Send them CareerScore.",
      referralCopy: "Know someone applying to jobs but stuck? Send them CareerScore.",
      cta: "Send CareerScore to one friend.",
      bestFor: "Referral and share loop.",
    },
    {
      assetType: "landing_page_copy",
      platform: "Landing Page",
      format: "pricing upsell",
      title: "Free score gives direction. Detailed report gives the fix.",
      content:
        "Start with a free CareerScore preview. Upgrade to the INR 99 detailed report or INR 199 advanced report when you want the gap, fix, and next move.",
      landingCopy:
        "Free score gives direction. INR 99 detailed report gives the gap, fix, and next move.",
      cta: CAREERSCORE_CTA,
      bestFor: "Pricing and upsell copy.",
    },
  ];

  logTiming("asset generation", startedAt);

  return assets;
}

export async function generateShortVideoBatch(projectId: string) {
  return (await generateContentBatch(projectId)).filter((asset) =>
    asset.assetType.includes("short"),
  );
}

export async function scoreContentBatch(projectId: string) {
  const context = await loadContext(projectId);
  const bottleneck = detectFunnelBottleneck({
    clicks: context.previousResults.clicks,
    signups: context.previousResults.signups,
    paidUsers: context.previousResults.paidUsers,
  });
  const assets = (await generateContentBatch(projectId)).map((asset) => ({
    ...asset,
    previousChannelScore:
      context.previousResults.clicks > 0 && asset.platform === "LinkedIn" ? 80 : 20,
    funnelBottleneck: bottleneck,
  }));

  return rankContentAssets(assets).slice(0, 12);
}

export async function qaContentBatch(projectId: string) {
  const scored = await scoreContentBatch(projectId);

  return scored.map((item) => ({
    ...item,
    qa: qaContentAsset({
      content: item.asset.content,
      cta: item.asset.cta,
      trackingLink: "/t/pending",
      platform: item.asset.platform,
    }),
  }));
}

export async function createPublishingQueue(projectId: string) {
  return publishOrQueue(projectId);
}

export async function publishOrQueue(projectId: string) {
  const startedAt = performance.now();
  const supabase = await createClient();
  const context = await loadContext(projectId);
  const productUrl = await ingestProductUrl(projectId);
  const { data: recentCycle } = await supabase
    .from("distribution_cycles")
    .select("created_at, queued_count, next_cycle_plan")
    .eq("project_id", projectId)
    .eq("owner_id", context.ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    recentCycle?.created_at &&
    new Date(recentCycle.created_at).toISOString().slice(0, 10) ===
      new Date().toISOString().slice(0, 10)
  ) {
    return {
      strategy: "Today's Distribution Engine cycle already exists.",
      approvedCount: recentCycle.queued_count,
      rejectedCount: 0,
      queuedCount: recentCycle.queued_count,
      nextPlan: recentCycle.next_cycle_plan,
    };
  }

  const strategy = await generateDistributionStrategy(projectId);
  const qaAssets = await qaContentBatch(projectId);
  const approved = qaAssets.filter((item) => item.qa.status === "approved").slice(0, 12);
  const rejected = qaAssets.filter((item) => item.qa.status === "rejected");

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      project_id: projectId,
      owner_id: context.ownerId,
      name: `${context.project.customer || "CareerScore"} Autonomous Distribution Cycle`,
      campaign_type: "linkedin_founder_post",
      status: "draft",
      next_action: "Approve top assets, post manually, then record results.",
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message || "Campaign could not be created.");
  }

  const campaignItems: CampaignItemInsert[] = approved.map(({ asset }) => {
    const distributionAsset = asset as DistributionAsset;

    return {
      campaign_id: campaign.id,
      project_id: projectId,
      owner_id: context.ownerId,
      campaign_type: campaignTypeForAsset(distributionAsset.assetType),
      channel: distributionAsset.platform,
      hook: distributionAsset.title,
      content: distributionAsset.content,
      target_audience: CAREERSCORE_AUDIENCE,
      cta: distributionAsset.cta,
      expected_outcome: distributionAsset.bestFor,
      utm_source: slug(distributionAsset.platform),
      utm_medium: "organic",
      utm_campaign: "autonomous-distribution",
      utm_content: slug(distributionAsset.title),
      utm_link: productUrl,
      status: "draft",
    };
  });

  const { data: insertedItems, error: itemError } = await supabase
    .from("campaign_items")
    .insert(campaignItems)
    .select("id, project_id, owner_id, utm_source, utm_medium, utm_campaign, utm_content");

  if (itemError || !insertedItems) {
    throw new Error(itemError?.message || "Distribution assets could not be created.");
  }

  const trackingRows = insertedItems.map((item) => {
    const trackingId = crypto.randomUUID();

    return {
      id: trackingId,
      project_id: item.project_id,
      owner_id: item.owner_id,
      campaign_item_id: item.id,
      destination_url: productUrl,
      utm_source: item.utm_source,
      utm_medium: item.utm_medium,
      utm_campaign: item.utm_campaign,
      utm_content: item.utm_content,
      tracking_url: `/t/${trackingId}`,
    };
  });

  const { error: trackingError } = await supabase.from("tracking_links").insert(trackingRows);

  if (trackingError) {
    throw new Error(trackingError.message);
  }

  const queueRows: PublisherQueueInsert[] = approved.map(({ asset, score, qa }, index) => {
    const distributionAsset = asset as DistributionAsset;

    return {
      project_id: projectId,
      owner_id: context.ownerId,
      campaign_item_id: insertedItems[index]?.id ?? null,
      platform: publisherPlatform(distributionAsset),
      content_type: distributionAsset.assetType,
      title: distributionAsset.title,
      content: distributionAsset.content,
      tracking_url: trackingRows[index]?.tracking_url || "",
      status: "ready_for_approval",
      asset_type: distributionAsset.assetType,
      format: distributionAsset.format,
      short_video_script: distributionAsset.shortVideoScript || "",
      blog_outline: distributionAsset.blogOutline || "",
      caption: distributionAsset.caption || "",
      landing_copy: distributionAsset.landingCopy || "",
      referral_copy: distributionAsset.referralCopy || "",
      quality_score: toSafeIntegerScore(score),
      qa_status: qa.status,
      qa_reason: qa.reason,
      predicted_rank_score: toSafeIntegerScore(score),
      publishing_status: "manual_approval_required",
      result_summary: "Waiting for publishing connection or manual approval.",
    };
  });

  const { error: queueError } = await supabase.from("publisher_queue").insert(queueRows);

  if (queueError) {
    throw new Error(queueError.message);
  }

  const results = await trackDistributionResults(projectId);
  const learning = await learnFromResults(projectId);
  const nextPlan = await generateNextCyclePlan(projectId);

  await supabase.from("distribution_cycles").insert({
    project_id: projectId,
    owner_id: context.ownerId,
    cycle_type: "manual",
    status: "completed",
    product_url: productUrl,
    strategy_summary: strategy,
    channels_selected: CHANNELS,
    content_created_count: qaAssets.length,
    content_approved_count: approved.length,
    content_rejected_count: rejected.length,
    published_count: 0,
    queued_count: queueRows.length,
    clicks: results.clicks,
    signups: results.signups,
    paid_users: results.paidUsers,
    revenue: results.revenue,
    learning_summary: learning,
    next_cycle_plan: nextPlan,
  });

  logTiming("distribution cycle", startedAt);

  return {
    strategy,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    queuedCount: queueRows.length,
    nextPlan,
  };
}

export async function trackDistributionResults(projectId: string) {
  return (await loadContext(projectId)).previousResults;
}

export async function learnFromResults(projectId: string) {
  const { previousResults } = await loadContext(projectId);
  const bottleneck = detectFunnelBottleneck({
    clicks: previousResults.clicks,
    signups: previousResults.signups,
    paidUsers: previousResults.paidUsers,
  });

  if (previousResults.latestLearning) {
    return previousResults.latestLearning;
  }

  if (previousResults.paidUsers > 0) {
    return "Paid users exist. Repeat the strongest channel and CTA.";
  }

  if (previousResults.clicks > 0) {
    return "Traffic exists. Improve landing page proof and offer clarity next.";
  }

  return bottleneckRecommendation(bottleneck);
}

export async function generateNextCyclePlan(projectId: string) {
  const { previousResults } = await loadContext(projectId);
  const bottleneck = detectFunnelBottleneck({
    clicks: previousResults.clicks,
    signups: previousResults.signups,
    paidUsers: previousResults.paidUsers,
  });

  if (previousResults.paidUsers > 0) {
    return "DistributionOS will create more LinkedIn fresher-shortlist posts and test referral copy next.";
  }

  if (previousResults.clicks > 0) {
    return "DistributionOS will improve landing-page proof and test WhatsApp community copy next.";
  }

  return `DistributionOS will ${bottleneckRecommendation(bottleneck).toLowerCase()} and test LinkedIn, Reddit, and WhatsApp next.`;
}

export async function runDistributionCycle(projectId: string) {
  const startedAt = performance.now();
  await ingestProductUrl(projectId);
  const result = await publishOrQueue(projectId);
  logTiming("total run", startedAt);
  return result;
}
