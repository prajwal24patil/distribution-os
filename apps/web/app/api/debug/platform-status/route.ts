import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function envConfigured(key: string) {
  return Boolean(process.env[key]?.trim());
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") || url.searchParams.get("project_id") || "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const [connectionsResult, scheduledResult, autopilotResult] = await Promise.all([
    supabase
      .from("publishing_connections")
      .select(
        "platform, connection_status, account_name, access_token_encrypted, token_expires_at, last_error",
      )
      .eq("project_id", projectId)
      .eq("owner_id", user.id),
    supabase
      .from("scheduled_posts")
      .select("platform, status, published_url, failure_reason, updated_at")
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("distribution_cycles")
      .select(
        "status, content_created_count, content_approved_count, content_rejected_count, published_count, queued_count, learning_summary, created_at",
      )
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (connectionsResult.error || scheduledResult.error || autopilotResult.error) {
    return NextResponse.json(
      {
        error: "Status lookup failed.",
        details: [
          connectionsResult.error?.message,
          scheduledResult.error?.message,
          autopilotResult.error?.message,
        ].filter(Boolean),
      },
      { status: 500 },
    );
  }

  const connections = connectionsResult.data ?? [];
  const xConnection = connections.find((connection) => connection.platform === "x");

  return NextResponse.json({
    ok: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: envConfigured("NEXT_PUBLIC_SUPABASE_URL"),
      CRON_SECRET: envConfigured("CRON_SECRET"),
      CAREERSCORE_WEBHOOK_SECRET: envConfigured("CAREERSCORE_WEBHOOK_SECRET"),
      NEXT_PUBLIC_APP_URL: envConfigured("NEXT_PUBLIC_APP_URL"),
      X_CLIENT_ID: envConfigured("X_CLIENT_ID"),
      X_CLIENT_SECRET: envConfigured("X_CLIENT_SECRET"),
      X_REDIRECT_URI: envConfigured("X_REDIRECT_URI"),
      PLATFORM_TOKEN_ENCRYPTION_KEY: envConfigured("PLATFORM_TOKEN_ENCRYPTION_KEY"),
    },
    connected_platforms: connections.map((connection) => ({
      platform: connection.platform,
      status: connection.connection_status,
      account_name: connection.account_name,
      token_connected: Boolean(connection.access_token_encrypted),
      token_expiry_exists: Boolean(connection.token_expires_at),
    })),
    x: {
      env_configured:
        envConfigured("X_CLIENT_ID") &&
        envConfigured("X_CLIENT_SECRET") &&
        envConfigured("X_REDIRECT_URI") &&
        envConfigured("PLATFORM_TOKEN_ENCRYPTION_KEY"),
      account_connected: Boolean(xConnection?.access_token_encrypted),
      auto_publish_ready:
        xConnection?.connection_status === "connected" &&
        Boolean(xConnection?.access_token_encrypted),
      latest_token_expiry_exists: Boolean(xConnection?.token_expires_at),
      status: xConnection?.connection_status || "manual_required",
      last_error: xConnection?.last_error || "",
    },
    last_publisher_result: scheduledResult.data?.[0] ?? null,
    last_autopilot_result: autopilotResult.data?.[0] ?? null,
  });
}
