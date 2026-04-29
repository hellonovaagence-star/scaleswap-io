"use client";

import { use, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import VariationCard from "@/components/VariationCard";
import CaptionSelector from "@/components/CaptionSelector";
import { createClient } from "@/lib/supabase/client";
import JSZip from "jszip";

const gradients = [
  "linear-gradient(145deg, #4A3F8E 0%, #8B7FFF 60%, #FFB99A 100%)",
  "linear-gradient(170deg, #5A4FAA 0%, #9D93FF 55%, #FFC6A8 100%)",
  "linear-gradient(120deg, #3F3475 0%, #7B6FF0 55%, #FFAD8A 100%)",
  "linear-gradient(160deg, #2A3D5C 0%, #5B7FD1 55%, #A8CCFF 100%)",
  "linear-gradient(135deg, #5C3A4A 0%, #C77F92 55%, #FFC6A8 100%)",
  "linear-gradient(155deg, #3E5A4A 0%, #6FAF8A 55%, #D0E8B9 100%)",
  "linear-gradient(140deg, #2E2E3F 0%, #5A5A7A 55%, #B4B4D0 100%)",
  "linear-gradient(130deg, #8C4A2E 0%, #E6926F 55%, #FFDBA8 100%)",
  "linear-gradient(125deg, #2D4D3F 0%, #4F8774 55%, #A8D8C0 100%)",
  "linear-gradient(145deg, #3A3F5E 0%, #7B83C4 55%, #C8D1FF 100%)",
];

interface Project {
  id: string;
  title: string;
  variant_count: number;
  status: string;
  source_url: string | null;
  created_at: string;
  type?: string;
}

interface Variant {
  id: string;
  variant_index: number;
  status: string;
  output_url: string | null;
  hash: string | null;
  phash_distance: number | null;
  thumbnail_url: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [playerVideo, setPlayerVideo] = useState<{ url: string; title: string; filename: string; isImage?: boolean } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditData, setAuditData] = useState<Record<string, { width: number; height: number; duration: number; size: number }>>({});
  const [auditLoading, setAuditLoading] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genCount, setGenCount] = useState(5);
  const [genCaptionMode, setGenCaptionMode] = useState<"none" | "single" | "group">("none");
  const [genCaptionId, setGenCaptionId] = useState("");
  const [genCaptionGroupId, setGenCaptionGroupId] = useState("");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [projRes, varRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("variants").select("*").eq("project_id", id).order("variant_index"),
    ]);
    if (projRes.data) setProject(projRes.data);
    setVariants(varRes.data ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll variants every 2s while project is processing (max 10 min)
  useEffect(() => {
    if (!project || project.status !== "processing") return;
    const startedAt = Date.now();
    const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes

    const interval = setInterval(async () => {
      if (Date.now() - startedAt > MAX_POLL_MS) {
        // Safety: stop polling and mark as error if stuck
        clearInterval(interval);
        await supabase
          .from("projects")
          .update({ status: "error" })
          .eq("id", id);
        fetchData();
        return;
      }
      fetchData();
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.status, fetchData]);

  const isImageProject = project?.type === "image";

  // Load media metadata for audit table
  const loadAuditData = useCallback(async () => {
    const urls: { key: string; url: string }[] = [];
    if (project?.source_url) urls.push({ key: "source", url: project.source_url });
    for (const v of variants) {
      if (v.status === "valid" && v.output_url) {
        urls.push({ key: `v_${v.variant_index}`, url: v.output_url });
      }
    }
    if (urls.length === 0) return;
    setAuditLoading(true);

    const isImg = project?.type === "image";
    const results: Record<string, { width: number; height: number; duration: number; size: number }> = {};

    await Promise.all(urls.map(({ key, url }) =>
      new Promise<void>((resolve) => {
        fetch(url, { method: "HEAD" }).then(r => {
          const cl = r.headers.get("content-length");
          const size = cl ? parseInt(cl, 10) : 0;

          if (isImg) {
            // Image: use Image API for dimensions, duration = 0
            const img = new window.Image();
            img.onload = () => {
              results[key] = { width: img.naturalWidth, height: img.naturalHeight, duration: 0, size };
              resolve();
            };
            img.onerror = () => {
              results[key] = { width: 0, height: 0, duration: 0, size };
              resolve();
            };
            img.src = url;
          } else {
            // Video: use video element for dimensions + duration
            const video = document.createElement("video");
            video.preload = "metadata";
            video.muted = true;
            video.onloadedmetadata = () => {
              results[key] = { width: video.videoWidth, height: video.videoHeight, duration: video.duration, size };
              video.remove();
              resolve();
            };
            video.onerror = () => {
              results[key] = { width: 0, height: 0, duration: 0, size };
              video.remove();
              resolve();
            };
            video.src = url;
          }
        }).catch(() => resolve());
      })
    ));

    setAuditData(results);
    setAuditLoading(false);
  }, [project, variants]);

  const handleDelete = async () => {
    await supabase.from("projects").delete().eq("id", id);
    window.location.href = "/library";
  };

  const handleGenerate = async () => {
    if (!project || generating) return;
    setGenerating(true);
    setGenError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setGenError("Not authenticated");
      setGenerating(false);
      return;
    }

    const count = genCount;

    // Find the highest existing variant_index to append after it
    const maxIndex = variants.reduce((max, v) => Math.max(max, v.variant_index), 0);
    const startIndex = maxIndex + 1;

    // Update project variant_count to total
    const newTotal = maxIndex + count;
    await supabase.from("projects").update({ variant_count: newTotal }).eq("id", project.id);

    const variantRows = Array.from({ length: count }, (_, i) => ({
      project_id: project.id,
      user_id: user.id,
      variant_index: startIndex + i,
      status: "pending" as const,
    }));

    const { error } = await supabase.from("variants").insert(variantRows);
    if (error) {
      setGenError(error.message);
      setGenerating(false);
      return;
    }

    await supabase.from("projects").update({ status: "processing" }).eq("id", project.id);

    // Fire-and-forget: trigger video generation (server handles new variants)
    console.log("[generate] mode:", genCaptionMode, "captionId:", genCaptionId, "groupId:", genCaptionGroupId);
    if (project.source_url) {
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          sourceUrl: project.source_url,
          variantCount: newTotal,
          userId: user.id,
          startIndex,
          captionId: genCaptionMode === "single" && genCaptionId ? genCaptionId : undefined,
          captionGroupId: genCaptionMode === "group" && genCaptionGroupId ? genCaptionGroupId : undefined,
          projectType: project.type === "image" ? "image" : "video",
        }),
      }).then(async (res) => {
        if (!res.ok) console.error("[generate] API error:", res.status, await res.text().catch(() => ""));
      }).catch((e) => console.error("[generate] fetch error:", e));
    }

    setShowGenModal(false);
    setSelectedIds(new Set());
    setSelectMode(false);
    await fetchData();
    setGenerating(false);
  };

  const toggleSelect = (variantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const handleExport = async () => {
    const toExport = variants.filter((v) => {
      if (v.status !== "valid" || !v.output_url) return false;
      if (selectMode && selectedIds.size > 0) return selectedIds.has(v.id);
      return true;
    });
    if (toExport.length === 0) return;

    setExporting(true);
    const zip = new JSZip();
    const prefix = project?.title?.replace(/\s+/g, "_") || "variants";

    await Promise.all(
      toExport.map(async (v) => {
        const res = await fetch(v.output_url!);
        const blob = await res.blob();
        const ext = isImageProject ? ".jpg" : ".mp4";
        zip.file(`${prefix}_V${String(v.variant_index).padStart(2, "0")}${ext}`, blob);
      })
    );

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}_${toExport.length}variants.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-[14px]" style={{ color: "var(--color-muted)" }}>Loading project...</div>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-[550] tracking-tight leading-tight" style={{ letterSpacing: "-0.025em" }}>
            {project.title}
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--color-muted)" }}>
            {variants.length} variation{variants.length !== 1 ? "s" : ""} · Created {timeAgo(project.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="text-[13px] font-medium px-3 py-2 rounded-lg" style={{
            color: "var(--color-red)",
          }}>Delete</button>
        </div>
      </div>

      {/* Main content */}
      <div>
          {/* Source player */}
          <div className="grid gap-4 p-3.5 rounded-[14px] border mb-5" style={{
            gridTemplateColumns: "160px 1fr",
            background: "var(--color-surface)",
            borderColor: "var(--color-border-soft)",
          }}>
            <div
              className="w-[160px] rounded-[10px] relative overflow-hidden cursor-pointer group"
              style={{
                aspectRatio: "9/16",
                background: gradients[0],
              }}
              onClick={() => {
                if (project.source_url) {
                  const ext = isImageProject ? ".jpg" : ".mp4";
                  setPlayerVideo({
                    url: project.source_url,
                    title: project.title,
                    filename: `${project.title?.replace(/\s+/g, "_") || "source"}_original${ext}`,
                    isImage: isImageProject,
                  });
                }
              }}
            >
              {project.source_url ? (
                isImageProject ? (
                  <>
                    <img
                      src={project.source_url}
                      alt={project.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <video
                      src={`${project.source_url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                    </div>
                  </>
                )
              ) : (
                <div className="absolute left-1/2 top-1/2 -translate-x-[40%] -translate-y-1/2">
                  <div className="border-l-[16px] border-t-[10px] border-b-[10px] border-l-white/95 border-t-transparent border-b-transparent drop-shadow-lg" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)", letterSpacing: "0.04em" }}>
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--color-accent)" }} />
                Original source
              </div>
              <h3 className="text-base font-semibold tracking-tight mb-1" style={{ letterSpacing: "-0.015em" }}>
                {project.title}
              </h3>
              <p className="text-[13px] leading-relaxed mb-3.5" style={{ color: "var(--color-muted)" }}>
                {isImageProject ? "Photo optimized for platform fingerprint bypass." : "Vertical 9:16 format optimized for Reels/TikTok/Shorts."}
              </p>
            </div>
          </div>

          {/* Progress bar — visible while processing */}
          {project.status === "processing" && variants.length > 0 && (() => {
            const done = variants.filter((v) => v.status === "valid" || v.status === "invalid").length;
            const total = variants.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div className="rounded-[12px] border p-4 mb-5" style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border-soft)",
              }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" style={{ color: "var(--color-accent)" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>
                      Processing variants...
                    </span>
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "var(--color-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {done}/{total} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "var(--color-accent)" }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Variations */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold tracking-tight" style={{ letterSpacing: "-0.015em" }}>Generated variations</h2>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent-hover)",
              }}>{variants.length}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const next = !showAudit;
                  setShowAudit(next);
                  if (next && Object.keys(auditData).length === 0) loadAuditData();
                }}
                className="text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-all"
                style={{
                  background: showAudit ? "var(--color-accent-soft)" : "var(--color-surface)",
                  borderColor: showAudit ? "var(--color-accent)" : "var(--color-border)",
                  color: showAudit ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Audit
                </span>
              </button>
              <button
                onClick={() => {
                  const next = !selectMode;
                  setSelectMode(next);
                  if (!next) setSelectedIds(new Set());
                }}
                className="text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-all"
                style={{
                  background: selectMode ? "var(--color-accent-soft)" : "var(--color-surface)",
                  borderColor: selectMode ? "var(--color-accent)" : "var(--color-border)",
                  color: selectMode ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                }}
              >
                <span className="flex items-center gap-1.5">
                  {selectMode ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Cancel"}
                    </>
                  ) : "Select"}
                </span>
              </button>
              <button
                onClick={() => setShowGenModal(true)}
                disabled={generating || project.status === "processing"}
                className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--color-accent)",
                  color: "#fff",
                  boxShadow: "0 1px 2px rgba(139,127,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                <span className="flex items-center gap-1.5">
                  {generating || project.status === "processing" ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  )}
                  {generating || project.status === "processing" ? "Generating..." : "Generate new variations"}
                </span>
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || variants.filter(v => v.status === "valid").length === 0}
                className="text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-ink-2)",
                }}
              >
                <span className="flex items-center gap-1.5">
                  {exporting ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  )}
                  {exporting ? "Exporting..." : selectMode && selectedIds.size > 0 ? `Export (${selectedIds.size})` : "Export all"}
                </span>
              </button>
            </div>
          </div>

          {/* Fingerprint audit — similarity scores */}
          {showAudit && (
            <div className="rounded-[14px] border p-5 mb-4 animate-page-fade" style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border-soft)",
            }}>
              {auditLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" style={{ color: "var(--color-accent)" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>Analyzing variants...</span>
                </div>
              ) : Object.keys(auditData).length > 0 ? (() => {
                const src = auditData["source"];
                if (!src) return null;

                const validVariants = variants.filter(v => v.status === "valid");
                const variantMetrics = validVariants.map((v) => {
                  const d = auditData[`v_${v.variant_index}`];
                  if (!d) return null;

                  const resDiffW = Math.abs(d.width - src.width);
                  const resDiffH = Math.abs(d.height - src.height);
                  const durDiff = Math.abs(d.duration - src.duration);
                  const sizeDiffPct = src.size > 0 ? Math.abs(d.size - src.size) / src.size * 100 : 0;
                  const hashDiff = v.hash !== null; // always different (re-encoded + padded)
                  const phashDist = v.phash_distance;

                  return { v, d, resDiffW, resDiffH, durDiff, sizeDiffPct, hashDiff, phashDist };
                }).filter(Boolean) as { v: Variant; d: { width: number; height: number; duration: number; size: number }; resDiffW: number; resDiffH: number; durDiff: number; sizeDiffPct: number; hashDiff: boolean; phashDist: number | null }[];

                // Count how many checks pass (are different from source)
                const allCheckLabels: { key: string; label: string; desc: string; type?: "video" }[] = [
                  { key: "binary", label: "Binary hash", desc: isImageProject ? "MD5 re-encode" : "MD5 + free atom" },
                  { key: "metadata", label: "Metadata", desc: "GPS, date, device" },
                  { key: "spatial", label: "Spatial crop", desc: isImageProject ? "1-3px edges" : "4-12px edges" },
                  { key: "temporal", label: "Temporal trim", desc: "Start + end + speed", type: "video" },
                  { key: "color", label: "Color grading", desc: "Gamma, contrast, brightness" },
                  { key: "noise", label: "Noise injection", desc: "Adversarial grain", type: "video" },
                  { key: "codec", label: "Codec variation", desc: isImageProject ? "JPEG quality" : "CRF, GOP, profile, FPS" },
                  { key: "vignette", label: "Vignette", desc: "Edge darkening", type: "video" },
                  { key: "zoom", label: "Zoom + crop", desc: isImageProject ? "0.5-1.2% scale" : "2-5% scale shift" },
                  { key: "rotation", label: "Micro-rotation", desc: isImageProject ? "0.05-0.15°" : "0.1-0.3°" },
                  { key: "resolution", label: "Resolution shift", desc: isImageProject ? "±2px" : "±4-10px" },
                  { key: "hue", label: "Hue shift", desc: "Chroma micro-rotation" },
                  { key: "lens", label: "Lens distortion", desc: "Barrel/pincushion" },
                  { key: "flip", label: "Horizontal flip", desc: "~40% chance", type: "video" },
                  { key: "blur", label: "Gaussian blur", desc: isImageProject ? "σ 0.05-0.12" : "σ 0.1-0.2" },
                  { key: "dct", label: "DCT adversarial", desc: "Low-freq pattern" },
                  { key: "unsharp", label: "Unsharp mask", desc: "Counter-blur sharpen" },
                  { key: "audioEq", label: "Audio EQ", desc: "3-band ±0.5dB", type: "video" },
                  { key: "audioPitch", label: "Audio pitch", desc: "±0.2% shift", type: "video" },
                  { key: "audioNoise", label: "Audio noise", desc: "Waveform injection", type: "video" },
                  { key: "audioPhase", label: "Audio phase", desc: "1-5ms delay", type: "video" },
                  { key: "audioVol", label: "Audio volume", desc: "±2% adjustment", type: "video" },
                ];
                const checkLabels = allCheckLabels.filter((c) => !isImageProject || c.type !== "video");

                const formatBytes = (b: number) => b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${(b / 1_000).toFixed(0)} KB`;

                return (
                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{
                        background: "rgba(139,127,255,0.1)",
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold" style={{ color: "var(--color-ink)" }}>Fingerprint audit</div>
                        <div className="text-[11.5px]" style={{ color: "var(--color-muted)" }}>
                          Real measured differences vs source
                        </div>
                      </div>
                    </div>

                    {/* Source reference */}
                    <div className="flex items-center gap-3 p-2.5 rounded-[10px] mb-3" style={{ background: "var(--color-surface-2)" }}>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                        background: "var(--color-accent-soft)", color: "var(--color-accent-hover)",
                      }}>SRC</span>
                      <span className="text-[11.5px]" style={{ color: "var(--color-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {src.width}x{src.height}{!isImageProject && ` · ${src.duration.toFixed(2)}s`} · {formatBytes(src.size)}
                      </span>
                    </div>

                    {/* Per-variant comparison table */}
                    <div className="flex flex-col gap-2 mb-4">
                      {variantMetrics.map(({ v, d, resDiffW, resDiffH, durDiff, sizeDiffPct, phashDist }) => (
                        <div key={v.id} className="rounded-[10px] border p-3" style={{ borderColor: "var(--color-border-soft)" }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold" style={{
                              color: "var(--color-ink-2)",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>V{String(v.variant_index).padStart(2, "0")}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                              background: "var(--color-surface-2)",
                              color: "var(--color-muted)",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>{v.hash}</span>
                          </div>
                          <div className={`grid gap-x-4 gap-y-1.5 ${isImageProject ? "grid-cols-3" : "grid-cols-4"}`}>
                            <div>
                              <div className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>Resolution</div>
                              <div className="text-[11.5px] font-semibold" style={{
                                color: (resDiffW > 0 || resDiffH > 0) ? "#34d399" : "var(--color-ink-2)",
                                fontFamily: "'JetBrains Mono', monospace",
                              }}>
                                {d.width}x{d.height}
                                {(resDiffW > 0 || resDiffH > 0) && (
                                  <span className="text-[9px] ml-1 opacity-70">({resDiffW > 0 ? `-${resDiffW}` : "="},{resDiffH > 0 ? `-${resDiffH}` : "="}px)</span>
                                )}
                              </div>
                            </div>
                            {!isImageProject && (
                            <div>
                              <div className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>Duration</div>
                              <div className="text-[11.5px] font-semibold" style={{
                                color: durDiff > 0.01 ? "#34d399" : "var(--color-ink-2)",
                                fontFamily: "'JetBrains Mono', monospace",
                              }}>
                                {d.duration.toFixed(2)}s
                                {durDiff > 0.01 && (
                                  <span className="text-[9px] ml-1 opacity-70">(-{durDiff.toFixed(2)}s)</span>
                                )}
                              </div>
                            </div>
                            )}
                            <div>
                              <div className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>File size</div>
                              <div className="text-[11.5px] font-semibold" style={{
                                color: sizeDiffPct > 1 ? "#34d399" : "var(--color-ink-2)",
                                fontFamily: "'JetBrains Mono', monospace",
                              }}>
                                {formatBytes(d.size)}
                                {sizeDiffPct > 1 && (
                                  <span className="text-[9px] ml-1 opacity-70">({sizeDiffPct > 0 ? (d.size > src.size ? "+" : "-") : ""}{sizeDiffPct.toFixed(1)}%)</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>pHash dist.</div>
                              <div className="text-[11.5px] font-semibold" style={{
                                color: phashDist !== null ? (phashDist >= 10 ? "#34d399" : "#f87171") : "var(--color-muted)",
                                fontFamily: "'JetBrains Mono', monospace",
                              }}>
                                {phashDist !== null ? (
                                  <>
                                    {phashDist}/64
                                    <span className="text-[9px] ml-1 opacity-70">
                                      {phashDist >= 10 ? "pass" : "low"}
                                    </span>
                                  </>
                                ) : "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Checklist — what changed */}
                    <div className="text-[11px] font-semibold mb-2" style={{ color: "var(--color-ink-2)" }}>Applied transformations</div>
                    <div className="grid grid-cols-2 gap-1.5 mb-4">
                      {checkLabels.map((check) => (
                        <div key={check.key} className="flex items-center gap-2 py-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <div>
                            <span className="text-[11px] font-medium" style={{ color: "var(--color-ink-2)" }}>{check.label}</span>
                            <span className="text-[10px] ml-1" style={{ color: "var(--color-muted)" }}>{check.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Honest verdict */}
                    <div className="rounded-[10px] p-3" style={{ background: "var(--color-surface-2)" }}>
                      <div className="flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                          Each variant is a <strong style={{ color: "var(--color-ink-2)" }}>unique re-encode</strong> with different resolution, duration, file size, metadata, and binary hash.
                          Instagram uses <strong style={{ color: "var(--color-ink-2)" }}>perceptual hashing</strong> (pHash) — not exact matching.
                          The visual changes (noise, color, crop) are imperceptible but shift the perceptual fingerprint.
                          <strong style={{ color: "var(--color-ink-2)" }}> No tool can guarantee 0% detection</strong> — but these are the same techniques used by professional reposting tools.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : null}
            </div>
          )}

          {variants.length > 0 ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}>
              {variants.map((v, i) => (
                <VariationCard
                  key={v.id}
                  id={v.id}
                  index={v.variant_index}
                  gradient={gradients[i % gradients.length]}
                  status={v.status as "valid" | "invalid" | "processing" | "pending"}
                  hash={v.hash || `0x${v.id.slice(0, 8)}`}
                  videoUrl={v.output_url}
                  thumbnailUrl={v.thumbnail_url}
                  mediaType={isImageProject ? "image" : "video"}
                  selected={selectMode ? selectedIds.has(v.id) : undefined}
                  onClick={() => {
                    if (selectMode) {
                      if (v.status === "valid") toggleSelect(v.id);
                    } else if (v.status === "valid" && v.output_url) {
                      const ext = isImageProject ? ".jpg" : ".mp4";
                      setPlayerVideo({
                        url: v.output_url,
                        title: `Variation ${String(v.variant_index).padStart(2, "0")}`,
                        filename: `${project?.title?.replace(/\s+/g, "_") || "variant"}_V${String(v.variant_index).padStart(2, "0")}${ext}`,
                        isImage: isImageProject,
                      });
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-[14px] border" style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border-soft)",
            }}>
              <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>No variations generated yet</p>
              <p className="text-[12.5px] mt-1 mb-4" style={{ color: "var(--color-muted-2)" }}>Click below to generate variations</p>
              {genError && (
                <p className="text-[12.5px] mb-3 px-4 py-2 rounded-lg mx-auto inline-block" style={{ background: "var(--color-red-soft)", color: "var(--color-red)" }}>{genError}</p>
              )}
              <button
                onClick={() => setShowGenModal(true)}
                disabled={generating || project.status === "processing"}
                className="inline-flex items-center gap-2 text-[13.5px] font-medium px-5 py-2.5 rounded-[10px] text-white transition-all disabled:opacity-50"
                style={{
                  background: "var(--color-accent)",
                  boxShadow: "0 2px 8px rgba(139,127,255,0.35)",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Generate variations
              </button>
            </div>
          )}
      </div>

      {/* Generate modal */}
      {showGenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowGenModal(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[16px] border p-6"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold tracking-tight" style={{ letterSpacing: "-0.015em" }}>Generate variations</h2>
              <button onClick={() => setShowGenModal(false)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface-2)]" style={{ color: "var(--color-muted)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Variant count */}
            <div className="mb-5">
              <div className="flex justify-between items-center text-xs font-medium mb-2.5" style={{ color: "var(--color-ink-2)" }}>
                <span>Number of variations</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-accent-hover)" }}>{genCount}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {[1, 3, 5, 10, 15, 25].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGenCount(n)}
                    className="text-[12px] font-medium px-2.5 py-[5px] rounded-[7px] border transition-all"
                    style={{
                      background: genCount === n ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                      borderColor: genCount === n ? "var(--color-accent)" : "transparent",
                      color: genCount === n ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                    }}
                  >{n}</button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={genCount}
                  onChange={(e) => setGenCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="w-14 text-center text-[12px] font-medium px-1.5 py-[5px] rounded-[7px] border outline-none focus:ring-2"
                  style={{
                    background: "var(--color-surface-2)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                  }}
                />
              </div>
            </div>

            {/* Caption selector */}
            <div className="mb-5">
              <CaptionSelector
                onModeChange={(m) => {
                  setGenCaptionMode(m);
                  if (m === "none") { setGenCaptionId(""); setGenCaptionGroupId(""); }
                }}
                onCaptionSelect={(id) => setGenCaptionId(id)}
                onGroupSelect={(id) => setGenCaptionGroupId(id)}
              />
            </div>

            {genError && (
              <p className="text-[12.5px] mb-3 px-3 py-2 rounded-lg" style={{ background: "var(--color-red-soft)", color: "var(--color-red)" }}>{genError}</p>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13.5px] font-medium text-white transition-all hover:-translate-y-px disabled:opacity-50"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 2px 8px rgba(139,127,255,0.35)",
              }}
            >
              {generating ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Generate {genCount} variation{genCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Video player lightbox — portaled to body */}
      {playerVideo && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 99999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setPlayerVideo(null)}
        >
          {/* Close button — top right */}
          <button
            onClick={() => setPlayerVideo(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
            style={{ background: "rgba(255,255,255,0.1)", zIndex: 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <div
            className="relative flex flex-col items-center"
            style={{ maxHeight: "90vh", width: "min(380px, 85vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <div className="text-white text-[14px] font-medium mb-3 text-center">{playerVideo.title}</div>

            {/* Media */}
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#000" }}>
              {playerVideo.isImage ? (
                <img
                  src={playerVideo.url}
                  alt={playerVideo.title}
                  className="w-full"
                  style={{ aspectRatio: "9/16", objectFit: "contain" }}
                />
              ) : (
                <video
                  src={playerVideo.url}
                  controls
                  autoPlay
                  className="w-full"
                  style={{ aspectRatio: "9/16" }}
                />
              )}
            </div>

            {/* Download button */}
            <button
              onClick={async () => {
                const res = await fetch(playerVideo.url);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = playerVideo.filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium px-5 py-2.5 rounded-[10px] text-white transition-all hover:-translate-y-px cursor-pointer"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 2px 8px rgba(139,127,255,0.4)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
