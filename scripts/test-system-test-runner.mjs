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
  "apps/web/lib/systemTestRunner.ts",
  [
    "runFullSystemTest",
    "testProjectSetup",
    "testDistributionCycle",
    "testAssetGeneration",
    "testQaScoring",
    "testScheduling",
    "testDashboardQc",
    "testSchedulingIdempotency",
    "testTrackingLinks",
    "testClickTracking",
    "testResultTracking",
    "testNextMove",
    "cleanupOldTestRuns",
    "generateFixInstruction",
    "duration_ms",
    "pass",
    "fail",
    "warning",
  ],
  "systemTestRunner",
);

const runner = read("apps/web/lib/systemTestRunner.ts");
ok(runner.includes("system_test"), "system test records are marked as system_test");
ok(
  runner.includes("Demo/test result") || runner.includes("demo result"),
  "demo/test result wording exists",
);
ok(runner.includes("manual_approval_required"), "publishing test stays manual approval required");
ok(runner.includes("Dashboard clean"), "dashboard QC is included in system health");
ok(runner.includes("Fix /t/[id] redirect"), "failed tracking test creates fix instruction");
ok(!runner.toLowerCase().includes("publishpost("), "system runner does not publish externally");
ok(!runner.toLowerCase().includes("send message"), "system runner does not send messages");
ok(!runner.toLowerCase().includes("scrape"), "system runner does not scrape");

includesAll(
  "database/migrations/0015_create_system_test_runs.sql",
  ["system_test_runs", "results_json", "enable row level security", "auth.uid() = owner_id"],
  "system test migration",
);

includesAll(
  "apps/web/app/actions.ts",
  ["runFullSystemTestAction", "createDemoResultAction", "system_test_demo", "Demo result"],
  "actions",
);

includesAll(
  "apps/web/app/projects/[id]/autopilot/page.tsx",
  [
    "System Health",
    "Run Full System Test",
    "Best Next Action",
    "Growth Results",
    "Scheduled Work",
    "Next Move",
    "Run Autopilot",
    "Advanced",
  ],
  "Autopilot dashboard",
);

if (failures.length > 0) {
  console.error("\nSystem test runner QA failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nSystem test runner QA passed.");
