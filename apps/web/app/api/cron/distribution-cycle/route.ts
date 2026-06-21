import { NextResponse } from "next/server";
import { runPublishingWorker } from "@/lib/publishingWorker";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (token !== cronSecret) {
    return unauthorized();
  }

  const publishing = await runPublishingWorker();

  return NextResponse.json({
    ok: true,
    dailyCycles: 0,
    note: "Project-wide daily cycles need a server-side project selector before cron is enabled.",
    publishing,
  });
}
