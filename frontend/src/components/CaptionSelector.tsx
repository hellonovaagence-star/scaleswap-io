"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Caption, CaptionGroup } from "@/lib/api";

type Mode = "none" | "single" | "group";

interface CaptionSelectorProps {
  onModeChange?: (mode: Mode) => void;
  onCaptionSelect?: (captionId: string) => void;
  onGroupSelect?: (groupId: string) => void;
}

export default function CaptionSelector({ onModeChange, onCaptionSelect, onGroupSelect }: CaptionSelectorProps) {
  const [mode, setMode] = useState<Mode>("none");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [groups, setGroups] = useState<CaptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaptionId, setSelectedCaptionId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [captionsRes, groupsRes, membersRes] = await Promise.all([
      supabase.from("captions").select("*").order("created_at", { ascending: false }),
      supabase.from("caption_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("caption_group_members").select("*"),
    ]);
    setCaptions(captionsRes.data ?? []);
    const rawGroups = groupsRes.data ?? [];
    const rawMembers = membersRes.data ?? [];
    setGroups(
      rawGroups.map((g: { id: string; name: string; description?: string; created_at: string }) => ({
        ...g,
        caption_ids: rawMembers.filter((m: { group_id: string }) => m.group_id === g.id).map((m: { caption_id: string }) => m.caption_id),
      }))
    );
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMode = (m: Mode) => {
    setMode(m);
    onModeChange?.(m);
  };

  const selectedCaption = captions.find((c) => c.id === selectedCaptionId);

  return (
    <div>
      <div className="text-xs font-medium mb-3" style={{ color: "var(--color-ink-2)" }}>Caption mode</div>

      {/* Mode cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {([
          { key: "none" as const, label: "Without", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg> },
          { key: "single" as const, label: "Single", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg> },
          { key: "group" as const, label: "Group", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
        ]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => handleMode(key)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-[10px] border transition-all cursor-pointer"
            style={{
              background: mode === key ? "var(--color-accent-soft)" : "var(--color-surface)",
              borderColor: mode === key ? "var(--color-accent)" : "var(--color-border-soft)",
              color: mode === key ? "var(--color-accent-hover)" : "var(--color-muted)",
            }}
          >
            {icon}
            <span className="text-[11.5px] font-medium" style={{
              color: mode === key ? "var(--color-accent-hover)" : "var(--color-ink-2)",
            }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Single caption picker */}
      {mode === "single" && (
        <div className="flex flex-col gap-1.5">
          {loading ? (
            <div className="text-[12px] text-center py-3" style={{ color: "var(--color-muted)" }}>Loading...</div>
          ) : captions.length === 0 ? (
            <div className="text-center py-4 rounded-[10px] border" style={{ borderColor: "var(--color-border-soft)" }}>
              <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>No captions yet</p>
              <a href="/captions" className="text-[12px] font-medium mt-1 inline-block" style={{ color: "var(--color-accent)" }}>
                Create one in Captions
              </a>
            </div>
          ) : (
            <>
              {captions.map((c) => {
                const selected = selectedCaptionId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCaptionId(c.id); onCaptionSelect?.(c.id); }}
                    className="flex items-center gap-3 p-2.5 rounded-[10px] border text-left transition-all"
                    style={{
                      background: selected ? "var(--color-accent-soft)" : "var(--color-surface)",
                      borderColor: selected ? "var(--color-accent)" : "var(--color-border-soft)",
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" style={{
                      borderColor: selected ? "var(--color-accent)" : "var(--color-border)",
                    }}>
                      {selected && <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium truncate" style={{
                        color: selected ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                      }}>{c.text}</div>
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{
                      background: selected ? "rgba(139,127,255,0.15)" : "var(--color-surface-2)",
                      color: selected ? "var(--color-accent-hover)" : "var(--color-muted)",
                    }}>{c.position}</span>
                  </button>
                );
              })}
              {selectedCaption && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-accent)" }} />
                  <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {selectedCaption.position} · {selectedCaption.font_size}px · <span style={{ color: selectedCaption.font_color, textShadow: "0 0 1px rgba(0,0,0,0.3)" }}>A</span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Group picker */}
      {mode === "group" && (
        <div className="flex flex-col gap-1.5">
          {loading ? (
            <div className="text-[12px] text-center py-3" style={{ color: "var(--color-muted)" }}>Loading...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-4 rounded-[10px] border" style={{ borderColor: "var(--color-border-soft)" }}>
              <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>No caption groups yet</p>
              <a href="/captions" className="text-[12px] font-medium mt-1 inline-block" style={{ color: "var(--color-accent)" }}>
                Create one in Captions
              </a>
            </div>
          ) : (
            groups.map((g) => {
              const selected = selectedGroupId === g.id;
              const count = g.caption_ids.length;
              return (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGroupId(g.id); onGroupSelect?.(g.id); }}
                  className="flex items-center gap-3 p-2.5 rounded-[10px] border text-left transition-all"
                  style={{
                    background: selected ? "var(--color-accent-soft)" : "var(--color-surface)",
                    borderColor: selected ? "var(--color-accent)" : "var(--color-border-soft)",
                  }}
                >
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" style={{
                    borderColor: selected ? "var(--color-accent)" : "var(--color-border)",
                  }}>
                    {selected && <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium truncate" style={{
                      color: selected ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                    }}>{g.name}</div>
                    {g.description && (
                      <div className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{g.description}</div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{
                    background: selected ? "rgba(139,127,255,0.15)" : "var(--color-surface-2)",
                    color: selected ? "var(--color-accent-hover)" : "var(--color-muted)",
                  }}>{count} caption{count !== 1 ? "s" : ""}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
