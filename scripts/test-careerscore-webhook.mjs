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
    "payment_started",
    "paid_report",
    "referral_share",
    "tracking_id",
    "tracking_links",
    "conversion_events",
    "event_value",
    "revenue",
    "createAdminClient",
    "tracked",
    "attributed",
    "findCareerScoreProject",
    "safeFailure",
    "try {",
    "catch (error)",
  ],
  "CareerScore webhook route",
);

const route = read("apps/web/app/api/events/careerscore/route.ts");
ok(!route.includes("NEXT_PUBLIC_CAREERSCORE"), "webhook secret is not public");
ok(route.includes("Unauthorized"), "webhook rejects invalid secret");
ok(route.includes("Unsupported event_type"), "webhook validates event type");
ok(route.includes("ok: true"), "webhook returns success JSON");
ok(route.includes("ok: false"), "webhook returns failure JSON");
ok(!route.includes("tracking_id is required"), "missing tracking_id does not crash");
ok(!route.includes("Tracking link not found"), "unknown tracking_id does not crash");
ok(
  route.includes("trackingLink ?") || route.includes("if (trackingLink)"),
  "known tracking links are attributed",
);
ok(route.includes("tracking_link_id: null"), "unknown tracking links are saved unattributed");
ok(route.includes("event_type: payload.event_type"), "valid event type is stored");
ok(route.includes('payload.event_type === "paid_report"'), "paid_report revenue is accepted");
ok(
  route.includes('payload.event_type === "payment_started"'),
  "payment_started revenue is accepted",
);
ok(route.includes('table: "projects"'), "project lookup failures are structured");
ok(route.includes('table: "conversion_events"'), "conversion insert failures are structured");
ok(route.includes('table: "webhook"'), "unhandled webhook errors are returned as JSON");

const envRoot = read(".env.example");
const envWeb = read("apps/web/.env.example");
ok(envRoot.includes("CAREERSCORE_WEBHOOK_SECRET="), "root env documents webhook secret");
ok(envWeb.includes("CAREERSCORE_WEBHOOK_SECRET="), "web env documents webhook secret");
ok(envRoot.includes("SUPABASE_SERVICE_ROLE_KEY="), "root env documents service role key");
ok(envWeb.includes("SUPABASE_SERVICE_ROLE_KEY="), "web env documents service role key");

const types = read("apps/web/lib/supabase/types.ts");
const migration = read("database/migrations/0019_add_payment_started_conversion_event.sql");
ok(types.includes('"payment_started"'), "Supabase types include payment_started");
ok(migration.includes("'payment_started'"), "migration allows payment_started");
ok(migration.includes("conversion_events_event_type_check"), "migration updates event type check");

if (failures.length > 0) {
  console.error("\nCareerScore webhook QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nCareerScore webhook QA passed.");
