import { createClient } from "@/lib/supabase/server";
import type {
  PublishingConnectionPlatform,
  PublishingConnectionRow,
  PublishingConnectionStatus,
} from "@/lib/supabase/types";

export const publisherPlatforms: PublishingConnectionPlatform[] = [
  "linkedin",
  "x",
  "google_business_profile",
  "reddit",
  "facebook_page",
  "instagram_business",
  "youtube",
  "quora_manual",
  "whatsapp_manual",
  "email_manual",
  "blog",
];

export type PublisherConnectionView = {
  platform: PublishingConnectionPlatform;
  connection_status: PublishingConnectionStatus;
  account_name: string;
  can_auto_publish: boolean;
  explanation: string;
  setup_steps: string;
};

export function connectionCanAutoPublish(connection: PublishingConnectionRow | null | undefined) {
  return connection?.platform === "blog" || connection?.connection_status === "connected";
}

export function explainConnectionStatus(connection: PublishingConnectionRow | null | undefined) {
  if (!connection) return "Needs official connection";
  if (connection.platform === "blog") return "Auto-publish ready";

  const labels: Record<PublishingConnectionStatus, string> = {
    not_connected: "Needs official connection",
    connected: "Connected",
    expired: "Connection expired",
    manual_required: "Manual required",
    rate_limited: "Rate limited",
    permission_missing: "Permission missing",
    disabled: "Disabled",
    integration_not_ready: "Integration not ready",
  };

  return labels[connection.connection_status];
}

export function getMissingConnectionSteps(platform: PublishingConnectionPlatform) {
  const steps: Record<PublishingConnectionPlatform, string> = {
    linkedin: "Create LinkedIn Developer App, request Share on LinkedIn permission, connect OAuth.",
    x: "Create X Developer app, request official posting permissions, connect OAuth.",
    google_business_profile:
      "Create Google Cloud app, enable Business Profile APIs, connect the verified profile.",
    reddit: "Create Reddit app, connect OAuth, and keep replies helpful/manual until approved.",
    facebook_page:
      "Create Meta app, connect Facebook Page, and request official publishing permissions.",
    instagram_business:
      "Create Meta app, connect Instagram Business account, and request publishing permissions.",
    youtube: "Create Google Cloud OAuth app, enable YouTube Data API, connect channel.",
    quora_manual: "Prepare manual Quora answer drafts. Official auto-publishing is not enabled.",
    whatsapp_manual: "Prepare manual WhatsApp share text. Do not auto-send messages.",
    email_manual: "Prepare manual email drafts. Do not auto-send email.",
    blog: "Internal DistributionOS blog publishing is auto-publish ready.",
  };

  return steps[platform];
}

function toView(
  platform: PublishingConnectionPlatform,
  connection: PublishingConnectionRow | null | undefined,
): PublisherConnectionView {
  const syntheticConnection =
    connection ??
    ({
      platform,
      connection_status: platform === "blog" ? "connected" : "manual_required",
      account_name: "",
    } as PublishingConnectionRow);

  return {
    platform,
    connection_status: syntheticConnection.connection_status,
    account_name: syntheticConnection.account_name,
    can_auto_publish: connectionCanAutoPublish(syntheticConnection),
    explanation: explainConnectionStatus(syntheticConnection),
    setup_steps: getMissingConnectionSteps(platform),
  };
}

export async function listPublishingConnections(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publishing_connections")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  const connections = (data ?? []) as PublishingConnectionRow[];

  return publisherPlatforms.map((platform) =>
    toView(
      platform,
      connections.find((connection) => connection.platform === platform),
    ),
  );
}

export async function getPublishingConnection(
  projectId: string,
  platform: PublishingConnectionPlatform,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publishing_connections")
    .select("*")
    .eq("project_id", projectId)
    .eq("platform", platform)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return toView(platform, (data ?? null) as PublishingConnectionRow | null);
}
