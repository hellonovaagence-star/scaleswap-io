import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/retry-stuck
 * Finds all projects stuck in "processing" status with no variants generated,
 * and re-triggers their generation by calling /api/generate for each.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find projects stuck in "processing" that belong to this user
  const { data: stuckProjects, error: queryError } = await supabase
    .from("projects")
    .select("id, source_url, variant_count, type, batch_id")
    .eq("user_id", user.id)
    .eq("status", "processing")
    .order("created_at", { ascending: true });

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!stuckProjects || stuckProjects.length === 0) {
    return NextResponse.json({ ok: true, retriggered: 0, message: "No stuck projects found" });
  }

  // For each stuck project, check if it actually has unprocessed variants
  const toRetrigger: typeof stuckProjects = [];
  for (const project of stuckProjects) {
    const { count } = await supabase
      .from("variants")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("status", "valid");

    // Only re-trigger if no valid variants exist yet
    if ((count ?? 0) === 0 && project.source_url) {
      toRetrigger.push(project);
    }
  }

  // Get caption info from the first project's batch (they all share the same settings)
  // We can't recover the original caption settings, so we skip captions for retries
  const baseUrl = req.nextUrl.origin;

  let triggered = 0;
  for (const project of toRetrigger) {
    // Reset variants to pending
    await supabase
      .from("variants")
      .update({ status: "pending" })
      .eq("project_id", project.id);

    // Fire generation request (fire-and-forget)
    fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") || "" },
      body: JSON.stringify({
        projectId: project.id,
        sourceUrl: project.source_url,
        variantCount: project.variant_count,
        userId: user.id,
        projectType: project.type || "video",
      }),
    }).catch((err) => {
      console.error(`[retry-stuck] Failed to trigger ${project.id}:`, err);
    });

    triggered++;
    // Small stagger to avoid overwhelming the queue
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[retry-stuck] Re-triggered ${triggered} stuck projects for user ${user.id}`);

  return NextResponse.json({
    ok: true,
    retriggered: triggered,
    total_stuck: stuckProjects.length,
    skipped: stuckProjects.length - triggered,
  });
}
