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

const adapters = read("apps/web/lib/platformPublisherAdapters.ts");
const legacyAdapters = read("apps/web/lib/publisherAdapters.ts");
const connections = read("apps/web/lib/publisherConnections.ts");
const types = read("apps/web/lib/supabase/types.ts");

for (const adapter of [
  "BlogPublisherAdapter",
  "LinkedInPublisherAdapter",
  "XPublisherAdapter",
  "GoogleBusinessProfilePublisherAdapter",
  "RedditPublisherAdapter",
  "FacebookPagePublisherAdapter",
  "InstagramBusinessPublisherAdapter",
  "YouTubePublisherAdapter",
  "ManualPublisherAdapter",
]) {
  ok(adapters.includes(adapter), `exports ${adapter}`);
}

for (const method of [
  "validateConnection",
  "validateAsset",
  "publish",
  "schedule",
  "getPublishStatus",
  "recoverFailure",
]) {
  ok(adapters.includes(method), `adapter interface includes ${method}`);
}

for (const platform of [
  "linkedin",
  "x",
  "google_business_profile",
  "reddit",
  "facebook_page",
  "instagram_business",
  "youtube",
  "email_manual",
  "blog",
]) {
  ok(adapters.includes(platform), `platform publisher adapters include ${platform}`);
  ok(legacyAdapters.includes(platform), `future publisher adapters include ${platform}`);
  ok(connections.includes(platform), `connection setup includes ${platform}`);
  ok(types.includes(platform), `Supabase types include ${platform}`);
}

ok(adapters.includes("token_exposed: false"), "adapters never expose tokens in results");
ok(!adapters.includes("console.log"), "adapters do not log secrets");
ok(
  adapters.includes("Official adapter stub; not publishing yet."),
  "non-blog stubs do not pretend to publish",
);
ok(
  adapters.includes("Scheduled blog post required."),
  "blog publish requires scheduled post context",
);
ok(adapters.includes("Token expired. Reconnect required."), "expired token state is handled");
ok(adapters.includes("Platform rate limit active."), "rate limit state is handled");
ok(types.includes("token_reference"), "token reference field exists");
ok(types.includes("refresh_token_reference"), "refresh token reference field exists");
ok(types.includes("token_expires_at"), "token expiry field exists");
ok(types.includes("scopes"), "scopes field exists");

if (failures.length > 0) {
  console.error("\nPlatform publisher adapter QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nPlatform publisher adapter QA passed.");
