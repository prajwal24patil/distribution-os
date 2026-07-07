import { startXOAuth } from "@/lib/oauthPlatform";

export async function GET(request: Request) {
  return startXOAuth(request);
}
