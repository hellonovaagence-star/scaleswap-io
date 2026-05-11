"use client";

import { useState, useEffect } from "react";

interface BulkFile {
  id: string;
  file: File;
  title: string;
  thumbnailUrl?: string;
}

interface BulkFileListProps {
  files: BulkFile[];
  onRemove: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({ item, onRemove, onTitleChange }: { item: BulkFile; onRemove: () => void; onTitleChange: (title: string) => void }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(item.thumbnailUrl || null);

  useEffect(() => {
    if (item.thumbnailUrl) return;
    const url = URL.createObjectURL(item.file);

    if (item.file.type.startsWith("image/")) {
      setThumbnailUrl(url);
      return () => { URL.revokeObjectURL(url); };
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.7));
      }
      URL.revokeObjectURL(url);
    };
    video.src = url;

    return () => { URL.revokeObjectURL(url); };
  }, [item.file, item.thumbnailUrl]);

  const ext = item.file.name.split(".").pop()?.toUpperCase() || "";

  return (
    <div className="flex items-center gap-3 p-3 rounded-[12px] border transition-all" style={{
      background: "var(--color-surface)",
      borderColor: "var(--color-border-soft)",
    }}>
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-[8px] overflow-hidden shrink-0 flex items-center justify-center" style={{
        background: "var(--color-surface-2)",
      }}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }}>
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={item.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-[13px] font-medium bg-transparent border-none outline-none truncate"
          style={{ color: "var(--color-ink)" }}
        />
        <div className="flex items-center gap-2 text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
          <span>{formatFileSize(item.file.size)}</span>
          <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium" style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--color-surface-2)",
          }}>{ext}</span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-[6px] flex items-center justify-center border transition-colors hover:bg-[var(--color-red-soft)] shrink-0"
        style={{
          borderColor: "var(--color-border-soft)",
          color: "var(--color-muted)",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

export default function BulkFileList({ files, onRemove, onTitleChange }: BulkFileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium" style={{ color: "var(--color-ink-2)" }}>
          {files.length} file{files.length !== 1 ? "s" : ""} selected
        </span>
      </div>
      {files.map((f) => (
        <FileRow
          key={f.id}
          item={f}
          onRemove={() => onRemove(f.id)}
          onTitleChange={(title) => onTitleChange(f.id, title)}
        />
      ))}
    </div>
  );
}
