import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { extractPostIdFromPublicationSlug } from "@/lib/blogPublisher";
import { sanitizeCareerScoreCopy, sanitizeCareerScoreTitle } from "@/lib/careerScoreCopy";
import { getPublicAppUrl, toPublicUrl } from "@/lib/publicUrl";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScheduledPostRow } from "@/lib/supabase/types";

type PublicationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PublicationPageProps) {
  const { slug } = await params;
  const post = await loadPublishedPost(slug);

  if (!post) {
    return {
      title: "CareerScore Publication",
    };
  }

  return {
    title: sanitizeCareerScoreTitle(post.title, `${post.platform} ${post.content_type}`),
    description: sanitizeCareerScoreCopy(post.content).slice(0, 150),
  };
}

async function loadPublishedPost(slug: string) {
  const supabase = createAdminClient();
  const postId = extractPostIdFromPublicationSlug(slug);
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as ScheduledPostRow | null;
}

export default async function PublicationPage({ params }: PublicationPageProps) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const origin = getPublicAppUrl(host ? `${protocol}://${host}` : "");
  const post = await loadPublishedPost(slug);

  if (!post) {
    notFound();
  }

  const trackingUrl = toPublicUrl(post.tracking_url, origin);
  const articleContent = post.tracking_url
    ? sanitizeCareerScoreCopy(post.content).replaceAll(post.tracking_url, trackingUrl)
    : sanitizeCareerScoreCopy(post.content);
  const articleTitle = sanitizeCareerScoreTitle(
    post.title,
    `${post.platform} ${post.content_type}`,
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-neutral-950 sm:px-6">
      <article>
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          CareerScore Publication
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">{articleTitle}</h1>
        <p className="mt-3 text-sm text-neutral-500">Published by DistributionOS for CareerScore</p>
        <div className="mt-8 whitespace-pre-wrap text-base leading-8 text-neutral-800">
          {articleContent}
        </div>
        {post.tracking_url ? (
          <a
            className="mt-8 inline-flex rounded bg-neutral-950 px-4 py-3 text-sm font-semibold text-white"
            href={trackingUrl}
          >
            Check your CareerScore
          </a>
        ) : null}
      </article>
    </main>
  );
}
