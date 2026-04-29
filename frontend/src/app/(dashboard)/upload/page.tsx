"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import CaptionSelector from "@/components/CaptionSelector";
import { createClient } from "@/lib/supabase/client";
import { GPS_CITIES } from "@/lib/gps-cities";


interface ProjectGroup {
  id: string;
  name: string;
  project_count: number;
}

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchGroups = useCallback(async () => {
    const { data: groupsData } = await supabase
      .from("project_groups")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (groupsData) {
      // Get member counts
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

  // Auto-fill title from file name
  const handleFileSelect = (f: File) => {
    setFile(f);
    if (!projectTitle) {
      const name = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setProjectTitle(name.charAt(0).toUpperCase() + name.slice(1));
    }
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

  const canGenerate = file && projectTitle.trim() && variantCount > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError("");

    // Get authenticated user directly (hook may still be loading)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setError("Not authenticated. Please log in again.");
      setIsGenerating(false);
      return;
    }

    // 1. Create project record
    const isImage = file.type.startsWith("image/");
    const projectType = isImage ? "image" : "video";

    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: authUser.id,
        title: projectTitle.trim(),
        variant_count: variantCount,
        status: "draft",
        type: projectType,
      })
      .select()
      .single();

    if (insertError || !project) {
      setIsGenerating(false);
      setError(insertError?.message || "Failed to create project.");
      return;
    }

    // 2. Upload video to Storage
    const ext = file.name.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "mp4");
    const storagePath = `${authUser.id}/${project.id}/source.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      setIsGenerating(false);
      setError(`Upload failed: ${uploadError.message}`);
      // Clean up the project record
      await supabase.from("projects").delete().eq("id", project.id);
      return;
    }

    // 3. Get public URL and save to project
    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);
    await supabase
      .from("projects")
      .update({ source_url: urlData.publicUrl })
      .eq("id", project.id);

    // 4. If group selected, add to group
    if (selectedGroupId) {
      await supabase.from("project_group_members").insert({
        project_id: project.id,
        group_id: selectedGroupId,
      });
    }

    // 5. Create variant records (pending — real processing happens server-side)
    const variantRows = Array.from({ length: variantCount }, (_, i) => ({
      project_id: project.id,
      user_id: authUser.id,
      variant_index: i + 1,
      status: "pending" as const,
      output_url: null,
    }));

    const { error: variantError } = await supabase.from("variants").insert(variantRows);
    if (variantError) {
      setIsGenerating(false);
      setError(`Variants creation failed: ${variantError.message}`);
      return;
    }

    // 6. Update project status to processing
    await supabase
      .from("projects")
      .update({ status: "processing" })
      .eq("id", project.id);

    // 7. Fire-and-forget: trigger video generation (server handles all variants)
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        sourceUrl: urlData.publicUrl,
        variantCount,
        userId: authUser.id,
        gpsCity: gpsCity || undefined,
        captionId: captionMode === "single" && selectedCaptionId ? selectedCaptionId : undefined,
        captionGroupId: captionMode === "group" && selectedCaptionGroupId ? selectedCaptionGroupId : undefined,
        projectType,
      }),
    }).catch(() => {});

    router.push(`/library/${project.id}`);
  };

  const variantPresets = [1, 3, 5, 10, 15, 25];

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

      {/* Step 1: Upload */}
      <UploadDropzone
        file={file}
        onFileSelect={handleFileSelect}
        onRemove={() => { setFile(null); setProjectTitle(""); }}
      />

      {/* Tagline — only when no file yet, centered in remaining space */}
      {!file && (
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

      {/* Step 2: Project settings — visible after file upload */}
      {file && (
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
                <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>Name your project and choose how many variants</div>
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Project title</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
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

            {/* Variant count */}
            <div>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Number of variants</label>
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
          <div className="flex items-center justify-between pt-2">
            <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              {variantCount} variant{variantCount !== 1 ? "s" : ""} will be generated
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
                  Creating project...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Generate variants
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
