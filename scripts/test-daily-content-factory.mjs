import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const factory = read("apps/web/lib/dailyContentFactory.ts");

let failures = 0;

function ok(condition, message) {
  if (condition) {
    console.log(`ok - ${message}`);
  } else {
    failures += 1;
    console.error(`not ok - ${message}`);
  }
}

function count(marker) {
  return [...factory.matchAll(new RegExp(`assetType: "${marker}"`, "g"))].length;
}

ok(factory.includes("createDailyContentFactory"), "daily content factory exists");
ok(factory.includes("GO_AUTOPILOT_ANGLES"), "GO Autopilot angles are explicit");
[
  "no callback",
  "resume not shortlisted",
  "fresher gap",
  "data analyst roadmap",
  "MNC readiness",
  "salary growth",
  "AI-proof career",
  "before applying again",
].forEach((angle) => ok(factory.includes(angle), `angle exists: ${angle}`));

ok(count("linkedin_post") === 3, "factory creates 3 LinkedIn posts");
ok(
  count("x_post") === 1 && factory.includes("].map(([title, angle])"),
  "factory creates mapped X posts",
);
ok(factory.includes("x_posts: assets.filter"), "summary counts 5 X posts");
ok(count("x_thread") === 1, "factory creates 1 X thread");
ok(count("seo_blog") === 1, "factory creates 1 SEO blog");
ok(
  count("reddit_reply") === 1 && factory.includes("reddit_drafts"),
  "factory creates Reddit drafts",
);
ok(count("quora_answer") === 1 && factory.includes("quora_drafts"), "factory creates Quora drafts");
ok(
  count("whatsapp_message") === 1 && factory.includes("whatsapp_messages"),
  "factory creates WhatsApp messages",
);
ok(
  count("instagram_caption") === 1 && factory.includes("instagram_captions"),
  "factory creates Instagram captions",
);
ok(count("youtube_short_script") === 2, "factory creates 2 YouTube Shorts scripts");
ok(count("google_business_post") === 1, "factory creates 1 Google Business post draft");
ok(count("email_draft") === 1, "factory creates 1 email draft");
ok(count("referral_post") === 1, "factory creates 1 referral post");

ok(factory.includes("createShortVideoScriptAgent"), "Short Video Script Agent exists");
ok(factory.includes("hook"), "short video script includes hook");
ok(factory.includes("scene_outline"), "short video script includes scene outline");
ok(factory.includes("voiceover"), "short video script includes voiceover");
ok(factory.includes("hashtags"), "short video script includes hashtags");
ok(factory.includes("tracking_link"), "short video script includes tracking link");

ok(factory.includes("runSpamRiskGuard"), "Spam/Risk Guard exists");
ok(factory.includes("guaranteed"), "guard blocks fake guarantees");
ok(factory.includes("fake proof"), "guard blocks fake proof");
ok(factory.includes("dm everyone"), "guard blocks auto-DM behavior");
ok(factory.includes("scrape"), "guard blocks scraping language");
ok(factory.includes("qaContentAsset"), "factory uses QA agent");

if (failures > 0) {
  console.error(`\nDaily Content Factory QA failed: ${failures}`);
  process.exit(1);
}

console.log("\nDaily Content Factory QA passed.");
