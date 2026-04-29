"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import ProjectCard from "@/components/ProjectCard";
import PillTabs from "@/components/PillTabs";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

interface Project {
  id: string;
  title: string;
  status: string;
  variant_count: number;
  source_url: string | null;
  created_at: string;
  type?: string;
}

interface ProjectGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface GroupMember {
  project_id: string;
  group_id: string;
}

const gradients = [
  "linear-gradient(145deg, #4A3F8E 0%, #8B7FFF 60%, #FFB99A 100%)",
  "linear-gradient(170deg, #5A4FAA 0%, #9D93FF 55%, #FFC6A8 100%)",
  "linear-gradient(120deg, #3F3475 0%, #7B6FF0 55%, #FFAD8A 100%)",
  "linear-gradient(160deg, #2A3D5C 0%, #5B7FD1 55%, #A8CCFF 100%)",
  "linear-gradient(135deg, #5C3A4A 0%, #C77F92 55%, #FFC6A8 100%)",
  "linear-gradient(155deg, #3E5A4A 0%, #6FAF8A 55%, #D0E8B9 100%)",
  "linear-gradient(140deg, #2E2E3F 0%, #5A5A7A 55%, #B4B4D0 100%)",
  "linear-gradient(130deg, #8C4A2E 0%, #E6926F 55%, #FFDBA8 100%)",
];

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

