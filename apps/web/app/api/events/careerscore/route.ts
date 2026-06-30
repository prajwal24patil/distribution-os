import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConversionEventType, ProjectRow, TrackingLinkRow } from "@/lib/supabase/types";

const allowedEvents: ConversionEventType[] = [
  "signup",
  "resume_upload",
  "free_score_generated",
  "payment_started",
  "paid_report",
  "referral_share",
];

type CareerScoreEventPayload = {
  event_type?: string;
  tracking_id?: string;
  email?: string;
  revenue?: number;
  metadata?: Record<string, unknown>;
};

type WebhookContext = {
  project_id: string;
  owner_id: string;
  tracking_link_id: string | null;
  campaign_item_id: string | null;
  source: string;
  platform: string;
  tracked: boolean;
  attributed: boolean;
};

type SafeFailure = {
  table: string;
  action: string;
  message: string;
};

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function safeFailure({ table, action, message }: SafeFailure, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        table,
        action,
        message,
      },
    },
    { status },
  );
}

function normalizeTrackingId(value = "") {
  const trimmed = value.trim();
  const pathMatch = trimmed.match(/\/t\/([^/?#]+)/);

  return (pathMatch?.[1] || trimmed.replace(/^\/?t\//, "")).trim();
}

function eventValue(payload: CareerScoreEventPayload) {
  if (payload.event_type === "paid_report" || payload.event_type === "payment_started") {
    const value = Number(payload.revenue ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  return 1;
}

function metadataString(payload: CareerScoreEventPayload, key: string) {
  const value = payload.metadata?.[key];
  return typeof value === "string" ? value : "";
}

async function findTrackingLink(
  supabase: ReturnType<typeof createAdminClient>,
  trackingId?: string,
) {
  if (!trackingId) return { trackingLink: null, failure: null };

  const normalized = normalizeTrackingId(trackingId);

  if (!normalized) return { trackingLink: null, failure: null };

  const { data, error } = await supabase
    .from("tracking_links")
    .select("*")
    .or(`id.eq.${normalized},tracking_url.eq./t/${normalized},tracking_url.eq.${normalized}`)
    .maybeSingle();

  if (error) {
    return {
      trackingLink: null,
      failure: { table: "tracking_links", action: "lookup", message: error.message },
    };
  }

  return { trackingLink: (data ?? null) as TrackingLinkRow | null, failure: null };
}

async function findCareerScoreProject(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .or("customer.ilike.%CareerScore%,name.ilike.%CareerScore%")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      project: null,
      failure: { table: "projects", action: "lookup", message: error.message },
    };
  }

  if (!data) {
    return {
      project: null,
      failure: {
        table: "projects",
        action: "lookup",
        message: "CareerScore project not found for unattributed webhook event.",
      },
    };
  }

  return { project: data as ProjectRow, failure: null };
}

async function buildWebhookContext({
  supabase,
  payload,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  payload: CareerScoreEventPayload;
}): Promise<{ context: WebhookContext | null; failure: SafeFailure | null }> {
  const { trackingLink, failure: trackingFailure } = await findTrackingLink(
    supabase,
    payload.tracking_id,
  );

  if (trackingFailure) {
    return { context: null, failure: trackingFailure };
  }

  if (trackingLink) {
    const { data: campaignItem, error: campaignError } = await supabase
      .from("campaign_items")
      .select("id, channel")
      .eq("id", trackingLink.campaign_item_id)
      .maybeSingle();

    if (campaignError) {
      return {
        context: null,
        failure: { table: "campaign_items", action: "lookup", message: campaignError.message },
      };
    }

    return {
      context: {
        project_id: trackingLink.project_id,
        owner_id: trackingLink.owner_id,
        tracking_link_id: trackingLink.id,
        campaign_item_id: trackingLink.campaign_item_id,
        source: trackingLink.utm_source || metadataString(payload, "source") || "careerscore",
        platform: campaignItem?.channel || trackingLink.utm_source || "careerscore",
        tracked: true,
        attributed: true,
      },
      failure: null,
    };
  }

  const { project, failure: projectFailure } = await findCareerScoreProject(supabase);

  if (projectFailure || !project) {
    return { context: null, failure: projectFailure };
  }

  return {
    context: {
      project_id: project.id,
      owner_id: project.user_id,
      tracking_link_id: null,
      campaign_item_id: null,
      source: metadataString(payload, "source") || "careerscore",
      platform: metadataString(payload, "platform") || "careerscore",
      tracked: Boolean(payload.tracking_id),
      attributed: false,
    },
    failure: null,
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.CAREERSCORE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return safeFailure({
      table: "environment",
      action: "validate",
      message: "CAREERSCORE_WEBHOOK_SECRET is not configured.",
    });
  }

  if (request.headers.get("x-careerscore-secret") !== webhookSecret) {
    return unauthorized();
  }

  try {
    const payload = (await request.json()) as CareerScoreEventPayload;

    if (!payload.event_type || !allowedEvents.includes(payload.event_type as ConversionEventType)) {
      return badRequest("Unsupported event_type.");
    }

    const supabase = createAdminClient();
    const { context, failure } = await buildWebhookContext({ supabase, payload });

    if (failure || !context) {
      return safeFailure(
        failure || {
          table: "projects",
          action: "lookup",
          message: "Webhook context could not be resolved.",
        },
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("conversion_events")
      .insert({
        project_id: context.project_id,
        owner_id: context.owner_id,
        tracking_link_id: context.tracking_link_id,
        campaign_item_id: context.campaign_item_id,
        event_type: payload.event_type as ConversionEventType,
        event_value: eventValue(payload),
        source: context.source,
        platform: context.platform,
      })
      .select("id, event_type, event_value")
      .single();

    if (eventError || !event) {
      return safeFailure({
        table: "conversion_events",
        action: "insert",
        message: eventError?.message || "Conversion event could not be saved.",
      });
    }

    return NextResponse.json({
      ok: true,
      event_type: event.event_type,
      tracked: context.tracked,
      attributed: context.attributed,
    });
  } catch (error) {
    return safeFailure({
      table: "webhook",
      action: "process",
      message: error instanceof Error ? error.message : "CareerScore webhook failed.",
    });
  }
}
