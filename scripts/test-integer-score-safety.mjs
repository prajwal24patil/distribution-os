import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const helper = read("apps/web/lib/scoreSafety.ts");
const goAutopilot = read("apps/web/lib/goAutopilot.ts");
const autonomous = read("apps/web/lib/autonomousDistributionEngine.ts");
const actions = read("apps/web/app/actions.ts");
const growth = read("apps/web/lib/growthEngine.ts");
const migrations = [
  read("database/migrations/0001_create_projects.sql"),
  read("database/migrations/0003_create_research_runs.sql"),
  read("database/migrations/0012_create_autonomous_distribution_core.sql"),
].join("\n");

let failures = 0;

function ok(condition, message) {
  if (condition) {
    console.log(`ok - ${message}`);
  } else {
    failures += 1;
    console.error(`not ok - ${message}`);
  }
}

function toSafeIntegerScore(value, fallback = 0) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : fallback;

  if (!Number.isFinite(numeric)) return fallback;

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

ok(toSafeIntegerScore(89.9) === 90, "89.9 becomes 90");
ok(toSafeIntegerScore("89.9") === 90, '"89.9" becomes 90');
ok(toSafeIntegerScore("90") === 90, '"90" becomes 90');
ok(toSafeIntegerScore("bad") === 0, "invalid string safely becomes 0");
ok(toSafeIntegerScore(null) === 0, "null safely becomes 0");
ok(toSafeIntegerScore(140) === 100, "score clamps above 100");
ok(toSafeIntegerScore(-10) === 0, "score clamps below 0");

ok(helper.includes("toSafeIntegerScore"), "score safety helper exists");
ok(helper.includes("Math.round"), "helper rounds decimal values");
ok(helper.includes("Math.min(100"), "helper clamps max score/progress");
ok(helper.includes("Math.max(0"), "helper clamps min score/progress");
ok(helper.includes("Number.isFinite"), "helper handles invalid values safely");

ok(migrations.includes("progress integer"), "projects.progress is integer");
ok(migrations.includes("confidence_score integer"), "research_runs.confidence_score is integer");
ok(migrations.includes("quality_score integer"), "publisher_queue.quality_score is integer");
ok(
  migrations.includes("predicted_rank_score integer"),
  "publisher_queue.predicted_rank_score is integer",
);

ok(
  goAutopilot.includes("toSafeIntegerScore(asset.qualityScore - index * 0.1)"),
  "GO Autopilot quality_score rounds 89.9 before insert",
);
ok(
  goAutopilot.includes("toSafeIntegerScore(asset.predictedRankScore - index * 0.1)"),
  "GO Autopilot predicted_rank_score rounds 89.9 before insert",
);
ok(
  !goAutopilot.includes("quality_score: asset.qualityScore - index * 0.1"),
  "GO Autopilot no longer inserts decimal quality_score",
);
ok(
  !goAutopilot.includes("predicted_rank_score: asset.predictedRankScore - index * 0.1"),
  "GO Autopilot no longer inserts decimal predicted_rank_score",
);
ok(
  autonomous.includes("quality_score: toSafeIntegerScore(score)"),
  "Distribution Engine quality_score is integer-safe",
);
ok(
  autonomous.includes("predicted_rank_score: toSafeIntegerScore(score)"),
  "Distribution Engine predicted_rank_score is integer-safe",
);
ok(actions.includes("progress: toSafeIntegerScore"), "project progress writes are integer-safe");
ok(
  growth.includes("confidence_score: toSafeIntegerScore(confidenceScore)"),
  "research confidence_score is integer-safe",
);

const unsafeDecimalStringPattern =
  /(quality_score|predicted_rank_score|confidence_score|progress):\s*["'`]\d+\.\d+["'`]/;

ok(
  !unsafeDecimalStringPattern.test([goAutopilot, autonomous, actions, growth].join("\n")),
  "Supabase score payloads do not include decimal strings for integer fields",
);

if (failures > 0) {
  console.error(`\nInteger score safety QA failed: ${failures}`);
  process.exit(1);
}

console.log("\nInteger score safety QA passed.");
