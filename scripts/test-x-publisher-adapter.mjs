import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function ok(condition, message) {
  if (!condition) {
    console.error(`not ok - ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`ok - ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
ok(packageJson.scripts["test:x-publisher-adapter"], "npm script test:x-publisher-adapter exists");

const adapter = read("apps/web/lib/xPublisherAdapter.ts");
const worker = read("apps/web/lib/publishingWorker.ts");
const legacyAdapters = read("apps/web/lib/publisherAdapters.ts");

ok(adapter.includes("publishXPost"), "X publisher adapter exports publishXPost");
ok(adapter.includes("XPublisherAdapter"), "X publisher adapter exports XPublisherAdapter");
ok(
  adapter.includes("https://api.twitter.com/2/tweets"),
  "X adapter uses official create post endpoint",
);
ok(adapter.includes("decryptPlatformToken"), "X adapter decrypts server-side token");
ok(adapter.includes("qaContentAsset"), "X adapter checks QC before posting");
ok(adapter.includes("tweet.write"), "X adapter requires tweet.write scope");
ok(adapter.includes("users.read"), "X adapter requires users.read scope");
ok(adapter.includes("Tracking link is required"), "X adapter requires tracking link");
ok(adapter.includes("hasDuplicateXPost"), "X adapter checks duplicate content");
ok(adapter.includes("24 * 60 * 60 * 1000"), "X duplicate window is 24 hours");
ok(adapter.includes("retry_scheduled"), "X failures can return retry_scheduled");
ok(adapter.includes("manual_required"), "not connected X returns manual_required");
ok(adapter.includes("publishedUrl"), "X success returns published URL");
ok(worker.includes("publishXPost"), "publishing worker calls X adapter");
ok(worker.includes("updatePostRetry"), "publishing worker schedules retry");
ok(worker.includes("published_url: publishedUrl"), "publishing worker saves published URL");
ok(worker.includes("published_at: publishedAt"), "publishing worker saves published timestamp");
ok(worker.includes("Platform rate limit active"), "publishing worker respects rate limit state");
ok(
  legacyAdapters.includes("official_integration_not_implemented"),
  "non-X adapters do not fake publish",
);
ok(!adapter.includes("console.log"), "X adapter does not log tokens");
ok(!adapter.includes("accessToken)"), "X adapter does not return raw token");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("\nX publisher adapter QA passed.");
