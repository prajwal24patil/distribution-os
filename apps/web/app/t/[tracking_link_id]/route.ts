import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TrackingRouteProps = {
  params: Promise<{
    tracking_link_id: string;
  }>;
};

const CAREERSCORE_FALLBACK_URL = "https://incomeos-theta.vercel.app/";

function validDestinationUrl(destinationUrl: string) {
  try {
    return new URL(destinationUrl).toString();
  } catch {
    return "";
  }
}

function destinationWithUtm({
  destinationUrl,
  source,
  medium,
  campaign,
  content,
}: {
  destinationUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
}) {
  const url = new URL(validDestinationUrl(destinationUrl) || CAREERSCORE_FALLBACK_URL);

  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);

  return url.toString();
}

export async function GET(_request: Request, { params }: TrackingRouteProps) {
  const { tracking_link_id: trackingLinkId } = await params;
  const supabase = await createClient();

  const { data: trackingLink, error } = await supabase
    .from("tracking_links")
    .select("*")
    .eq("id", trackingLinkId)
    .single();

  if (error || !trackingLink) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  let destinationUrl = validDestinationUrl(trackingLink.destination_url);

  if (!destinationUrl) {
    const { data: memory } = await supabase
      .from("product_memory")
      .select("website_url")
      .eq("project_id", trackingLink.project_id)
      .eq("owner_id", trackingLink.owner_id)
      .maybeSingle();

    destinationUrl = validDestinationUrl(memory?.website_url || "") || CAREERSCORE_FALLBACK_URL;
  }

  await supabase.from("click_events").insert({
    tracking_link_id: trackingLink.id,
    project_id: trackingLink.project_id,
    owner_id: trackingLink.owner_id,
    source: trackingLink.utm_source,
    medium: trackingLink.utm_medium,
    campaign: trackingLink.utm_campaign,
    content: trackingLink.utm_content,
  });

  await supabase.from("conversion_events").insert({
    tracking_link_id: trackingLink.id,
    campaign_item_id: trackingLink.campaign_item_id,
    project_id: trackingLink.project_id,
    owner_id: trackingLink.owner_id,
    event_type: "click",
    event_value: 1,
    source: trackingLink.utm_source,
    platform: trackingLink.utm_source,
  });

  await supabase
    .from("tracking_links")
    .update({ clicks: trackingLink.clicks + 1 })
    .eq("id", trackingLink.id);

  return NextResponse.redirect(
    destinationWithUtm({
      destinationUrl,
      source: trackingLink.utm_source,
      medium: trackingLink.utm_medium,
      campaign: trackingLink.utm_campaign,
      content: trackingLink.utm_content,
    }),
  );
}
