"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildProductMemoryFromUrl,
  generateGrowthActionsIfMissing,
  generateTrackingLinksIfMissing,
  runAutopilotCycle,
  startGrowthAutopilot as buildAutopilotSummary,
} from "@/lib/autopilotOrchestrator";
import { runDistributionCycle } from "@/lib/autonomousDistributionEngine";
import { createDailyGrowthPlan } from "@/lib/dailyAutopilot";
import { runDailyAutopilotForProject } from "@/lib/dailyAutopilotRunner";
import { runGoAutopilot } from "@/lib/goAutopilot";
import { buildGrowthActions, buildResearchRun, buildViralCampaignItems } from "@/lib/growthEngine";
import { applySafeFixes, detectGrowthProblems } from "@/lib/growthProblemSolver";
import { markPostPublished, scheduleApprovedAssets } from "@/lib/publishingScheduler";
import { publishDuePosts } from "@/lib/publishingWorker";
import { requirePublicAppUrlForGeneration } from "@/lib/publicUrl";
import { createClient } from "@/lib/supabase/server";
import { repairLegacyLocalTrackingLinks } from "@/lib/trackingLinkRepair";
import { runFullSystemTest } from "@/lib/systemTestRunner";
import type {
  CampaignItemStatus,
  CampaignResultRow,
  CampaignType,
  ExecutionResultStatus,
  GrowthActionCategory,
  GrowthActionStatus,
  ProjectStatus,
  TrackingLinkRow,
} from "@/lib/supabase/types";

type RecommendationExecutionLog = {
  result_status: ExecutionResultStatus;
  channel: string;
  learning: string;
  executed_at: string;
};

type RecommendationAction = {
  id: string;
  category: GrowthActionCategory;
  title: string;
  status: GrowthActionStatus;
  execution_logs?: RecommendationExecutionLog[];
};

type SolverCampaignItem = {
  id: string;
  campaign_id: string;
  campaign_type: CampaignType;
  channel: string;
  hook: string;
  status: CampaignItemStatus;
  campaign_results?: CampaignResultRow[];
  tracking_links?: TrackingLinkRow[];
};

type SolverCampaign = {
  id: string;
  campaign_items?: SolverCampaignItem[];
};

type DailyAutopilotCampaignItem = {
  id: string;
  project_id: string;
  owner_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  tracking_links?: TrackingLinkRow[];
};

type DailyAutopilotCampaign = {
  campaign_items?: DailyAutopilotCampaignItem[];
};

