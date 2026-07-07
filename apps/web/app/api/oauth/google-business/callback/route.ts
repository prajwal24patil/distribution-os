import { placeholderOAuthCallback } from "@/lib/oauthPlatform";

export function GET() {
  return placeholderOAuthCallback("google_business_profile");
}
