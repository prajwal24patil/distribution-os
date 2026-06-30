import { qaContentAsset } from "@/lib/qaAgent";
import { sanitizeCareerScoreCopy, sanitizeCareerScoreTitle } from "@/lib/careerScoreCopy";
import { sanitizePostTrackingLinks, sanitizePublicTrackingUrl } from "@/lib/publicUrl";
import { generateShortVideoScript } from "@/lib/shortVideoEngine";
import type { CampaignType } from "@/lib/supabase/types";

export const GO_AUTOPILOT_ANGLES = [
  "no callback",
  "resume not shortlisted",
  "fresher gap",
  "data analyst roadmap",
  "MNC readiness",
  "salary growth",
  "AI-proof career",
  "before applying again",
];

export type DailyFactoryAsset = {
  assetType: string;
  platform: string;
  campaignType: CampaignType;
  title: string;
  content: string;
  cta: string;
  targetAudience: string;
  expectedOutcome: string;
  format: string;
  angle: string;
  shortVideoScript?: string;
  blogOutline?: string;
  caption?: string;
  referralCopy?: string;
};

export type GuardedFactoryAsset = DailyFactoryAsset & {
  finalContent: string;
  trackingUrl: string;
  qaStatus: "approved" | "rejected";
  qaReason: string;
  qualityScore: number;
  predictedRankScore: number;
};

const TRACKING_TOKEN = "{tracking_link}";
const AUDIENCE =
  "Indian freshers, job seekers, students, career switchers, and early professionals";
const CTA = `Check your CareerScore before applying again: ${TRACKING_TOKEN}`;

function text(lines: string[]) {
  return lines.join("\n\n");
}

function asset({
  assetType,
  platform,
  campaignType = "linkedin_founder_post",
  title,
  content,
  cta = CTA,
  expectedOutcome,
  format,
  angle,
  shortVideoScript,
  blogOutline,
  caption,
  referralCopy,
}: Omit<DailyFactoryAsset, "targetAudience" | "campaignType" | "cta"> & {
  campaignType?: CampaignType;
  cta?: string;
}) {
  return {
    assetType,
    platform,
    campaignType,
    title,
    content,
    cta,
    targetAudience: AUDIENCE,
    expectedOutcome,
    format,
    angle,
    shortVideoScript,
    blogOutline,
    caption,
    referralCopy,
  };
}

export function createShortVideoScriptAgent({
  angle,
  trackingUrl = TRACKING_TOKEN,
}: {
  angle: string;
  trackingUrl?: string;
}) {
  const script = generateShortVideoScript({ angle, trackingLink: trackingUrl });

  return {
    hook: script.hook,
    script: [script.problem, script.insight, script.cta].join(" "),
    scene_outline: script.shotList.join(" | "),
    voiceover: script.voiceover,
    caption: script.caption,
    hashtags: script.hashtags.join(" "),
    cta: script.cta,
    tracking_link: trackingUrl,
  };
}