function getString(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function getNonNegativeNumber(formData: FormData, key: string) {
  return Math.max(0, getNumber(formData, key, 0));
}

function redirectWithError(pathname: string, message: string): never {
  redirect(`${pathname}?error=${encodeURIComponent(message)}`);
}

function getRequiredString(formData: FormData, key: string, label: string, pathname: string) {
  const value = getString(formData, key);

  if (!value) {
    redirectWithError(pathname, `${label} is required.`);
  }

  return value;
}

function hasSuccessfulChannel(actions: RecommendationAction[], category: GrowthActionCategory) {
  return actions.some(
    (action) =>
      action.category === category &&
      (action.execution_logs ?? []).some((log) => log.result_status === "success"),
  );
}

function buildNextRecommendation(researchCount: number, actions: RecommendationAction[]) {
  const executionLogs = actions.flatMap((action) => action.execution_logs ?? []);
  const approvedActions = actions.filter((action) => action.status === "approved");
  const pendingAction = actions.find((action) => action.status === "pending");

  if (researchCount === 0) {
    return "Run Research to create the first audience, channel, and positioning analysis.";
  }

  if (actions.length === 0) {
    return "Generate Growth Actions from the latest research run.";
  }

  if (approvedActions.length === 0 && executionLogs.length === 0) {
    return pendingAction
      ? `Approve the top priority action: ${pendingAction.title}.`
      : "Approve one draft action before execution.";
  }

  if (approvedActions.length > 0 && executionLogs.length === 0) {
    return `Manually execute one approved action: ${approvedActions[0].title}.`;
  }

  if (executionLogs.some((log) => log.result_status === "pending")) {
    return "Check pending execution results after 24 hours and log the learning.";
  }

  if (hasSuccessfulChannel(actions, "linkedin_post")) {
    return "Generate more LinkedIn founder posts based on the winning angle.";
  }

  if (hasSuccessfulChannel(actions, "seo_blog")) {
    return "Generate more SEO blog ideas around the topic that worked.";
  }

  if (hasSuccessfulChannel(actions, "whatsapp_community")) {
    return "Run more community distribution using the message that resonated.";
  }

  if (executionLogs.some((log) => log.result_status === "failed")) {
    return "Change the angle or channel, then retry the failed action manually.";
  }

  return "Review the latest learning and choose the next approved action to execute.";
}

function campaignItemScore(item: SolverCampaignItem) {
  const clicks = (item.tracking_links ?? []).reduce((total, link) => total + link.clicks, 0);
  const resultScore = (item.campaign_results ?? []).reduce(
    (total, result) =>
      total + result.signups * 10 + result.paid_users * 50 + Number(result.revenue),
    0,
  );

  return clicks + resultScore;
}

function readyWorkText(readyWork: string[]) {
  return readyWork.map((work, index) => `${index + 1}. ${work}`).join("\n\n");
}

async function preparePublicTrackingLinks(projectId: string, ownerId: string, pathname: string) {
  try {
    requirePublicAppUrlForGeneration();
    await repairLegacyLocalTrackingLinks(projectId, ownerId);
  } catch (error) {
    redirectWithError(
      pathname,
      error instanceof Error ? error.message : "Public tracking URL setup is required.",
    );
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getString(formData, "next", "/");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError("/login", error.message);
  }

  revalidatePath("/", "layout");
  redirect(next || "/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirectWithError("/signup", error.message);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: getString(formData, "name"),
      customer: getString(formData, "customer", "CareerScore"),
      status: getString(formData, "status", "planning") as ProjectStatus,
      channel: getString(formData, "channel", "manual"),
      owner: getString(formData, "owner", "Founder"),
      goal: getString(formData, "goal"),
      summary: getString(formData, "summary"),
      progress: getNumber(formData, "progress"),
      experiments: getNumber(formData, "experiments"),
      content_items: getNumber(formData, "content_items"),
      next_action: getString(formData, "next_action"),
    })
    .select("id, name, customer, goal")
    .single();

  if (error) {
    redirectWithError("/projects/new", error.message);
  }

  const productUrl = getString(formData, "product_url");

  if (productUrl) {
    const { error: memoryError } = await supabase.from("product_memory").insert(
      buildProductMemoryFromUrl({
        project: {
          id: data.id,
          user_id: user.id,
          name: data.name,
          customer: data.customer,
          status: "planning",
          channel: "manual",
          owner: "Founder",
          goal: data.goal,
          summary: "",
          progress: 0,
          experiments: 0,
          content_items: 0,
          next_action: "",
          next_recommendation: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ownerId: user.id,
        productUrl,
      }),
    );

    if (memoryError) {
      redirectWithError(`/projects/${data.id}/autopilot`, memoryError.message);
    }
  }

  revalidatePath("/");
  revalidatePath("/projects");
  redirect(`/projects/${data.id}/autopilot`);
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient();
  const id = getString(formData, "id");
  const returnTo = getString(formData, "return_to", `/projects/${id}`);

  const { error } = await supabase
    .from("projects")
    .update({
      name: getString(formData, "name"),
      customer: getString(formData, "customer", "CareerScore"),
      status: getString(formData, "status", "planning") as ProjectStatus,
      channel: getString(formData, "channel", "manual"),
      owner: getString(formData, "owner", "Founder"),
      goal: getString(formData, "goal"),
      summary: getString(formData, "summary"),
      progress: getNumber(formData, "progress"),
      experiments: getNumber(formData, "experiments"),
      content_items: getNumber(formData, "content_items"),
      next_action: getString(formData, "next_action"),
    })
    .eq("id", id);

  if (error) {
    redirectWithError(`/projects/${id}`, error.message);
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/settings`);
  redirect(returnTo);
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient();
  const id = getString(formData, "id");
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    redirectWithError(`/projects/${id}`, error.message);
  }

  revalidatePath("/");
  revalidatePath("/projects");
  redirect("/projects");
}

export async function saveProductMemory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const memoryId = getString(formData, "memory_id");
  const pathname = `/projects/${projectId}/memory`;
  const productName = getRequiredString(formData, "product_name", "Product name", pathname);
  const productSummary = getRequiredString(
    formData,
    "product_summary",
    "Product summary",
    pathname,
  );

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  const payload = {
    product_name: productName,
    website_url: getString(formData, "website_url"),
    product_summary: productSummary,
    target_users: getString(formData, "target_users"),
    primary_problem: getString(formData, "primary_problem"),
    value_proposition: getString(formData, "value_proposition"),
    pricing: getString(formData, "pricing"),
    current_stage: getString(formData, "current_stage"),
    primary_goal: getString(formData, "primary_goal"),
    target_countries: getString(formData, "target_countries"),
    preferred_channels: getString(formData, "preferred_channels"),
    competitors: getString(formData, "competitors"),
    brand_voice: getString(formData, "brand_voice"),
    constraints: getString(formData, "constraints"),
  };

  const result = memoryId
    ? await supabase.from("product_memory").update(payload).eq("id", memoryId)
    : await supabase.from("product_memory").insert({
        ...payload,
        project_id: projectId,
        owner_id: user.id,
      });

  if (result.error) {
    redirectWithError(pathname, result.error.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?saved=1`);
}

export async function runResearch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const pathname = `/projects/${projectId}/research`;
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  const { data: memory, error: memoryError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (memoryError) {
    redirectWithError(pathname, memoryError.message);
  }

  const { error } = await supabase
    .from("research_runs")
    .insert(buildResearchRun({ project, memory, ownerId: user.id }));

  if (error) {
    redirectWithError(pathname, error.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=research`);
}

export async function generateGrowthActions(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const pathname = `/projects/${projectId}/actions`;
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  const { data: memory, error: memoryError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (memoryError) {
    redirectWithError(pathname, memoryError.message);
  }

  const { data: latestResearch } = await supabase
    .from("research_runs")
    .select("id")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const actions = buildGrowthActions({
    project,
    memory,
    ownerId: user.id,
    researchRunId: latestResearch?.id ?? null,
  });

  const { error } = await supabase.from("growth_actions").insert(actions);

  if (error) {
    redirectWithError(pathname, error.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=actions`);
}

export async function updateGrowthActionStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const actionId = getString(formData, "action_id");
  const status = getString(formData, "status") as GrowthActionStatus;
  const pathname = `/projects/${projectId}/actions`;

  if (!projectId || !actionId) {
    redirectWithError("/projects", "Action is required.");
  }

  if (!["approved", "rejected", "completed"].includes(status)) {
    redirectWithError(pathname, "Unsupported action status.");
  }

  const { error } = await supabase
    .from("growth_actions")
    .update({ status })
    .eq("id", actionId)
    .eq("owner_id", user.id);

  if (error) {
    redirectWithError(pathname, error.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=status`);
}

export async function markActionManuallyExecuted(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const actionId = getString(formData, "action_id");
  const pathname = `/projects/${projectId}/approvals`;

  if (!projectId || !actionId) {
    redirectWithError("/projects", "Action is required.");
  }

  const resultStatus = getString(formData, "result_status", "pending") as ExecutionResultStatus;

  if (!["pending", "success", "failed", "needs_follow_up"].includes(resultStatus)) {
    redirectWithError(pathname, "Unsupported result status.");
  }

  const { data: action, error: actionError } = await supabase
    .from("growth_actions")
    .select("id, category")
    .eq("id", actionId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (actionError || !action) {
    redirectWithError(pathname, "Action not found.");
  }

  const { error: logError } = await supabase.from("execution_logs").insert({
    project_id: projectId,
    owner_id: user.id,
    growth_action_id: action.id,
    execution_type: getString(formData, "execution_type", "manual"),
    channel: getString(formData, "channel", action.category),
    executed_at: getString(formData, "executed_at") || new Date().toISOString(),
    executed_by: getString(formData, "executed_by", "Founder"),
    external_url: getString(formData, "external_url"),
    notes: getString(formData, "notes"),
    result_metric: getString(formData, "result_metric"),
    result_value: getString(formData, "result_value"),
    learning: getString(formData, "learning"),
    result_status: resultStatus,
    completed_at: resultStatus === "pending" ? null : new Date().toISOString(),
  });

  if (logError) {
    redirectWithError(pathname, logError.message);
  }

  const { error: updateError } = await supabase
    .from("growth_actions")
    .update({ status: "completed" })
    .eq("id", action.id)
    .eq("owner_id", user.id);

  if (updateError) {
    redirectWithError(pathname, updateError.message);
  }

  revalidatePath(`/projects/${projectId}/actions`);
  revalidatePath(pathname);
  redirect(`${pathname}?success=executed`);
}

export async function generateNextRecommendation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}`;
  const returnTo = getString(formData, "return_to", pathname);

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  const { count: researchCount, error: researchError } = await supabase
    .from("research_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (researchError) {
    redirectWithError(pathname, researchError.message);
  }

  const { data: actions, error: actionsError } = await supabase
    .from("growth_actions")
    .select(
      "id, category, title, status, execution_logs(result_status, channel, learning, executed_at)",
    )
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (actionsError) {
    redirectWithError(pathname, actionsError.message);
  }

  const recommendation = buildNextRecommendation(
    researchCount ?? 0,
    (actions ?? []) as RecommendationAction[],
  );

  const { error: updateError } = await supabase
    .from("projects")
    .update({ next_recommendation: recommendation })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (updateError) {
    redirectWithError(pathname, updateError.message);
  }

  revalidatePath(pathname);
  revalidatePath(returnTo);
  redirect(`${returnTo}?success=recommendation`);
}

export async function generateViralCampaign(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/campaigns`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  await preparePublicTrackingLinks(projectId, user.id, pathname);

  const { data: memory, error: memoryError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (memoryError) {
    redirectWithError(pathname, memoryError.message);
  }

  const destinationUrl = getString(formData, "destination_url") || memory?.website_url || "";

  if (!destinationUrl) {
    redirectWithError(pathname, "CareerScore destination URL is required.");
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      name: `${project.customer} Viral Growth Campaign`,
      campaign_type: "linkedin_founder_post",
      status: "draft",
      next_action: "Approve the strongest campaign items, then post manually and record results.",
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    redirectWithError(pathname, campaignError?.message || "Campaign could not be created.");
  }

  const { data: campaignItems, error: itemError } = await supabase
    .from("campaign_items")
    .insert(
      buildViralCampaignItems({
        project,
        memory,
        ownerId: user.id,
        campaignId: campaign.id,
        destinationUrl,
      }),
    )
    .select(
      "id, project_id, owner_id, utm_source, utm_medium, utm_campaign, utm_content, utm_link",
    );

  if (itemError || !campaignItems) {
    redirectWithError(pathname, itemError?.message || "Campaign items could not be created.");
  }

  const { error: trackingError } = await supabase.from("tracking_links").insert(
    campaignItems.map((item) => {
      const trackingId = crypto.randomUUID();

      return {
        id: trackingId,
        project_id: item.project_id,
        owner_id: item.owner_id,
        campaign_item_id: item.id,
        destination_url: destinationUrl,
        utm_source: item.utm_source,
        utm_medium: item.utm_medium,
        utm_campaign: item.utm_campaign,
        utm_content: item.utm_content,
        tracking_url: `/t/${trackingId}`,
      };
    }),
  );

  if (trackingError) {
    redirectWithError(pathname, trackingError.message);
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/autopilot`);
  redirect(`${pathname}?success=campaign`);
}

export async function updateCampaignItemStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const itemId = getString(formData, "campaign_item_id");
  const status = getString(formData, "status") as CampaignItemStatus;
  const pathname = `/projects/${projectId}/campaigns`;

  if (!projectId || !itemId) {
    redirectWithError("/projects", "Campaign item is required.");
  }

  if (!["draft", "approved", "posted", "completed", "failed"].includes(status)) {
    redirectWithError(pathname, "Unsupported campaign item status.");
  }

  const { error } = await supabase
    .from("campaign_items")
    .update({ status })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    redirectWithError(pathname, error.message);
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/autopilot`);
  redirect(`${pathname}?success=status`);
}

export async function saveCampaignResult(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const campaignId = getString(formData, "campaign_id");
  const itemId = getString(formData, "campaign_item_id");
  const pathname = `/projects/${projectId}/campaigns`;

  if (!projectId || !campaignId || !itemId) {
    redirectWithError("/projects", "Campaign result is required.");
  }

  const { data: item, error: itemError } = await supabase
    .from("campaign_items")
    .select("id")
    .eq("id", itemId)
    .eq("campaign_id", campaignId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (itemError || !item) {
    redirectWithError(pathname, "Campaign item not found.");
  }

  const { error: resultError } = await supabase.from("campaign_results").insert({
    campaign_id: campaignId,
    campaign_item_id: itemId,
    project_id: projectId,
    owner_id: user.id,
    views: getNonNegativeNumber(formData, "views"),
    clicks: getNonNegativeNumber(formData, "clicks"),
    signups: getNonNegativeNumber(formData, "signups"),
    paid_users: getNonNegativeNumber(formData, "paid_users"),
    revenue: getNonNegativeNumber(formData, "revenue"),
    learning: getString(formData, "learning"),
  });

  if (resultError) {
    redirectWithError(pathname, resultError.message);
  }

  const { error: updateError } = await supabase
    .from("campaign_items")
    .update({ status: "completed" })
    .eq("id", itemId)
    .eq("owner_id", user.id);

  if (updateError) {
    redirectWithError(pathname, updateError.message);
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/autopilot`);
  redirect(`${pathname}?success=result`);
}

