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
const actions = read("apps/web/app/actions.ts");
const autopilotData = read("apps/web/lib/autopilotData.ts");
const debugRoute = read("apps/web/app/api/debug/platform-status/route.ts");
const social = read("apps/web/lib/socialDeploymentEngine.ts");
const share = read("apps/web/app/projects/[id]/social-share/page.tsx");
const autopilotPage = read("apps/web/app/projects/[id]/autopilot/page.tsx");
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
ok(go.includes("published_count: summary.publishedCount"), "published_count uses successful publish count");
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
ok(worker.includes("updatePostFailed"), "worker saves X failures as failed");
ok(xAdapter.includes("X API publish failed (${response.status})"), "X adapter saves API status");
ok(xAdapter.includes("responseBody.slice(0, 500)"), "X adapter saves safe API failure body");
ok(xAdapter.includes('status: "failed"'), "X adapter returns failed for API failure");
ok(actions.includes("testXPublishAction"), "Autopilot has direct Test X Publish action");
ok(actions.includes("X_SMOKE_POST_TEMPLATE"), "Test X Publish uses fixed smoke post content");
ok(actions.includes("publishXPost(post, connection)"), "Test X Publish calls X adapter directly");
ok(actions.includes("published_at: publishedAt"), "Test X Publish saves published_at on success");
ok(actions.includes("published_url: publishResult.publishedUrl"), "Test X Publish saves published URL");
ok(actions.includes('status: "failed"'), "Test X Publish saves failed status on failure");
ok(actions.includes("failure_reason: failureReason"), "Test X Publish saves exact failure reason");
ok(autopilotData.includes("XPublishDiagnostics"), "Autopilot data includes X diagnostics");
ok(autopilotData.includes("xPublishAttempted"), "Autopilot data exposes X publish attempted");
ok(autopilotPage.includes("Test X Publish"), "Autopilot page shows Test X Publish button");
ok(autopilotPage.includes("X connected"), "Autopilot page shows X connected diagnostic");
ok(autopilotPage.includes("X auto-publish ready"), "Autopilot page shows X ready diagnostic");
ok(autopilotPage.includes("X assets found"), "Autopilot page shows X asset count");
ok(autopilotPage.includes("X publish attempted"), "Autopilot page shows X attempt diagnostic");
ok(autopilotPage.includes("X failure reason"), "Autopilot page shows exact X failure reason");
ok(autopilotPage.includes("X published URL"), "Autopilot page shows X published URL");
ok(debugRoute.includes("latestXResult ?? scheduledResult"), "debug prefers X result over manual rows");
ok(debugRoute.includes("x_publish_attempted"), "debug shows X publish attempted");
ok(debugRoute.includes("x_publish_status"), "debug shows X publish status");
ok(debugRoute.includes("x_failure_reason"), "debug shows X failure reason");
ok(debugRoute.includes("x_published_url"), "debug shows X published URL");
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
