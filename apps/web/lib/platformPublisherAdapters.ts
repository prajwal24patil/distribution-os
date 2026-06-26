import { publishInternalBlogPost } from "@/lib/blogPublisher";
import type { PublishingConnectionRow, ScheduledPostRow } from "@/lib/supabase/types";

export type PlatformPublishResult = {
  status:
    | "published"
    | "manual_required"
    | "integration_not_ready"
    | "permission_missing"
    | "expired"
    | "rate_limited"
    | "failed";
  platform: string;
  published_url: string;
  safe_error_message: string;
  token_exposed: false;
};

export type PublisherAsset = {
  title: string;
  content: string;
  tracking_link: string;
  platform: string;
};

export type PlatformPublisherAdapter = {
  platform: string;
  validateConnection: (connection?: PublishingConnectionRow | null) => PlatformPublishResult;
  validateAsset: (asset: PublisherAsset) => PlatformPublishResult;
  publish: (
    asset: PublisherAsset,
    connection?: PublishingConnectionRow | null,
    scheduledPost?: ScheduledPostRow,
  ) => Promise<PlatformPublishResult>;
  schedule: (asset: PublisherAsset, scheduledFor: string) => PlatformPublishResult;
  getPublishStatus: (id: string) => PlatformPublishResult;
  recoverFailure: (errorCode: string) => PlatformPublishResult;
};

function result(
  platform: string,
  status: PlatformPublishResult["status"],
  safeError = "",
  publishedUrl = "",
): PlatformPublishResult {
  return {
    status,
    platform,
    published_url: publishedUrl,
    safe_error_message: safeError,
    token_exposed: false,
  };
}

function validateOfficialConnection(platform: string, connection?: PublishingConnectionRow | null) {
  if (!connection || connection.connection_status === "manual_required") {
    return result(platform, "manual_required", "Official connection required.");
  }

  if (connection.connection_status === "expired") {
    return result(platform, "expired", "Token expired. Reconnect required.");
  }

  if (connection.connection_status === "permission_missing") {
    return result(platform, "permission_missing", "Required publishing permission missing.");
  }

  if (connection.connection_status === "rate_limited") {
    return result(platform, "rate_limited", "Platform rate limit active.");
  }

  if (connection.connection_status !== "connected") {
    return result(platform, "integration_not_ready", "Official integration is not ready.");
  }

  return result(platform, "integration_not_ready", "Official adapter stub; not publishing yet.");
}

function validateAsset(platform: string, asset: PublisherAsset) {
  if (!asset.tracking_link) return result(platform, "failed", "Tracking link is required.");
  if (!asset.content || !asset.title)
    return result(platform, "failed", "Title and content are required.");
  return result(platform, "integration_not_ready", "Asset shape is valid.");
}

function manualAdapter(platform: string): PlatformPublisherAdapter {
  return {
    platform,
    validateConnection: (connection) => validateOfficialConnection(platform, connection),
    validateAsset: (asset) => validateAsset(platform, asset),
    publish: async (_asset, connection) => validateOfficialConnection(platform, connection),
    schedule: () => result(platform, "manual_required", "Create a manual posting task."),
    getPublishStatus: () =>
      result(platform, "manual_required", "Manual status must be updated by founder."),
    recoverFailure: (errorCode) =>
      result(platform, "manual_required", `Manual fallback created for ${errorCode}.`),
  };
}

export const BlogPublisherAdapter: PlatformPublisherAdapter = {
  platform: "blog",
  validateConnection: () => result("blog", "published", ""),
  validateAsset: (asset) => validateAsset("blog", asset),
  publish: async (asset, _connection, scheduledPost) => {
    if (!scheduledPost)
      return result("blog", "integration_not_ready", "Scheduled blog post required.");
    const publishedUrl = await publishInternalBlogPost(scheduledPost);
    void asset;
    return result("blog", "published", "", publishedUrl);
  },
  schedule: () => result("blog", "published", "Blog is scheduled through existing scheduler."),
  getPublishStatus: () => result("blog", "published", ""),
  recoverFailure: () => result("blog", "manual_required", "Retry blog once, then mark warning."),
};

export const LinkedInPublisherAdapter = manualAdapter("linkedin");
export const XPublisherAdapter = manualAdapter("x");
export const GoogleBusinessProfilePublisherAdapter = manualAdapter("google_business_profile");
export const RedditPublisherAdapter = manualAdapter("reddit");
export const FacebookPagePublisherAdapter = manualAdapter("facebook_page");
export const InstagramBusinessPublisherAdapter = manualAdapter("instagram_business");
export const YouTubePublisherAdapter = manualAdapter("youtube");
export const EmailManualPublisherAdapter = manualAdapter("email_manual");
export const ManualPublisherAdapter = manualAdapter("manual");

export const platformPublisherAdapters = [
  BlogPublisherAdapter,
  LinkedInPublisherAdapter,
  XPublisherAdapter,
  GoogleBusinessProfilePublisherAdapter,
  RedditPublisherAdapter,
  FacebookPagePublisherAdapter,
  InstagramBusinessPublisherAdapter,
  YouTubePublisherAdapter,
  EmailManualPublisherAdapter,
  ManualPublisherAdapter,
];
