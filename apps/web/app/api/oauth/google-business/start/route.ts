import { placeholderOAuthStart } from "@/lib/oauthPlatform";

export function GET() {
  return placeholderOAuthStart("google_business_profile");
}
