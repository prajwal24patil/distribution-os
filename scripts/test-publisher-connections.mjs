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
  "apps/web/lib/publisherConnections.ts",
  [
    "listPublishingConnections",
    "getPublishingConnection",
    "connectionCanAutoPublish",
    "explainConnectionStatus",
    "getMissingConnectionSteps",
    "linkedin",
    "reddit",
    "facebook",
    "instagram",
    "youtube",
    "blog",
    "integration_not_ready",
  ],
  "publisherConnections",
);

includesAll(
  "apps/web/lib/publisherAdapters.ts",
  [
    "manual_approval_required",
    "exact_setup_needed",
    "Create LinkedIn Developer App",
    "Create Meta app",
    "Create Google Cloud OAuth app",
    "Create Reddit app",
    "official_integration_not_implemented",
  ],
  "publisherAdapters",
);

includesAll(
  "apps/web/app/projects/[id]/settings/page.tsx",
  [
    "Production Automation",
    "CareerScore webhook",
    "Cron status",
    "Blog publishing",
    "Setup required",
    "Connect soon",
  ],
  "settings automation UI",
);

includesAll(
  "database/migrations/0016_add_publishing_connection_integration_status.sql",
  ["integration_not_ready", "publishing_connections_connection_status_check"],
  "connection status migration",
);

if (failures.length > 0) {
  console.error("\nPublisher connections QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nPublisher connections QA passed.");
