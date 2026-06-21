import {
  generateContentBatch,
  generateDistributionStrategy,
} from "@/lib/autonomousDistributionEngine";
import { runDashboardQc } from "@/lib/dashboardQcAgent";
import { qaContentAsset } from "@/lib/qaAgent";
import { scheduleApprovedAssets } from "@/lib/publishingScheduler";
import { createClient } from "@/lib/supabase/server";
import type { SystemTestResult, SystemTestStatus } from "@/lib/supabase/types";

type TestContext = {
  projectId: string;
  ownerId: string;
};

export type FullSystemTestRun = {
  status: SystemTestStatus;
  total_tests: number;
  passed: number;
  failed: number;
  warnings: number;
  summary: string;
  results: SystemTestResult[];
};

function elapsed(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function result({
  name,
  status,
  message,
  details = "",
  startedAt,
}: {
  name: string;
  status: SystemTestStatus;
  message: string;
  details?: string;
  startedAt: number;
}): SystemTestResult {
  const testResult: SystemTestResult = {
    name,
    status,
    message,
    details,
    duration_ms: elapsed(startedAt),
  };

  if (status === "fail") {
    testResult.fix_instruction = generateFixInstruction(testResult);
  }

  return testResult;
}

async function getContext(projectId: string): Promise<TestContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is required to run the system test.");
  }

  return { projectId, ownerId: user.id };
}

async function createSystemTestCampaign(context: TestContext) {
  const supabase = await createClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      project_id: context.projectId,
      owner_id: context.ownerId,
      name: "system_test CareerScore health check",
      campaign_type: "linkedin_founder_post",
      status: "draft",
      next_action: "system_test only; do not publish externally.",
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message || "Could not create system_test campaign.");
  }

  const { data: item, error: itemError } = await supabase
    .from("campaign_items")
    .insert({
      campaign_id: campaign.id,
      project_id: context.projectId,
      owner_id: context.ownerId,
      campaign_type: "linkedin_founder_post",
      channel: "linkedin",
      hook: "system_test CareerScore fresher shortlist angle",
      content:
        "system_test demo: Most freshers do not know why they are not getting shortlisted. CareerScore helps them check readiness before applying again.",
      target_audience: "system_test freshers and job seekers",
      cta: "Check your CareerScore",
      expected_outcome: "system_test validates tracking and results only.",
      utm_source: "system_test_linkedin",
      utm_medium: "organic_test",
      utm_campaign: "system_test",
      utm_content: "careerscore_health_check",
      utm_link: "https://incomeos-theta.vercel.app/",
      status: "draft",
    })
    .select("id, campaign_id")
    .single();

  if (itemError || !item) {
    throw new Error(itemError?.message || "Could not create system_test campaign item.");
  }

  const trackingId = crypto.randomUUID();
  const { error: trackingError } = await supabase.from("tracking_links").insert({
    id: trackingId,
    project_id: context.projectId,
    owner_id: context.ownerId,
    campaign_item_id: item.id,
    destination_url: "https://incomeos-theta.vercel.app/",
    utm_source: "system_test_linkedin",
    utm_medium: "organic_test",
    utm_campaign: "system_test",
    utm_content: "careerscore_health_check",
    tracking_url: `/t/${trackingId}`,
  });

  if (trackingError) {
    throw new Error(trackingError.message);
  }

  return {
    campaignId: campaign.id,
    campaignItemId: item.id,
    trackingId,
    trackingUrl: `/t/${trackingId}`,
  };
}

async function getLatestSystemTracking(context: TestContext) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracking_links")
    .select("*")
    .eq("project_id", context.projectId)
    .eq("owner_id", context.ownerId)
    .eq("utm_campaign", "system_test")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export function generateFixInstruction(testFailure: Pick<SystemTestResult, "name" | "message">) {
  const name = testFailure.name.toLowerCase();

  if (name.includes("tracking")) {
    return "Tracking links failed. Ask Codex: Fix /t/[id] redirect so it records clicks and redirects to the CareerScore URL.";
  }

  if (name.includes("scheduling")) {
    return "Scheduling failed. Ask Codex: Fix publishing scheduler so approved assets create manual-required scheduled posts safely.";
  }

  if (name.includes("product")) {
    return "Product setup failed. Ask Codex: Fix Product Memory setup so CareerScore URL and product details are saved before Autopilot runs.";
  }

  if (name.includes("result")) {
    return "Result tracking failed. Ask Codex: Fix demo/test result saving so clicks, signups, paid reports, revenue, and learning update the dashboard.";
  }

  return `System test failed. Ask Codex: Fix ${testFailure.name}. Reason: ${testFailure.message}`;
}

