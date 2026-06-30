export type PublisherPlatform =
  | "linkedin"
  | "x"
  | "google_business_profile"
  | "reddit"
  | "facebook_page"
  | "instagram_business"
  | "youtube"
  | "quora_manual"
  | "whatsapp_manual"
  | "email_manual"
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
  name: string;
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
  x: "Create X Developer app, request official posting permissions, connect OAuth.",
  google_business_profile:
    "Create Google Cloud app, enable Business Profile APIs, connect verified profile.",
  reddit: "Create Reddit app, connect OAuth.",
  facebook_page: "Create Meta app, connect Facebook Page, and request publishing permissions.",
  instagram_business:
    "Create Meta app, connect Instagram Business account, and request publishing permissions.",
  youtube: "Create Google Cloud OAuth app, enable YouTube Data API, connect channel.",
  quora_manual: "Manual Quora draft only. No auto-publishing.",
  whatsapp_manual: "Manual WhatsApp share only. No auto-sending.",
  email_manual: "Manual email draft only. No auto-sending.",
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
    return response(platform, "scheduled", "Blog publishing is handled internally.");
  }

  return connected
    ? response(
        platform,
        "official_integration_not_implemented",
        "Official connection exists, but this adapter is not implemented yet.",
      )
    : response(platform, "manual_approval_required", "Official account connection is required.");
}

function connectionReadyStubAdapter(platform: PublisherPlatform, name: string): PublisherAdapter {
  return {
    name,
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

export const BlogPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "blog",
  "BlogPublisherAdapter",
);
export const LinkedInPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "linkedin",
  "LinkedInPublisherAdapter",
);
export const XPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "x",
  "XPublisherAdapter",
);
export const GoogleBusinessProfilePublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "google_business_profile",
  "GoogleBusinessProfilePublisherAdapter",
);
export const RedditPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "reddit",
  "RedditPublisherAdapter",
);
export const FacebookPagePublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "facebook_page",
  "FacebookPagePublisherAdapter",
);
export const InstagramBusinessPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "instagram_business",
  "InstagramBusinessPublisherAdapter",
);
export const YouTubePublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "youtube",
  "YouTubePublisherAdapter",
);
export const QuoraManualPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "quora_manual",
  "QuoraManualPublisherAdapter",
);
export const WhatsAppManualPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "whatsapp_manual",
  "WhatsAppManualPublisherAdapter",
);
export const EmailManualPublisherAdapter: PublisherAdapter = connectionReadyStubAdapter(
  "email_manual",
  "EmailManualPublisherAdapter",
);

export const publisherAdapters: PublisherAdapter[] = [
  LinkedInPublisherAdapter,
  XPublisherAdapter,
  GoogleBusinessProfilePublisherAdapter,
  RedditPublisherAdapter,
  FacebookPagePublisherAdapter,
  InstagramBusinessPublisherAdapter,
  YouTubePublisherAdapter,
  QuoraManualPublisherAdapter,
  WhatsAppManualPublisherAdapter,
  EmailManualPublisherAdapter,
  BlogPublisherAdapter,
];

export function getPublisherNotice() {
  return "Official account connection required for auto-publishing. For now, approve and post manually.";
}

export function getPublisherAdapter(platform: string) {
  const normalized = platform.toLowerCase();

  if (normalized.includes("linkedin"))
    return publisherAdapters.find((adapter) => adapter.platform === "linkedin");
  if (normalized === "x" || normalized.includes("twitter"))
    return publisherAdapters.find((adapter) => adapter.platform === "x");
  if (normalized.includes("google"))
    return publisherAdapters.find((adapter) => adapter.platform === "google_business_profile");
  if (normalized.includes("reddit"))
    return publisherAdapters.find((adapter) => adapter.platform === "reddit");
  if (normalized.includes("facebook"))
    return publisherAdapters.find((adapter) => adapter.platform === "facebook_page");
  if (normalized.includes("quora"))
    return publisherAdapters.find((adapter) => adapter.platform === "quora_manual");
  if (normalized.includes("whatsapp"))
    return publisherAdapters.find((adapter) => adapter.platform === "whatsapp_manual");
  if (normalized.includes("email"))
    return publisherAdapters.find((adapter) => adapter.platform === "email_manual");
  if (normalized.includes("instagram"))
    return publisherAdapters.find((adapter) => adapter.platform === "instagram_business");
  if (normalized.includes("youtube"))
    return publisherAdapters.find((adapter) => adapter.platform === "youtube");
  if (normalized.includes("blog") || normalized.includes("seo")) {
    return publisherAdapters.find((adapter) => adapter.platform === "blog");
  }

  return publisherAdapters.find((adapter) => adapter.platform === "linkedin");
}
