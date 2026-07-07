import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function ok(condition, message) {
  if (!condition) {
    console.error(`not ok - ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`ok - ${message}`);
}

const packageJson = JSON.parse(read("package.json"));
ok(packageJson.scripts["test:oauth-foundation"], "npm script test:oauth-foundation exists");

for (const route of [
  "x/start",
  "x/callback",
  "linkedin/start",
  "linkedin/callback",
  "youtube/start",
  "youtube/callback",
  "google-business/start",
  "google-business/callback",
  "meta/start",
  "meta/callback",
  "reddit/start",
  "reddit/callback",
]) {
  ok(exists(`apps/web/app/api/oauth/${route}/route.ts`), `OAuth route exists: ${route}`);
}

const oauth = read("apps/web/lib/oauthPlatform.ts");
const vault = read("apps/web/lib/platformTokenVault.ts");
const settings = read("apps/web/app/projects/[id]/settings/page.tsx");
const migration = read("database/migrations/0020_create_official_social_oauth_foundation.sql");
const types = read("apps/web/lib/supabase/types.ts");
const debugRoute = read("apps/web/app/api/debug/platform-status/route.ts");

ok(oauth.includes("startXOAuth"), "X OAuth start helper exists");
ok(oauth.includes("handleXOAuthCallback"), "X OAuth callback helper exists");
ok(oauth.includes("projectId"), "X OAuth start accepts projectId");
ok(oauth.includes("customerId"), "X OAuth state preserves customer context");
ok(oauth.includes("workspaceId"), "X OAuth state preserves workspace context");
ok(oauth.includes('connected: "x"'), "X OAuth callback redirects with connected=x");
ok(oauth.includes("X_CLIENT_SECRET"), "X OAuth validates X_CLIENT_SECRET");
ok(oauth.includes("X_REDIRECT_URI"), "X OAuth validates X_REDIRECT_URI");
ok(oauth.includes("https://api.x.com/2/oauth2/token"), "X OAuth uses api.x.com token endpoint");
ok(oauth.includes("x_oauth_state"), "X OAuth stores state cookie");
ok(oauth.includes("x_oauth_project_id"), "X OAuth stores project cookie");
ok(oauth.includes("stateMatches"), "X OAuth validates stored state");
ok(oauth.includes("useBasicAuth: true"), "X OAuth first tries confidential Basic auth");
ok(oauth.includes("useBasicAuth: false"), "X OAuth retries without Basic auth");
ok(oauth.includes("client_secret"), "X OAuth retry can send client_secret in form body");
ok(oauth.includes("logSafeTokenExchangeFailure"), "X OAuth logs safe token diagnostics");
ok(oauth.includes("invalid_client"), "X OAuth detects invalid_client");
ok(oauth.includes("redirect_uri_mismatch"), "X OAuth detects redirect URI mismatch");
ok(oauth.includes("DistributionOS CareerScore"), "X OAuth explains likely wrong app client secret");
ok(oauth.includes("code_challenge"), "X OAuth uses PKCE");
ok(oauth.includes("x_oauth_code_verifier"), "X OAuth verifier is stored in httpOnly cookie");
ok(oauth.includes("encryptPlatformToken"), "X OAuth encrypts tokens before save");
ok(oauth.includes("access_token_encrypted"), "X OAuth saves encrypted access token field");
ok(oauth.includes("refresh_token_encrypted"), "X OAuth saves encrypted refresh token field");
ok(!settings.includes("access_token_encrypted"), "Settings does not render access token fields");
ok(!settings.includes("refresh_token_encrypted"), "Settings does not render refresh token fields");
ok(vault.includes("PLATFORM_TOKEN_ENCRYPTION_KEY"), "token vault requires encryption key");
ok(vault.includes("throw new Error"), "missing encryption key blocks token save");
ok(vault.includes("aes-256-gcm"), "token vault uses authenticated encryption");
ok(migration.includes("access_token_encrypted"), "migration adds encrypted access token column");
ok(migration.includes("refresh_token_encrypted"), "migration adds encrypted refresh token column");
ok(types.includes("access_token_encrypted: string"), "types include encrypted access token");
ok(settings.includes("Connect X"), "Settings shows X connect button");
ok(settings.includes("projectId="), "Settings links to projectId OAuth start URL");
ok(settings.includes("X env configured"), "Settings shows X env diagnostic");
ok(settings.includes("X token connected"), "Settings shows X token diagnostic");
ok(settings.includes("X auto-publish ready"), "Settings shows X auto-publish diagnostic");
ok(settings.includes("View safe debug status"), "Settings links to safe debug status");
ok(settings.includes("Disconnect"), "Settings shows disconnect button");
ok(settings.includes("Reconnect"), "Settings shows reconnect button");
ok(settings.includes("Connect soon"), "Settings shows non-X placeholders");
ok(settings.includes("Auto-publish ready"), "Settings keeps blog auto-publish ready");
ok(oauth.includes("placeholderOAuthStart"), "non-X OAuth routes are placeholders");
ok(oauth.includes("manual_required"), "non-X OAuth placeholders stay manual required");
ok(debugRoute.includes("access_token_encrypted"), "debug route checks token presence");
ok(!debugRoute.includes("refresh_token_encrypted"), "debug route does not expose refresh tokens");
ok(debugRoute.includes("token_connected: Boolean"), "debug route returns token boolean only");
ok(debugRoute.includes("latest_token_expiry_exists"), "debug route shows token expiry presence");
ok(debugRoute.includes("auto_publish_ready"), "debug route shows X auto-publish readiness");

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("\nOAuth foundation QA passed.");
