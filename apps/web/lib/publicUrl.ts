const PRODUCTION_FALLBACK_APP_URL = "https://distribution-os-web.vercel.app";
const LOCAL_PUBLIC_URL_PATTERN =
  /^https?:\/\/(?:localhost|0\.0\.0\.0|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?/i;
const LEGACY_LOCAL_URL_PATTERN =
  /https?:\/\/(?:localhost|0\.0\.0\.0|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?/gi;
const TRACKING_URL_PATTERN =
  /https?:\/\/(?:localhost|0\.0\.0\.0|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?(\/t\/[A-Za-z0-9_-]+(?:\?[^)\s]*)?)/gi;

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function isLocalPublicUrl(value = "") {
  return LOCAL_PUBLIC_URL_PATTERN.test(value);
}

export function isValidProductionPublicAppUrl(value = "") {
  if (!value || isLocalPublicUrl(value)) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function getPublicUrlWarning() {
  if (!isProductionRuntime()) return "";

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configured) {
    return "NEXT_PUBLIC_APP_URL is required in production before generating public posts.";
  }

  if (!isValidProductionPublicAppUrl(configured)) {
    return "NEXT_PUBLIC_APP_URL must be a valid https public URL in production.";
  }

  return "";
}

export function getPublicAppUrl(requestOrigin = "") {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    if (isProductionRuntime() && !isValidProductionPublicAppUrl(configured)) {
      return "";
    }

    return configured.replace(/\/$/, "");
  }

  if (isProductionRuntime()) {
    return "";
  }

  if (requestOrigin && !isLocalPublicUrl(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001";
  }

  return "";
}

export function toPublicUrl(pathOrUrl: string, requestOrigin = "") {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return sanitizePublicTrackingUrl(pathOrUrl);
  }

  const baseUrl = getPublicAppUrl(requestOrigin);
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function requirePublicAppUrlForGeneration() {
  const publicUrl = getPublicAppUrl();

  if (!publicUrl && isProductionRuntime()) {
    throw new Error(getPublicUrlWarning());
  }

  return publicUrl;
}

export function getSafePublicTrackingUrl(trackingId: string) {
  const normalizedId = trackingId.replace(/^\/?t\//, "").trim();

  if (!normalizedId) return "";

  return toPublicUrl(`/t/${normalizedId}`);
}

export function sanitizePublicTrackingUrlWithWarning(url: string) {
  if (!url) return { url: "", warning: "" };

  const configured = getPublicAppUrl();
  const production = isProductionRuntime();

  if (!production) {
    return { url, warning: "" };
  }

  if (LOCAL_PUBLIC_URL_PATTERN.test(url)) {
    const parsed = url.match(
      /^https?:\/\/(?:localhost|0\.0\.0\.0|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?(\/t\/[A-Za-z0-9_-]+(?:\?[^)\s]*)?)/i,
    );

    if (!configured) {
      return {
        url: "",
        warning: getPublicUrlWarning(),
      };
    }

    return {
      url: parsed ? `${configured}${parsed[1]}` : url.replace(LOCAL_PUBLIC_URL_PATTERN, configured),
      warning: "",
    };
  }

  return { url, warning: "" };
}

export function sanitizePublicTrackingUrl(url: string) {
  return sanitizePublicTrackingUrlWithWarning(url).url;
}

export function sanitizePostTrackingLinks(content: string) {
  if (!content || !isProductionRuntime()) return content;

  const publicUrl = getPublicAppUrl();

  if (!publicUrl) return content;

  return content.replace(TRACKING_URL_PATTERN, (_match, trackingPath: string) => {
    return `${publicUrl}${trackingPath}`;
  });
}

export function hasLocalTrackingUrl(content = "") {
  return LOCAL_PUBLIC_URL_PATTERN.test(content);
}

export function productionPublicAppUrlForRepair() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || PRODUCTION_FALLBACK_APP_URL;
}

export function repairLegacyLocalTrackingText(content: string) {
  if (!content) return content;

  const publicUrl = productionPublicAppUrlForRepair();

  return content
    .replace(TRACKING_URL_PATTERN, (_match, trackingPath: string) => {
      return `${publicUrl}${trackingPath}`;
    })
    .replace(LEGACY_LOCAL_URL_PATTERN, publicUrl);
}
