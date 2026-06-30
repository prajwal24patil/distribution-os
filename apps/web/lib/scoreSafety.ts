export function toSafeIntegerScore(value: number | string | null | undefined, fallback = 0) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : fallback;

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}
