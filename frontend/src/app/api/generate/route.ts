import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAllVariants, closeBrowser, type CaptionOverlay } from "@/lib/video-engine";
import * as fs from "fs/promises";
import { createWriteStream } from "fs";
import * as path from "path";
import * as os from "os";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    projectId, sourceUrl, variantCount, userId, gpsCity,
    captionId, captionGroupId,
    startIndex = 1, batchSize,
    projectType = "video",
  } = body as {
    projectId: string;
    sourceUrl: string;
    variantCount: number;
    userId: string;
    gpsCity?: string;
    captionId?: string;
    captionGroupId?: string;
    startIndex?: number;
    batchSize?: number;
    projectType?: "video" | "image";
  };

  const isImage = projectType === "image";

  // Input validation
  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }
  if (!sourceUrl || typeof sourceUrl !== "string") {
    return NextResponse.json({ error: "Invalid sourceUrl" }, { status: 400 });
  }
  if (!variantCount || typeof variantCount !== "number" || variantCount < 1 || variantCount > 50) {
    return NextResponse.json({ error: "variantCount must be 1-50" }, { status: 400 });
  }

  // Verify ownership
  if (user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate sourceUrl points to our Supabase storage (prevent SSRF)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !sourceUrl.startsWith(supabaseUrl)) {
    return NextResponse.json({ error: "Invalid source URL" }, { status: 400 });
  }

  // Compute batch bounds
  const effectiveBatchSize = batchSize || variantCount; // no batchSize = process all
  const endIndex = Math.min(startIndex + effectiveBatchSize - 1, variantCount);
  const batchCount = endIndex - startIndex + 1;
  const remaining = variantCount - endIndex;

  // Set project to processing (only on first batch)
  if (startIndex === 1) {
    await supabase
      .from("projects")
      .update({ status: "processing" })
      .eq("id", projectId);
  }

  // Work directory
  const tmpDir = path.join(os.tmpdir(), "scaleswap", projectId);
  await fs.mkdir(tmpDir, { recursive: true });

  // Derive source filename extension from the URL
  const sourceUrlPath = new URL(sourceUrl).pathname;
  const sourceExt = path.extname(sourceUrlPath) || (isImage ? ".jpg" : ".mp4");
  const sourcePath = path.join(tmpDir, `source${sourceExt}`);

  try {
    // Download source video (only if not already cached from previous batch)
    const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
    if (!sourceExists) {
      const response = await fetch(sourceUrl);
      if (!response.ok || !response.body) {
        throw new Error(`Failed to download source: ${response.status}`);
      }
      const nodeStream = Readable.fromWeb(response.body as import("stream/web").ReadableStream);
      await pipeline(nodeStream, createWriteStream(sourcePath));

      const stat = await fs.stat(sourcePath);
      if (stat.size === 0) {
        throw new Error("Downloaded source file is empty");
      }
    }

    // Build caption overlays from DB
    let captions: CaptionOverlay[] | undefined;
    console.log("[generate] captionId:", captionId, "captionGroupId:", captionGroupId);

    if (captionId) {
      const { data: cap } = await supabase
        .from("captions")
        .select("*")
        .eq("id", captionId)
        .single();
      console.log("[generate] single caption data:", cap);
      if (cap) {
        captions = [{
          text: cap.text,
          position: (cap.position || "bottom") as "top" | "center" | "bottom",
          fontSize: cap.font_size || 24,
          fontColor: cap.font_color || "white",
          strokeColor: cap.stroke_color || "black",
          fontFamily: cap.font_family || "tiktok",
        }];
      }
    } else if (captionGroupId) {
      const { data: members } = await supabase
        .from("caption_group_members")
        .select("caption_id")
        .eq("group_id", captionGroupId);
      if (members && members.length > 0) {
        const captionIds = members.map((m) => m.caption_id);
        const { data: caps } = await supabase
          .from("captions")
          .select("*")
          .in("id", captionIds);
        if (caps && caps.length > 0) {
          captions = caps.map((c) => ({
            text: c.text,
            position: (c.position || "bottom") as "top" | "center" | "bottom",
            fontSize: c.font_size || 24,
            fontColor: c.font_color || "white",
            strokeColor: c.stroke_color || "black",
            fontFamily: c.font_family || "tiktok",
          }));
        }
      }
    }

    // Process this batch of variants
    let completedCount = 0;
    console.log(`[generate] Starting generation: isImage=${isImage}, batchCount=${batchCount}, startIndex=${startIndex}, source=${sourcePath}`);

    await generateAllVariants(sourcePath, tmpDir, batchCount, gpsCity, captions, async (_completed, _total, result) => {
      const variantExt = isImage ? ".jpg" : ".mp4";
      const variantContentType = isImage ? "image/jpeg" : "video/mp4";
      const i = result.variantIndex;

      // Mark as processing
      await supabase
        .from("variants")
        .update({ status: "processing" })
        .eq("project_id", projectId)
        .eq("variant_index", i);

      console.log(`[generate] Variant ${i}: success=${result.success}, outputPath=${result.outputPath?.slice(-30)}, error=${result.error}`);
      if (result.success && result.outputPath) {
        // Upload variant file
        const fileData = await fs.readFile(result.outputPath);
        const storagePath = `${user.id}/${projectId}/variant_${String(i).padStart(3, "0")}${variantExt}`;

        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(storagePath, fileData, {
            contentType: variantContentType,
            cacheControl: "3600",
            upsert: true,
          });

        // Clean up variant file immediately
        await fs.unlink(result.outputPath).catch(() => {});

        if (uploadError) {
          console.error(`Upload failed for variant ${i}:`, uploadError.message);
          await supabase
            .from("variants")
            .update({ status: "invalid" })
            .eq("project_id", projectId)
            .eq("variant_index", i);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("videos")
          .getPublicUrl(storagePath);

        // Upload thumbnail if available
        let thumbnailUrl: string | null = null;
        if (result.thumbnailPath) {
          try {
            const thumbData = await fs.readFile(result.thumbnailPath);
            const thumbStoragePath = `${user.id}/${projectId}/thumb_${String(i).padStart(3, "0")}.jpg`;

            const { error: thumbError } = await supabase.storage
              .from("videos")
              .upload(thumbStoragePath, thumbData, {
                contentType: "image/jpeg",
                cacheControl: "3600",
                upsert: true,
              });

            if (!thumbError) {
              const { data: thumbUrl } = supabase.storage
                .from("videos")
                .getPublicUrl(thumbStoragePath);
              thumbnailUrl = thumbUrl.publicUrl;
            }
          } catch {
            // Non-fatal
          } finally {
            await fs.unlink(result.thumbnailPath).catch(() => {});
          }
        }

        // Single DB update with all variant data
        const updateData: Record<string, unknown> = {
          status: "valid",
          output_url: urlData.publicUrl,
          hash: result.hash ? `0x${result.hash.slice(0, 12)}` : null,
        };
        if (result.phash) {
          updateData.phash = result.phash;
          updateData.phash_distance = result.phashDistance;
        }
        if (thumbnailUrl) {
          updateData.thumbnail_url = thumbnailUrl;
        }
        await supabase
          .from("variants")
          .update(updateData)
          .eq("project_id", projectId)
          .eq("variant_index", i);

        completedCount++;
      } else {
        console.error(`FFmpeg failed for variant ${i}:`, result.error);
        console.error(`[generate] FFmpeg error variant ${i}:`, result.error);
        await supabase
          .from("variants")
          .update({ status: "invalid" })
          .eq("project_id", projectId)
          .eq("variant_index", i);
      }
    }, startIndex, isImage);

    // Update project status when this is the last batch (or the only batch)
    if (remaining === 0) {
      // For the final batch, check total valid variants (not just this batch's count)
      const { count } = await supabase
        .from("variants")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "valid");

      await supabase
        .from("projects")
        .update({ status: (count ?? 0) > 0 ? "ready" : "error" })
        .eq("id", projectId);

      // Only cleanup temp directory on the last batch (prevents race condition)
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    // Close shared Puppeteer browser to prevent zombie Chrome processes
    await closeBrowser().catch(() => {});

    return NextResponse.json({
      ok: true,
      completed: completedCount,
      remaining,
      startIndex,
      endIndex,
    });
  } catch (err) {
    console.error("Generation failed:", err);
    console.error(`[generate] Fatal error:`, err);
    await closeBrowser().catch(() => {});
    // Mark remaining pending/processing variants as invalid
    await supabase
      .from("variants")
      .update({ status: "invalid" })
      .eq("project_id", projectId)
      .or("status.eq.pending,status.eq.processing");

    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", projectId);

    // Cleanup temp directory on error
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    return NextResponse.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }
}
