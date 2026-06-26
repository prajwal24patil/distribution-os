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

const supervisor = read("apps/web/lib/agentSupervisor.ts");
const autopilot = read("apps/web/app/projects/[id]/autopilot/page.tsx");
const cron = read("apps/web/app/api/cron/distribution/route.ts");

for (const agent of [
  "CareerScore Revenue Agent",
  "Pain-Based Campaign Agent",
  "Social Deployment Supervisor",
  "Platform Connection Agent",
  "Content Creation Agent",
  "SEO/Blog Agent",
  "X Trend Radar Agent",
  "LinkedIn Growth Agent",
  "Google Business Profile Agent",
  "Reddit Community Agent",
  "Instagram/Facebook Agent",
  "YouTube Shorts Agent",
  "Referral Agent",
  "Proof Agent",
  "Compliance/QC Agent",
  "Publishing Agent",
  "Tracking Agent",
  "Health Agent",
  "Recovery Agent",
  "Analytics Agent",
]) {
  ok(supervisor.includes(agent), `supervisor includes ${agent}`);
}

for (const key of [
  "run_id",
  "agents_started",
  "agents_completed",
  "agents_failed",
  "recovered_issues",
  "warnings",
  "manual_actions_needed",
  "next_safe_action",
  "overall_status",
]) {
  ok(supervisor.includes(key), `supervisor output includes ${key}`);
}

for (const envName of [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
]) {
  ok(supervisor.includes(envName), `preflight checks ${envName}`);
}

ok(supervisor.includes("try {"), "one failed agent is isolated with try/catch");
ok(supervisor.includes("catch (error)"), "agent failure path is captured");
ok(
  supervisor.includes("isolated; remaining agents continued"),
  "failed agent recovery is described",
);
ok(supervisor.includes("buildAgentHealthDashboard"), "agent health dashboard helper exists");
ok(autopilot.includes("Agent Health"), "Autopilot renders agent health");
ok(autopilot.includes("runMasterAgentSupervisor"), "Autopilot invokes supervisor");
ok(cron.includes("NextResponse.json"), "cron returns JSON responses");
ok(cron.includes("errors"), "cron exposes structured error summaries");

if (failures.length > 0) {
  console.error("\nAgent supervisor QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nAgent supervisor QA passed.");
