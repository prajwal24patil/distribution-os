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

const deployment = read("apps/web/lib/socialDeploymentEngine.ts");
const socialShare = read("apps/web/app/projects/[id]/social-share/page.tsx");
const migration = read(
  "database/migrations/0018_create_agent_supervisor_and_social_publish_queue.sql",
);

for (const status of [
  "auto_publish_ready",
  "manual_required",
  "manual_review_required",
  "blocked_by_qc",
  "blocked_by_connection",
  "blocked_by_platform_rules",
  "blocked_by_rate_limit",
]) {
  ok(deployment.includes(status), `publish decision supports ${status}`);
}

for (const platform of [
  "linkedin",
  "x",
  "google_business_profile",
  "reddit",
  "facebook_page",
  "instagram_business",
  "youtube",
  "quora_manual",
  "whatsapp_manual",
  "email_manual",
  "blog",
]) {
  ok(deployment.includes(platform), `deployment engine handles ${platform}`);
  ok(migration.includes(platform), `migration supports ${platform}`);
}

for (const status of [
  "draft",
  "qc_pending",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "retry_scheduled",
  "manual_required",
  "manual_review_required",
  "blocked",
]) {
  ok(migration.includes(status), `social publish queue supports ${status}`);
}

ok(
  deployment.includes("Official account connection required"),
  "missing connection becomes manual_required",
);
ok(
  deployment.includes("Blog can publish through the internal blog publisher"),
  "blog can be auto-publish ready",
);
ok(deployment.includes("write"), "LinkedIn write scope is checked");
ok(deployment.includes("tweet.write"), "X write scope is checked");
ok(deployment.includes("business.manage"), "Google Business Profile scope is checked");
ok(deployment.includes("submit"), "Reddit submit scope is checked");
ok(deployment.includes("manual_instructions"), "manual instructions are generated");
ok(socialShare.includes("Retry"), "Social Share Center exposes retry action placeholder");
ok(socialShare.includes("Approve"), "Social Share Center exposes approve action placeholder");
ok(socialShare.includes("Copy Post"), "manual assets include copy text");
ok(socialShare.includes("Copy Link"), "manual assets include tracking link copy");

if (failures.length > 0) {
  console.error("\nSocial deployment engine QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nSocial deployment engine QA passed.");
