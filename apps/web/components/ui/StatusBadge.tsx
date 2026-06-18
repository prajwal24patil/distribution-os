import { getProjectStatusLabel, type ProjectStatus } from "@/lib/projects";

const statusStyles: Record<ProjectStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  planning: "border-sky-200 bg-sky-50 text-sky-800",
  paused: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

type StatusBadgeProps = {
  status: ProjectStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded border px-2.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {getProjectStatusLabel(status)}
    </span>
  );
}