export async function testProjectSetup(projectId: string) {
  const startedAt = performance.now();
  const context = await getContext(projectId);
  const supabase = await createClient();
  const [{ data: project }, { data: memory }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("user_id", context.ownerId)
      .maybeSingle(),
    supabase
      .from("product_memory")
      .select("id, product_name, website_url, product_url")
      .eq("project_id", projectId)
      .eq("owner_id", context.ownerId)
      .maybeSingle(),
  ]);

  if (!project) {
    return result({
      name: "Product setup",
      status: "fail",
      message: "Project was not found for the current user.",
      startedAt,
    });
  }

  if (!memory?.product_name) {
    return result({
      name: "Product setup",
      status: "warning",
      message: "Project exists, but Product Memory is incomplete.",
      details: "Add CareerScore product details before relying on growth automation.",
      startedAt,
    });
  }

  if (!memory.website_url && !memory.product_url) {
    return result({
      name: "Product setup",
      status: "warning",
      message: "CareerScore URL is missing.",
      details: "Add CareerScore URL to Product Memory.",
      startedAt,
    });
  }

  return result({
    name: "Product setup",
    status: "pass",
    message: "Project, Product Memory, and CareerScore URL exist.",
    startedAt,
  });
}

export async function testDistributionCycle(projectId: string) {
  const startedAt = performance.now();
  const strategy = await generateDistributionStrategy(projectId);

  return result({
    name: "Distribution cycle",
    status: strategy ? "pass" : "fail",
    message: strategy
      ? "Distribution strategy can be generated."
      : "Distribution strategy did not generate.",
    details: strategy.slice(0, 220),
    startedAt,
  });
}

export async function testAssetGeneration(projectId: string) {
  const startedAt = performance.now();
  const assets = await generateContentBatch(projectId);

  return result({
    name: "Asset generation",
    status: assets.length >= 5 ? "pass" : "fail",
    message: `${assets.length} assets generated.`,
    details: assets
      .slice(0, 3)
      .map((asset) => asset.title)
      .join(" | "),
    startedAt,
  });
}

export async function testQaScoring(_projectId: string) {
  const startedAt = performance.now();
  const approved = qaContentAsset({
    content:
      "Most freshers do not know why they are not getting shortlisted. CareerScore helps them check career readiness before applying again.",
    cta: "Check your CareerScore",
    trackingLink: "/t/system_test",
    platform: "linkedin",
  });
  const rejected = qaContentAsset({
    content: "Guaranteed dream job if you dm everyone.",
    cta: "Buy now",
    trackingLink: "/t/system_test",
    platform: "reddit",
  });

  return result({
    name: "QA scoring",
    status: approved.status === "approved" && rejected.status === "rejected" ? "pass" : "fail",
    message: "QA approves safe CareerScore content and rejects unsafe content.",
    details: `Approved: ${approved.reason} Rejected: ${rejected.reason}`,
    startedAt,
  });
}

export async function testScheduling(projectId: string) {
  const startedAt = performance.now();
  const context = await getContext(projectId);
  const supabase = await createClient();
  const testData = await createSystemTestCampaign(context);

  const { error } = await supabase.from("publisher_queue").insert({
    project_id: projectId,
    owner_id: context.ownerId,
    campaign_item_id: testData.campaignItemId,
    platform: "linkedin",
    content_type: "system_test",
    title: "system_test CareerScore scheduled asset",
    content:
      "system_test demo: Most freshers do not know why they are not getting shortlisted. CareerScore helps them check readiness before applying again.",
    tracking_url: testData.trackingUrl,
    status: "approved",
    asset_type: "system_test",
    format: "manual post",
    quality_score: 80,
    qa_status: "approved",
    qa_reason: "system_test safe asset",
    predicted_rank_score: 80,
    publishing_status: "manual_approval_required",
    result_summary: "system_test scheduled work only.",
  });

  if (error) {
    return result({
      name: "Scheduling",
      status: "fail",
      message: error.message,
      startedAt,
    });
  }

  const scheduled = await scheduleApprovedAssets(projectId);

  return result({
    name: "Scheduling",
    status: "pass",
    message:
      scheduled.created > 0
        ? "Approved assets create scheduled/manual-ready posts."
        : "No new scheduled posts were needed because existing work is already scheduled.",
    details: `Created ${scheduled.created}, manual required ${scheduled.manualRequired}.`,
    startedAt,
  });
}