export async function fixNextGrowthProblem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  const { data: memory, error: memoryError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (memoryError) {
    redirectWithError(pathname, memoryError.message);
  }

  const { count: researchCount, error: researchError } = await supabase
    .from("research_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (researchError) {
    redirectWithError(pathname, researchError.message);
  }

  const { data: campaigns, error: campaignLoadError } = await supabase
    .from("campaigns")
    .select(
      "id, campaign_items(id, campaign_id, campaign_type, channel, hook, status, campaign_results(*), tracking_links(*))",
    )
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (campaignLoadError) {
    redirectWithError(pathname, campaignLoadError.message);
  }

  const typedCampaigns = (campaigns ?? []) as SolverCampaign[];
  const campaignItems = typedCampaigns.flatMap((campaign) => campaign.campaign_items ?? []);
  const trackingLinks = campaignItems.flatMap((item) => item.tracking_links ?? []);
  const results = campaignItems.flatMap((item) => item.campaign_results ?? []);
  const bestItem = [...campaignItems].sort(
    (a, b) => campaignItemScore(b) - campaignItemScore(a),
  )[0];
  const failedItem = campaignItems.find((item) => item.status === "failed");
  const hasProductMemory = Boolean(memory?.product_name && memory.product_summary);

  const problems = detectGrowthProblems({
    hasProductMemory,
    researchCount: researchCount ?? 0,
    campaignCount: typedCampaigns.length,
    readyToPostCount: campaignItems.length,
    clicks: trackingLinks.reduce((total, link) => total + link.clicks, 0),
    signups: results.reduce((total, result) => total + result.signups, 0),
    paidUsers: results.reduce((total, result) => total + result.paid_users, 0),
    failedChannel: failedItem?.channel,
    winningChannel: bestItem && campaignItemScore(bestItem) > 0 ? bestItem.channel : undefined,
    hasReferralWork: campaignItems.some((item) => item.campaign_type === "referral_campaign"),
  });
  const problem = problems[0] ?? {
    type: "winning_channel_found" as const,
    problem: "Winning channel found: keep scaling what works.",
  };
  const fix = applySafeFixes(problem);
  let appliedFix = fix.appliedFix;
  let status = fix.status;

  if (problem.type === "no_research") {
    const { error } = await supabase
      .from("research_runs")
      .insert(buildResearchRun({ project, memory, ownerId: user.id }));

    if (error) {
      redirectWithError(pathname, error.message);
    }
  }

  if (["no_campaign", "no_ready_content", "no_clicks"].includes(problem.type)) {
    const destinationUrl = memory?.website_url || "";

    if (!destinationUrl) {
      appliedFix =
        "CareerScore destination URL is missing. Add the website URL in Product Memory, then run this fix again.";
      status = "needs_input";
    } else {
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          project_id: projectId,
          owner_id: user.id,
          name: `${project.customer} Problem Solver Campaign`,
          campaign_type: "linkedin_founder_post",
          status: "draft",
          next_action: fix.nextStep,
        })
        .select("id")
        .single();

      if (campaignError || !campaign) {
        redirectWithError(pathname, campaignError?.message || "Campaign could not be created.");
      }

      const { data: newItems, error: itemError } = await supabase
        .from("campaign_items")
        .insert(
          buildViralCampaignItems({
            project,
            memory,
            ownerId: user.id,
            campaignId: campaign.id,
            destinationUrl,
          }),
        )
        .select("id, project_id, owner_id, utm_source, utm_medium, utm_campaign, utm_content");

      if (itemError || !newItems) {
        redirectWithError(pathname, itemError?.message || "Campaign items could not be created.");
      }

      const { error: trackingError } = await supabase.from("tracking_links").insert(
        newItems.map((item) => {
          const trackingId = crypto.randomUUID();

          return {
            id: trackingId,
            project_id: item.project_id,
            owner_id: item.owner_id,
            campaign_item_id: item.id,
            destination_url: destinationUrl,
            utm_source: item.utm_source,
            utm_medium: item.utm_medium,
            utm_campaign: item.utm_campaign,
            utm_content: item.utm_content,
            tracking_url: `/t/${trackingId}`,
          };
        }),
      );

      if (trackingError) {
        redirectWithError(pathname, trackingError.message);
      }
    }
  }

  const appliedFixWithWork = `${appliedFix}\n\nReady-to-use work:\n${readyWorkText(fix.readyWork)}`;

  const { error: runError } = await supabase.from("autopilot_runs").insert({
    project_id: projectId,
    owner_id: user.id,
    detected_problem: problem.problem,
    applied_fix: appliedFixWithWork,
    work_created: readyWorkText(fix.readyWork),
    next_step: fix.nextStep,
    status,
  });

  if (runError) {
    redirectWithError(pathname, runError.message);
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/campaigns`);
  revalidatePath(`/projects/${projectId}/research`);
  redirect(`${pathname}?success=fix`);
}

export async function startGrowthAutopilotAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  await preparePublicTrackingLinks(projectId, user.id, pathname);

  const { data: existingMemory, error: memoryLoadError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (memoryLoadError) {
    redirectWithError(pathname, memoryLoadError.message);
  }

  let memory = existingMemory;

  if (!memory) {
    const productUrl = getString(formData, "product_url");

    if (!productUrl) {
      redirectWithError(pathname, "Product URL is required to start Autopilot.");
    }

    const { data: createdMemory, error: memoryError } = await supabase
      .from("product_memory")
      .insert(buildProductMemoryFromUrl({ project, ownerId: user.id, productUrl }))
      .select("*")
      .single();

    if (memoryError || !createdMemory) {
      redirectWithError(pathname, memoryError?.message || "Product memory could not be created.");
    }

    memory = createdMemory;
  }

  const { count: researchCount, error: researchCountError } = await supabase
    .from("research_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (researchCountError) {
    redirectWithError(pathname, researchCountError.message);
  }

  if ((researchCount ?? 0) === 0) {
    const { error } = await supabase
      .from("research_runs")
      .insert(buildResearchRun({ project, memory, ownerId: user.id }));

    if (error) {
      redirectWithError(pathname, error.message);
    }
  }

  const { count: actionCount, error: actionCountError } = await supabase
    .from("growth_actions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (actionCountError) {
    redirectWithError(pathname, actionCountError.message);
  }

  if ((actionCount ?? 0) === 0) {
    const actions = generateGrowthActionsIfMissing({
      project,
      memory,
      ownerId: user.id,
      researchCount: researchCount ?? 0,
      actionCount: actionCount ?? 0,
      campaigns: [],
    });

    if (actions.length > 0) {
      const { error } = await supabase.from("growth_actions").insert(actions);

      if (error) {
        redirectWithError(pathname, error.message);
      }
    }
  }

  const { data: campaigns, error: campaignLoadError } = await supabase
    .from("campaigns")
    .select("id, campaign_items(id, tracking_links(*))")
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (campaignLoadError) {
    redirectWithError(pathname, campaignLoadError.message);
  }

  if ((campaigns ?? []).length === 0) {
    if (!memory.website_url) {
      redirectWithError(pathname, "Product URL is required to create tracking links.");
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        project_id: projectId,
        owner_id: user.id,
        name: `${project.customer} Magic URL Autopilot`,
        campaign_type: "linkedin_founder_post",
        status: "draft",
        next_action: "Copy/post the first ready-to-use work item with its tracking link.",
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      redirectWithError(pathname, campaignError?.message || "Campaign could not be created.");
    }

    const { data: newItems, error: itemError } = await supabase
      .from("campaign_items")
      .insert(
        buildViralCampaignItems({
          project,
          memory,
          ownerId: user.id,
          campaignId: campaign.id,
          destinationUrl: memory.website_url,
        }),
      )
      .select("id, project_id, owner_id, utm_source, utm_medium, utm_campaign, utm_content");

    if (itemError || !newItems) {
      redirectWithError(pathname, itemError?.message || "Ready-to-use work could not be created.");
    }

    const { error: trackingError } = await supabase
      .from("tracking_links")
      .insert(generateTrackingLinksIfMissing(newItems, memory.website_url));

    if (trackingError) {
      redirectWithError(pathname, trackingError.message);
    }
  }

  const { data: hydratedCampaigns, error: hydratedError } = await supabase
    .from("campaigns")
    .select("*, campaign_items(*, campaign_results(*), tracking_links(*))")
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (hydratedError) {
    redirectWithError(pathname, hydratedError.message);
  }

  const { count: hydratedActionCount } = await supabase
    .from("growth_actions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  const summary = buildAutopilotSummary({
    project,
    memory,
    ownerId: user.id,
    researchCount: Math.max(researchCount ?? 0, 1),
    actionCount: hydratedActionCount ?? actionCount ?? 0,
    campaigns: hydratedCampaigns ?? [],
  });
  const cycle = runAutopilotCycle({
    project,
    memory,
    ownerId: user.id,
    researchCount: Math.max(researchCount ?? 0, 1),
    actionCount: hydratedActionCount ?? actionCount ?? 0,
    campaigns: hydratedCampaigns ?? [],
  });
  const workCreated = summary.workCreated.slice(0, 5).join("\n\n");

  const { error: runError } = await supabase.from("autopilot_runs").insert({
    project_id: projectId,
    owner_id: user.id,
    detected_problem: cycle.problem,
    applied_fix: cycle.fix,
    work_created: workCreated,
    next_step: cycle.nextMove,
    status: "applied",
  });

  if (runError) {
    redirectWithError(pathname, runError.message);
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/campaigns`);
  redirect(`${pathname}?success=autopilot`);
}

