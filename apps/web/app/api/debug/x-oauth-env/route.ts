import { NextResponse } from "next/server";

export function GET() {
  const clientId = process.env.X_CLIENT_ID?.trim() || "";

  return NextResponse.json({
    hasClientId: Boolean(clientId),
    clientIdPrefix: clientId.slice(0, 6),
    hasClientSecret: Boolean(process.env.X_CLIENT_SECRET?.trim()),
    redirectUri: process.env.X_REDIRECT_URI?.trim() || "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "",
  });
}
