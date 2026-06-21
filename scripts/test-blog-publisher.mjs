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
  "apps/web/lib/blogPublisher.ts",
  [
    "publishInternalBlogPost",
    "publicationUrl",
    "publicationSlug",
    "scheduled_posts",
    "publisher_queue",
    "published_url",
    'status: "published"',
  ],
  "blogPublisher",
);

includesAll(
  "apps/web/app/publications/[slug]/page.tsx",
  [
    "generateMetadata",
    "CareerScore Publication",
    "loadPublishedPost",
    "scheduled_posts",
    "published",
    "Check your CareerScore",
  ],
  "publication page",
);

const worker = read("apps/web/lib/publishingWorker.ts");
ok(worker.includes("isBlogPlatform"), "worker detects blog platform");
ok(worker.includes("publishInternalBlogPost"), "worker publishes blog internally");
ok(!worker.includes("browser automation"), "worker does not browser-bot post");

if (failures.length > 0) {
  console.error("\nBlog publisher QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nBlog publisher QA passed.");
