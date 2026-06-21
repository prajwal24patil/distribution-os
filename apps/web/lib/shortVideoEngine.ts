export type ShortVideoScript = {
  hook: string;
  problem: string;
  insight: string;
  cta: string;
  caption: string;
  hashtags: string[];
  textOverlays: string[];
  platformFit: string;
  voiceover: string;
  shotList: string[];
};

export function generateHook(angle = "Most freshers don't know why they are not shortlisted") {
  return `${angle}.`;
}

export function generateSceneBreakdown() {
  return [
    "0-3 sec: show job applications sent with no replies",
    "3-10 sec: explain the missing proof or positioning gap",
    "10-20 sec: show CareerScore as the readiness check",
    "20-30 sec: ask the viewer to check their score before applying again",
  ];
}

export function generateCaption(trackingLink = "[tracking link]") {
  return `Before applying to 100 jobs, check your CareerScore. Try it here: ${trackingLink}`;
}

export function generateHashtags() {
  return ["#CareerScore", "#Freshers", "#JobSearch", "#CareerReadiness", "#ResumeTips"];
}

export function generateVoiceover(trackingLink = "[tracking link]") {
  return [
    "Applying everywhere but not getting callbacks?",
    "The issue may not be effort. It may be missing proof, unclear positioning, or the wrong role fit.",
    "CareerScore helps you see your readiness score and the next gaps to fix.",
    `Check your CareerScore before applying again: ${trackingLink}`,
  ].join(" ");
}

export function generateShotList() {
  return [
    "Close-up of job applications sent",
    "Resume section with proof gaps highlighted",
    "CareerScore report preview",
    "Clear CTA screen with tracking link",
  ];
}

export function generateShortVideoScript({
  trackingLink = "[tracking link]",
  angle = "Most freshers don't know why they are not shortlisted",
}: {
  trackingLink?: string;
  angle?: string;
} = {}): ShortVideoScript {
  return {
    hook: `0-3 sec: ${generateHook(angle)}`,
    problem:
      "3-10 sec: You keep applying, but your resume may be missing proof, skills, or positioning.",
    insight:
      "10-20 sec: CareerScore works like a readiness check before the market judges your resume.",
    cta: `20-30 sec: Check your CareerScore before applying again: ${trackingLink}`,
    caption: generateCaption(trackingLink),
    hashtags: generateHashtags(),
    textOverlays: [
      "No callbacks?",
      "Find the gap first",
      "Check your CareerScore",
      "Apply again with clarity",
    ],
    platformFit: "YouTube Shorts, Instagram Reels, and Facebook short video.",
    voiceover: generateVoiceover(trackingLink),
    shotList: generateShotList(),
  };
}