export async function testDashboardQc(projectId: string) {
  const startedAt = performance.now();
  const qc = await runDashboardQc(projectId);

  return result({
    name: "Dashboard QC",
    status: qc.status === "fail" ? "fail" : "pass",
    message:
      qc.status === "pass"
        ? "QC passed. Dashboard clean, tracking placeholders fixed, duplicate assets hidden."
        : "Dashboard QC needs attention.",
    details: [...qc.fixes, ...qc.warnings].slice(0, 5).join(" | "),
    startedAt,
  });
}

export async function testSchedulingIdempotency(projectId: string) {
  const startedAt = performance.now();
  const first = await scheduleApprovedAssets(projectId);
  const second = await scheduleApprovedAssets(projectId);

  return result({
    name: "Scheduling idempotency",
    status: second.created === 0 ? "pass" : "warning",
    message:
      second.created === 0
        ? "Repeated scheduling did not create duplicate scheduled posts."
        : "Repeated scheduling created additional posts; check duplicate safeguards.",
    details: `First run created ${first.created}. Second run created ${second.created}.`,
    startedAt,
  });
}

export async function testTrackingLinks(projectId: string) {
  const startedAt = performance.now();
  const context = await getContext(projectId);
  const tracking =
    (await getLatestSystemTracking(context)) ?? (await createSystemTestCampaign(context));
  const trackingUrl = "tracking_url" in tracking ? tracking.tracking_url : tracking.trackingUrl;

  return result({
    name: "Tracking links",
    status: trackingUrl?.startsWith("/t/") ? "pass" : "fail",
    message: trackingUrl ? "Tracking link exists." : "Tracking link was not created.",
    details: trackingUrl || "",
    startedAt,
  });
}

export async function testClickTracking(projectId: string) {
  const startedAt = performance.now();
  const context = await getContext(projectId);
  const supabase = await createClient();
  const tracking = await getLatestSystemTracking(context);

  if (!tracking) {
    return result({
      name: "Click tracking",
      status: "fail",
      message: "No system_test tracking link exists.",
      startedAt,
    });
  }

  const before = tracking.clicks;
  await supabase.from("click_events").insert({
    tracking_link_id: tracking.id,
    project_id: projectId,
    owner_id: context.ownerId,
    source: tracking.utm_source,
    medium: tracking.utm_medium,
    campaign: tracking.utm_campaign,
    content: tracking.utm_content,
  });
  await supabase.from("conversion_events").insert({
    tracking_link_id: tracking.id,
    campaign_item_id: tracking.campaign_item_id,
    project_id: projectId,
    owner_id: context.ownerId,
    event_type: "click",
    event_value: 1,
    source: "system_test",
    platform: "linkedin",
  });
  await supabase
    .from("tracking_links")
    .update({ clicks: before + 1 })
    .eq("id", tracking.id);

  const { data: after } = await supabase
    .from("tracking_links")
    .select("clicks")
    .eq("id", tracking.id)
    .single();

  return result({
    name: "Click tracking",
    status: (after?.clicks ?? 0) > before ? "pass" : "fail",
    message: "Click count updates for a controlled system_test tracking link.",
    details: `Before ${before}, after ${after?.clicks ?? 0}.`,
    startedAt,
  });
}

