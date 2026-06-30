import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const settings = read("apps/web/app/projects/[id]/settings/page.tsx");
const connections = read("apps/web/lib/publisherConnections.ts");
const packageJson = read("package.json");
const types = read("apps/web/lib/supabase/types.ts");

let failures = 0;

function ok(condition, message) {
  if (condition) {
    console.log(`ok - ${message}`);
  } else {
    failures += 1;
    console.error(`not ok - ${message}`);
  }
}

ok(
  packageJson.includes('"test:platform-connections"'),
  "npm script test:platform-connections exists",
);
ok(settings.includes("Platform Connections"), "Settings shows Platform Connections section");
ok(settings.includes("Official API/OAuth setup foundation"), "Settings explains OAuth foundation");
ok(settings.includes("No browser bots or fake published states"), "Settings bans fake publishing");
ok(settings.includes("officialConnectionPlatforms"), "Settings filters official social platforms");
ok(settings.includes("BlogPublisherAdapter"), "Settings shows internal blog adapter readiness");
ok(settings.includes("Auto-publish ready"), "Settings shows auto-publish ready state");
ok(settings.includes("Manual-required"), "Settings shows manual-required state");
ok(settings.includes("Reconnect required"), "Settings shows reconnect required state");
ok(
  settings.includes("Copy/manual instructions available"),
  "Settings includes copy/manual instructions",
);

for (const platform of [
  "linkedin",
  "x",
  "google_business_profile",
  "reddit",
  "youtube",
  "instagram_business",
  "facebook_page",
]) {
  ok(settings.includes(platform), `Settings official platform list includes ${platform}`);
  ok(connections.includes(platform), `connection helper includes ${platform}`);
  ok(types.includes(platform), `Supabase types include ${platform}`);
}

for (const status of [
  "not_connected",
  "connected",
  "expired",
  "permission_missing",
  "manual_required",
  "rate_limited",
  "disabled",
]) {
  ok(connections.includes(status) || types.includes(status), `connection status exists: ${status}`);
}

ok(connections.includes("token_reference") === false, "connection view does not expose tokens");
ok(settings.includes("access_token") === false, "Settings never renders access tokens");
ok(settings.includes("refresh_token") === false, "Settings never renders refresh tokens");

if (failures > 0) {
  console.error(`\nPlatform Connections QA failed: ${failures}`);
  process.exit(1);
}

console.log("\nPlatform Connections QA passed.");
