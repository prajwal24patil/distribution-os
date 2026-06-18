import type { ProjectRow, ProjectStatus } from "@/lib/supabase/types";

export type { ProjectRow, ProjectStatus };

export function getProjectStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    active: "Active",
    planning: "Planning",
    paused: "Paused",
  };

  return labels[status];
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
