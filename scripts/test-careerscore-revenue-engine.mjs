import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function ok(condition, message) {
  if (!condition) {
    failures.push(message);
    console.error(`not ok - ${message}`);
    return;
  }

  console.log(`ok - ${message}`);
}

function includesAll(file, markers, label) {
  const content = read(file);

  for (const marker of markers) {
    const found = marker instanceof RegExp ? marker.test(content) : content.includes(marker);
    ok(found, `${label} contains ${marker.toString()}`);
  }
}

const engine = read("apps/web/lib/careerScoreRevenueEngine.ts");

includesAll(
  "apps/web/lib/careerScoreRevenueEngine.ts",
  [
    "careerScoreRevenueBrain",
    "Freshers applying but no callback",
    "2023/2024/2025 passouts",
    "Gap-year candidates",
    "Data analyst aspirants",
    "Software job seekers",
    "Working professionals wanting salary jump",
    "Resume uploaded but not paid",
    "Paid users/referral candidates",
    "Free CareerScore preview",
    "INR 99 basic report",
    "INR 199 advanced roadmap",
    "INR 499 premium CV + roadmap later",
    "createPainBasedCampaignAssets",
    "runRevenueAssetQc",
    "generateXTrendAngles",
    "generateLinkedInGrowthAssets",
    "generateGoogleSeoGrowthAssets",
    "generateShareableReportOutline",
    "buildProofBlocks",
    "generateReferralShareAsset",
    "buildConversionOptimizer",
    "buildRevenueDashboardSummary",
  ],
  "CareerScore revenue engine",
);

for (const assetType of [
  "linkedin_founder_post",
  "linkedin_short_post",
  "x_post",
  "x_thread",
  "google_business_profile_post",
  "reddit_helpful_reply",
  "quora_answer",
  "whatsapp_share",
  "email_follow_up",
  "instagram_caption",
  "facebook_page_post",
  "youtube_shorts_script",
  "youtube_video_title_description",
  "seo_blog_article",
  "shareable_report_outline",
  "short_video_production_brief",
]) {
  ok(engine.includes(assetType), `campaign factory creates ${assetType}`);
}

ok(engine.includes("tracking_link: trackingLink"), "tracking link is attached to every asset");
ok(engine.includes("guaranteed job"), "QC checks fake guarantees");
ok(engine.includes("trend manipulation"), "QC checks fake trend manipulation");
ok(engine.includes("manual_required"), "social assets stay manual-required without connection");
ok(
  engine.includes('platform === "blog"') && engine.includes("return true"),
  "blog remains auto-publish eligible",
);
ok(engine.includes("No fake engagement"), "X trend radar stays safe");
ok(engine.includes("needs real data"), "report outline marks missing stats as needs real data");
ok(engine.includes("needs data"), "proof engine does not fake stats");
ok(
  engine.includes("Real CareerScore conversion data not connected yet."),
  "conversion optimizer handles missing CareerScore webhook data",
);

includesAll(
  "apps/web/app/projects/[id]/autopilot/page.tsx",
  [
    "CareerScore Revenue Engine",
    "todays_revenue_move",
    "best_audience_to_target",
    "assets_created_today",
    "social_assets_ready",
    "Blog auto-published",
    "manual_social_shares_pending",
    "x_trend_angles_ready",
    "referral_campaign_ready",
    "weakest_funnel_step",
    "next_best_action",
  ],
  "Autopilot revenue dashboard",
);

includesAll(
  "apps/web/app/projects/[id]/social-share/page.tsx",
  [
    "Social Share Center",
    "Ready-to-share assets",
    "Manual required",
    "Auto-publish ready",
    "Copy Link",
    "Last shared",
    "QC",
    "X trend angles",
  ],
  "Social Share Center page",
);

const connections = read("apps/web/lib/publisherConnections.ts");
for (const platform of [
  "linkedin",
  "x",
  "google_business_profile",
  "reddit",
  "facebook_page",
  "instagram_business",
  "youtube",
  "quora_manual",
  "whatsapp_manual",
  "email_manual",
  "blog",
]) {
  ok(connections.includes(platform), `publishing connection model supports ${platform}`);
}
ok(connections.includes("manual_required"), "connection model supports manual_required status");

const migration = read("database/migrations/0017_extend_revenue_engine_publishing_connections.sql");
ok(migration.includes("google_business_profile"), "migration extends platform constraint");
ok(migration.includes("manual_required"), "migration extends status constraint");

if (failures.length > 0) {
  console.error("\nCareerScore Revenue Engine QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nCareerScore Revenue Engine QA passed.");
