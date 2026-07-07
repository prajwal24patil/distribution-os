import { placeholderOAuthCallback } from "@/lib/oauthPlatform";

export function GET() {
  return placeholderOAuthCallback("reddit");
}
