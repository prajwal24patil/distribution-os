import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path) {
  return existsSync(join(root, path));
}

function fail(message) {
  failures.push(message);
}

function pass(message) {
  console.log(`ok - ${message}`);
}

function parseEnvFile(path) {
  if (!exists(path)) return {};

  return Object.fromEntries(
    read(path)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

const envSources = [
  process.env,
  parseEnvFile(".env"),
  parseEnvFile(".env.local"),
  parseEnvFile("apps/web/.env"),
  parseEnvFile("apps/web/.env.local"),
  parseEnvFile(".env.example"),
  parseEnvFile("apps/web/.env.example"),
];

function envValue(key) {
  return envSources.map((source) => source[key]).find((value) => value && value.trim());
}

function expectEnv(key) {
  if (envValue(key)) {
    pass(`env ${key} is documented or configured`);
  } else {
    fail(`Missing env variable: ${key}`);
  }
}

function expectFile(path, label = path) {
  if (exists(path)) {
    pass(`${label} exists`);
  } else {
    fail(`${label} is missing at ${path}`);
  }
}

function expectContains(path, patterns, label = path) {
  if (!exists(path)) {
    fail(`${label} is missing at ${path}`);
    return;
  }

  const content = read(path);

  for (const pattern of patterns) {
    const found = pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern);

    if (!found) {
      fail(`${label} is missing required marker: ${pattern.toString()}`);
    }
  }

  pass(`${label} contains required markers`);
}

["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_APP_URL"].forEach(
  expectEnv,
);

const routeFiles = {
  "/": "apps/web/app/page.tsx",
  "/login": "apps/web/app/login/page.tsx",
  "/projects": "apps/web/app/projects/page.tsx",
  "/projects/[id]": "apps/web/app/projects/[id]/page.tsx",
  "/projects/[id]/autopilot": "apps/web/app/projects/[id]/autopilot/page.tsx",
  "/projects/[id]/results": "apps/web/app/projects/[id]/results/page.tsx",
  "/projects/[id]/settings": "apps/web/app/projects/[id]/settings/page.tsx",
  "/projects/[id]/campaigns": "apps/web/app/projects/[id]/campaigns/page.tsx",
  "/t/[tracking_link_id]": "apps/web/app/t/[tracking_link_id]/route.ts",
};

for (const [route, path] of Object.entries(routeFiles)) {
  expectFile(path, `route ${route}`);
}

const serviceExports = {
  "apps/web/lib/autopilotData.ts": ["loadAutopilotPageData"],
  "apps/web/lib/dailyAutopilotRunner.ts": [
    "runDailyAutopilotForProject",
    "createDailyGrowthWork",
    "summarizeDailyAutopilotRun",
    "selectBestNextWork",
    "preventDuplicateDailyRun",
  ],
  "apps/web/lib/publisherQueue.ts": [
    "createPublisherQueueItems",
    "approvePublisherItem",
    "markPublisherItemPosted",
    "markPublisherItemFailed",
    "getTodayPublisherQueue",
    "getPublisherSummary",
  ],
  "apps/web/lib/growthProblemSolver.ts": [
    "detectGrowthProblems",
    "applySafeFixes",
    "getNextExecutionStep",
  ],
  "apps/web/lib/aiContentEngine.ts": [
    "improveCampaignContent",
    "generatePlatformSpecificVariants",
    "generateHooks",
    "generateCTAs",
    "generateBlogOutline",
    "generateYouTubeShortScript",
    "generateRedditReply",
    "generateWhatsAppMessage",
  ],
  "apps/web/lib/publisherAdapters.ts": [
    "publisherAdapters",
    "validateConnection",
    "preparePost",
    "publishPost",
    "getPublishStatus",
  ],
};

for (const [path, exports] of Object.entries(serviceExports)) {
  expectContains(
    path,
    exports.map((name) => new RegExp(`\\b${name}\\b`)),
    `service ${path}`,
  );
}

expectContains(
  "apps/web/app/projects/[id]/autopilot/page.tsx",
  [
    "loadAutopilotPageData",
    "Best Next Action",
    "System Health",
    "Growth Results",
    "Scheduled Work",
    "Next Move",
    "Advanced",
    "Run Autopilot",
    "Run Full System Test",
    "Copy Post",
    "Copy Link",
    "Mark Posted",
    "Add Result",
    "Settings",
    "Results",
    "Top 5 scheduled assets",
    "Post",
    "Tracking link",
  ],
  "Autopilot page",
);

const autopilotPage = read("apps/web/app/projects/[id]/autopilot/page.tsx");
if (/\.from\(/.test(autopilotPage)) {
  fail(
    "Autopilot page should use loadAutopilotPageData instead of direct scattered Supabase queries.",
  );
} else {
  pass("Autopilot page uses optimized data loader");
}

expectContains(
  "apps/web/app/t/[tracking_link_id]/route.ts",
  [
    "click_events",
    "clicks",
    "destinationWithUtm",
    "CAREERSCORE_FALLBACK_URL",
    "https://incomeos-theta.vercel.app/",
  ],
  "tracking redirect route",
);

expectContains(
  "apps/web/lib/growthEngine.ts",
  [
    "Most freshers don't know why they're not getting shortlisted.",
    "Quick question - are you applying to jobs but not getting callbacks?",
    "If you're applying a lot but not getting responses",
    "Before applying to 100 jobs, check your CareerScore.",
    "Know your CareerScore before the market judges your resume.",
    "Know someone applying to jobs but stuck?",
  ],
  "CareerScore content templates",
);

const roboticPhrase = [
  "People do not know their " + "market value",
  "skill gaps",
  "best career path",
  "or what to do next.",
].join(", ");
for (const path of [
  "apps/web/lib/growthEngine.ts",
  "apps/web/lib/aiContentEngine.ts",
  "apps/web/app/projects/[id]/autopilot/page.tsx",
]) {
  if (exists(path) && read(path).includes(roboticPhrase)) {
    fail(`Robotic phrase still exists in ${path}`);
  }
}

expectFile("apps/web/app/projects/[id]/autopilot/loading.tsx", "Autopilot loading skeleton");
expectFile("apps/web/app/projects/[id]/campaigns/loading.tsx", "Campaigns loading skeleton");

if (failures.length > 0) {
  console.error("\nAutopilot QA failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nAutopilot QA passed.");
