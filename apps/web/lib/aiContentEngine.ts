type ContentInput = {
  productName?: string;
  angle?: string;
  trackingUrl?: string;
};

const defaultAngles = [
  "CareerScore like CIBIL for career",
  "freshers not getting shortlisted",
  "salary gap",
  "skill gap",
  "job readiness",
  "INR 99 detailed report",
  "INR 199 advanced report",
  "shareable CareerScore badge",
  "referral invite friend",
];

function productName(input?: ContentInput) {
  return input?.productName || "CareerScore";
}

function angle(input?: ContentInput) {
  return input?.angle || defaultAngles[0];
}

function tracking(input?: ContentInput) {
  return input?.trackingUrl || "[tracking link]";
}

function extractText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.output_text === "string") {
    return record.output_text.trim();
  }

  const candidates = record.candidates;

  if (Array.isArray(candidates)) {
    const first = candidates[0] as Record<string, unknown> | undefined;
    const content = first?.content as Record<string, unknown> | undefined;
    const parts = content?.parts;

    if (Array.isArray(parts)) {
      const text = parts
        .map((part) =>
          part && typeof part === "object" ? (part as Record<string, unknown>).text : null,
        )
        .filter((part): part is string => typeof part === "string")
        .join("\n")
        .trim();

      return text || null;
    }
  }

  return null;
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
    }),
  });

  if (!response.ok) {
    return null;
  }

  return extractText(await response.json());
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  return extractText(await response.json());
}

async function maybeGenerateWithProvider(prompt: string) {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    return (await callGemini(prompt)) || (await callOpenAI(prompt));
  } catch {
    return null;
  }
}

export async function improveCampaignContent(content: string) {
  return (
    (await maybeGenerateWithProvider(`Improve this campaign content: ${content}`)) ||
    `${content}\n\nCheck your CareerScore before your next application.`
  );
}

export async function generateHooks(input?: ContentInput) {
  return (
    (await maybeGenerateWithProvider(
      `Generate hooks for ${productName(input)} and ${angle(input)}`,
    )) || [
      "Most freshers don't know why they're not getting shortlisted.",
      "Before applying to 100 jobs, find the gap.",
      "Your resume may look complete and still miss job-ready proof.",
      "A salary gap often starts with a skill gap you cannot see yet.",
      "CareerScore is like a CIBIL score for your career readiness.",
    ]
  );
}

export async function generateCTAs(input?: ContentInput) {
  return (
    (await maybeGenerateWithProvider(`Generate CTAs for ${productName(input)}`)) || [
      `Check your score: ${tracking(input)}`,
      `Find your career readiness gap: ${tracking(input)}`,
      `Unlock your INR 99 detailed report: ${tracking(input)}`,
      `Try the INR 199 advanced report: ${tracking(input)}`,
      `Share your CareerScore with a friend: ${tracking(input)}`,
    ]
  );
}

export async function generateBlogOutline(input?: ContentInput) {
  return (
    (await maybeGenerateWithProvider(`Generate SEO outline for ${angle(input)}`)) ||
    [
      "Title: Why freshers are not getting shortlisted and how to fix the gap",
      "Intro: getting ignored after applications is frustrating, but it usually has a pattern",
      "Section 1: the common gaps behind no callbacks",
      "Section 2: how a career readiness score helps you focus",
      "Section 3: what to fix before applying again",
      `CTA: ${tracking(input)}`,
    ].join("\n")
  );
}

export async function generateYouTubeShortScript(input?: ContentInput) {
  return (
    (await maybeGenerateWithProvider(`Generate YouTube Shorts script for ${angle(input)}`)) ||
    `Hook: Applying everywhere but no callbacks?\nPoint: Your resume may not show enough job-ready proof yet.\nCTA: Check your CareerScore before your next application: ${tracking(input)}`
  );
}

export async function generateRedditReply(input?: ContentInput) {
  return (
    (await maybeGenerateWithProvider(`Generate Reddit reply for ${angle(input)}`)) ||
    `If you are not getting shortlisted, do not just rewrite the resume again. First check whether the gap is skills, proof, role fit, or readiness. ${productName(
      input,
    )} can help you find that gap before applying again: ${tracking(input)}`
  );
}

export async function generateWhatsAppMessage(input?: ContentInput) {
  return (
    (await maybeGenerateWithProvider(`Generate WhatsApp message for ${angle(input)}`)) ||
    `Quick one: if you are applying to jobs but not getting shortlisted, check your CareerScore first. It shows the gap to fix before applying again: ${tracking(input)}`
  );
}

export async function generatePlatformSpecificVariants(input?: ContentInput) {
  const hooks = await generateHooks(input);

  return [
    {
      platform: "LinkedIn",
      content: `${hooks[0]}\n\nCareerScore helps you find the gap before applying again.\n\n${tracking(input)}`,
    },
    { platform: "Reddit", content: await generateRedditReply(input) },
    { platform: "WhatsApp", content: await generateWhatsAppMessage(input) },
    { platform: "SEO Blog", content: await generateBlogOutline(input) },
    { platform: "YouTube Shorts", content: await generateYouTubeShortScript(input) },
    {
      platform: "Instagram/Facebook",
      content: `${hooks[1]}\n\nCheck your CareerScore and fix the right gap first.\n\n${tracking(input)}`,
    },
  ];
}
