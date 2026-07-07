import { placeholderOAuthStart } from "@/lib/oauthPlatform";

export function GET() {
  return placeholderOAuthStart("meta");
}
