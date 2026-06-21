import type { ConversionEventRow, ScheduledPostRow } from "@/lib/supabase/types";

export type PostingWindow = {
  platform: string;
  dayType: "weekday" | "weekend" | "any";
  hour: number;
  reason: string;
};

const DEFAULT_WINDOWS: Record<string, PostingWindow[]> = {
  linkedin: [
    { platform: "linkedin", dayType: "weekday", hour: 9, reason: "weekday morning visibility" },
    { platform: "linkedin", dayType: "weekday", hour: 18, reason: "early evening review time" },
  ],
  reddit: [
    { platform: "reddit", dayType: "weekday", hour: 20, reason: "evening discussion window" },
    { platform: "reddit", dayType: "weekend", hour: 11, reason: "weekend community browsing" },
  ],
  whatsapp: [
    { platform: "whatsapp", dayType: "any", hour: 19, reason: "evening community sharing" },
  ],
  seo: [{ platform: "seo", dayType: "any", hour: 10, reason: "morning publish slot" }],
  blog: [{ platform: "blog", dayType: "any", hour: 10, reason: "morning publish slot" }],
  youtube: [
    { platform: "youtube", dayType: "any", hour: 19, reason: "evening short-form viewing" },
  ],
  instagram: [
    { platform: "instagram", dayType: "weekday", hour: 19, reason: "evening short-form browsing" },
    { platform: "instagram", dayType: "weekend", hour: 11, reason: "weekend social browsing" },
  ],
  facebook: [
    { platform: "facebook", dayType: "weekday", hour: 19, reason: "evening community browsing" },
    { platform: "facebook", dayType: "weekend", hour: 11, reason: "weekend community browsing" },
  ],
  referral: [
    { platform: "referral", dayType: "any", hour: 20, reason: "after successful user moments" },
  ],
};

function normalizePlatform(platform: string) {
  const normalized = platform.toLowerCase();

  if (normalized.includes("linkedin")) return "linkedin";
  if (normalized.includes("reddit")) return "reddit";
  if (normalized.includes("whatsapp")) return "whatsapp";
  if (normalized.includes("youtube")) return "youtube";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("seo")) return "seo";
  if (normalized.includes("blog")) return "blog";
  if (normalized.includes("referral")) return "referral";

  return "linkedin";
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function dateMatchesWindow(date: Date, window: PostingWindow) {
  if (window.dayType === "any") return true;
  if (window.dayType === "weekend") return isWeekend(date);
  return !isWeekend(date);
}

function nextDateForWindow(window: PostingWindow, now = new Date()) {
  const candidate = new Date(now);
  candidate.setMinutes(0, 0, 0);
  candidate.setHours(window.hour);

  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(candidate);
    date.setDate(candidate.getDate() + offset);

    if (!dateMatchesWindow(date, window)) continue;
    if (date.getTime() <= now.getTime()) continue;

    return date;
  }

  candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

export function getBestPostingWindows(platform: string, events: ConversionEventRow[] = []) {
  const normalized = normalizePlatform(platform);
  const defaults = DEFAULT_WINDOWS[normalized] ?? DEFAULT_WINDOWS.linkedin;
  const winningHours = events
    .filter((event) => event.platform.toLowerCase() === normalized)
    .sort((a, b) => businessValue(b) - businessValue(a))
    .slice(0, 2)
    .map((event) => new Date(event.occurred_at).getHours());

  const learned = winningHours.map<PostingWindow>((hour) => ({
    platform: normalized,
    dayType: "any",
    hour,
    reason: "learned from prior result data",
  }));

  return [...learned, ...defaults].slice(0, 3);
}

function businessValue(event: ConversionEventRow) {
  if (event.event_type === "paid_report") return 500 + event.event_value;
  if (event.event_type === "revenue") return 400 + event.event_value;
  if (event.event_type === "signup") return 100;
  if (event.event_type === "resume_upload") return 75;
  if (event.event_type === "free_score_generated") return 50;
  if (event.event_type === "referral_share") return 40;
  return 10;
}

export function scorePostingWindow({
  window,
  events = [],
  failedPosts = [],
}: {
  window: PostingWindow;
  events?: ConversionEventRow[];
  failedPosts?: ScheduledPostRow[];
}) {
  const platform = normalizePlatform(window.platform);
  const resultScore = events
    .filter((event) => event.platform.toLowerCase() === platform)
    .filter((event) => new Date(event.occurred_at).getHours() === window.hour)
    .reduce((total, event) => total + businessValue(event), 0);
  const failurePenalty = failedPosts.filter(
    (post) =>
      normalizePlatform(post.platform) === platform &&
      new Date(post.scheduled_for).getHours() === window.hour,
  ).length;

  return 50 + resultScore - failurePenalty * 25;
}

export function chooseBestPostingTime({
  platform,
  events = [],
  failedPosts = [],
  now = new Date(),
}: {
  platform: string;
  events?: ConversionEventRow[];
  failedPosts?: ScheduledPostRow[];
  now?: Date;
}) {
  const bestWindow = getBestPostingWindows(platform, events).sort(
    (a, b) =>
      scorePostingWindow({ window: b, events, failedPosts }) -
      scorePostingWindow({ window: a, events, failedPosts }),
  )[0];

  return nextDateForWindow(bestWindow, now);
}

export function createPlatformPostingPlan({
  platforms,
  events = [],
  failedPosts = [],
  now = new Date(),
}: {
  platforms: string[];
  events?: ConversionEventRow[];
  failedPosts?: ScheduledPostRow[];
  now?: Date;
}) {
  return platforms.map((platform) => ({
    platform,
    scheduledFor: chooseBestPostingTime({ platform, events, failedPosts, now }),
    reason: getBestPostingWindows(platform, events)[0]?.reason ?? "default posting window",
  }));
}

export function learnBestPostingTimeFromResults(events: ConversionEventRow[] = []) {
  if (events.length === 0) {
    return "No timing data yet. Use default posting windows until real results exist.";
  }

  const best = [...events].sort((a, b) => businessValue(b) - businessValue(a))[0];
  const hour = new Date(best.occurred_at).getHours();

  return `Best early signal: ${best.platform || best.source || "organic"} around ${hour}:00 based on ${best.event_type}.`;
}
