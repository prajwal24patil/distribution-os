export type ContentAsset = {
  assetType: string;
  platform: string;
  title: string;
  content: string;
  cta: string;
  previousChannelScore?: number;
  funnelBottleneck?: FunnelBottleneck;
};

export type FunnelBottleneck =
  | "no_clicks"
  | "clicks_no_signups"
  | "signups_no_uploads"
  | "uploads_no_paid"
  | "paid_no_referrals"
  | "winner_found";

export type ContentScore = {
  asset: ContentAsset;
  score: number;
  explanation: string;
};

function points(condition: boolean, value: number) {
  return condition ? value : 0;
}

function normalized(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function audiencePainClarity(text: string) {
  return normalized(
    points(text.includes("not getting shortlisted") || text.includes("callbacks"), 45) +
      points(text.includes("before applying"), 25) +
      points(text.includes("gap"), 20) +
      points(text.includes("freshers") || text.includes("job seekers"), 10),
  );
}

function platformFit(asset: ContentAsset) {
  const platform = asset.platform.toLowerCase();
  const type = asset.assetType.toLowerCase();

  return normalized(
    points(platform.includes("linkedin") && type.includes("linkedin"), 90) +
      points(platform.includes("reddit") && type.includes("reddit"), 90) +
      points(platform.includes("whatsapp") && type.includes("whatsapp"), 90) +
      points(platform.includes("seo") && type.includes("seo"), 90) +
      points(platform.includes("youtube") && type.includes("short"), 90) +
      points(platform.includes("instagram") && type.includes("caption"), 90) +
      points(platform.includes("landing") && type.includes("landing"), 90) +
      points(platform.includes("referral") && type.includes("referral"), 90) +
      10,
  );
}

function hookStrength(text: string) {
  return normalized(
    points(text.includes("most freshers"), 35) +
      points(text.includes("before applying to 100 jobs"), 35) +
      points(text.includes("cibil"), 20) +
      points(text.includes("?"), 10),
  );
}

function ctaClarity(text: string) {
  return normalized(
    points(text.includes("check your careerscore"), 55) +
      points(text.includes("try it"), 20) +
      points(text.includes("before applying again"), 25),
  );
}

function businessValuePotential(asset: ContentAsset) {
  const text = `${asset.title} ${asset.content} ${asset.cta}`.toLowerCase();

  return normalized(
    points(text.includes("inr 99") || text.includes("99"), 35) +
      points(text.includes("inr 199") || text.includes("199"), 35) +
      points(text.includes("paid") || text.includes("report"), 20) +
      points(asset.assetType.includes("referral"), 10),
  );
}

export function detectFunnelBottleneck({
  clicks,
  signups,
  resumeUploads = 0,
  paidUsers,
  referralShares = 0,
}: {
  clicks: number;
  signups: number;
  resumeUploads?: number;
  paidUsers: number;
  referralShares?: number;
}): FunnelBottleneck {
  if (clicks === 0) return "no_clicks";
  if (signups === 0) return "clicks_no_signups";
  if (resumeUploads === 0) return "signups_no_uploads";
  if (paidUsers === 0) return "uploads_no_paid";
  if (referralShares === 0) return "paid_no_referrals";
  return "winner_found";
}

export function bottleneckRecommendation(bottleneck: FunnelBottleneck) {
  if (bottleneck === "no_clicks") return "Create stronger hooks.";
  if (bottleneck === "clicks_no_signups") return "Fix the landing headline and CTA.";
  if (bottleneck === "signups_no_uploads") return "Improve the upload flow CTA.";
  if (bottleneck === "uploads_no_paid") return "Test the INR 99 and INR 199 report pitch.";
  if (bottleneck === "paid_no_referrals") return "Create a referral and share loop.";
  return "Create variations of the winning pattern.";
}

export function simulateContentPerformance(asset: ContentAsset): ContentScore {
  const text = `${asset.title} ${asset.content} ${asset.cta}`.toLowerCase();
  const qualityScore = normalized(
    audiencePainClarity(text) * 0.45 +
      points(text.includes("proof") || text.includes("skill") || text.includes("positioning"), 20) +
      points(text.includes("careerscore"), 20) +
      points(!text.includes("guaranteed") && !text.includes("viral"), 15),
  );
  const finalScore =
    qualityScore * 0.35 +
    platformFit(asset) * 0.2 +
    hookStrength(text) * 0.15 +
    ctaClarity(text) * 0.1 +
    normalized(asset.previousChannelScore ?? 0) * 0.15 +
    businessValuePotential(asset) * 0.05;

  return {
    asset,
    score: Math.round(normalized(finalScore)),
    explanation: explainRanking(asset, Math.round(normalized(finalScore))),
  };
}

export function rankContentAssets(assets: ContentAsset[]) {
  return assets.map(simulateContentPerformance).sort((a, b) => b.score - a.score);
}

export function selectTopAssets(assets: ContentAsset[], limit = 5) {
  return rankContentAssets(assets).slice(0, limit);
}

export function explainRanking(
  asset: ContentAsset,
  score = simulateContentPerformance(asset).score,
) {
  if (score >= 80) {
    return "Strong audience pain, platform fit, clear CareerScore fit, direct CTA, and low hype.";
  }

  if (score >= 60) {
    return "Useful asset with clear enough pain and CTA; can be tested manually.";
  }

  return "Needs sharper pain, specificity, or CTA before publishing.";
}