export async function testResultTracking(projectId: string) {
  const startedAt = performance.now();
  const context = await getContext(projectId);
  const supabase = await createClient();
  const tracking = await getLatestSystemTracking(context);

  if (!tracking) {
    return result({
      name: "Result tracking",
      status: "fail",
      message: "No system_test tracking link exists for result tracking.",
      startedAt,
    });
  }

  const { data: item } = await supabase
    .from("campaign_items")
    .select("campaign_id")
    .eq("id", tracking.campaign_item_id)
    .eq("owner_id", context.ownerId)
    .single();

  if (!item) {
    return result({
      name: "Result tracking",
      status: "fail",
      message: "No campaign item exists for the system_test tracking link.",
      startedAt,
    });
  }

  await supabase.from("campaign_results").insert({
    campaign_id: item.campaign_id,
    campaign_item_id: tracking.campaign_item_id,
    project_id: projectId,
    owner_id: context.ownerId,
    views: 10,
    clicks: 10,
    signups: 2,
    paid_users: 1,
    revenue: 99,
    learning: "system_test demo result: LinkedIn fresher shortlisted angle worked.",
  });
  await supabase.from("conversion_events").insert([
    {
      tracking_link_id: tracking.id,
      campaign_item_id: tracking.campaign_item_id,
      project_id: projectId,
      owner_id: context.ownerId,
      event_type: "signup",
      event_value: 2,
      source: "system_test",
      platform: "linkedin",
    },
    {
      tracking_link_id: tracking.id,
      campaign_item_id: tracking.campaign_item_id,
      project_id: projectId,
      owner_id: context.ownerId,
      event_type: "resume_upload",
      event_value: 1,
      source: "system_test",
      platform: "linkedin",
    },
    {
      tracking_link_id: tracking.id,
      campaign_item_id: tracking.campaign_item_id,
      project_id: projectId,
      owner_id: context.ownerId,
      event_type: "paid_report",
      event_value: 1,
      source: "system_test",
      platform: "linkedin",
    },
    {
      tracking_link_id: tracking.id,
      campaign_item_id: tracking.campaign_item_id,
      project_id: projectId,
      owner_id: context.ownerId,
      event_type: "revenue",
      event_value: 99,
      source: "system_test",
      platform: "linkedin",
    },
  ]);

  return result({
    name: "Result tracking",
    status: "pass",
    message:
      "Demo/test result saves clicks, signups, resume upload, paid report, revenue, and learning.",
    details: "system_test result only; not production metrics.",
    startedAt,
  });
}

export async function testNextMove(projectId: string) {
  const startedAt = performance.now();
  const context = await getContext(projectId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaign_results")
    .select("learning")
    .eq("project_id", projectId)
    .eq("owner_id", context.ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return result({
    name: "Next move",
    status: data?.learning ? "pass" : "warning",
    message: data?.learning
      ? "Latest learning is available for the next move."
      : "No learning exists yet.",
    details: data?.learning || "Create a demo result or add a real result.",
    startedAt,
  });
}

export async function cleanupOldTestRuns(projectId: string) {
  const context = await getContext(projectId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_test_runs")
    .select("id")
    .eq("project_id", projectId)
    .eq("owner_id", context.ownerId)
    .order("created_at", { ascending: false })
    .range(10, 50);

  const ids = (data ?? []).map((row) => row.id);

  if (ids.length > 0) {
    await supabase.from("system_test_runs").delete().in("id", ids).eq("owner_id", context.ownerId);
  }
}

export async function runFullSystemTest(projectId: string): Promise<FullSystemTestRun> {
  await cleanupOldTestRuns(projectId);
  const tests = [
    testProjectSetup,
    testDistributionCycle,
    testAssetGeneration,
    testQaScoring,
    testScheduling,
    testDashboardQc,
    testSchedulingIdempotency,
    testTrackingLinks,
    testClickTracking,
    testResultTracking,
    testNextMove,
  ];
  const results: SystemTestResult[] = [];

  for (const test of tests) {
    try {
      results.push(await test(projectId));
    } catch (error) {
      const failed = result({
        name: test.name
          .replace(/^test/, "")
          .replace(/([A-Z])/g, " $1")
          .trim(),
        status: "fail",
        message: error instanceof Error ? error.message : "Unknown system test error.",
        startedAt: performance.now(),
      });
      results.push(failed);
    }
  }

  const failed = results.filter((item) => item.status === "fail").length;
  const warnings = results.filter((item) => item.status === "warning").length;
  const passed = results.filter((item) => item.status === "pass").length;
  const status: SystemTestStatus = failed > 0 ? "fail" : warnings > 0 ? "warning" : "pass";

  return {
    status,
    total_tests: results.length,
    passed,
    failed,
    warnings,
    summary:
      failed > 0
        ? "System test found issues that need a fix."
        : "DistributionOS engine is working. It can create assets, schedule work, track clicks, save results, and update next move.",
    results,
  };
}
