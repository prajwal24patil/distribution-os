"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildGrowthActions, buildResearchRun } from "@/lib/growthEngine";
import { createClient } from "@/lib/supabase/server";
import type {
  ExecutionResultStatus,
  GrowthActionCategory,
  GrowthActionStatus,
  ProjectStatus,
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

function getString(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
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
    .select("id")
    .single();

  if (error) {
    redirectWithError("/projects/new", error.message);
  }

  revalidatePath("/");
  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient();
  const id = getString(formData, "id");

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
  redirect(`/projects/${id}`);
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

  const resultStatus = getString(
    formData,
    "result_status",
    "pending",
  ) as ExecutionResultStatus;

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
    .select("id, category, title, status, execution_logs(result_status, channel, learning, executed_at)")
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
