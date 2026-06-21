import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConversionEventType, TrackingLinkRow } from "@/lib/supabase/types";

const allowedEvents: ConversionEventType[] = [
  "signup",
  "resume_upload",
  "free_score_generated",
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

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeTrackingId(value: string) {
  return value.trim().replace(/^\/?t\//, "");
}

async function findTrackingLink(trackingId: string) {
  const supabase = createAdminClient();
  const normalized = normalizeTrackingId(trackingId);
  const { data, error } = await supabase
    .from("tracking_links")
    .select("*")
    .or(`id.eq.${normalized},tracking_url.eq./t/${normalized},tracking_url.eq.${normalized}`)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as TrackingLinkRow | null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.CAREERSCORE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "CAREERSCORE_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (request.headers.get("x-careerscore-secret") !== webhookSecret) {
    return unauthorized();
  }

  let payload: CareerScoreEventPayload;

  try {
    payload = (await request.json()) as CareerScoreEventPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  if (!payload.event_type || !allowedEvents.includes(payload.event_type as ConversionEventType)) {
    return badRequest("Unsupported event_type.");
  }

  if (!payload.tracking_id) {
    return badRequest("tracking_id is required.");
  }

  const trackingLink = await findTrackingLink(payload.tracking_id);

  if (!trackingLink) {
    return NextResponse.json({ error: "Tracking link not found." }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: campaignItem } = await supabase
    .from("campaign_items")
    .select("id, channel")
    .eq("id", trackingLink.campaign_item_id)
    .maybeSingle();
  const eventType = payload.event_type as ConversionEventType;
  const eventValue = eventType === "paid_report" ? Number(payload.revenue ?? 0) : 1;
  const { data: event, error: eventError } = await supabase
    .from("conversion_events")
    .insert({
      project_id: trackingLink.project_id,
      owner_id: trackingLink.owner_id,
      tracking_link_id: trackingLink.id,
      campaign_item_id: trackingLink.campaign_item_id,
      event_type: eventType,
      event_value: Number.isFinite(eventValue) ? eventValue : 0,
      source: trackingLink.utm_source,
      platform: campaignItem?.channel || trackingLink.utm_source,
    })
    .select("id, event_type, event_value")
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { error: eventError?.message || "Conversion event could not be saved." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    event_id: event.id,
    event_type: event.event_type,
    event_value: event.event_value,
    project_id: trackingLink.project_id,
    tracking_link_id: trackingLink.id,
  });
}
