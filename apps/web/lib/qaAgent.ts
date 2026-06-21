export type QaResult = {
  status: "approved" | "rejected";
  reason: string;
};

const blockedPhrases = [
  "guaranteed",
  "guaranteed viral",
  "get rich",
  "instant success",
  "100% placement",
  "six figure salary",
  "dream job guaranteed",
  "life changing opportunity",
  "unlock your potential",
  "hustle harder",
  "fake it",
  "spam",
  "dm everyone",
  ["market value", "skill gaps", "best career path"].join(", "),
];

export function qaContentAsset({
  content,
  cta,
  trackingLink,
  platform,
}: {
  content: string;
  cta?: string;
  trackingLink?: string;
  platform?: string;
}): QaResult {
  const text = `${content} ${cta ?? ""}`.trim();
  const lower = text.toLowerCase();
  const blocked = blockedPhrases.find((phrase) => lower.includes(phrase.toLowerCase()));

  if (blocked) {
    return { status: "rejected", reason: `Rejected for unsafe or robotic phrase: ${blocked}` };
  }

  if (text.length < 40) {
    return { status: "rejected", reason: "Rejected because the asset is too thin to be useful." };
  }

  if (
    !lower.includes("shortlisted") &&
    !lower.includes("callbacks") &&
    !lower.includes("resume") &&
    !lower.includes("career readiness")
  ) {
    return { status: "rejected", reason: "Rejected because it lacks specific CareerScore pain." };
  }

  if (!lower.includes("careerscore")) {
    return {
      status: "rejected",
      reason: "Rejected because it is not clearly CareerScore relevant.",
    };
  }

  if (!cta && !lower.includes("check") && !lower.includes("try it")) {
    return { status: "rejected", reason: "Rejected because it has no clear CTA." };
  }

  if (!trackingLink) {
    return { status: "rejected", reason: "Rejected because it has no tracking link." };
  }

  if ((platform ?? "").toLowerCase().includes("reddit") && lower.includes("buy now")) {
    return {
      status: "rejected",
      reason: "Rejected because the community reply is too sales-heavy.",
    };
  }

  if (text.length > 2800) {
    return { status: "rejected", reason: "Rejected because it is too long for a first test." };
  }

  return {
    status: "approved",
    reason: "Useful, specific, platform-fit, CareerScore relevant, and safe to queue.",
  };
}

export function qaContentBatch<
  T extends { content: string; cta?: string; trackingUrl?: string; platform?: string },
>(assets: T[]) {
  return assets.map((asset) => ({
    ...asset,
    qa: qaContentAsset({
      content: asset.content,
      cta: asset.cta,
      trackingLink: asset.trackingUrl,
      platform: asset.platform,
    }),
  }));
}
