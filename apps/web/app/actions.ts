"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/supabase/types";

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
