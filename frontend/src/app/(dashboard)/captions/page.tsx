"use client";

import { useState, useEffect, useCallback } from "react";
import CaptionCard from "@/components/CaptionCard";
import CaptionGroupCard from "@/components/CaptionGroupCard";
import CaptionEditor from "@/components/CaptionEditor";
import CaptionGroupEditor from "@/components/CaptionGroupEditor";
import PillTabs from "@/components/PillTabs";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Caption, CaptionGroup } from "@/lib/api";

type Tab = "captions" | "groups";

export default function CaptionsPage() {
  const [tab, setTab] = useState<Tab>("captions");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [groups, setGroups] = useState<CaptionGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<{ caption_id: string; group_id: string }[]>([]);
  const [editingCaption, setEditingCaption] = useState<Caption | null>(null);
  const [showCaptionEditor, setShowCaptionEditor] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CaptionGroup | null>(null);
  const [showGroupEditor, setShowGroupEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const supabase = createClient();
  const { user } = useUser();

  const fetchData = useCallback(async () => {
    const sb = createClient();
    const [captionsRes, groupsRes, membersRes] = await Promise.all([
      sb.from("captions").select("*").order("created_at", { ascending: false }),
      sb.from("caption_groups").select("*").order("created_at", { ascending: false }),
      sb.from("caption_group_members").select("*"),
    ]);
    setCaptions(captionsRes.data ?? []);
    const rawGroups = groupsRes.data ?? [];
    const rawMembers = membersRes.data ?? [];
    setGroupMembers(rawMembers);
    setGroups(
      rawGroups.map((g: { id: string; name: string; description?: string; created_at: string }) => ({
        ...g,
        caption_ids: rawMembers.filter((m) => m.group_id === g.id).map((m) => m.caption_id),
      }))
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCaptions = captions.filter((c) =>
    c.text.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const getGroupsForCaption = (captionId: string) =>
    groups.filter((g) => g.caption_ids.includes(captionId));

  const getGroupIdsForCaption = (captionId: string) =>
    groups.filter((g) => g.caption_ids.includes(captionId)).map((g) => g.id);

  const handleCreateGroupInline = async (name: string): Promise<string> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return "";
    const { data } = await supabase
      .from("caption_groups")
      .insert({ name, user_id: authUser.id })
      .select()
      .single();
    if (data) {
      setGroups((prev) => [...prev, { ...data, caption_ids: [] }]);
      return data.id;
    }
    return "";
  };

  const handleSaveCaption = async (data: Omit<Caption, "id" | "created_at">, selectedGroupIds: string[]) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    let captionId: string;

    if (editingCaption) {
      captionId = editingCaption.id;
      const updatePayload = {
        text: data.text,
        position: data.position,
        font_size: data.font_size,
        text_scale: data.text_scale,
        font_color: data.font_color,
        stroke_color: data.stroke_color,
        font_family: data.font_family,
      };
      const { data: updated, error: updateError } = await supabase
        .from("captions")
        .update(updatePayload)
        .eq("id", captionId)
        .select()
        .single();
      if (updateError || !updated) {
        alert(`Save failed: ${updateError?.message || "No row returned"}`);
        return;
      }
      setCaptions((prev) => prev.map((c) => c.id === captionId ? { ...c, ...updated } : c));
    } else {
      const { data: newCaption, error: insertError } = await supabase
        .from("captions")
        .insert({ ...data, user_id: authUser.id })
        .select()
        .single();
      if (insertError || !newCaption) {
        console.error("[caption insert] failed:", insertError);
        alert(`Save failed: ${insertError?.message || "Unknown error"}`);
        return;
      }
      captionId = newCaption.id;
    }

    // Sync group memberships: delete old, insert new
    await supabase.from("caption_group_members").delete().eq("caption_id", captionId);
    if (selectedGroupIds.length > 0) {
      await supabase.from("caption_group_members").insert(
        selectedGroupIds.map((gid) => ({ caption_id: captionId, group_id: gid }))
      );
    }

    setShowCaptionEditor(false);
    setEditingCaption(null);
    await fetchData();
  };

  const handleDeleteCaption = async (id: string) => {
    await supabase.from("captions").delete().eq("id", id);
    fetchData();
  };

  const handleSaveGroup = async (data: { name: string; description?: string; caption_ids: string[] }) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    let groupId: string;

    if (editingGroup) {
      groupId = editingGroup.id;
      await supabase.from("caption_groups").update({ name: data.name, description: data.description }).eq("id", groupId);
    } else {
      const { data: newGroup } = await supabase
        .from("caption_groups")
        .insert({ name: data.name, description: data.description, user_id: authUser.id })
        .select()
        .single();
      if (!newGroup) return;
      groupId = newGroup.id;
    }

    // Sync memberships
    await supabase.from("caption_group_members").delete().eq("group_id", groupId);
    if (data.caption_ids.length > 0) {
      await supabase.from("caption_group_members").insert(
        data.caption_ids.map((cid) => ({ caption_id: cid, group_id: groupId }))
      );
    }

    setShowGroupEditor(false);
    setEditingGroup(null);
    fetchData();
  };

  const handleDeleteGroup = async (id: string) => {
    await supabase.from("caption_groups").delete().eq("id", id);
    fetchData();
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-[550] tracking-tight leading-tight" style={{ letterSpacing: "-0.025em" }}>
            Caption <em className="not-italic font-normal" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>list</em>
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--color-muted)" }}>
            {captions.length} caption{captions.length !== 1 ? "s" : ""} · {groups.length} group{groups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "captions" ? (
            <button
              onClick={() => { setEditingCaption(null); setShowCaptionEditor(true); }}
              className="inline-flex items-center gap-[7px] text-[13px] font-medium px-3 py-2 rounded-lg text-white"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 1px 2px rgba(139,127,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add caption
            </button>
          ) : (
            <button
              onClick={() => { setEditingGroup(null); setShowGroupEditor(true); }}
              className="inline-flex items-center gap-[7px] text-[13px] font-medium px-3 py-2 rounded-lg text-white"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 1px 2px rgba(139,127,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Create group
            </button>
          )}
        </div>
      </div>

      {/* Tabs + Filter */}
      <div className="flex items-center gap-2.5 mb-4">
        <PillTabs
          tabs={[{ key: "captions" as const, label: "Captions" }, { key: "groups" as const, label: "Groups" }]}
          active={tab}
          onChange={(t) => { setTab(t); setSearch(""); }}
        />

        <label className="flex items-center gap-2 px-3 py-[7px] rounded-lg border min-w-[240px]" style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder={tab === "captions" ? "Search captions..." : "Search groups..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] flex-1 min-w-0"
          />
        </label>

        {tab === "captions" && (
          <div className="flex items-center rounded-lg border p-0.5" style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
          }}>
            <button
              onClick={() => setViewMode("grid")}
              className="w-[30px] h-[30px] rounded-[5px] flex items-center justify-center transition-all"
              style={{
                background: viewMode === "grid" ? "var(--color-surface-2)" : "transparent",
                color: viewMode === "grid" ? "var(--color-ink)" : "var(--color-muted)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="w-[30px] h-[30px] rounded-[5px] flex items-center justify-center transition-all"
              style={{
                background: viewMode === "list" ? "var(--color-surface-2)" : "transparent",
                color: viewMode === "list" ? "var(--color-ink)" : "var(--color-muted)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {tab === "captions" ? (
        viewMode === "grid" ? (
          <div key="captions-grid" className="grid gap-3.5 animate-page-fade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filteredCaptions.map((c) => (
              <CaptionCard
                key={c.id}
                caption={c}
                groupNames={getGroupsForCaption(c.id).map((g) => g.name)}
                onEdit={(cap) => { setEditingCaption(cap); setShowCaptionEditor(true); }}
                onDelete={handleDeleteCaption}
              />
            ))}
            {filteredCaptions.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>No captions found</p>
                <button
                  onClick={() => { setEditingCaption(null); setShowCaptionEditor(true); }}
                  className="text-[13px] font-medium mt-2"
                  style={{ color: "var(--color-accent)" }}
                >Create your first caption</button>
              </div>
            )}
          </div>
        ) : (
          <div key="captions-list" className="flex flex-col gap-1.5 animate-page-fade">
            {/* List header */}
            <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted-2)", letterSpacing: "0.04em" }}>
              <span className="flex-1 min-w-0">Caption</span>
              <span className="w-[70px] text-center">Position</span>
              <span className="w-[70px] text-center">Style</span>
              <span className="w-[60px] text-center">Size</span>
              <span className="w-[100px]">Groups</span>
              <span className="w-[70px] text-right">Date</span>
              <span className="w-7" />
            </div>
            {filteredCaptions.map((c) => {
              const posLabel = c.position === "top" ? "Top" : c.position === "center" ? "Center" : c.position === "bottom" ? "Bottom" : c.position.includes(",") ? (parseFloat(c.position) < 25 ? "Top" : parseFloat(c.position) > 75 ? "Bottom" : "Center") : "Custom";
              const captionGroups = getGroupsForCaption(c.id);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-[10px] border cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm group"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border-soft)",
                  }}
                  onClick={() => { setEditingCaption(c); setShowCaptionEditor(true); }}
                >
                  {/* Text */}
                  <p className="flex-1 min-w-0 text-[13px] leading-snug truncate" style={{ color: "var(--color-ink-2)" }}>
                    {c.text}
                  </p>
                  {/* Position */}
                  <span className="w-[70px] text-center text-[10.5px] font-medium px-[7px] py-[3px] rounded-full shrink-0" style={{
                    background: "var(--color-accent-soft)",
                    color: "var(--color-accent-hover)",
                  }}>
                    {posLabel}
                  </span>
                  {/* Style */}
                  <span className="w-[70px] text-center text-[10.5px] font-medium px-[7px] py-[3px] rounded-full shrink-0" style={{
                    background: "var(--color-surface-2)",
                    color: "var(--color-muted)",
                  }}>
                    {c.font_family === "instagram" ? "Instagram" : "TikTok"}
                  </span>
                  {/* Size + colors */}
                  <span className="w-[60px] flex items-center justify-center gap-1.5 text-[11px] shrink-0" style={{ color: "var(--color-muted-2)" }}>
                    <span className="w-2.5 h-2.5 rounded-sm border" style={{ background: c.font_color, borderColor: "var(--color-border-soft)" }} />
                    {c.font_size}px
                  </span>
                  {/* Groups */}
                  <span className="w-[100px] truncate text-[11px] shrink-0" style={{ color: "var(--color-muted)" }}>
                    {captionGroups.length > 0 ? captionGroups.map((g) => g.name).join(", ") : "—"}
                  </span>
                  {/* Date */}
                  <span className="w-[70px] text-right text-[11px] shrink-0" style={{ color: "var(--color-muted-2)" }}>
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {/* Edit icon */}
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
              );
            })}
            {filteredCaptions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>No captions found</p>
                <button
                  onClick={() => { setEditingCaption(null); setShowCaptionEditor(true); }}
                  className="text-[13px] font-medium mt-2"
                  style={{ color: "var(--color-accent)" }}
                >Create your first caption</button>
              </div>
            )}
          </div>
        )
      ) : (
        <div key="groups" className="grid gap-3.5 animate-page-fade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filteredGroups.map((g) => (
            <CaptionGroupCard
              key={g.id}
              group={g}
              captions={captions}
              onEdit={(grp) => { setEditingGroup(grp); setShowGroupEditor(true); }}
              onDelete={handleDeleteGroup}
              onEditCaption={(cap) => { setEditingCaption(cap); setShowCaptionEditor(true); }}
            />
          ))}
          {filteredGroups.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>No groups found</p>
              <button
                onClick={() => { setEditingGroup(null); setShowGroupEditor(true); }}
                className="text-[13px] font-medium mt-2"
                style={{ color: "var(--color-accent)" }}
              >Create your first group</button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCaptionEditor && (
        <CaptionEditor
          caption={editingCaption ?? undefined}
          groups={groups}
          initialGroupIds={editingCaption ? getGroupIdsForCaption(editingCaption.id) : undefined}
          onSave={handleSaveCaption}
          onCreateGroup={handleCreateGroupInline}
          onClose={() => { setShowCaptionEditor(false); setEditingCaption(null); }}
        />
      )}
      {showGroupEditor && (
        <CaptionGroupEditor
          group={editingGroup ?? undefined}
          captions={captions}
          onSave={handleSaveGroup}
          onClose={() => { setShowGroupEditor(false); setEditingGroup(null); }}
        />
      )}
    </>
  );
}
