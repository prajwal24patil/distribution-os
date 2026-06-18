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
