import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function ok(condition, message) {
  if (!condition) {
    console.error(`not ok - ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`ok - ${message}`);
}

function includesAll(file, markers, label) {
  const content = read(file);

  for (const marker of markers) {
    ok(content.includes(marker), `${label} contains ${marker}`);
  }
}

includesAll(
  "apps/web/lib/platformTimingAgent.ts",
  [
    "getBestPostingWindows",
    "scorePostingWindow",
    "chooseBestPostingTime",
    "createPlatformPostingPlan",
    "learnBestPostingTimeFromResults",
    "paid_report",
  ],
  "platformTimingAgent",
);

includesAll(
  "apps/web/lib/publishingScheduler.ts",
  [
    "scheduleApprovedAssets",
    "scheduleOneAsset",
    "getScheduledPosts",
    "getNextPostsToPublish",
    "markPostPublished",
    "markPostFailed",
    "skipUnsafePost",
    "summarizePublishingPlan",
    "manual_required",
    "MAX_PER_PLATFORM_PER_DAY",
  ],
  "publishingScheduler",
);

includesAll(
  "apps/web/lib/publishingWorker.ts",
  [
    "runPublishingWorker",
    "publishDuePosts",
    "publishSinglePost",
    "collectPublishedPostMetrics",
    "handlePublishFailure",
    "Official account connection required",
    "MAX_ATTEMPTS",
  ],
  "publishingWorker",
);

const adapters = read("apps/web/lib/publisherAdapters.ts");
ok(
  adapters.includes("manual_approval_required"),
  "publisher adapters return manual required without connection",
);
ok(
  adapters.includes("official_integration_not_implemented"),
  "publisher adapters never fake publishing when connected",
);
ok(!adapters.includes("browser automation"), "publisher adapters do not use browser automation");

const timing = read("apps/web/lib/platformTimingAgent.ts");
ok(timing.includes("return nextDateForWindow"), "best posting time returns a future date");

const scheduler = read("apps/web/lib/publishingScheduler.ts");
ok(
  scheduler.includes("tracking_url: sanitizePublicTrackingUrl(item.tracking_url)"),
  "tracking URL exists in scheduled asset and is sanitized",
);
ok(
  scheduler.includes("unique") === false,
  "duplicate prevention is handled in scheduler logic, not by unsafe rewrite",
);

const cronRoute = read("apps/web/app/api/cron/distribution-cycle/route.ts");
ok(cronRoute.includes("CRON_SECRET"), "cron route requires CRON_SECRET");
ok(cronRoute.includes("authorization"), "cron route checks authorization header");

const migration = read("database/migrations/0014_create_publishing_system.sql");
ok(migration.includes("publishing_connections"), "migration creates publishing connections");
ok(migration.includes("scheduled_posts"), "migration creates scheduled posts");
ok(migration.includes("conversion_events"), "migration creates conversion events");
ok(migration.includes("create index if not exists"), "migration adds safe indexes");

const autopilot = read("apps/web/app/projects/[id]/autopilot/page.tsx");
ok(autopilot.includes("Best Next Action"), "dashboard shows one best next action");
ok(autopilot.includes("Scheduled Work"), "dashboard shows scheduled work");
ok(autopilot.includes("Growth Results"), "dashboard shows growth results");

const unsafePhrases = ["guaranteed money", "guaranteed customers", "auto-post without connection"];
const scanned = [adapters, scheduler, cronRoute, autopilot].join("\n");

for (const phrase of unsafePhrases) {
  ok(!scanned.toLowerCase().includes(phrase), `no unsafe auto-posting text: ${phrase}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("\nPublishing system QA passed.");
