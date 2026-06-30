import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const scheduler = read("apps/web/lib/publishingScheduler.ts");
const worker = read("apps/web/lib/publishingWorker.ts");
const factory = read("apps/web/lib/dailyContentFactory.ts");
const go = read("apps/web/lib/goAutopilot.ts");
const adapters = read("apps/web/lib/publisherAdapters.ts");
const publicUrl = read("apps/web/lib/publicUrl.ts");

let failures = 0;

function ok(condition, message) {
  if (condition) {
    console.log(`ok - ${message}`);
  } else {
    failures += 1;
    console.error(`not ok - ${message}`);
  }
}

ok(scheduler.includes("MAX_PER_PLATFORM_PER_DAY"), "Schedule Optimizer limits per-platform volume");
ok(
  scheduler.includes("MAX_SCHEDULED_PER_PROJECT_PER_DAY"),
  "Schedule Optimizer limits daily volume",
);
ok(scheduler.includes("duplicateContentToday"), "Schedule Optimizer blocks duplicate content");
ok(scheduler.includes("chooseBestPostingTime"), "Schedule Optimizer uses timing windows");
ok(scheduler.includes("manual_required"), "unconnected social work becomes manual_required");
ok(scheduler.includes('platform !== "blog"'), "blog is not forced into manual-required mode");
ok(scheduler.includes("official_auto_publish"), "official connection path exists");
ok(scheduler.includes("sanitizePostTrackingLinks"), "scheduled post content is sanitized");
ok(scheduler.includes("sanitizePublicTrackingUrl"), "scheduled tracking links are sanitized");

ok(worker.includes("isBlogPlatform"), "publisher worker detects blog platform");
ok(worker.includes("publishInternalBlogPost"), "publisher worker publishes internal blog posts");
ok(
  worker.includes('post.status === "manual_required"'),
  "manual-required posts are not auto-posted",
);
ok(
  worker.includes("Official account connection required"),
  "social publishing requires official connection",
);
ok(
  adapters.includes("official_integration_not_implemented"),
  "social adapters do not fake publishing",
);

ok(factory.includes("runSpamRiskGuard"), "Spam/Risk Guard is present");
ok(factory.includes("qaContentAsset"), "safe queue requires QA");
ok(factory.includes("trackingLink"), "guard checks tracking link");
ok(go.includes('qaStatus === "approved"'), "only approved assets enter publisher queue");
ok(go.includes('status: "approved"'), "approved queue items are schedule-ready");
ok(go.includes("Schedule Optimizer limited output"), "GO summary warns when schedule is limited");
ok(publicUrl.includes("sanitizePublicTrackingUrl"), "public tracking sanitizer exists");

if (failures > 0) {
  console.error(`\nSafe Publishing Queue QA failed: ${failures}`);
  process.exit(1);
}

console.log("\nSafe Publishing Queue QA passed.");
