"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface ProjectCardProps {
  id: string;
  title: string;
  gradient: string;
  variantInfo: string;
  ratio: string;
  duration: string;
  timeAgo: string;
  sourceUrl?: string | null;
  mediaType?: "video" | "image";
  onDelete?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export default function ProjectCard({ id, title, gradient, variantInfo, ratio, duration, timeAgo, sourceUrl, mediaType = "video", onDelete, onRename }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Auto-focus rename input
  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== title && onRename) {
      onRename(id, trimmed);
    }
    setRenaming(false);
  };

  return (
    <div className="relative group">
      {/* 3-dot menu button */}
      <div ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            color: "#fff",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            className="absolute top-10 right-2 z-30 rounded-[10px] border py-1 min-w-[140px]"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            }}
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setRenaming(true); setRenameValue(title); }}
              className="w-full text-left px-3 py-[7px] text-[12.5px] font-medium flex items-center gap-2 transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ color: "var(--color-ink-2)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Rename
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete(id); }}
                className="w-full text-left px-3 py-[7px] text-[12.5px] font-medium flex items-center gap-2 transition-colors hover:bg-[var(--color-surface-2)]"
                style={{ color: "var(--color-red)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline rename input */}
      {renaming && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 p-3 pt-0"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
            onBlur={handleRename}
            className="w-full px-2.5 py-1.5 rounded-[8px] border text-sm font-medium outline-none"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-accent)",
              color: "var(--color-ink)",
              boxShadow: "0 0 0 2px rgba(139,127,255,0.25)",
            }}
          />
        </div>
      )}

      <Link href={`/library/${id}`}
        className="block rounded-[14px] p-3 border transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border-soft)",
        }}
      >
        <div className="rounded-[10px] overflow-hidden relative mb-3" style={{ aspectRatio: "9/16" }}>
          {sourceUrl ? (
            mediaType === "image" ? (
              <img
                src={sourceUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <video
                src={sourceUrl}
                muted
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0" style={{ background: gradient }} />
          )}
          <span className="absolute top-2 left-2 text-[10.5px] font-semibold px-[7px] py-[3px] rounded-[5px] backdrop-blur-lg" style={{
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            letterSpacing: "0.02em",
            opacity: 0.92,
          }}>{variantInfo}</span>
        </div>
        <div className="text-sm font-[550] tracking-tight px-1 truncate" style={{ letterSpacing: "-0.01em" }}>
          {renaming ? "\u00A0" : title}
        </div>
        <div className="flex items-center justify-between px-1 mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
          <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--color-ink-2)" }}>
            {ratio}{duration ? ` · ${duration}` : ""}
          </span>
          <span>{timeAgo}</span>
        </div>
      </Link>
    </div>
  );
}
