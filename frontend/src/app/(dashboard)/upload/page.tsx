"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import BulkFileList from "@/components/BulkFileList";
import BulkProgressPanel from "@/components/BulkProgressPanel";
import CaptionSelector from "@/components/CaptionSelector";
import { useBulkQueue } from "@/hooks/useBulkQueue";
import { createClient } from "@/lib/supabase/client";
import { GPS_CITIES } from "@/lib/gps-cities";


interface ProjectGroup {
  id: string;
  name: string;
  project_count: number;
}

interface BulkFile {
  id: string;
  file: File;
  title: string;
}

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const bulkQueue = useBulkQueue();

  // Files — single or multi
  const [files, setFiles] = useState<BulkFile[]>([]);
  const isBulk = files.length > 1;
  const singleFile = files.length === 1 ? files[0] : null;

  // Bulk processing phase
  const [bulkPhase, setBulkPhase] = useState<"select" | "processing" | "done">("select");

  // Settings
  const [variantCount, setVariantCount] = useState(5);
  const [captionMode, setCaptionMode] = useState<"none" | "single" | "group">("none");
  const [selectedCaptionId, setSelectedCaptionId] = useState("");
  const [selectedCaptionGroupId, setSelectedCaptionGroupId] = useState("");
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [gpsCity, setGpsCity] = useState("");
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchGroups = useCallback(async () => {
    const { data: groupsData } = await supabase
      .from("project_groups")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (groupsData) {
      const { data: members } = await supabase.from("project_group_members").select("group_id");
      const counts: Record<string, number> = {};
      (members ?? []).forEach((m) => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });
      setGroups(groupsData.map((g) => ({ ...g, project_count: counts[g.id] || 0 })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Watch bulk queue completion
  useEffect(() => {
    if (bulkPhase === "processing" && !bulkQueue.isRunning && bulkQueue.queue.length > 0) {
      const doneCount = bulkQueue.queue.filter((q) => q.status === "ready" || q.status === "error").length;
      if (doneCount === bulkQueue.queue.length) setBulkPhase("done");
    }
  }, [bulkPhase, bulkQueue.isRunning, bulkQueue.queue]);

  // Handle file selection — supports both single and multi
  const handleFilesSelect = (newFiles: File[]) => {
    const items: BulkFile[] = newFiles.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      title: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase()),
    }));
    setFiles((prev) => [...prev, ...items]);
  };

  const handleSingleFileSelect = (f: File) => {
    handleFilesSelect([f]);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleTitleChange = (id: string, title: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, title } : f));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data } = await supabase
      .from("project_groups")
      .insert({ name: newGroupName.trim(), user_id: authUser.id })
      .select()
      .single();
    if (data) {
      setGroups((prev) => [...prev, { ...data, project_count: 0 }]);
      setSelectedGroupId(data.id);
    }
    setNewGroupName("");
    setCreatingGroup(false);
    setShowGroupDropdown(false);
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const canGenerate = files.length > 0 && files.every((f) => f.title.trim()) && variantCount > 0;

  // Create a single project, upload, trigger generation
  const createAndTriggerProject = async (bulkFile: BulkFile, authUser: { id: string }, batchId?: string) => {
    const isImage = bulkFile.file.type.startsWith("image/");
    const projectType = isImage ? "image" : "video";

    // 1. Create project
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: authUser.id,
        title: bulkFile.title.trim(),
        variant_count: variantCount,
        status: "draft",
        type: projectType,
        ...(batchId ? { batch_id: batchId } : {}),
      })
      .select()
      .single();

    if (insertError || !project) {
      throw new Error(insertError?.message || "Failed to create project.");
    }

    // 2. Upload source file
    const ext = bulkFile.file.name.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "mp4");
    const storagePath = `${authUser.id}/${project.id}/source.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, bulkFile.file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      await supabase.from("projects").delete().eq("id", project.id);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 3. Get public URL
    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);
    await supabase.from("projects").update({ source_url: urlData.publicUrl }).eq("id", project.id);

    // 4. Add to group
    if (selectedGroupId) {
      await supabase.from("project_group_members").insert({
        project_id: project.id,
        group_id: selectedGroupId,
      });
    }

    // 5. Create variant records
    const variantRows = Array.from({ length: variantCount }, (_, i) => ({
      project_id: project.id,
      user_id: authUser.id,
      variant_index: i + 1,
      status: "pending" as const,
      output_url: null,
    }));

    const { error: variantError } = await supabase.from("variants").insert(variantRows);
    if (variantError) throw new Error(`Variants creation failed: ${variantError.message}`);

    // 6. Update status
    await supabase.from("projects").update({ status: "processing" }).eq("id", project.id);

    return {
      projectId: project.id,
      sourceUrl: urlData.publicUrl,
      projectType,
    };
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError("");

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setError("Not authenticated. Please log in again.");
      setIsGenerating(false);
      return;
    }

    if (!isBulk) {
      // Single file — same flow as before, redirect to detail page
      try {
        const result = await createAndTriggerProject(files[0], authUser);

        // Fire-and-forget
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: result.projectId,
            sourceUrl: result.sourceUrl,
            variantCount,
            userId: authUser.id,
            gpsCity: gpsCity || undefined,
            captionId: captionMode === "single" && selectedCaptionId ? selectedCaptionId : undefined,
            captionGroupId: captionMode === "group" && selectedCaptionGroupId ? selectedCaptionGroupId : undefined,
            projectType: result.projectType,
            mirrorEnabled,
          }),
        }).catch(() => {});

        router.push(`/library/${result.projectId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create project.");
        setIsGenerating(false);
      }
      return;
    }

    // Bulk — create all projects, then queue
    const batchId = crypto.randomUUID();
    for (const bulkFile of files) {
      try {
        const result = await createAndTriggerProject(bulkFile, authUser, batchId);

        bulkQueue.addToQueue({
          projectId: result.projectId,
          title: bulkFile.title,
          sourceUrl: result.sourceUrl,
          generatePayload: {
            projectId: result.projectId,
            sourceUrl: result.sourceUrl,
            variantCount,
            userId: authUser.id,
            gpsCity: gpsCity || undefined,
            captionId: captionMode === "single" && selectedCaptionId ? selectedCaptionId : undefined,
            captionGroupId: captionMode === "group" && selectedCaptionGroupId ? selectedCaptionGroupId : undefined,
            projectType: result.projectType,
            mirrorEnabled,
          },
        });
      } catch (err) {
        setError(`Error for "${bulkFile.title}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    setBulkPhase("processing");
    setIsGenerating(false);

    setTimeout(() => {
      bulkQueue.startQueue();
    }, 100);
  };

  const variantPresets = [1, 3, 5, 10, 15, 25];

  // Bulk processing/done phase
  if (bulkPhase === "processing" || bulkPhase === "done") {
    return (
      <div className="flex flex-col h-[calc(100vh-80px-60px)]">
        <div className="flex items-end justify-between mb-5 gap-4">
          <div>
            <h1 className="text-2xl font-[550] tracking-tight leading-tight" style={{ letterSpacing: "-0.025em" }}>
              New <em className="not-italic font-normal" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>project</em>
            </h1>
            <p className="text-[13.5px] mt-1" style={{ color: "var(--color-muted)" }}>
              {bulkPhase === "done" ? "All projects have been processed" : "Processing your projects sequentially..."}
            </p>
          </div>
        </div>
        <BulkProgressPanel
          queue={bulkQueue.queue}
          currentIndex={bulkQueue.currentIndex}
          isRunning={bulkQueue.isRunning}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px-60px)]">
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-[550] tracking-tight leading-tight" style={{ letterSpacing: "-0.025em" }}>
            New <em className="not-italic font-normal" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>project</em>
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--color-muted)" }}>Upload your source video or photo to generate unique variants</p>
        </div>
      </div>

      {/* Upload dropzone — always multiple */}
      {files.length === 0 ? (
        <UploadDropzone
          multiple
          onFilesSelect={handleFilesSelect}
          onFileSelect={handleSingleFileSelect}
        />
      ) : !isBulk ? (
        /* Single file — show inline preview */
        <UploadDropzone
          file={singleFile?.file}
          onFileSelect={(f) => {
            setFiles([{ id: crypto.randomUUID(), file: f, title: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase()) }]);
          }}
          onRemove={handleClearAll}
        />
      ) : (
        /* Multi files — show file list + "add more" dropzone */
        <div className="space-y-3">
          <BulkFileList
            files={files}
            onRemove={handleRemoveFile}
            onTitleChange={handleTitleChange}
          />
          <UploadDropzone
            multiple
            onFilesSelect={handleFilesSelect}
          />
        </div>
      )}

      {/* Tagline — only when no file yet */}
      {files.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-center text-[28px] font-[450] tracking-tight" style={{ color: "var(--color-muted-2)", letterSpacing: "-0.02em" }}>
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)", fontSize: "32px" }}>Scale</span>{" "}
            your content,{" "}
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)", fontSize: "32px" }}>test</span>,{" "}
            get views,{" "}
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)", fontSize: "32px" }}>boost</span>{" "}
            your traffic.
          </p>
        </div>
      )}

      {/* Settings — visible after file(s) selected */}
      {files.length > 0 && (
        <div className="mt-5 space-y-4 animate-page-fade">
          {/* Project title + Variant count */}
          <div className="rounded-[14px] border p-5" style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border-soft)",
          }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div>
                <div className="text-[13.5px] font-medium" style={{ color: "var(--color-ink)" }}>Project settings</div>
                <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                  {isBulk ? `Settings applied to all ${files.length} files` : "Name your project and choose how many variants"}
                </div>
              </div>
            </div>

            {/* Title — only for single file */}
            {!isBulk && (
              <div className="mb-4">
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Project title</label>
                <input
                  type="text"
                  value={singleFile?.title || ""}
                  onChange={(e) => {
                    if (singleFile) handleTitleChange(singleFile.id, e.target.value);
                  }}
                  placeholder="e.g. Gym motivation hook"
                  className="w-full text-[13px] px-3 py-[9px] rounded-[8px] border outline-none transition-all focus:ring-2"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                    // @ts-expect-error CSS custom property
                    "--tw-ring-color": "var(--color-accent-ring)",
                  }}
                />
              </div>
            )}

            {/* Variant count */}
            <div>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>
                Number of variants{isBulk ? " per file" : ""}
              </label>
              <div className="flex items-center gap-2">
                {variantPresets.map((n) => (
                  <button
                    key={n}
                    onClick={() => setVariantCount(n)}
                    className="text-[12.5px] font-medium px-3 py-[6px] rounded-[8px] border transition-all"
                    style={{
                      background: variantCount === n ? "var(--color-accent-soft)" : "var(--color-surface)",
                      borderColor: variantCount === n ? "var(--color-accent)" : "var(--color-border-soft)",
                      color: variantCount === n ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                    }}
                  >
                    {n}
                  </button>
                ))}
                <div className="h-5 w-px mx-1" style={{ background: "var(--color-border)" }} />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={variantCount}
                  onChange={(e) => setVariantCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="w-16 text-center text-[12.5px] font-medium px-2 py-[6px] rounded-[8px] border outline-none transition-all focus:ring-2"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                    // @ts-expect-error CSS custom property
                    "--tw-ring-color": "var(--color-accent-ring)",
                  }}
                />
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: "var(--color-muted)" }}>
                Each variant will be uniquely modified for platform fingerprint bypass
              </div>
            </div>

            {/* GPS city */}
            <div className="border-t pt-4 mt-4" style={{ borderColor: "var(--color-border-soft)" }}>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>GPS location</label>
              <select
                value={gpsCity}
                onChange={(e) => setGpsCity(e.target.value)}
                className="w-full text-[13px] px-3 py-[9px] rounded-[8px] border outline-none transition-all focus:ring-2"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: gpsCity ? "var(--color-ink)" : "var(--color-muted)",
                  // @ts-expect-error CSS custom property
                  "--tw-ring-color": "var(--color-accent-ring)",
                }}
              >
                <option value="">Random city (worldwide)</option>
                {GPS_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <div className="text-[11px] mt-1.5" style={{ color: "var(--color-muted)" }}>
                Each variant gets unique GPS coordinates near this city
              </div>
            </div>

            {/* Mirror toggle */}
            <div className="border-t pt-4 mt-4" style={{ borderColor: "var(--color-border-soft)" }}>
              <button
                onClick={() => setMirrorEnabled(!mirrorEnabled)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] border transition-all"
                style={{
                  background: mirrorEnabled ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                  borderColor: mirrorEnabled ? "var(--color-accent)" : "var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: mirrorEnabled ? "var(--color-accent-hover)" : "var(--color-muted)" }}>
                    <path d="M12 3v18M8 7H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4M16 7h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/>
                  </svg>
                  <span className="text-[12.5px] font-medium" style={{ color: mirrorEnabled ? "var(--color-accent-hover)" : "var(--color-ink-2)" }}>
                    Mirror effect
                  </span>
                </div>
                <div className="w-8 h-[18px] rounded-full transition-all relative" style={{ background: mirrorEnabled ? "var(--color-accent)" : "var(--color-border)" }}>
                  <div className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all" style={{ left: mirrorEnabled ? "calc(100% - 16px)" : "2px" }} />
                </div>
              </button>
              <div className="text-[11px] mt-1.5" style={{ color: "var(--color-muted)" }}>
                Random horizontal flip — most effective pHash breaker (videos only)
              </div>
            </div>
          </div>

          {/* Library group */}
          <div className="rounded-[14px] border p-5" style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border-soft)",
          }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{
                background: "var(--color-surface-2)",
                color: "var(--color-muted)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <div className="text-[13.5px] font-medium" style={{ color: "var(--color-ink)" }}>Library group</div>
                <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>Organize in your content library (optional)</div>
              </div>
            </div>

            {/* Group selector */}
            <div className="relative">
              <button
                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                className="w-full flex items-center justify-between text-[13px] px-3 py-[9px] rounded-[8px] border transition-all"
                style={{
                  background: "var(--color-surface)",
                  borderColor: showGroupDropdown ? "var(--color-accent)" : "var(--color-border)",
                  color: selectedGroup ? "var(--color-ink)" : "var(--color-muted)",
                  boxShadow: showGroupDropdown ? "0 0 0 3px var(--color-accent-ring)" : undefined,
                }}
              >
                <span className="truncate">{selectedGroup ? selectedGroup.name : "No group"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--color-muted)", transform: showGroupDropdown ? "rotate(180deg)" : undefined, transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              {showGroupDropdown && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-[10px] border p-1.5 shadow-lg" style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}>
                  {/* No group option */}
                  <button
                    onClick={() => { setSelectedGroupId(""); setShowGroupDropdown(false); }}
                    className="w-full flex items-center gap-2.5 text-left text-[12.5px] px-2.5 py-2 rounded-[6px] transition-colors hover:bg-[var(--color-surface-2)]"
                    style={{ color: !selectedGroupId ? "var(--color-accent-hover)" : "var(--color-ink-2)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                    No group
                  </button>

                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGroupId(g.id); setShowGroupDropdown(false); }}
                      className="w-full flex items-center gap-2.5 text-left text-[12.5px] px-2.5 py-2 rounded-[6px] transition-colors hover:bg-[var(--color-surface-2)]"
                      style={{ color: selectedGroupId === g.id ? "var(--color-accent-hover)" : "var(--color-ink-2)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{g.name}</span>
                      </div>
                      <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-full" style={{
                        background: "var(--color-surface-2)",
                        color: "var(--color-muted)",
                      }}>{g.project_count}</span>
                      {selectedGroupId === g.id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-accent)" }}><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}

                  {/* Divider */}
                  <div className="h-px my-1" style={{ background: "var(--color-border-soft)" }} />

                  {/* Create new group */}
                  {creatingGroup ? (
                    <div className="flex items-center gap-1.5 px-1.5 py-1">
                      <input
                        autoFocus
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateGroup();
                          if (e.key === "Escape") { setCreatingGroup(false); setNewGroupName(""); }
                        }}
                        placeholder="Group name..."
                        className="flex-1 text-[12.5px] px-2 py-1.5 rounded-[6px] border outline-none"
                        style={{
                          background: "var(--color-surface)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-ink)",
                        }}
                      />
                      <button
                        onClick={handleCreateGroup}
                        className="text-[11.5px] font-medium px-2 py-1.5 rounded-[6px] text-white"
                        style={{ background: "var(--color-accent)" }}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreatingGroup(true)}
                      className="w-full flex items-center gap-2.5 text-left text-[12.5px] font-medium px-2.5 py-2 rounded-[6px] transition-colors hover:bg-[var(--color-surface-2)]"
                      style={{ color: "var(--color-accent)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Create new group
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Captions section */}
          <div className="rounded-[14px] border p-5" style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border-soft)",
          }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{
                background: captionMode !== "none" ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                color: captionMode !== "none" ? "var(--color-accent)" : "var(--color-muted)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
              </div>
              <div>
                <div className="text-[13.5px] font-medium" style={{ color: "var(--color-ink)" }}>Captions</div>
                <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>Overlay text on each variation</div>
              </div>
            </div>
            <CaptionSelector
              onModeChange={(m) => {
                setCaptionMode(m);
                if (m === "none") { setSelectedCaptionId(""); setSelectedCaptionGroupId(""); }
              }}
              onCaptionSelect={(id) => setSelectedCaptionId(id)}
              onGroupSelect={(id) => setSelectedCaptionGroupId(id)}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-[10px] text-[13px]" style={{
              background: "var(--color-red-soft)",
              color: "var(--color-red)",
              border: "1px solid var(--color-red)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Generate button */}
          <div className="flex items-center justify-between pt-2 pb-6">
            <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              {isBulk
                ? `${files.length} files · ${variantCount} variant${variantCount !== 1 ? "s" : ""} each · ${files.length * variantCount} total`
                : `${variantCount} variant${variantCount !== 1 ? "s" : ""} will be generated`}
              {selectedGroup ? ` · Added to "${selectedGroup.name}"` : ""}
              {captionMode !== "none" && (selectedCaptionId || selectedCaptionGroupId) ? " · With captions" : ""}
            </div>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="inline-flex items-center gap-2 text-[13.5px] font-medium px-5 py-2.5 rounded-[10px] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--color-accent)",
                boxShadow: canGenerate ? "0 2px 8px rgba(139,127,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" : undefined,
              }}
            >
              {isGenerating ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  {isBulk ? "Creating projects..." : "Creating project..."}
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  {isBulk ? `Generate all (${files.length})` : "Generate variants"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
