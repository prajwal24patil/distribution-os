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
  "apps/web/app/api/events/careerscore/route.ts",
  [
    "CAREERSCORE_WEBHOOK_SECRET",
    "x-careerscore-secret",
    "signup",
    "resume_upload",
    "free_score_generated",
    "paid_report",
    "referral_share",
    "tracking_id",
    "tracking_links",
    "conversion_events",
    "event_value",
    "revenue",
    "createAdminClient",
  ],
  "CareerScore webhook route",
);

const route = read("apps/web/app/api/events/careerscore/route.ts");
ok(!route.includes("NEXT_PUBLIC_CAREERSCORE"), "webhook secret is not public");
ok(route.includes("Unauthorized"), "webhook rejects invalid secret");
ok(route.includes("Unsupported event_type"), "webhook validates event type");

const envRoot = read(".env.example");
const envWeb = read("apps/web/.env.example");
ok(envRoot.includes("CAREERSCORE_WEBHOOK_SECRET="), "root env documents webhook secret");
ok(envWeb.includes("CAREERSCORE_WEBHOOK_SECRET="), "web env documents webhook secret");
ok(envRoot.includes("SUPABASE_SERVICE_ROLE_KEY="), "root env documents service role key");
ok(envWeb.includes("SUPABASE_SERVICE_ROLE_KEY="), "web env documents service role key");

if (failures.length > 0) {
  console.error("\nCareerScore webhook QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nCareerScore webhook QA passed.");
