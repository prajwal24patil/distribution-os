import Link from "next/link";
import { notFound } from "next/navigation";
import { saveProductMemory } from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDate } from "@/lib/projects";
import { requireUser } from "@/lib/auth";
import type { ProductMemoryRow } from "@/lib/supabase/types";

type ProductMemoryPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type FieldProps = {
  label: string;
  name: keyof ProductMemoryRow;
  memory: ProductMemoryRow | null;
  placeholder?: string;
  required?: boolean;
  type?: string;
};

function InputField({ label, name, memory, placeholder, required, type = "text" }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        className="h-10 rounded border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950"
        defaultValue={String(memory?.[name] ?? "")}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextareaField({ label, name, memory, placeholder, required }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <textarea
        className="min-h-28 rounded border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
        defaultValue={String(memory?.[name] ?? "")}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

export default async function ProductMemoryPage({ params, searchParams }: ProductMemoryPageProps) {
  const { id } = await params;
  const { error: actionError, saved } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: memory, error: memoryError } = await supabase
    .from("product_memory")
    .select("*")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (memoryError) {
    return (
      <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-red-950">Product memory failed to load</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{memoryError.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="border-b border-neutral-300 pb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
        >
          Back to project
        </Link>
        <div className="mt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Product Memory
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{project.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-700">
            Store the product context needed to research, position, and grow this project.
          </p>
        </div>
      </section>

      {!memory ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-lg font-semibold text-sky-950">No product memory yet</h3>
          <p className="mt-2 text-sm leading-6 text-sky-800">
            Fill out the form below to create the first durable product memory record. Product
            details should be entered here through the UI, not hardcoded into platform logic.
          </p>
        </div>
      ) : (
        <div className="rounded border border-neutral-300 bg-white p-5">
          <p className="text-sm font-medium text-neutral-500">Last updated</p>
          <p className="mt-2 text-sm text-neutral-800">{formatDate(memory.updated_at)}</p>
        </div>
      )}

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Product memory saved.
        </div>
      ) : null}

      <form action={saveProductMemory} className="rounded border border-neutral-300 bg-white p-5">
        <input name="project_id" type="hidden" value={project.id} />
        <input name="memory_id" type="hidden" value={memory?.id ?? ""} />

        <div className="grid gap-5 md:grid-cols-2">
          <InputField
            label="Product name"
            memory={memory}
            name="product_name"
            placeholder="Enter the product name"
            required
          />
          <InputField
            label="Website URL"
            memory={memory}
            name="website_url"
            placeholder="https://example.com"
            type="url"
          />
          <TextareaField
            label="Product summary"
            memory={memory}
            name="product_summary"
            placeholder="What does the product do?"
            required
          />
          <TextareaField
            label="Target users"
            memory={memory}
            name="target_users"
            placeholder="Who is this for?"
          />
          <TextareaField
            label="Primary problem"
            memory={memory}
            name="primary_problem"
            placeholder="What painful problem does it solve?"
          />
          <TextareaField
            label="Value proposition"
            memory={memory}
            name="value_proposition"
            placeholder="Why should the target user care?"
          />
          <TextareaField
            label="Pricing"
            memory={memory}
            name="pricing"
            placeholder="Pricing model, tiers, or current assumptions"
          />
          <TextareaField
            label="Current stage"
            memory={memory}
            name="current_stage"
            placeholder="Idea, MVP, beta, launched, scaling"
          />
          <TextareaField
            label="Primary goal"
            memory={memory}
            name="primary_goal"
            placeholder="What is the main growth goal right now?"
          />
          <TextareaField
            label="Target countries"
            memory={memory}
            name="target_countries"
            placeholder="Countries or regions to prioritize"
          />
          <TextareaField
            label="Preferred channels"
            memory={memory}
            name="preferred_channels"
            placeholder="LinkedIn, SEO, email, partnerships, communities"
          />
          <TextareaField
            label="Competitors"
            memory={memory}
            name="competitors"
            placeholder="Known direct and indirect competitors"
          />
          <TextareaField
            label="Brand voice"
            memory={memory}
            name="brand_voice"
            placeholder="Tone, language, and messaging style"
          />
          <TextareaField
            label="Constraints"
            memory={memory}
            name="constraints"
            placeholder="Budget, time, positioning, compliance, or execution constraints"
          />
        </div>

        <div className="mt-6 flex justify-end border-t border-neutral-200 pt-5">
          <SubmitButton
            idleLabel={memory ? "Update Product Memory" : "Save Product Memory"}
            pendingLabel="Saving..."
          />
        </div>
      </form>
    </div>
  );
}
