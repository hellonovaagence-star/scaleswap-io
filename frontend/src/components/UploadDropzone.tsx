"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UploadDropzoneProps {
  file?: File | null;
  onFileSelect?: (file: File) => void;
  onRemove?: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function UploadDropzone({ file, onFileSelect, onRemove }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<string | null>(null);

  const isImage = file ? file.type.startsWith("image/") : false;

  // Generate thumbnail and get duration/dimensions from file
  useEffect(() => {
    if (!file) {
      setThumbnailUrl(null);
      setDuration(null);
      setDimensions(null);
      return;
    }

    const url = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {
      // Image: use object URL directly for preview, get dimensions
      setThumbnailUrl(url);
      setDuration(null);
      const img = new Image();
      img.onload = () => {
        setDimensions(`${img.naturalWidth}x${img.naturalHeight}`);
      };
      img.src = url;
      return () => { URL.revokeObjectURL(url); };
    }

    // Video: extract thumbnail frame + duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setDimensions(null);
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

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (f.type.startsWith("video/") || supportedImageTypes.includes(f.type)) {
      onFileSelect?.(f);
    }
  }, [onFileSelect]);

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) onFileSelect?.(f);
    };
    input.click();
  };

  // File selected — show preview
  if (file) {
    return (
      <div className="rounded-[18px] p-5 border transition-all" style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-accent)",
        boxShadow: "0 0 0 3px var(--color-accent-ring)",
      }}>
        <div className="flex items-center gap-4">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-[12px] overflow-hidden shrink-0 flex items-center justify-center" style={{
            background: "var(--color-surface-2)",
          }}>
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-green)" }} />
              <span className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>
                {file.name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--color-muted)" }}>
              <span>{formatFileSize(file.size)}</span>
              {duration !== null && <span>{formatDuration(duration)}</span>}
              {isImage && dimensions && <span>{dimensions}</span>}
              <span className="px-1.5 py-0.5 rounded-[4px] text-[10.5px] font-medium" style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: "var(--color-surface-2)",
                color: "var(--color-muted)",
              }}>
                {file.name.split(".").pop()?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleClick}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-[7px] rounded-[8px] border transition-all"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-ink-2)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Change
            </button>
            <button
              onClick={onRemove}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center border transition-colors hover:bg-[var(--color-red-soft)]"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No file — show dropzone
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className="rounded-[18px] px-16 py-10 text-center transition-all duration-200 cursor-pointer"
      style={{
        background: isDragging ? "var(--color-accent-soft)" : "var(--color-surface)",
        border: `2px dashed ${isDragging ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      <div className="w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-5" style={{
        background: "var(--color-accent-soft)",
        color: "var(--color-accent-hover)",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
      <h3 className="text-lg font-semibold tracking-tight mb-1.5" style={{ letterSpacing: "-0.02em" }}>
        Drag your file here
      </h3>
      <p className="text-[13.5px] mb-6" style={{ color: "var(--color-muted)" }}>
        or click to select a file from your device
      </p>
      <button className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-[9px] text-white" style={{
        background: "var(--color-accent)",
        boxShadow: "0 2px 6px rgba(139,127,255,0.3)",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Browse files
      </button>
      <div className="flex items-center justify-center gap-1 mt-5">
        {["MP4", "MOV", "AVI", "WEBM", "JPG", "PNG", "WEBP"].map((fmt) => (
          <span key={fmt} className="text-[11px] px-2 py-0.5 rounded-[5px]" style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--color-surface-2)",
            color: "var(--color-muted)",
          }}>{fmt}</span>
        ))}
      </div>

    </div>
  );
}
