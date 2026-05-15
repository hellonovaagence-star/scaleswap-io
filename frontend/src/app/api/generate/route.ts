import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAllVariants, acquireBrowser, releaseBrowser, closeBrowser, type CaptionOverlay } from "@/lib/video-engine";
import { acquireSlot, releaseSlot } from "@/lib/server-queue";
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
    mirrorEnabled = false,
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
    mirrorEnabled?: boolean;
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

  // Wait for a concurrency slot (max 3 projects generating simultaneously)
  await acquireSlot();

  // Register this project as using the shared Chrome browser
  acquireBrowser();

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

    // Build caption overlays from DB (with retry — queries can fail under concurrent load)
    let captions: CaptionOverlay[] | undefined;
    console.log("[generate] captionId:", captionId, "captionGroupId:", captionGroupId);

    const CAPTION_QUERY_RETRIES = 3;

    if (captionId) {
      for (let attempt = 0; attempt < CAPTION_QUERY_RETRIES; attempt++) {
        const { data: cap, error: capErr } = await supabase
          .from("captions")
          .select("*")
          .eq("id", captionId)
          .single();
        if (capErr) {
          console.warn(`[generate] Caption query attempt ${attempt} failed:`, capErr.message);
          if (attempt < CAPTION_QUERY_RETRIES - 1) await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        if (cap) {
          captions = [{
            text: cap.text,
            position: cap.position || "bottom",
            fontSize: cap.font_size || 24,
            textScale: cap.text_scale || 1,
            fontColor: cap.font_color || "white",
            strokeColor: cap.stroke_color || "black",
            fontFamily: cap.font_family || "tiktok",
          }];
          break;
        }
      }
      // Fail if caption was requested but couldn't be loaded
      if (!captions) {
        throw new Error(`Caption ${captionId} could not be loaded after ${CAPTION_QUERY_RETRIES} attempts`);
      }
    } else if (captionGroupId) {
      for (let attempt = 0; attempt < CAPTION_QUERY_RETRIES; attempt++) {
        const { data: members, error: memErr } = await supabase
          .from("caption_group_members")
          .select("caption_id")
          .eq("group_id", captionGroupId);
        if (memErr) {
          console.warn(`[generate] Caption group query attempt ${attempt} failed:`, memErr.message);
          if (attempt < CAPTION_QUERY_RETRIES - 1) await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        if (members && members.length > 0) {
          const captionIds = members.map((m) => m.caption_id);
          const { data: caps } = await supabase
            .from("captions")
            .select("*")
            .in("id", captionIds);
          if (caps && caps.length > 0) {
            captions = caps.map((c) => ({
              text: c.text,
              position: c.position || "bottom",
              fontSize: c.font_size || 24,
              textScale: c.text_scale || 1,
              fontColor: c.font_color || "white",
              strokeColor: c.stroke_color || "black",
              fontFamily: c.font_family || "tiktok",
            }));
            break;
          }
        }
      }
      if (!captions) {
        throw new Error(`Caption group ${captionGroupId} could not be loaded after ${CAPTION_QUERY_RETRIES} attempts`);
      }
    }

    // Process variants — upload each one as soon as it's generated
    let completedCount = 0;
    const variantExt = isImage ? ".jpg" : ".mp4";
    const variantContentType = isImage ? "image/jpeg" : "video/mp4";
    console.log(`[generate] Starting generation: isImage=${isImage}, batchCount=${batchCount}, startIndex=${startIndex}, source=${sourcePath}`);

    const allResults = await generateAllVariants(sourcePath, tmpDir, batchCount, gpsCity, captions, async (_completed, _total, result) => {
      const i = result.variantIndex;
      console.log(`[generate] Variant ${i}: success=${result.success}, outputPath=${result.outputPath?.slice(-30)}, error=${result.error}`);

      if (result.success && result.outputPath) {
        // Upload variant file immediately
        const fileData = await fs.readFile(result.outputPath);
        const storagePath = `${user.id}/${projectId}/variant_${String(i).padStart(3, "0")}${variantExt}`;

        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(storagePath, fileData, {
            contentType: variantContentType,
            cacheControl: "3600",
            upsert: true,
          });

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

        // Update DB immediately so frontend sees the variant
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
        console.error(`[generate] FFmpeg error variant ${i}:`, result.error);
        await supabase
          .from("variants")
          .update({ status: "invalid" })
          .eq("project_id", projectId)
          .eq("variant_index", i);
      }
    }, startIndex, isImage, mirrorEnabled);

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

    // Release browser ref — Chrome closes only when all projects are done
    await releaseBrowser().catch(() => {});

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
    await releaseBrowser().catch(() => {});
    // Mark remaining pending/processing variants as invalid
    await supabase
      .from("variants")
      .update({ status: "invalid" })
      .eq("project_id", projectId)
      .in("status", ["pending", "processing"]);

    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", projectId);

    // Cleanup temp directory on error
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    // Best-effort cleanup of orphaned tmp dirs (> 1 hour old)
    try {
      const scaleswapTmp = path.join(os.tmpdir(), "scaleswap");
      const entries = await fs.readdir(scaleswapTmp).catch(() => [] as string[]);
      const now = Date.now();
      for (const entry of entries) {
        const entryPath = path.join(scaleswapTmp, entry);
        const stat = await fs.stat(entryPath).catch(() => null);
        if (stat && stat.isDirectory() && now - stat.mtimeMs > 60 * 60 * 1000) {
          console.log(`[cleanup] Removing orphaned tmp dir: ${entry}`);
          await fs.rm(entryPath, { recursive: true, force: true }).catch(() => {});
        }
      }
    } catch {
      // Non-fatal — best effort cleanup
    }

    return NextResponse.json({ ok: false, error: "Generation failed" }, { status: 500 });
  } finally {
    releaseSlot();
  }
}
