"use client";

import type { Caption } from "@/lib/api";

interface CaptionCardProps {
  caption: Caption;
  groupNames?: string[];
  onEdit: (caption: Caption) => void;
  onDelete: (id: string) => void;
}

const positionLabels = { top: "Top", center: "Center", bottom: "Bottom" };

export default function CaptionCard({ caption, groupNames, onEdit, onDelete }: CaptionCardProps) {
  return (
    <div className="rounded-[14px] p-4 border transition-all duration-200 hover:-translate-y-0.5" style={{
      background: "var(--color-surface)",
      borderColor: "var(--color-border-soft)",
    }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--color-ink-2)" }}>
            {caption.text}
          </p>
        </div>
        <div className="relative shrink-0">
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
            <button onClick={() => onEdit(caption)} className="w-full text-left text-[13px] px-2.5 py-1.5 rounded-md transition-colors hover:bg-[var(--color-surface-2)]" style={{ color: "var(--color-ink-2)" }}>
              Edit
            </button>
            <button onClick={() => onDelete(caption.id)} className="w-full text-left text-[13px] px-2.5 py-1.5 rounded-md transition-colors hover:bg-[var(--color-surface-2)]" style={{ color: "var(--color-red)" }}>
              Delete
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10.5px] font-medium px-[7px] py-[3px] rounded-full" style={{
          background: "var(--color-accent-soft)",
          color: "var(--color-accent-hover)",
        }}>
          {positionLabels[caption.position]}
        </span>
        <span className="text-[10.5px] font-medium px-[7px] py-[3px] rounded-full" style={{
          background: "var(--color-surface-2)",
          color: "var(--color-muted)",
        }}>
          {caption.font_family === "instagram" ? "Instagram" : "TikTok"}
        </span>
        {groupNames?.map((name) => (
          <span key={name} className="text-[10.5px] font-medium px-[7px] py-[3px] rounded-full truncate max-w-[100px]" style={{
            background: "var(--color-surface-2)",
            color: "var(--color-muted)",
          }}>
            {name}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-muted-2)" }}>
          <span className="w-2.5 h-2.5 rounded-sm border" style={{
            background: caption.font_color,
            borderColor: "var(--color-border-soft)",
          }} />
          {caption.font_size}px
        </span>
        <span className="ml-auto text-[11px]" style={{ color: "var(--color-muted-2)" }}>
          {new Date(caption.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