export function createDailyContentFactory() {
  const videoOne = createShortVideoScriptAgent({
    angle: "Most freshers don't know why they are not getting shortlisted",
  });
  const videoTwo = createShortVideoScriptAgent({
    angle: "Before applying again, check the gap first",
  });

  return [
    asset({
      assetType: "linkedin_post",
      platform: "LinkedIn",
      title: "Most freshers don't know why they're not getting shortlisted.",
      content: text([
        "Most freshers don't know why they're not getting shortlisted.",
        "They keep applying, but the gap may be proof, role fit, or positioning.",
        "CareerScore helps job seekers check career readiness before applying again.",
        CTA,
      ]),
      expectedOutcome: "Founder-led LinkedIn post for comments and profile visits.",
      format: "founder post",
      angle: "no callback",
    }),
    asset({
      assetType: "linkedin_post",
      platform: "LinkedIn",
      title: "Your resume may be complete but still not convincing.",
      content: text([
        "A resume can look complete and still fail to prove readiness.",
        "CareerScore helps job seekers spot missing proof, weak positioning, and skill gaps before the next application.",
        CTA,
      ]),
      expectedOutcome: "LinkedIn education post for resume-not-shortlisted pain.",
      format: "education post",
      angle: "resume not shortlisted",
    }),
    asset({
      assetType: "linkedin_post",
      platform: "LinkedIn",
      title: "Before applying again, check the gap first.",
      content: text([
        "Before applying again, check the gap first.",
        "CareerScore works like a readiness check for your resume, skills, and job profile.",
        "It helps you understand what to fix before sending another batch of applications.",
        CTA,
      ]),
      expectedOutcome: "LinkedIn CTA post for CareerScore trials.",
      format: "founder CTA",
      angle: "before applying again",
    }),
    ...[
      ["No callbacks after applying? Check the gap first.", "no callback"],
      ["Resume not shortlisted? It may be missing proof.", "resume not shortlisted"],
      ["Freshers need proof, not just effort.", "fresher gap"],
      ["Data analyst roadmap: check readiness before applying.", "data analyst roadmap"],
      ["MNC readiness starts before the application.", "MNC readiness"],
    ].map(([title, angle]) =>
      asset({
        assetType: "x_post",
        platform: "X",
        title,
        content: `${title}\n\nCareerScore helps job seekers find the readiness gap before applying again.\n\n${CTA}`,
        expectedOutcome: "Short X post for fast hook testing.",
        format: "short post",
        angle,
      }),
    ),
    asset({
      assetType: "x_thread",
      platform: "X",
      title: "5 reasons freshers apply but don't get callbacks",
      content: text([
        "Thread: 5 reasons freshers apply but don't get callbacks.",
        "1. Resume has tasks but no proof.",
        "2. Skills don't map clearly to the role.",
        "3. Projects don't show outcomes.",
        "4. Positioning is too generic.",
        "5. No readiness check before applying.",
        `CareerScore helps you find the gap: ${TRACKING_TOKEN}`,
      ]),
      expectedOutcome: "X thread for saves and profile visits.",
      format: "thread",
      angle: "fresher gap",
    }),
    asset({
      assetType: "seo_blog",
      platform: "Blog",
      campaignType: "seo_blog",
      title: "Before applying to 100 jobs, check your CareerScore.",
      content: text([
        "Before applying to 100 jobs, check your CareerScore.",
        "Many job seekers apply repeatedly without knowing whether the issue is resume proof, skill-role match, or unclear positioning.",
        "CareerScore helps you check career readiness before applying again.",
        CTA,
      ]),
      blogOutline:
        "Intro: why no callbacks happen. Section 1: resume proof. Section 2: skills and role fit. Section 3: readiness score. CTA: check CareerScore.",
      expectedOutcome: "SEO article for high-intent job seekers.",
      format: "SEO blog",
      angle: "before applying again",
    }),
    ...[
      ["Reddit helpful reply: applying a lot but no responses", "reddit"],
      ["Reddit helpful reply: data analyst applications", "reddit"],
    ].map(([title]) =>
      asset({
        assetType: "reddit_reply",
        platform: "Reddit",
        campaignType: "reddit_community_reply",
        title,
        content: text([
          "If you're applying a lot but not getting responses, the problem may not be effort.",
          "It may be positioning, missing proof, or unclear skill match.",
          "I built CareerScore to help people see their career readiness score and the next gaps to fix.",
          `Link: ${TRACKING_TOKEN}`,
        ]),
        cta: `Helpful link if you want to check the gap: ${TRACKING_TOKEN}`,
        expectedOutcome: "Helpful community reply without spam or fake proof.",
        format: "community reply",
        angle: "no callback",
      }),
    ),
    ...[
      ["Quora answer: why am I not getting shortlisted?", "resume not shortlisted"],
      ["Quora answer: how can freshers become MNC-ready?", "MNC readiness"],
    ].map(([title, angle]) =>
      asset({
        assetType: "quora_answer",
        platform: "Quora",
        title,
        content: text([
          "The reason is often not one thing. It can be resume proof, project quality, role fit, or unclear positioning.",
          "CareerScore helps job seekers check readiness and understand what gap to fix next.",
          CTA,
        ]),
        expectedOutcome: "Helpful long-tail answer draft.",
        format: "answer draft",
        angle,
      }),
    ),
    ...[
      "Quick question - are you applying to jobs but not getting callbacks?",
      "Before applying again, check your CareerScore.",
    ].map((title) =>
      asset({
        assetType: "whatsapp_message",
        platform: "WhatsApp",
        campaignType: "whatsapp_community_share",
        title,
        content: text([
          title,
          "CareerScore checks your career readiness and shows what gap to fix next.",
          `Try it here: ${TRACKING_TOKEN}`,
        ]),
        expectedOutcome: "Community share that is easy to copy manually.",
        format: "community message",
        angle: "no callback",
      }),
    ),
    ...[
      ["No callbacks? Find the gap first.", "no callback"],
      ["AI-proof your career starts with knowing your readiness.", "AI-proof career"],
    ].map(([title, angle]) =>
      asset({
        assetType: "instagram_caption",
        platform: "Instagram",
        title,
        content: `${title}\n\nCareerScore helps you check your resume, skills, and job readiness before applying again.\n\n${CTA}`,
        caption: `${title} Check your CareerScore before applying again.`,
        expectedOutcome: "Short caption for Reel or carousel posting.",
        format: "caption",
        angle,
      }),
    ),
    asset({
      assetType: "youtube_short_script",
      platform: "YouTube",
      title: "Applying everywhere but no callbacks?",
      content: JSON.stringify(videoOne, null, 2),
      shortVideoScript: JSON.stringify(videoOne, null, 2),
      caption: videoOne.caption,
      expectedOutcome: "20-30 second YouTube Shorts script.",
      format: "short video script",
      angle: "no callback",
    }),
    asset({
      assetType: "youtube_short_script",
      platform: "YouTube",
      title: "Check your gap before applying again.",
      content: JSON.stringify(videoTwo, null, 2),
      shortVideoScript: JSON.stringify(videoTwo, null, 2),
      caption: videoTwo.caption,
      expectedOutcome: "20-30 second YouTube Shorts script.",
      format: "short video script",
      angle: "before applying again",
    }),
    asset({
      assetType: "google_business_post",
      platform: "Google Business",
      title: "Before applying again, check your CareerScore.",
      content: text([
        "Job seekers apply repeatedly but don't know why they are not getting shortlisted.",
        "CareerScore helps you check readiness and fix the next gap before applying again.",
        CTA,
      ]),
      expectedOutcome: "Google post draft for branded search visitors.",
      format: "business post draft",
      angle: "before applying again",
    }),
    asset({
      assetType: "email_draft",
      platform: "Email",
      title: "Before your next application, check this",
      content: text([
        "Subject: Before your next application, check this",
        "If you're applying but not getting callbacks, the gap may be proof, skill match, or positioning.",
        "CareerScore helps you check your readiness and see what to fix next.",
        CTA,
      ]),
      expectedOutcome: "Manual email draft for opted-in users only.",
      format: "email draft",
      angle: "before applying again",
    }),
    asset({
      assetType: "referral_post",
      platform: "Referral",
      campaignType: "referral_campaign",
      title: "Know someone applying to jobs but stuck?",
      content: `Know someone applying to jobs but stuck? Send them CareerScore.\n\n${CTA}`,
      cta: `Share CareerScore with one friend: ${TRACKING_TOKEN}`,
      referralCopy: "Know someone applying to jobs but stuck? Send them CareerScore.",
      expectedOutcome: "Referral/share loop test.",
      format: "referral post",
      angle: "salary growth",
    }),
  ];
}

