"use client";

import { useState } from "react";
import type { Caption, CaptionGroup } from "@/lib/api";

const positionLabels: Record<string, string> = { top: "Top", center: "Center", bottom: "Bottom" };

interface CaptionGroupCardProps {
  group: CaptionGroup;
  captions: Caption[];
  onEdit: (group: CaptionGroup) => void;
  onDelete: (id: string) => void;
}

export default function CaptionGroupCard({ group, captions, onEdit, onDelete }: CaptionGroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const groupCaptions = captions.filter((c) => group.caption_ids.includes(c.id));
  const previewTexts = groupCaptions.slice(0, 3);

  return (
    <div
      className="rounded-[14px] border transition-all duration-200"
      style={{
        background: "var(--color-surface)",
        borderColor: expanded ? "var(--color-accent)" : "var(--color-border-soft)",
        boxShadow: expanded ? "0 0 0 3px var(--color-accent-ring)" : undefined,
      }}
    >
      {/* Header — always visible */}
      <div
        className="p-4 cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className="shrink-0 transition-transform duration-200"
                style={{
                  color: "var(--color-muted)",
                  transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <div className="text-sm font-[550] tracking-tight truncate" style={{ letterSpacing: "-0.01em" }}>
                {group.name}
              </div>
            </div>
            {group.description && (
              <p className="text-[13px] leading-relaxed line-clamp-1 mt-0.5 ml-[22px]" style={{ color: "var(--color-muted)" }}>
                {group.description}
              </p>
            )}
          </div>
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                const menu = e.currentTarget.nextElementSibling;
                menu?.classList.toggle("hidden");
              }}
              className="w-7 h-7 inline-flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ color: "var(--color-muted-2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
            </button>
            <div className="hidden absolute right-0 top-8 z-10 min-w-[120px] rounded-lg border p-1 shadow-lg" style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}>
              <button onClick={() => onEdit(group)} className="w-full text-left text-[13px] px-2.5 py-1.5 rounded-md transition-colors hover:bg-[var(--color-surface-2)]" style={{ color: "var(--color-ink-2)" }}>
                Edit
              </button>
              <button onClick={() => onDelete(group.id)} className="w-full text-left text-[13px] px-2.5 py-1.5 rounded-md transition-colors hover:bg-[var(--color-surface-2)]" style={{ color: "var(--color-red)" }}>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Collapsed preview */}
        {!expanded && (
          <div className="flex flex-col gap-1 mt-2">
            {previewTexts.map((c) => (
              <div key={c.id} className="text-[12px] truncate px-2 py-1 rounded" style={{
                background: "var(--color-surface-2)",
                color: "var(--color-muted)",
              }}>
                {c.text}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10.5px] font-medium px-[7px] py-[3px] rounded-full" style={{
            background: "var(--color-accent-soft)",
            color: "var(--color-accent-hover)",
          }}>
            {group.caption_ids.length} caption{group.caption_ids.length !== 1 ? "s" : ""}
          </span>
          <span className="ml-auto text-[11px]" style={{ color: "var(--color-muted-2)" }}>
            {new Date(group.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Expanded — full caption list */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--color-border-soft)" }}>
          <div className="text-[11px] font-medium uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted)", letterSpacing: "0.04em" }}>
            Captions in this group
          </div>
          {groupCaptions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {groupCaptions.map((c) => (
                <div key={c.id} className="rounded-[10px] p-3 border" style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border-soft)",
                }}>
                  <p className="text-[13px] leading-relaxed mb-2" style={{ color: "var(--color-ink-2)" }}>
                    {c.text}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-[6px] py-[2px] rounded" style={{
                      background: "var(--color-accent-soft)",
                      color: "var(--color-accent-hover)",
                    }}>
                      {positionLabels[c.position] || c.position}
                    </span>
                    <span className="flex items-center gap-1 text-[10.5px]" style={{ color: "var(--color-muted-2)" }}>
                      <span className="w-2.5 h-2.5 rounded-sm border" style={{
                        background: c.font_color,
                        borderColor: "var(--color-border-soft)",
                      }} />
                      {c.font_size}px
                    </span>
                    <span className="flex items-center gap-1 text-[10.5px]" style={{ color: "var(--color-muted-2)" }}>
                      <span className="w-2.5 h-2.5 rounded-sm border" style={{
                        background: c.stroke_color,
                        borderColor: "var(--color-border-soft)",
                      }} />
                      stroke
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] py-3 text-center" style={{ color: "var(--color-muted)" }}>
              No captions in this group yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
