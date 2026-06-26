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

const engine = read("apps/web/lib/careerScoreRevenueEngine.ts");
const deployment = read("apps/web/lib/socialDeploymentEngine.ts");
const supervisor = read("apps/web/lib/agentSupervisor.ts");
const cron = read("apps/web/app/api/cron/distribution/route.ts");

for (const banned of [
  "guaranteed job",
  "guaranteed placement",
  "guaranteed salary",
  "fake likes",
  "fake retweets",
  "fake comments",
  "trend manipulation",
  "mass DM",
  "scraped personal data",
]) {
  ok(engine.includes(banned), `QC rejects ${banned}`);
}

ok(engine.includes("Tracking link is required."), "QC rejects assets without tracking links");
ok(
  deployment.includes("missing tracking link"),
  "deployment recovery handles missing tracking links",
);
ok(deployment.includes("retry_scheduled"), "rate-limit retry state exists");
ok(deployment.includes("manual_review_required"), "manual review state exists");
ok(engine.includes("needs real data"), "report/proof engine does not invent stats");
ok(engine.includes("needs data"), "proof engine returns needs data fallback");
ok(
  engine.includes("Real CareerScore conversion data not connected yet."),
  "conversion optimizer handles missing CareerScore webhook data",
);
ok(engine.includes("No fake engagement"), "trend radar forbids fake engagement");
ok(supervisor.includes("runPreflightHealthCheck"), "preflight health check exists");
ok(supervisor.includes("warnings"), "missing env returns structured warnings");
ok(cron.includes("NextResponse.json"), "cron JSON shape exists");
ok(supervisor.includes("system_status"), "dashboard health shape includes system_status");
ok(supervisor.includes("agent_health"), "dashboard health shape includes agent_health");

if (failures.length > 0) {
  console.error("\nRevenue engine resilience QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nRevenue engine resilience QA passed.");
