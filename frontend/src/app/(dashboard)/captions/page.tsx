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

  const supabase = createClient();
  const { user } = useUser();

  const fetchData = useCallback(async () => {
    const [captionsRes, groupsRes, membersRes] = await Promise.all([
      supabase.from("captions").select("*").order("created_at", { ascending: false }),
      supabase.from("caption_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("caption_group_members").select("*"),
    ]);
    setCaptions(captionsRes.data ?? []);
    const rawGroups = groupsRes.data ?? [];
    const rawMembers = membersRes.data ?? [];
    setGroupMembers(rawMembers);
    // Enrich groups with caption_ids for compatibility with existing components
    setGroups(
      rawGroups.map((g: { id: string; name: string; description?: string; created_at: string }) => ({
        ...g,
        caption_ids: rawMembers.filter((m) => m.group_id === g.id).map((m) => m.caption_id),
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await supabase.from("captions").update(data).eq("id", captionId);
    } else {
      const { data: newCaption } = await supabase
        .from("captions")
        .insert({ ...data, user_id: authUser.id })
        .select()
        .single();
      if (!newCaption) return;
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
    fetchData();
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
      </div>

      {/* Content */}
      {tab === "captions" ? (
        <div key="captions" className="grid gap-3.5 animate-page-fade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
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
        <div key="groups" className="grid gap-3.5 animate-page-fade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filteredGroups.map((g) => (
            <CaptionGroupCard
              key={g.id}
              group={g}
              captions={captions}
              onEdit={(grp) => { setEditingGroup(grp); setShowGroupEditor(true); }}
              onDelete={handleDeleteGroup}
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
