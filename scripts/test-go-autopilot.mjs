import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const go = read("apps/web/lib/goAutopilot.ts");
const actions = read("apps/web/app/actions.ts");
const autopilot = read("apps/web/app/projects/[id]/autopilot/page.tsx");
const packageJson = read("package.json");

let failures = 0;

function ok(condition, message) {
  if (condition) {
    console.log(`ok - ${message}`);
  } else {
    failures += 1;
    console.error(`not ok - ${message}`);
  }
}

ok(packageJson.includes('"test:go-autopilot"'), "npm script test:go-autopilot exists");
ok(go.includes("runGoAutopilot"), "GO Autopilot service exists");
ok(go.includes("createDailyContentFactory"), "GO Autopilot uses Daily Content Factory");
ok(go.includes("runSpamRiskGuard"), "GO Autopilot runs Spam/Risk Guard");
ok(go.includes("tracking_links"), "GO Autopilot creates tracking links");
ok(go.includes("publisher_queue"), "GO Autopilot creates publisher queue items");
ok(go.includes("scheduleApprovedAssets"), "GO Autopilot schedules approved work");
ok(go.includes("publishDuePosts"), "GO Autopilot publishes due eligible posts");
ok(go.includes("distribution_cycles"), "GO Autopilot saves GO Summary");
ok(go.includes("assetsCreated"), "GO Summary includes assets created");
ok(go.includes("approved"), "GO Summary includes approved");
ok(go.includes("blocked"), "GO Summary includes blocked");
ok(go.includes("scheduled"), "GO Summary includes scheduled");
ok(go.includes("blogPublished"), "GO Summary includes blog published");
ok(go.includes("manualShares"), "GO Summary includes manual shares");
ok(go.includes("warnings"), "GO Summary includes warnings");
ok(go.includes("nextBestAction"), "GO Summary includes next best action");
ok(go.includes("manual_approval_required"), "social output stays manual-required by default");
ok(go.includes("auto_publish_ready"), "blog output is auto-publish ready");

ok(actions.includes("goAutopilotAction"), "server action exists");
ok(actions.includes("preparePublicTrackingLinks"), "GO repairs public tracking links first");
ok(actions.includes("runGoAutopilot(projectId)"), "server action invokes GO Autopilot");
ok(autopilot.includes("GO Autopilot"), "primary UI label exists");
ok(autopilot.includes("goAutopilotAction"), "Autopilot page wires GO action");
ok(autopilot.includes("GO Summary"), "Autopilot page shows GO Summary");
ok(autopilot.includes("Assets created"), "GO Summary shows assets created");
ok(autopilot.includes("Manual shares"), "GO Summary shows manual shares");
ok(autopilot.includes("Blocked"), "GO Summary shows blocked assets");

const forbiddenExternal = ["auto-DM", "scrape personal data", "fake trending", "fake engagement"];

for (const phrase of forbiddenExternal) {
  ok(!go.toLowerCase().includes(`build ${phrase.toLowerCase()}`), `does not build ${phrase}`);
}

if (failures > 0) {
  console.error(`\nGO Autopilot QA failed: ${failures}`);
  process.exit(1);
}

console.log("\nGO Autopilot QA passed.");
