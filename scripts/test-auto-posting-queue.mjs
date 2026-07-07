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

const packageJson = JSON.parse(read("package.json"));
ok(packageJson.scripts["test:auto-posting-queue"], "npm script test:auto-posting-queue exists");

const go = read("apps/web/lib/goAutopilot.ts");
const scheduler = read("apps/web/lib/publishingScheduler.ts");
const worker = read("apps/web/lib/publishingWorker.ts");
const xAdapter = read("apps/web/lib/xPublisherAdapter.ts");
const social = read("apps/web/lib/socialDeploymentEngine.ts");
const share = read("apps/web/app/projects/[id]/social-share/page.tsx");
const migration = read("database/migrations/0020_create_official_social_oauth_foundation.sql");
const dailyFactory = read("apps/web/lib/dailyContentFactory.ts");
const types = read("apps/web/lib/supabase/types.ts");

ok(go.includes("queuePublishingStatus"), "GO Autopilot routes assets by connection status");
ok(
  go.includes("manual_required_upload_ready_package"),
  "GO Autopilot marks video packages manual upload-ready",
);
ok(go.includes('connection.platform === "x"'), "GO Autopilot checks X connection");
ok(go.includes("xConnected"), "GO Autopilot detects connected X account");
ok(go.includes("xAssetsFound"), "GO Autopilot counts approved X assets");
ok(go.includes('platform: "x"'), "GO Autopilot prioritizes due X publishing");
ok(go.includes("x_publish_attempted"), "GO Autopilot logs safe X publish attempt status");
ok(go.includes("publishedCount"), "GO Autopilot counts all successful publishes");
ok(go.includes("auto_publish_ready"), "GO Autopilot can mark X/blog auto-publish ready");
ok(go.includes("manual_approval_required"), "GO Autopilot keeps unconnected platforms manual");
ok(
  go.includes("manualInstructionsFor"),
  "GO Autopilot saves manual instructions in result summary",
);
ok(scheduler.includes('platform === "x"'), "scheduler treats X as official API platform");
ok(
  scheduler.includes('platform === "x" && officialReady'),
  "scheduler makes connected X posts due for immediate official publishing",
);
ok(scheduler.includes("manual_review_required"), "scheduler routes risky assets to manual review");
ok(worker.includes("platform?: PublishingConnectionPlatform"), "worker supports platform filter");
ok(worker.includes("query.eq(\"platform\", filters.platform)"), "worker can publish due X posts first");
ok(
  worker.includes("platform: normalizePlatform(post.platform)"),
  "worker returns platform in publish result",
);
ok(xAdapter.includes("X API publish failed (${response.status})"), "X adapter saves API status");
ok(xAdapter.includes("responseBody.slice(0, 500)"), "X adapter saves safe API failure body");
ok(types.includes('"retry_scheduled"'), "scheduler type supports retry scheduled");
ok(
  social.includes('connection?.connection_status === "rate_limited"'),
  "queue blocks rate-limited platforms",
);
ok(social.includes("tracking_link"), "queue keeps tracking link");
ok(social.includes("manual_instructions"), "queue includes manual instructions");
ok(share.includes("Auto-post"), "Social Share Center shows auto-post state");
ok(share.includes("Published URL"), "Social Share Center shows published URL");
ok(share.includes("Copy Post"), "Social Share Center keeps copy button");
ok(share.includes("Retry"), "Social Share Center shows retry control");
ok(dailyFactory.includes("thumbnail_text"), "video package includes thumbnail text");
ok(
  migration.includes("social_publish_queue_project_owner_status_idx"),
  "queue migration adds owner/status index",
);
ok(migration.includes("manual_review_required"), "migration allows manual review status");
ok(migration.includes("retry_scheduled"), "migration allows retry scheduled status");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("\nAuto-posting queue QA passed.");