export default function LibraryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [mediaFilter, setMediaFilter] = useState<"all" | "video" | "image">("all");
  const [search, setSearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  const supabase = createClient();
  const { user } = useUser();

  const fetchData = useCallback(async () => {
    const [projectsRes, groupsRes, membersRes] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("project_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("project_group_members").select("*"),
    ]);
    setProjects(projectsRes.data ?? []);
    setGroups(groupsRes.data ?? []);
    setGroupMembers(membersRes.data ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProjectIdsForGroup = (groupId: string) =>
    groupMembers.filter((m) => m.group_id === groupId).map((m) => m.project_id);

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedGroupId) {
      const projectIds = getProjectIdsForGroup(selectedGroupId);
      if (!projectIds.includes(p.id)) return false;
    }
    if (mediaFilter === "video" && p.type === "image") return false;
    if (mediaFilter === "image" && p.type !== "image") return false;
    return true;
  });

  const handleSaveGroup = async () => {
    if (!groupName.trim()) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    if (editingGroup) {
      await supabase
        .from("project_groups")
        .update({ name: groupName.trim() })
        .eq("id", editingGroup.id);
    } else {
      await supabase
        .from("project_groups")
        .insert({ name: groupName.trim(), user_id: authUser.id });
    }
    setShowGroupModal(false);
    setEditingGroup(null);
    setGroupName("");
    setGroupDesc("");
    fetchData();
  };

  const handleDeleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    fetchData();
  };

  const handleRenameProject = async (id: string, newTitle: string) => {
    await supabase.from("projects").update({ title: newTitle }).eq("id", id);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, title: newTitle } : p));
  };

  const handleDeleteGroup = async (id: string) => {
    await supabase.from("project_groups").delete().eq("id", id);
    if (selectedGroupId === id) setSelectedGroupId("");
    fetchData();
  };

  const openEditGroup = (g: ProjectGroup) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupDesc(g.description || "");
    setShowGroupModal(true);
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupName("");
    setGroupDesc("");
    setShowGroupModal(true);
  };

  return (
    <>
      {/* Page header */}
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-[550] tracking-tight leading-tight" style={{ letterSpacing: "-0.025em" }}>
            Content <em className="not-italic font-normal" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>library</em>
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--color-muted)" }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {groups.length} group{groups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openCreateGroup}
            className="inline-flex items-center gap-[7px] text-[13px] font-medium px-3 py-2 rounded-lg border transition-all"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-ink-2)",
              boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            New group
          </button>
          <Link href="/upload" className="inline-flex items-center gap-[7px] text-[13px] font-medium px-3 py-2 rounded-lg text-white" style={{
            background: "var(--color-accent)",
            boxShadow: "0 1px 2px rgba(139,127,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New project
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        <StatCard label="Projects" value={String(projects.length)} unit={projects.length !== 1 ? "files" : "file"} delta="" dotColor="var(--color-accent)" />
        <StatCard label="Total content" value={String(projects.reduce((sum, p) => sum + p.variant_count, 0) + projects.length)} unit="files" delta="" dotColor="var(--color-green)" />
        <StatCard label="Groups" value={String(groups.length)} delta={`${groups.length} collection${groups.length !== 1 ? "s" : ""}`} />
        <StatCard label="Money saved" value="+100$" delta="It's free, you're welcome" dotColor="var(--color-accent)" deltaColor="var(--color-accent)" />
      </div>

      {/* Group chips */}
      <div className="flex items-baseline flex-wrap gap-2 mb-3">
        <span className="text-[11.5px] font-medium mr-0.5 leading-none" style={{ color: "var(--color-muted)" }}>Groups</span>
        <button
          onClick={() => setSelectedGroupId("")}
          className="text-[11.5px] font-medium px-2.5 py-[4px] rounded-full border transition-all leading-none"
          style={{
            background: !selectedGroupId ? "var(--color-ink)" : "var(--color-surface)",
            borderColor: !selectedGroupId ? "var(--color-ink)" : "var(--color-border-soft)",
            color: !selectedGroupId ? "var(--color-bg)" : "var(--color-muted)",
          }}
        >All</button>
        {groups.map((g) => {
          const count = getProjectIdsForGroup(g.id).length;
          return (
            <div key={g.id} className="flex items-center">
              <button
                onClick={() => setSelectedGroupId(selectedGroupId === g.id ? "" : g.id)}
                className="text-[11.5px] font-medium px-2.5 py-[4px] rounded-full border transition-all"
                style={{
                  background: selectedGroupId === g.id ? "var(--color-accent-soft)" : "var(--color-surface)",
                  borderColor: selectedGroupId === g.id ? "var(--color-accent)" : "var(--color-border-soft)",
                  color: selectedGroupId === g.id ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                }}
              >
                {g.name}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
              {selectedGroupId === g.id && (
                <div className="flex items-center ml-1 gap-0.5">
                  <button
                    onClick={() => openEditGroup(g)}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--color-surface-2)]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--color-red-soft)]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Search bar + media filter */}
      <div className="flex items-center gap-2.5 mb-4">
        <PillTabs
          tabs={[
            { key: "all", label: "All" },
            { key: "video", label: "Videos" },
            { key: "image", label: "Photos" },
          ]}
          active={mediaFilter}
          onChange={setMediaFilter}
        />
        <label className="flex items-center gap-2 px-3 py-[7px] rounded-lg border min-w-[260px]" style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] flex-1 min-w-0"
          />
        </label>
      </div>

      {/* Project grid */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {filteredProjects.map((p, i) => (
          <ProjectCard
            key={p.id}
            id={p.id}
            title={p.title}
            gradient={gradients[i % gradients.length]}
            variantInfo={`${p.variant_count} variations`}
            ratio="9:16"
            duration=""
            timeAgo={timeAgo(p.created_at)}
            sourceUrl={p.source_url}
            mediaType={p.type === "image" ? "image" : "video"}
            onDelete={handleDeleteProject}
            onRename={handleRenameProject}
          />
        ))}
        {filteredProjects.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>No projects found</p>
            <Link href="/upload" className="text-[13px] font-medium mt-2 inline-block" style={{ color: "var(--color-accent)" }}>
              Create your first project
            </Link>
          </div>
        )}
      </div>

      {/* Group create/edit modal */}
      {showGroupModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => { setShowGroupModal(false); setEditingGroup(null); }}
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(3px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] rounded-[16px] border p-6 shadow-xl"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <h2 className="text-[15px] font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
              {editingGroup ? "Edit group" : "Create new group"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Group name</label>
                <input
                  autoFocus
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveGroup()}
                  placeholder="e.g. Fitness content"
                  className="w-full text-[13px] px-3 py-[9px] rounded-[8px] border outline-none transition-all focus:ring-2"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setShowGroupModal(false); setEditingGroup(null); }}
                className="text-[13px] font-medium px-3.5 py-2 rounded-[8px] border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-ink-2)",
                }}
              >Cancel</button>
              <button
                onClick={handleSaveGroup}
                disabled={!groupName.trim()}
                className="text-[13px] font-medium px-3.5 py-2 rounded-[8px] text-white disabled:opacity-40"
                style={{ background: "var(--color-accent)" }}
              >{editingGroup ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
