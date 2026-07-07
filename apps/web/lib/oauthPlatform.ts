import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  encryptPlatformToken,
  assertPlatformTokenEncryptionConfigured,
} from "@/lib/platformTokenVault";
import { getPublicAppUrl } from "@/lib/publicUrl";
import { createClient } from "@/lib/supabase/server";
import type { PublishingConnectionPlatform } from "@/lib/supabase/types";

const X_SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function fromBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function oauthStateSecret() {
  return process.env.OAUTH_STATE_SECRET || process.env.PLATFORM_TOKEN_ENCRYPTION_KEY || "";
}

function signState(payload: string) {
  const secret = oauthStateSecret();

  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET or PLATFORM_TOKEN_ENCRYPTION_KEY is required.");
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeState(input: {
  projectId: string;
  ownerId: string;
  platform: string;
  customerId?: string;
  workspaceId?: string;
}) {
  const payload = base64UrlJson({ ...input, nonce: crypto.randomUUID(), createdAt: Date.now() });
  return `${payload}.${signState(payload)}`;
}

function decodeState(state: string) {
  const [payload, signature] = state.split(".");

  if (!payload || !signature || signState(payload) !== signature) {
    throw new Error("Invalid OAuth state.");
  }

  return fromBase64UrlJson<{
    projectId: string;
    ownerId: string;
    platform: PublishingConnectionPlatform;
    customerId?: string;
    workspaceId?: string;
    createdAt: number;
  }>(payload);
}

function oauthRedirectUri(platform: "x") {
  const explicit = process.env.X_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  return `${getPublicAppUrl()}/api/oauth/${platform}/callback`;
}

function settingsRedirect(projectId: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return NextResponse.redirect(
    `${getPublicAppUrl()}/projects/${projectId}/settings?${search.toString()}`,
  );
}

function codeChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function cookieValue(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}

function xOAuthEnv() {
  const clientId = process.env.X_CLIENT_ID?.trim();
  const clientSecret = process.env.X_CLIENT_SECRET?.trim();
  const redirectUri = process.env.X_REDIRECT_URI?.trim();
  const missingEnv = [
    ["X_CLIENT_ID", clientId],
    ["X_CLIENT_SECRET", clientSecret],
    ["X_REDIRECT_URI", redirectUri],
    ["PLATFORM_TOKEN_ENCRYPTION_KEY", process.env.PLATFORM_TOKEN_ENCRYPTION_KEY?.trim()],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    clientId,
    clientSecret,
    redirectUri,
    missingEnv,
  };
}

function tokenFailureReason(status: number, responseBody: string) {
  const body = responseBody.toLowerCase();

  if (body.includes("invalid_client")) return "invalid_client";
  if (body.includes("redirect") && body.includes("uri")) return "redirect_uri_mismatch";
  if (body.includes("invalid_grant")) return "invalid_grant";
  if (body.includes("code_verifier")) return "pkce_verifier_mismatch";

  return `http_${status}`;
}

function possibleTokenFailureCause(reason: string) {
  if (reason === "invalid_client") {
    return "X_CLIENT_ID/X_CLIENT_SECRET likely belong to a different X app or secret was regenerated. Use the same app: DistributionOS CareerScore.";
  }

  if (reason === "redirect_uri_mismatch") {
    return "X_REDIRECT_URI does not exactly match the callback URL saved in the X Developer app.";
  }

  if (reason === "pkce_verifier_mismatch" || reason === "invalid_grant") {
    return "OAuth code was reused, expired, or PKCE verifier/state cookies did not match.";
  }

  return "Wrong X app client id/secret OR redirect uri mismatch OR app auth settings not saved.";
}

async function exchangeXToken({
  code,
  codeVerifier,
  clientId,
  clientSecret,
  redirectUri,
  useBasicAuth,
}: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useBasicAuth: boolean;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (useBasicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    body.set("client_secret", clientSecret);
  }

  return fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body,
  });
}

