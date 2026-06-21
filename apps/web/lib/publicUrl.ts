export function getPublicAppUrl(requestOrigin = "") {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (requestOrigin) {
    return requestOrigin.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001";
  }

  return "";
}

export function toPublicUrl(pathOrUrl: string, requestOrigin = "") {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;

  const baseUrl = getPublicAppUrl(requestOrigin);
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
