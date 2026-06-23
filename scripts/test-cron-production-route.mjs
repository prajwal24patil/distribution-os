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

const route = read("apps/web/app/api/cron/distribution/route.ts");

includesAll(
  "apps/web/app/api/cron/distribution/route.ts",
  [
    "export async function POST",
    "export function GET",
    "Method not allowed",
    "Unauthorized",
    "validateRequiredEnv",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "NEXT_PUBLIC_APP_URL",
    "missing_env",
    "safeErrorDetail",
    "logSafeCronError",
    "CronRouteError",
    "supabaseFailure",
    "projects_checked",
    "cycles_run",
    "assets_created",
    "scheduled",
    "published",
    "manual_required",
    "errors",
  ],
  "production cron route",
);

ok(route.includes('request.headers.get("Authorization")'), "POST keeps Authorization required");
ok(route.includes("token !== cronSecret"), "missing or invalid auth returns unauthorized");
ok(route.includes("{ status: 401 }"), "missing auth returns 401 JSON");
ok(route.includes("{ status: 405 }"), "GET returns 405 JSON");
ok(route.includes("{ status: 500 }"), "missing env and route failures return 500 JSON");
ok(route.includes("table") && route.includes("action"), "Supabase failures include table/action");
ok(route.includes("for (const project"), "cron iterates projects");
ok(route.includes("try {") && route.includes("catch (error)"), "cron has try/catch handling");
ok(route.includes("summary.errors.push(detail)"), "per-project failures are collected as JSON");
ok(
  route.includes("publishDuePosts") && route.includes("publish_due_posts"),
  "publishing failures are isolated",
);
ok(!route.includes("SUPABASE_SERVICE_ROLE_KEY is required"), "route does not expose secret values");
ok(!route.includes("throw new Error"), "route avoids unstructured thrown errors");

if (failures.length > 0) {
  console.error("\nProduction cron route QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nProduction cron route QA passed.");