function logSafeTokenExchangeFailure(input: {
  status: number;
  responseBody: string;
  redirectUri: string;
  hasCode: boolean;
  hasState: boolean;
  stateMatches: boolean;
  hasCodeVerifier: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  reason: string;
}) {
  console.error("[oauth:x:token_exchange_failed]", {
    token_endpoint_status: input.status,
    token_endpoint_response_body: input.responseBody,
    redirect_uri_used: input.redirectUri,
    has_code: input.hasCode,
    has_state: input.hasState,
    state_matches: input.stateMatches,
    has_code_verifier: input.hasCodeVerifier,
    has_client_id: input.hasClientId,
    has_client_secret: input.hasClientSecret,
    app_callback_url_expected: process.env.X_REDIRECT_URI || "",
    reason: input.reason,
    possible_cause: possibleTokenFailureCause(input.reason),
  });
}

export async function startXOAuth(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${getPublicAppUrl()}/login`);
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") || url.searchParams.get("project_id") || "";
  const customerId = url.searchParams.get("customerId") || "";
  const workspaceId = url.searchParams.get("workspaceId") || projectId;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const { clientId, redirectUri, missingEnv } = xOAuthEnv();

  if (missingEnv.length > 0) {
    return settingsRedirect(projectId, {
      error: `X setup incomplete. Missing: ${missingEnv.join(", ")}.`,
    });
  }

  const xClientId = clientId || "";

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    assertPlatformTokenEncryptionConfigured();
  } catch (error) {
    return settingsRedirect(projectId, {
      error: error instanceof Error ? error.message : "Token encryption is not configured.",
    });
  }

  const verifier = crypto.randomBytes(48).toString("base64url");
  const state = encodeState({
    projectId,
    ownerId: user.id,
    platform: "x",
    customerId,
    workspaceId,
  });
  const authorizationUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", xClientId);
  authorizationUrl.searchParams.set("redirect_uri", oauthRedirectUri("x"));
  authorizationUrl.searchParams.set("scope", X_SCOPES.join(" "));
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge(verifier));
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorizationUrl.toString());
  response.cookies.set("x_oauth_code_verifier", verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  response.cookies.set("x_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  response.cookies.set("x_oauth_project_id", projectId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });

  return response;
}

export async function handleXOAuthCallback(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const stateParam = url.searchParams.get("state") || "";
  const verifier = cookieValue(request, "x_oauth_code_verifier");
  const storedState = cookieValue(request, "x_oauth_state");
  const storedProjectId = cookieValue(request, "x_oauth_project_id");

  if (!user) {
    return NextResponse.redirect(`${getPublicAppUrl()}/login`);
  }

  let state: ReturnType<typeof decodeState>;

  try {
    state = decodeState(stateParam);
  } catch {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const stateMatches = Boolean(storedState && storedState === stateParam);

  if (state.ownerId !== user.id || state.platform !== "x" || !stateMatches) {
    return NextResponse.json(
      { error: "OAuth state does not match the current user." },
      { status: 403 },
    );
  }

  if (!code || !verifier) {
    return settingsRedirect(storedProjectId || state.projectId, {
      error: "X OAuth callback is missing code verifier.",
    });
  }

  const codeVerifier = decodeURIComponent(verifier);

  try {
    assertPlatformTokenEncryptionConfigured();
  } catch (error) {
    return settingsRedirect(state.projectId, {
      error: error instanceof Error ? error.message : "Token encryption is not configured.",
    });
  }

  const { clientId, clientSecret, redirectUri, missingEnv } = xOAuthEnv();

  if (missingEnv.length > 0) {
    return settingsRedirect(state.projectId, {
      error: `X setup incomplete. Missing: ${missingEnv.join(", ")}.`,
    });
  }

  const tokenResponse = await exchangeXToken({
    code,
    codeVerifier,
    clientId: clientId || "",
    clientSecret: clientSecret || "",
    redirectUri: redirectUri || oauthRedirectUri("x"),
    useBasicAuth: true,
  });

  if (!tokenResponse.ok) {
    const firstResponseBody = await tokenResponse.text();
    const retryResponse = await exchangeXToken({
      code,
      codeVerifier,
      clientId: clientId || "",
      clientSecret: clientSecret || "",
      redirectUri: redirectUri || oauthRedirectUri("x"),
      useBasicAuth: false,
    });

    if (!retryResponse.ok) {
      const retryResponseBody = await retryResponse.text();
      const reason = tokenFailureReason(retryResponse.status, retryResponseBody);

      logSafeTokenExchangeFailure({
        status: retryResponse.status,
        responseBody: retryResponseBody || firstResponseBody,
        redirectUri: redirectUri || oauthRedirectUri("x"),
        hasCode: Boolean(code),
        hasState: Boolean(stateParam),
        stateMatches,
        hasCodeVerifier: Boolean(codeVerifier),
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
        reason,
      });

      await supabase.from("publishing_connections").upsert(
        {
          project_id: state.projectId,
          owner_id: user.id,
          platform: "x",
          connection_status: "manual_required",
          last_error: `${reason}: ${possibleTokenFailureCause(reason)}`,
          last_checked_at: new Date().toISOString(),
        },
        { onConflict: "project_id,owner_id,platform" },
      );

      return settingsRedirect(state.projectId, {
        error: "X OAuth token exchange failed",
        reason,
      });
    }

    const retryTokenPayload = (await retryResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    return saveXConnection({
      supabase,
      userId: user.id,
      stateProjectId: state.projectId,
      tokenPayload: retryTokenPayload,
    });
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!tokenPayload.access_token) {
    return settingsRedirect(state.projectId, { error: "X OAuth did not return an access token." });
  }

  return saveXConnection({
    supabase,
    userId: user.id,
    stateProjectId: state.projectId,
    tokenPayload,
  });
}

async function saveXConnection({
  supabase,
  userId,
  stateProjectId,
  tokenPayload,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  stateProjectId: string;
  tokenPayload: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
}) {
  if (!tokenPayload.access_token) {
    return settingsRedirect(stateProjectId, { error: "X OAuth did not return an access token." });
  }

  const meResponse = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  const me = meResponse.ok
    ? ((await meResponse.json()) as { data?: { id?: string; username?: string; name?: string } })
    : { data: {} };
  const expiresAt = tokenPayload.expires_in
    ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabase.from("publishing_connections").upsert(
    {
      project_id: stateProjectId,
      owner_id: userId,
      platform: "x",
      connection_status: "connected",
      account_id: me.data?.id || "",
      account_name: me.data?.username || me.data?.name || "Connected X account",
      access_token_encrypted: encryptPlatformToken(tokenPayload.access_token),
      refresh_token_encrypted: encryptPlatformToken(tokenPayload.refresh_token || ""),
      access_token_encrypted_placeholder: "encrypted",
      refresh_token_encrypted_placeholder: tokenPayload.refresh_token ? "encrypted" : "",
      token_reference: "platform_token_vault",
      refresh_token_reference: tokenPayload.refresh_token ? "platform_token_vault" : "",
      token_expires_at: expiresAt,
      scopes: tokenPayload.scope || X_SCOPES.join(" "),
      permissions: tokenPayload.scope || X_SCOPES.join(" "),
      last_error: "",
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: "project_id,owner_id,platform" },
  );

  if (error) {
    return settingsRedirect(stateProjectId, { error: "X connection could not be saved." });
  }

  const response = settingsRedirect(stateProjectId, { connected: "x" });
  response.cookies.delete("x_oauth_code_verifier");
  response.cookies.delete("x_oauth_state");
  response.cookies.delete("x_oauth_project_id");
  return response;
}

export function placeholderOAuthStart(platform: string) {
  return NextResponse.json(
    {
      ok: false,
      platform,
      status: "manual_required",
      reason: `${platform} OAuth is connection-ready but not implemented yet.`,
    },
    { status: 501 },
  );
}

export const placeholderOAuthCallback = placeholderOAuthStart;