export function applyTrackingToAsset(asset: DailyFactoryAsset, trackingUrl: string) {
  const safeUrl = sanitizePublicTrackingUrl(trackingUrl);
  const content = sanitizePostTrackingLinks(
    sanitizeCareerScoreCopy(asset.content).replaceAll(TRACKING_TOKEN, safeUrl),
  );

  return {
    ...asset,
    title: sanitizeCareerScoreTitle(asset.title, `${asset.platform} ${asset.assetType}`),
    content,
    cta: asset.cta.replaceAll(TRACKING_TOKEN, safeUrl),
    trackingUrl: safeUrl,
  };
}

export function runSpamRiskGuard(
  asset: DailyFactoryAsset,
  trackingUrl: string,
): GuardedFactoryAsset {
  const tracked = applyTrackingToAsset(asset, trackingUrl);
  const repeated = /(guaranteed|100% placement|fake proof|dm everyone|spam|scrape)/i.test(
    tracked.content,
  );
  const qa = repeated
    ? { status: "rejected" as const, reason: "Blocked by Spam/Risk Guard." }
    : qaContentAsset({
        content: tracked.content,
        cta: tracked.cta,
        trackingLink: tracked.trackingUrl,
        platform: tracked.platform,
      });
  const platformBoost = /linkedin|x|blog|whatsapp/i.test(tracked.platform) ? 8 : 0;
  const qualityScore = qa.status === "approved" ? 82 + platformBoost : 20;

  return {
    ...asset,
    title: tracked.title,
    finalContent: tracked.content,
    cta: tracked.cta,
    trackingUrl: tracked.trackingUrl,
    qaStatus: qa.status,
    qaReason: qa.reason,
    qualityScore,
    predictedRankScore: qualityScore,
  };
}

export function summarizeFactoryMix(assets = createDailyContentFactory()) {
  return {
    linkedin_posts: assets.filter((asset) => asset.assetType === "linkedin_post").length,
    x_posts: assets.filter((asset) => asset.assetType === "x_post").length,
    x_threads: assets.filter((asset) => asset.assetType === "x_thread").length,
    seo_blogs: assets.filter((asset) => asset.assetType === "seo_blog").length,
    reddit_drafts: assets.filter((asset) => asset.assetType === "reddit_reply").length,
    quora_drafts: assets.filter((asset) => asset.assetType === "quora_answer").length,
    whatsapp_messages: assets.filter((asset) => asset.assetType === "whatsapp_message").length,
    instagram_captions: assets.filter((asset) => asset.assetType === "instagram_caption").length,
    youtube_scripts: assets.filter((asset) => asset.assetType === "youtube_short_script").length,
    google_posts: assets.filter((asset) => asset.assetType === "google_business_post").length,
    email_drafts: assets.filter((asset) => asset.assetType === "email_draft").length,
    referral_posts: assets.filter((asset) => asset.assetType === "referral_post").length,
  };
}