export async function createTodayGrowthPlan(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const plan = createDailyGrowthPlan();
  const { error } = await supabase.from("autopilot_runs").insert({
    project_id: projectId,
    owner_id: user.id,
    detected_problem: plan.focus,
    applied_fix: "Created today's manual growth plan.",
    work_created: plan.tasks.join("\n\n"),
    next_step: plan.resultCheck,
    status: "ready",
  });

  if (error) {
    redirectWithError(pathname, error.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=daily`);
}

export async function runTodayAutopilot(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    redirectWithError(pathname, "Project not found.");
  }

  const { data: memory, error: memoryError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (memoryError || !memory) {
    redirectWithError(pathname, memoryError?.message || "Product URL setup is required first.");
  }

  await preparePublicTrackingLinks(projectId, user.id, pathname);

  const { count: researchCount } = await supabase
    .from("research_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if ((researchCount ?? 0) === 0) {
    const { error } = await supabase
      .from("research_runs")
      .insert(buildResearchRun({ project, memory, ownerId: user.id }));

    if (error) {
      redirectWithError(pathname, error.message);
    }
  }

  const { count: actionCount } = await supabase
    .from("growth_actions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if ((actionCount ?? 0) === 0) {
    const { error } = await supabase.from("growth_actions").insert(
      buildGrowthActions({
        project,
        memory,
        ownerId: user.id,
        researchRunId: null,
      }),
    );

    if (error) {
      redirectWithError(pathname, error.message);
    }
  }

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if ((campaigns ?? []).length === 0) {
    if (!memory.website_url) {
      redirectWithError(pathname, "Add CareerScore URL to create tracking links.");
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        project_id: projectId,
        owner_id: user.id,
        name: `${project.customer} Daily Autopilot`,
        campaign_type: "linkedin_founder_post",
        status: "draft",
        next_action: "Approve today's queue and post manually.",
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      redirectWithError(pathname, campaignError?.message || "Campaign could not be created.");
    }

    const { data: newItems, error: itemError } = await supabase
      .from("campaign_items")
      .insert(
        buildViralCampaignItems({
          project,
          memory,
          ownerId: user.id,
          campaignId: campaign.id,
          destinationUrl: memory.website_url,
        }),
      )
      .select("id, project_id, owner_id, utm_source, utm_medium, utm_campaign, utm_content");

    if (itemError || !newItems) {
      redirectWithError(pathname, itemError?.message || "Daily work could not be created.");
    }

    const { error: trackingError } = await supabase
      .from("tracking_links")
      .insert(generateTrackingLinksIfMissing(newItems, memory.website_url));

    if (trackingError) {
      redirectWithError(pathname, trackingError.message);
    }
  }

  const { data: hydratedCampaigns, error: hydratedError } = await supabase
    .from("campaigns")
    .select("*, campaign_items(*, campaign_results(*), tracking_links(*))")
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (hydratedError) {
    redirectWithError(pathname, hydratedError.message);
  }

  const dailyCampaigns = (hydratedCampaigns ?? []) as DailyAutopilotCampaign[];
  const missingTrackingItems = dailyCampaigns
    .flatMap((campaign) => campaign.campaign_items ?? [])
    .filter((item) => (item.tracking_links ?? []).length === 0);

  if (missingTrackingItems.length > 0) {
    if (!memory.website_url) {
      redirectWithError(pathname, "Add CareerScore URL to create tracking links.");
    }

    const { error: trackingError } = await supabase
      .from("tracking_links")
      .insert(generateTrackingLinksIfMissing(missingTrackingItems, memory.website_url));

    if (trackingError) {
      redirectWithError(pathname, trackingError.message);
    }
  }

  const { data: autopilotCampaigns, error: autopilotCampaignError } = await supabase
    .from("campaigns")
    .select("*, campaign_items(*, campaign_results(*), tracking_links(*))")
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (autopilotCampaignError) {
    redirectWithError(pathname, autopilotCampaignError.message);
  }

  const trackedItems = ((autopilotCampaigns ?? []) as DailyAutopilotCampaign[])
    .flatMap((campaign) => campaign.campaign_items ?? [])
    .map((item) => ({
      id: item.id,
      trackingUrl: item.tracking_links?.[0]?.tracking_url || "",
    }))
    .filter((item) => item.trackingUrl);

  for (const item of trackedItems) {
    const { error: queueLinkError } = await supabase
      .from("publisher_queue")
      .update({ tracking_url: item.trackingUrl })
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
      .eq("campaign_item_id", item.id)
      .eq("tracking_url", "");

    if (queueLinkError) {
      redirectWithError(pathname, queueLinkError.message);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: existingRuns } = await supabase
    .from("daily_autopilot_runs")
    .select("run_date")
    .eq("project_id", projectId)
    .eq("owner_id", user.id);
  const output = await runDailyAutopilotForProject({
    context: {
      project,
      memory,
      ownerId: user.id,
      researchCount: Math.max(researchCount ?? 0, 1),
      actionCount: Math.max(actionCount ?? 0, 1),
      campaigns: autopilotCampaigns ?? [],
    },
    today,
    existingRunDates: (existingRuns ?? []).map((run) => run.run_date),
  });

  if (output.queueItems.length > 0) {
    const { error: queueError } = await supabase.from("publisher_queue").insert(output.queueItems);

    if (queueError) {
      redirectWithError(pathname, queueError.message);
    }
  }

  if (output.dailyRun.status === "skipped") {
    revalidatePath(pathname);
    redirect(`${pathname}?success=skipped`);
  }

  const { error: runError } = await supabase.from("daily_autopilot_runs").insert(output.dailyRun);

  if (runError) {
    redirectWithError(pathname, runError.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=today`);
}

export async function startDistributionEngine(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  try {
    requirePublicAppUrlForGeneration();
    await repairLegacyLocalTrackingLinks(projectId, user.id);
    await runDistributionCycle(projectId);
    await scheduleApprovedAssets(projectId);
    await publishDuePosts(10, { projectId, ownerId: user.id });
  } catch (error) {
    redirectWithError(
      pathname,
      error instanceof Error ? error.message : "Distribution Engine failed.",
    );
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/campaigns`);
  redirect(`${pathname}?success=distribution`);
}

export async function goAutopilotAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  try {
    await preparePublicTrackingLinks(projectId, user.id, pathname);
    await runGoAutopilot(projectId);
  } catch (error) {
    redirectWithError(pathname, error instanceof Error ? error.message : "GO Autopilot failed.");
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/campaigns`);
  revalidatePath(`/projects/${projectId}/social-share`);
  redirect(`${pathname}?success=go-autopilot`);
}

export async function approvePublisherQueueItem(formData: FormData) {
  await updatePublisherQueueStatus(formData, "approved");
}

export async function markPublisherQueueItemPosted(formData: FormData) {
  await updatePublisherQueueStatus(formData, "posted");
}

export async function markPublisherQueueItemFailed(formData: FormData) {
  await updatePublisherQueueStatus(formData, "failed");
}

export async function runFullSystemTestAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const output = await runFullSystemTest(projectId);
  const { error } = await supabase.from("system_test_runs").insert({
    project_id: projectId,
    owner_id: user.id,
    status: output.status,
    total_tests: output.total_tests,
    passed: output.passed,
    failed: output.failed,
    warnings: output.warnings,
    summary: output.summary,
    results_json: output.results,
  });

  if (error) {
    redirectWithError(pathname, error.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=system-test`);
}

export async function createDemoResultAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId) {
    redirectWithError("/projects", "Project is required.");
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      name: "system_test demo result campaign",
      campaign_type: "linkedin_founder_post",
      status: "draft",
      next_action: "Demo/test result only; do not treat as production metrics.",
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    redirectWithError(pathname, campaignError?.message || "Demo campaign could not be created.");
  }

  const { data: item, error: itemError } = await supabase
    .from("campaign_items")
    .insert({
      campaign_id: campaign.id,
      project_id: projectId,
      owner_id: user.id,
      campaign_type: "linkedin_founder_post",
      channel: "linkedin",
      hook: "system_test demo: LinkedIn fresher shortlisted angle",
      content:
        "system_test demo: Most freshers do not know why they are not getting shortlisted. CareerScore helps them check readiness before applying again.",
      target_audience: "system_test freshers and job seekers",
      cta: "Check your CareerScore",
      expected_outcome: "Show dashboard behavior with safe demo/test data.",
      utm_source: "system_test_linkedin",
      utm_medium: "organic_test",
      utm_campaign: "system_test_demo",
      utm_content: "demo_result",
      utm_link: "https://incomeos-theta.vercel.app/",
      status: "posted",
    })
    .select("id")
    .single();

  if (itemError || !item) {
    redirectWithError(pathname, itemError?.message || "Demo campaign item could not be created.");
  }

  const trackingId = crypto.randomUUID();
  const { error: trackingError } = await supabase.from("tracking_links").insert({
    id: trackingId,
    project_id: projectId,
    owner_id: user.id,
    campaign_item_id: item.id,
    destination_url: "https://incomeos-theta.vercel.app/",
    utm_source: "system_test_linkedin",
    utm_medium: "organic_test",
    utm_campaign: "system_test_demo",
    utm_content: "demo_result",
    tracking_url: `/t/${trackingId}`,
    clicks: 10,
  });

  if (trackingError) {
    redirectWithError(pathname, trackingError.message);
  }

  const { error: resultError } = await supabase.from("campaign_results").insert({
    campaign_id: campaign.id,
    campaign_item_id: item.id,
    project_id: projectId,
    owner_id: user.id,
    views: 10,
    clicks: 10,
    signups: 2,
    paid_users: 1,
    revenue: 99,
    learning: "Demo result: LinkedIn fresher shortlisted angle worked. system_test data only.",
  });

  if (resultError) {
    redirectWithError(pathname, resultError.message);
  }

  const { error: conversionError } = await supabase.from("conversion_events").insert([
    {
      tracking_link_id: trackingId,
      campaign_item_id: item.id,
      project_id: projectId,
      owner_id: user.id,
      event_type: "signup",
      event_value: 2,
      source: "system_test_demo",
      platform: "linkedin",
    },
    {
      tracking_link_id: trackingId,
      campaign_item_id: item.id,
      project_id: projectId,
      owner_id: user.id,
      event_type: "resume_upload",
      event_value: 1,
      source: "system_test_demo",
      platform: "linkedin",
    },
    {
      tracking_link_id: trackingId,
      campaign_item_id: item.id,
      project_id: projectId,
      owner_id: user.id,
      event_type: "paid_report",
      event_value: 1,
      source: "system_test_demo",
      platform: "linkedin",
    },
    {
      tracking_link_id: trackingId,
      campaign_item_id: item.id,
      project_id: projectId,
      owner_id: user.id,
      event_type: "revenue",
      event_value: 99,
      source: "system_test_demo",
      platform: "linkedin",
    },
  ]);

  if (conversionError) {
    redirectWithError(pathname, conversionError.message);
  }

  revalidatePath(pathname);
  revalidatePath(`/projects/${projectId}/campaigns`);
  redirect(`${pathname}?success=demo-result`);
}

export async function markScheduledPostPosted(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const scheduledPostId = getString(formData, "scheduled_post_id");
  const publishedUrl = getString(formData, "published_url");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId || !scheduledPostId) {
    redirectWithError("/projects", "Scheduled post is required.");
  }

  try {
    await markPostPublished(scheduledPostId, user.id, publishedUrl);
  } catch (error) {
    redirectWithError(
      pathname,
      error instanceof Error ? error.message : "Scheduled post could not be updated.",
    );
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=posted`);
}

async function updatePublisherQueueStatus(
  formData: FormData,
  status: "approved" | "posted" | "failed",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = getString(formData, "project_id");
  const queueId = getString(formData, "publisher_queue_id");
  const pathname = `/projects/${projectId}/autopilot`;

  if (!projectId || !queueId) {
    redirectWithError("/projects", "Publisher queue item is required.");
  }

  const { error } = await supabase
    .from("publisher_queue")
    .update({
      status,
      posted_url: getString(formData, "posted_url"),
      result_notes: getString(formData, "result_notes"),
    })
    .eq("id", queueId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (error) {
    redirectWithError(pathname, error.message);
  }

  revalidatePath(pathname);
  redirect(`${pathname}?success=queue`);
}
