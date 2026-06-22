export const CAREERSCORE_PROBLEM =
  "Job seekers apply repeatedly but don't know why they are not getting shortlisted.";
export const CAREERSCORE_BLOG_TITLE = "Before applying to 100 jobs, check your CareerScore.";

const OLD_PROBLEM_PATTERN = new RegExp(
  [
    "People do not know their\\s+market value",
    "skill gaps",
    "best career path",
    "or what to do next\\.?",
  ].join(",\\s*"),
  "gi",
);
const OLD_BLOG_TITLE_PATTERN = new RegExp(
  [
    "People do not know their\\s+market value",
    "skill gaps",
    "best career path",
    "or what to do next\\.?:\\s*how to know what to do next\\.?",
  ].join(",\\s*"),
  "gi",
);
const WEAK_BLOG_TITLE_PATTERN = /how to know what to do next\.?/i;

export function sanitizeCareerScoreCopy(value = "") {
  return value
    .replace(OLD_BLOG_TITLE_PATTERN, CAREERSCORE_BLOG_TITLE)
    .replace(OLD_PROBLEM_PATTERN, CAREERSCORE_PROBLEM);
}

export function sanitizeCareerScoreTitle(value = "", context = "") {
  const isBlog = /blog|seo/i.test(context);
  const hasOldBlogTitle =
    new RegExp(OLD_BLOG_TITLE_PATTERN).test(value) || WEAK_BLOG_TITLE_PATTERN.test(value);

  if (isBlog && hasOldBlogTitle) {
    return CAREERSCORE_BLOG_TITLE;
  }

  return sanitizeCareerScoreCopy(value);
}

export function hasBannedCareerScorePhrase(value = "") {
  return (
    new RegExp(OLD_PROBLEM_PATTERN).test(value) || new RegExp(OLD_BLOG_TITLE_PATTERN).test(value)
  );
}
