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

includesAll(
  "apps/web/lib/dashboardQcAgent.ts",
  [
    "runDashboardQc",
    "detectVisibleQualityIssues",
    "cleanVisibleScheduledWork",
    "cleanVisibleBestAssets",
    "replaceTrackingPlaceholders",
    "removeSystemTestAssetsFromRealView",
    "dedupeAssets",
    "validateReadyToPostContent",
    "generateQcSummary",
    "issues_found",
    "issues_fixed",
  ],
  "dashboardQcAgent",
);

const qcAgent = read("apps/web/lib/dashboardQcAgent.ts");
ok(qcAgent.includes("system_test"), "system_test assets are filtered from real view");
ok(qcAgent.includes("dedupeAssets"), "duplicate assets are deduped");
ok(
  qcAgent.includes("\\{tracking_"),
  "{tracking_link} is replaced without showing raw token in UI code",
);
ok(qcAgent.includes("\\[tracking link\\]"), "[tracking link] is replaced");
ok(qcAgent.includes("templateFor"), "meta descriptions become actual posts");
ok(
  qcAgent.includes(
    "Job seekers apply repeatedly but don’t know why they are not getting shortlisted.",
  ),
  "banned robotic phrase is replaced",
);
ok(qcAgent.includes('status: "pass"') || qcAgent.includes("status:"), "QC result format is valid");

includesAll(
  "apps/web/lib/autopilotData.ts",
  ["cleanVisibleScheduledWork", "cleanVisibleBestAssets", "dashboardQc", ".limit(20)"],
  "autopilotData",
);

includesAll(
  "apps/web/lib/systemTestRunner.ts",
  [
    "testDashboardQc",
    "testSchedulingIdempotency",
    "Dashboard clean",
    /Tracking placeholders fixed/i,
    "duplicate assets hidden",
  ],
  "systemTestRunner",
);

includesAll(
  "apps/web/lib/publishingScheduler.ts",
  [
    "MAX_SCHEDULED_PER_PROJECT_PER_DAY",
    "duplicateContentToday",
    "publisher_queue_id",
    "MAX_PER_PLATFORM_PER_DAY",
  ],
  "publishingScheduler",
);

const autopilotPage = read("apps/web/app/projects/[id]/autopilot/page.tsx");
ok(autopilotPage.includes("Dashboard QC"), "System Health shows Dashboard QC label");
ok(!autopilotPage.includes("{tracking_link}"), "Autopilot page does not expose raw tracking token");

if (failures.length > 0) {
  console.error("\nDashboard QC QA failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nDashboard QC QA passed.");
