import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function pathFor(path) {
  return join(root, path);
}

function read(path) {
  return readFileSync(pathFor(path), "utf8");
}

function exists(path) {
  return existsSync(pathFor(path));
}

function pass(message) {
  console.log(`ok - ${message}`);
}

function fail(message) {
  failures.push(message);
}

function expectFile(path) {
  if (exists(path)) {
    pass(`${path} exists`);
  } else {
    fail(`${path} is missing`);
  }
}

function expectContains(path, markers, label = path) {
  if (!exists(path)) {
    fail(`${path} is missing`);
    return;
  }

  const content = read(path);

  for (const marker of markers) {
    const found = marker instanceof RegExp ? marker.test(content) : content.includes(marker);

    if (!found) {
      fail(`${label} missing marker: ${marker.toString()}`);
    }
  }

  pass(`${label} contains required markers`);
}

expectContains(
  "apps/web/lib/autonomousDistributionEngine.ts",
  [
    "runDistributionCycle",
    "ingestProductUrl",
    "analyzeProductPositioning",
    "analyzeAudiencePain",
    "analyzeChannelOpportunities",
    "generateDistributionStrategy",
    "generateContentBatch",
    "generateShortVideoBatch",
    "scoreContentBatch",
    "qaContentBatch",
    "createPublishingQueue",
    "publishOrQueue",
    "trackDistributionResults",
    "learnFromResults",
    "generateNextCyclePlan",
    "linkedin_post",
    "seo_blog",
    "youtube_short_script",
    "instagram_caption",
    "landing_page_copy",
    "referral_message",
  ],
  "autonomous distribution engine",
);

expectContains(
  "apps/web/lib/shortVideoEngine.ts",
  [
    "generateShortVideoScript",
    "generateHook",
    "generateSceneBreakdown",
    "generateCaption",
    "generateHashtags",
    "generateVoiceover",
    "generateShotList",
    "0-3 sec",
    "3-10 sec",
    "10-20 sec",
    "20-30 sec",
  ],
  "short video engine",
);

expectContains(
  "apps/web/lib/contentSimulation.ts",
  [
    "simulateContentPerformance",
    "rankContentAssets",
    "selectTopAssets",
    "explainRanking",
    "detectFunnelBottleneck",
    "bottleneckRecommendation",
    "audience pain",
    "platform fit",
  ],
  "content simulation",
);

expectContains(
  "apps/web/lib/qaAgent.ts",
  [
    "qaContentAsset",
    "qaContentBatch",
    "guaranteed",
    "spam",
    "fake",
    "no tracking link",
    "approved",
    "rejected",
  ],
  "QA agent",
);

expectContains(
  "apps/web/lib/publisherAdapters.ts",
  [
    "validateConnection",
    "prepareContent",
    "schedulePost",
    "publishPost",
    "getPostStatus",
    "fetchBasicMetrics",
    "manual_approval_required",
  ],
  "publisher adapters",
);

expectContains(
  "apps/web/lib/schedulerPlan.ts",
  [
    "planDailyDistributionCycle",
    "planWeeklyDistributionReview",
    "shouldRunDailyCycle",
    "shouldRunWeeklyReview",
  ],
  "scheduler plan",
);

expectContains(
  "database/migrations/0012_create_autonomous_distribution_core.sql",
  [
    "distribution_cycles",
    "product_url",
    "publishing_mode",
    "asset_type",
    "quality_score",
    "qa_status",
    "predicted_rank_score",
  ],
  "autonomous distribution migration",
);

expectContains(
  "apps/web/app/projects/[id]/autopilot/page.tsx",
  [
    "System Health",
    "Best Next Action",
    "Growth Results",
    "Scheduled Work",
    "Next Move",
    "Run Autopilot",
    "Top 5 scheduled assets",
    "Advanced",
  ],
  "Autopilot result-first UI",
);

const searchFiles = [
  "apps/web/app/projects/[id]/autopilot/page.tsx",
  "apps/web/lib/autonomousDistributionEngine.ts",
  "apps/web/lib/growthEngine.ts",
  "apps/web/lib/aiContentEngine.ts",
];

for (const path of searchFiles) {
  if (!exists(path)) continue;
  const content = read(path).toLowerCase();

  if (content.includes("guaranteed viral")) {
    fail(`${path} contains forbidden UI/copy phrase: guaranteed viral`);
  }

  if (
    content.includes(
      "people do not know their " +
        ["market value", "skill gaps", "best career path", "or what to do next."].join(", "),
    )
  ) {
    fail(`${path} still contains robotic CareerScore phrase`);
  }
}

if (exists(".next/BUILD_ID") || exists("apps/web/.next/BUILD_ID")) {
  pass("Next.js build output exists");
} else {
  fail(
    "Next.js build output missing. Run npm run build before npm run test:autonomous-distribution.",
  );
}

expectFile("apps/web/lib/autonomousDistributionEngine.ts");
expectFile("apps/web/lib/shortVideoEngine.ts");
expectFile("apps/web/lib/contentSimulation.ts");
expectFile("apps/web/lib/qaAgent.ts");

if (failures.length > 0) {
  console.error("\nAutonomous distribution QA failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nAutonomous distribution QA passed.");
