"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Caption, CaptionGroup } from "@/lib/api";

interface CaptionGroupEditorProps {
  group?: CaptionGroup;
  captions: Caption[];
  onSave: (data: { name: string; description?: string; caption_ids: string[] }) => void;
  onClose: () => void;
}

export default function CaptionGroupEditor({ group, captions, onSave, onClose }: CaptionGroupEditorProps) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(group?.caption_ids ?? []);

  const toggle = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[16px] border p-6" style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
      }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight" style={{ letterSpacing: "-0.015em" }}>
            {group ? "Edit group" : "Create group"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface-2)]" style={{ color: "var(--color-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CTA variations, Hook pack..."
              className="w-full px-3 py-2.5 rounded-[9px] border text-[13.5px] outline-none transition-all focus:border-[var(--color-accent)]"
              style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of this group..."
              className="w-full px-3 py-2.5 rounded-[9px] border text-[13.5px] outline-none transition-all resize-none focus:border-[var(--color-accent)]"
              style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>
              Select captions <span style={{ color: "var(--color-muted)" }}>({selectedIds.length} selected)</span>
            </label>
            <div className="rounded-[9px] border max-h-[240px] overflow-y-auto" style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-2)",
            }}>
              {captions.length === 0 ? (
                <div className="p-4 text-center text-[13px]" style={{ color: "var(--color-muted)" }}>
                  No captions yet. Create some first.
                </div>
              ) : captions.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b last:border-b-0 transition-colors hover:bg-[var(--color-surface)]"
                  style={{ borderColor: "var(--color-border-soft)" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="w-3.5 h-3.5 rounded accent-[var(--color-accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] truncate" style={{ color: "var(--color-ink-2)" }}>
                      {c.text}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t" style={{ borderColor: "var(--color-border-soft)" }}>
          <button onClick={onClose} className="text-[13px] font-medium px-4 py-2 rounded-lg border transition-all" style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-ink-2)",
          }}>Cancel</button>
          <button
            onClick={() => onSave({ name, description: description || undefined, caption_ids: selectedIds })}
            className="text-[13px] font-medium px-4 py-2 rounded-lg text-white transition-all hover:-translate-y-px"
            style={{
              background: "var(--color-accent)",
              boxShadow: "0 2px 6px rgba(139,127,255,0.3)",
            }}
          >Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
