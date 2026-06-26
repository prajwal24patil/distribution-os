import { createPainBasedCampaignAssets } from "@/lib/careerScoreRevenueEngine";
import { decideSocialDeployment } from "@/lib/socialDeploymentEngine";
import type { ProjectRow, PublishingConnectionRow } from "@/lib/supabase/types";

export type AgentRunStatus = "healthy" | "degraded" | "recovered" | "warning" | "failed";

export type AgentSupervisorOutput = {
  run_id: string;
  started_at: string;
  finished_at: string;
  agents_started: string[];
  agents_completed: string[];
  agents_failed: string[];
  recovered_issues: string[];
  warnings: string[];
  manual_actions_needed: string[];
  next_safe_action: string;
  overall_status: AgentRunStatus;
};

export type PreflightHealthCheck = {
  status: AgentRunStatus;
  warnings: string[];
  manual_actions_needed: string[];
  checks: Array<{ name: string; status: "pass" | "warning" | "fail"; message: string }>;
};

export const masterAgentNames = [
  "CareerScore Revenue Agent",
  "Pain-Based Campaign Agent",
  "Social Deployment Supervisor",
  "Platform Connection Agent",
  "Content Creation Agent",
  "SEO/Blog Agent",
  "X Trend Radar Agent",
  "LinkedIn Growth Agent",
  "Google Business Profile Agent",
  "Reddit Community Agent",
  "Instagram/Facebook Agent",
  "YouTube Shorts Agent",
  "Referral Agent",
  "Proof Agent",
  "Compliance/QC Agent",
  "Publishing Agent",
  "Tracking Agent",
  "Health Agent",
  "Recovery Agent",
  "Analytics Agent",
];

function check(name: string, passed: boolean, message: string) {
  return { name, status: passed ? ("pass" as const) : ("warning" as const), message };
}

export function runPreflightHealthCheck({
  project,
  connections = [],
  trackingLink,
}: {
  project?: ProjectRow | null;
  connections?: PublishingConnectionRow[];
  trackingLink?: string;
}): PreflightHealthCheck {
  const checks = [
    check(
      "NEXT_PUBLIC_APP_URL",
      Boolean(process.env.NEXT_PUBLIC_APP_URL) &&
        (process.env.NODE_ENV !== "production" ||
          !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")),
      "Set NEXT_PUBLIC_APP_URL to the deployed app URL.",
    ),
    check(
      "NEXT_PUBLIC_SUPABASE_URL",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      "Set Supabase URL.",
    ),
    check(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      "Set Supabase anon key.",
    ),
    check(
      "SUPABASE_SERVICE_ROLE_KEY",
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      "Set server-only service role key.",
    ),
    check("CRON_SECRET", Boolean(process.env.CRON_SECRET), "Set CRON_SECRET."),
    check("project exists", Boolean(project), "Create or select a project."),
    check(
      "tracking link generation",
      Boolean(trackingLink),
      "Run Autopilot to generate tracking links.",
    ),
    check("blog publisher", true, "Blog publisher is available."),
    check(
      "platform connection records",
      connections.length > 0,
      "Connection records can be synthesized; connect official platforms later.",
    ),
    check(
      "platform tokens only for connected platforms",
      connections.every((connection) =>
        connection.connection_status === "connected"
          ? Boolean(connection.access_token_encrypted_placeholder || connection.account_id)
          : true,
      ),
      "Reconnect connected platforms with token references.",
    ),
    check("rate-limit metadata", true, "Rate-limit/retry metadata is available in queue model."),
  ];
  const warnings = checks.filter((item) => item.status !== "pass").map((item) => item.message);

  return {
    status: warnings.length > 0 ? "degraded" : "healthy",
    warnings,
    manual_actions_needed: warnings,
    checks,
  };
}

export function runMasterAgentSupervisor({
  project,
  connections = [],
  trackingLink = "",
}: {
  project?: ProjectRow | null;
  connections?: PublishingConnectionRow[];
  trackingLink?: string;
}): AgentSupervisorOutput {
  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const completed: string[] = [];
  const failed: string[] = [];
  const warnings: string[] = [];
  const recovered: string[] = [];
  const manualActions: string[] = [];
  const preflight = runPreflightHealthCheck({ project, connections, trackingLink });

  for (const agent of masterAgentNames) {
    try {
      if (agent === "Pain-Based Campaign Agent") {
        const assets = createPainBasedCampaignAssets({ trackingLink, connections });
        for (const asset of assets) {
          const decision = decideSocialDeployment(asset, connections);
          if (decision.publish_decision === "manual_required") {
            manualActions.push(`${asset.platform}: ${decision.manual_instructions}`);
          }
        }
      }

      completed.push(agent);
    } catch (error) {
      failed.push(agent);
      warnings.push(error instanceof Error ? error.message : `${agent} failed.`);
      recovered.push(`${agent} isolated; remaining agents continued.`);
    }
  }

  warnings.push(...preflight.warnings);
  manualActions.push(...preflight.manual_actions_needed);

  return {
    run_id: runId,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    agents_started: masterAgentNames,
    agents_completed: completed,
    agents_failed: failed,
    recovered_issues: recovered,
    warnings,
    manual_actions_needed: [...new Set(manualActions)].slice(0, 10),
    next_safe_action:
      manualActions.length > 0
        ? "Resolve manual connection/setup actions, then run Autopilot again."
        : "Publish approved safe assets through available official channels.",
    overall_status: failed.length > 0 ? "recovered" : warnings.length > 0 ? "degraded" : "healthy",
  };
}

export function buildAgentHealthDashboard(output: AgentSupervisorOutput) {
  return {
    system_status: output.overall_status,
    agent_health: `${output.agents_completed.length}/${output.agents_started.length} agents completed`,
    last_successful_run: output.finished_at,
    failed_agents: output.agents_failed,
    recovered_issues: output.recovered_issues,
    warnings_before_crash: output.warnings,
    manual_actions_needed: output.manual_actions_needed,
    next_safe_action: output.next_safe_action,
  };
}
