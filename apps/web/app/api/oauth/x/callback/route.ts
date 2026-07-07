import { handleXOAuthCallback } from "@/lib/oauthPlatform";

export async function GET(request: Request) {
  return handleXOAuthCallback(request);
}
