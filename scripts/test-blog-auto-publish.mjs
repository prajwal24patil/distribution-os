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

const oldPhrase = [
  "People do not know their market value",
  "skill gaps",
  "best career path",
  "or what to do next",
].join(", ");

const copy = read("apps/web/lib/careerScoreCopy.ts");
ok(copy.includes("sanitizeCareerScoreCopy"), "shared sanitizer exists");
ok(copy.includes("sanitizeCareerScoreTitle"), "shared title sanitizer exists");
ok(
  copy.includes("Before applying to 100 jobs, check your CareerScore."),
  "blog title fallback exists",
);

const blogPublisher = read("apps/web/lib/blogPublisher.ts");
includesAll(
  "apps/web/lib/blogPublisher.ts",
  [
    "publishInternalBlogPost",
    "sanitizeCareerScoreTitle",
    "sanitizeCareerScoreCopy",
    'status: "published"',
    "published_url",
    "publisher_queue",
    "publishedUrl",
  ],
  "blogPublisher",
);
ok(
  !blogPublisher.includes(`${oldPhrase}: how to know what to do next`),
  "old blog title is not saved by publisher",
);

const worker = read("apps/web/lib/publishingWorker.ts");
includesAll(
  "apps/web/lib/publishingWorker.ts",
  [
    "publishDuePosts",
    "publishSinglePost",
    "publishInternalBlogPost",
    "isBlogPlatform",
    '"manual_required"',
    '"auto_publish_ready"',
  ],
  "publishingWorker",
);
ok(
  worker.includes('post.status === "manual_required"') &&
    worker.includes("Official account connection required before auto-publishing."),
  "social manual-required posts stay manual without fake publishing",
);

const actions = read("apps/web/app/actions.ts");
ok(
  actions.includes("publishDuePosts(10, { projectId, ownerId: user.id })"),
  "Run Autopilot publishes due project posts",
);

const data = read("apps/web/lib/autopilotData.ts");
ok(data.includes("PENDING_SCHEDULED_STATUSES"), "scheduled work has pending status allowlist");
ok(
  data.includes("scheduledPosts: rawScheduledPosts"),
  "blog published count uses raw scheduled rows",
);
ok(
  data.includes('post.status === "published"'),
  "Blog published count increments from published rows",
);
ok(
  !data.includes("scheduledPosts: scheduledPosts,"),
  "published posts are not used as pending scheduled work",
);

const autopilot = read("apps/web/app/projects/[id]/autopilot/page.tsx");
ok(autopilot.includes("Blog published"), "Autopilot shows Blog published count");
ok(
  !autopilot.includes("{tracking_link}"),
  "Autopilot page does not expose raw tracking placeholders",
);

includesAll(
  "apps/web/app/publications/[slug]/page.tsx",
  [
    "CareerScore Publication",
    "articleTitle",
    "articleContent",
    "Check your CareerScore",
    "trackingUrl",
    "sanitizeCareerScoreTitle",
    "sanitizeCareerScoreCopy",
  ],
  "publication page",
);

if (failures.length > 0) {
  console.error("\nBlog auto-publish QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nBlog auto-publish QA passed.");
