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
  "apps/web/app/api/cron/distribution/route.ts",
  [
    "CRON_SECRET",
    "Authorization",
    "Bearer",
    "projects_checked",
    "cycles_run",
    "assets_created",
    "scheduled",
    "published",
    "manual_required",
    "errors",
    "distribution_cycles",
    "publisher_queue",
    "scheduled_posts",
    "publishDuePosts",
    "runDashboardQcForProject",
    "collectPublishedPostMetrics",
  ],
  "cron distribution route",
);

const route = read("apps/web/app/api/cron/distribution/route.ts");
ok(route.includes("try {"), "cron isolates per-project failures");
ok(route.includes('.eq("status", "active")'), "cron selects active projects");
ok(!route.includes("NEXT_PUBLIC_CRON_SECRET"), "cron secret is not public");

const envRoot = read(".env.example");
const envWeb = read("apps/web/.env.example");
ok(envRoot.includes("CRON_SECRET="), "root env documents cron secret");
ok(envWeb.includes("CRON_SECRET="), "web env documents cron secret");

if (failures.length > 0) {
  console.error("\nCron distribution QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nCron distribution QA passed.");
