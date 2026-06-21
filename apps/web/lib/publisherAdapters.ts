export type PublisherPlatform =
  | "linkedin"
  | "reddit"
  | "facebook"
  | "instagram"
  | "youtube"
  | "blog";

export type PublisherStatus =
  | "manual_approval_required"
  | "official_integration_not_implemented"
  | "published"
  | "scheduled"
  | "failed";

export type PublisherAdapterResponse = {
  status: PublisherStatus;
  platform: PublisherPlatform;
  reason: string;
  exact_setup_needed: string;
};

export type PreparedPost = {
  title: string;
  content: string;
  trackingUrl: string;
};

export type BasicPublisherMetrics = {
  views: number;
  clicks: number;
  signups: number;
  revenue: number;
};

export type PublisherAdapter = {
  platform: PublisherPlatform;
  validateConnection: (connected?: boolean) => PublisherAdapterResponse;
  prepareContent: (post: PreparedPost, connected?: boolean) => PublisherAdapterResponse;
  schedulePost: (
    post: PreparedPost,
    scheduledFor?: string,
    connected?: boolean,
  ) => PublisherAdapterResponse;
  preparePost: (post: PreparedPost, connected?: boolean) => PublisherAdapterResponse;
  publishPost: (post: PreparedPost, connected?: boolean) => PublisherAdapterResponse;
  getPostStatus: (id: string) => PublisherAdapterResponse;
  getPublishStatus: (id: string) => PublisherAdapterResponse;
  fetchBasicMetrics: (id: string) => PublisherAdapterResponse | BasicPublisherMetrics;
};

const setupNeeded: Record<PublisherPlatform, string> = {
  linkedin: "Create LinkedIn Developer App, request Share on LinkedIn permission, connect OAuth.",
  reddit: "Create Reddit app, connect OAuth.",
  facebook: "Create Meta app, connect Facebook page, request required publishing permissions.",
  instagram:
    "Create Meta app, connect Instagram business account, request required publishing permissions.",
  youtube: "Create Google Cloud OAuth app, enable YouTube Data API, connect channel.",
  blog: "Internal DistributionOS blog publishing is ready.",
};

function response(
  platform: PublisherPlatform,
  status: PublisherStatus,
  reason: string,
): PublisherAdapterResponse {
  return {
    status,
    platform,
    reason,
    exact_setup_needed: setupNeeded[platform],
  };
}

function connectionStatus(platform: PublisherPlatform, connected?: boolean) {
  if (platform === "blog") {
    return response(platform, "published", "Blog publishing is handled internally.");
  }

  return connected
    ? response(
        platform,
        "official_integration_not_implemented",
        "Official connection exists, but this adapter is not implemented yet.",
      )
    : response(platform, "manual_approval_required", "Official account connection is required.");
}

function manualAdapter(platform: PublisherPlatform): PublisherAdapter {
  return {
    platform,
    validateConnection: (connected) => connectionStatus(platform, connected),
    prepareContent: (_post, connected) => connectionStatus(platform, connected),
    schedulePost: (_post, _scheduledFor, connected) => connectionStatus(platform, connected),
    preparePost: (_post, connected) => connectionStatus(platform, connected),
    publishPost: (_post, connected) => connectionStatus(platform, connected),
    getPostStatus: () => connectionStatus(platform, false),
    getPublishStatus: () => connectionStatus(platform, false),
    fetchBasicMetrics: () => connectionStatus(platform, false),
  };
}

export const publisherAdapters: PublisherAdapter[] = [
  manualAdapter("linkedin"),
  manualAdapter("reddit"),
  manualAdapter("facebook"),
  manualAdapter("instagram"),
  manualAdapter("youtube"),
  manualAdapter("blog"),
];

export function getPublisherNotice() {
  return "Official account connection required for auto-publishing. For now, approve and post manually.";
}

export function getPublisherAdapter(platform: string) {
  const normalized = platform.toLowerCase();

  if (normalized.includes("linkedin"))
    return publisherAdapters.find((adapter) => adapter.platform === "linkedin");
  if (normalized.includes("reddit"))
    return publisherAdapters.find((adapter) => adapter.platform === "reddit");
  if (normalized.includes("facebook"))
    return publisherAdapters.find((adapter) => adapter.platform === "facebook");
  if (normalized.includes("instagram"))
    return publisherAdapters.find((adapter) => adapter.platform === "instagram");
  if (normalized.includes("youtube"))
    return publisherAdapters.find((adapter) => adapter.platform === "youtube");
  if (normalized.includes("blog") || normalized.includes("seo")) {
    return publisherAdapters.find((adapter) => adapter.platform === "blog");
  }

  return publisherAdapters.find((adapter) => adapter.platform === "linkedin");
}
