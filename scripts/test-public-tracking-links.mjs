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

const publicUrl = read("apps/web/lib/publicUrl.ts");
const repair = read("apps/web/lib/trackingLinkRepair.ts");
const actions = read("apps/web/app/actions.ts");
const autopilot = read("apps/web/app/projects/[id]/autopilot/page.tsx");
const campaigns = read("apps/web/app/projects/[id]/campaigns/page.tsx");
const socialShare = read("apps/web/app/projects/[id]/social-share/page.tsx");
const blogPublisher = read("apps/web/lib/blogPublisher.ts");
const publication = read("apps/web/app/publications/[slug]/page.tsx");
const revenueEngine = read("apps/web/lib/careerScoreRevenueEngine.ts");
const publisherQueue = read("apps/web/lib/publisherQueue.ts");
const scheduler = read("apps/web/lib/publishingScheduler.ts");

for (const marker of [
  "getPublicAppUrl",
  "NEXT_PUBLIC_APP_URL",
  "isProductionRuntime",
  "sanitizePublicTrackingUrl",
  "sanitizePostTrackingLinks",
  "sanitizePublicTrackingUrlWithWarning",
  "requirePublicAppUrlForGeneration",
  "getPublicUrlWarning",
  "productionPublicAppUrlForRepair",
  "https://distribution-os-web.vercel.app",
]) {
  ok(publicUrl.includes(marker), `public URL helper includes ${marker}`);
}

for (const localHost of ["localhost", "0\\.0\\.0\\.0", "127\\.0\\.0\\.1", "192\\.168"]) {
  ok(publicUrl.includes(localHost), `public URL helper detects ${localHost}`);
}

ok(
  publicUrl.includes("(\\/t\\/[A-Za-z0-9_-]+") || publicUrl.includes("/t/[A-Za-z0-9_-]+"),
  "tracking ID path is preserved",
);
ok(publicUrl.includes("(?:\\?[^)\\s]*)?"), "tracking query params are preserved");
ok(
  publicUrl.includes('return "http://localhost:3001"'),
  "local development can still use localhost",
);
ok(
  publicUrl.includes("NEXT_PUBLIC_APP_URL is required in production"),
  "production blocks generation if NEXT_PUBLIC_APP_URL is missing",
);
ok(
  publicUrl.includes("if (isProductionRuntime())") && publicUrl.includes('return ""'),
  "production never falls back to request origin",
);

for (const table of [
  "tracking_links",
  "publisher_queue",
  "scheduled_posts",
  "campaign_items",
  "autopilot_runs",
  "daily_autopilot_runs",
]) {
  ok(repair.includes(table), `legacy repair updates ${table}`);
}

for (const field of [
  "tracking_url",
  "content",
  "published_url",
  "posted_url",
  "short_video_script",
  "blog_outline",
  "caption",
  "landing_copy",
  "referral_copy",
  "work_created",
]) {
  ok(repair.includes(field), `legacy repair covers ${field}`);
}

ok(actions.includes("repairLegacyLocalTrackingLinks"), "Run Autopilot repairs old saved links");
ok(actions.includes("requirePublicAppUrlForGeneration"), "new generation requires public app URL");
ok(
  autopilot.includes("Local tracking links detected. Run link repair before posting."),
  "Autopilot warning exists",
);
ok(autopilot.includes("sanitizePostTrackingLinks"), "scheduled work output sanitizes post links");
ok(campaigns.includes("sanitizePostTrackingLinks"), "campaign output sanitizes post links");
ok(socialShare.includes("sanitizePostTrackingLinks"), "social share output sanitizes post links");
ok(blogPublisher.includes("sanitizePostTrackingLinks"), "blog CTA/content has no local URLs");
ok(publication.includes("sanitizePostTrackingLinks"), "public blog page sanitizes content links");
ok(
  revenueEngine.includes("sanitizePublicTrackingUrl"),
  "revenue campaign assets sanitize tracking links",
);
ok(
  publisherQueue.includes("sanitizePublicTrackingUrl"),
  "manual share queue sanitizes tracking links",
);
ok(scheduler.includes("sanitizePublicTrackingUrl"), "scheduled work rows sanitize tracking links");

if (failures.length > 0) {
  console.error("\nPublic tracking link QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nPublic tracking link QA passed.");
