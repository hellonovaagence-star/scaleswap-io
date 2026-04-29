"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Caption, CaptionGroup } from "@/lib/api";

interface CaptionEditorProps {
  caption?: Caption;
  groups: CaptionGroup[];
  initialGroupIds?: string[];
  onSave: (data: Omit<Caption, "id" | "created_at">, groupIds: string[]) => void;
  onCreateGroup: (name: string) => string | Promise<string>;
  onClose: () => void;
}

const PRESET_Y = { top: 8, center: 50, bottom: 88 } as const;
const SNAP_POINTS = [
  { y: 8, label: "Top" },
  { y: 33, label: "⅓" },
  { y: 50, label: "Center" },
  { y: 66, label: "⅔" },
  { y: 88, label: "Bottom" },
];
const SNAP_THRESHOLD = 3;

export default function CaptionEditor({ caption, groups, initialGroupIds, onSave, onCreateGroup, onClose }: CaptionEditorProps) {
  const [text, setText] = useState(caption?.text ?? "");
  const [groupIds, setGroupIds] = useState<string[]>(initialGroupIds ?? []);
  const [customY, setCustomY] = useState<number>(PRESET_Y[caption?.position ?? "bottom"]);
  const [customX, setCustomX] = useState<number>(50);
  const [fontSize, setFontSize] = useState(caption?.font_size ?? 24);
  const [fontColor, setFontColor] = useState(caption?.font_color ?? "#FFFFFF");
  const [strokeColor, setStrokeColor] = useState(caption?.stroke_color ?? "#000000");
  const [strokeEnabled, setStrokeEnabled] = useState(caption?.stroke_color !== "transparent");
  const [captionFont, setCaptionFont] = useState<"tiktok" | "instagram">((caption?.font_family as "tiktok" | "instagram") ?? "tiktok");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartScale, setResizeStartScale] = useState(1);
  const [textScale, setTextScale] = useState(1);
  const [showGuides, setShowGuides] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const id = await onCreateGroup(newGroupName.trim());
    if (id) setGroupIds((prev) => [...prev, id]);
    setCreatingGroup(false);
    setNewGroupName("");
  };

  const toggleGroup = (id: string) => {
    setGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Snap helpers
  const snapY = (raw: number) => {
    for (const snap of SNAP_POINTS) {
      if (Math.abs(raw - snap.y) < SNAP_THRESHOLD) return snap.y;
    }
    return raw;
  };
  const snapX = (raw: number) => Math.abs(raw - 50) < SNAP_THRESHOLD ? 50 : raw;
  const isXCentered = Math.abs(customX - 50) < 1.5;

  // Drag handlers
  const calcPos = useCallback((clientX: number, clientY: number) => {
    if (!previewRef.current) return null;
    const rect = previewRef.current.getBoundingClientRect();
    const rawY = ((clientY - rect.top) / rect.height) * 100;
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    return {
      y: Math.max(5, Math.min(95, rawY)),
      x: Math.max(10, Math.min(90, rawX)),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setShowGuides(true);
    const pos = calcPos(e.clientX, e.clientY);
    if (pos) {
      setCustomY(snapY(pos.y));
      setCustomX(snapX(pos.x));
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isResizing) {
      const deltaY = resizeStartY - e.clientY;
      const newScale = Math.max(0.3, Math.min(3, resizeStartScale + deltaY * 0.008));
      setTextScale(Math.round(newScale * 100) / 100);
      return;
    }
    if (!isDragging) return;
    const pos = calcPos(e.clientX, e.clientY);
    if (pos) {
      setCustomY(snapY(pos.y));
      setCustomX(snapX(pos.x));
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setTimeout(() => setShowGuides(false), 400);
  };

  const handleResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
    setResizeStartY(e.clientY);
    setResizeStartScale(textScale);
  };

  // Map back to enum for save
  const getPosition = (): Caption["position"] => {
    if (customY < 25) return "top";
    if (customY > 75) return "bottom";
    return "center";
  };

  // Active preset check
  const isPresetActive = (pos: "top" | "center" | "bottom") =>
    Math.abs(customY - PRESET_Y[pos]) < SNAP_THRESHOLD;

  const previewFontSize = Math.max(8, fontSize * 0.35);
  const previewStrokeWidth = Math.max(0.5, previewFontSize * 0.08);

  // Which snap point is currently snapped
  const snappedPoint = SNAP_POINTS.find((s) => Math.abs(customY - s.y) < 1.5);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-[680px] flex flex-col rounded-[16px] border" style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
        maxHeight: "calc(100vh - 48px)",
      }}>
        {/* Fixed header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-semibold tracking-tight" style={{ letterSpacing: "-0.015em" }}>
            {caption ? "Edit caption" : "New caption"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface-2)]" style={{ color: "var(--color-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 flex-1 min-h-0">
          <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 200px" }}>
            {/* Form */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Caption text</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="Enter your caption text..."
                  className="w-full px-3 py-2.5 rounded-[9px] border text-[13.5px] outline-none transition-all resize-none focus:border-[var(--color-accent)]"
                  style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
                />
              </div>

              {/* Group selector — multi-select chips */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Groups</label>
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g) => {
                    const selected = groupIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGroup(g.id)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-[5px] rounded-full border transition-all"
                        style={{
                          background: selected ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                          borderColor: selected ? "var(--color-accent)" : "var(--color-border-soft)",
                          color: selected ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                        }}
                      >
                        {selected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        )}
                        {g.name}
                        {selected && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 2 }}><path d="M18 6L6 18M6 6l12 12"/></svg>
                        )}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCreatingGroup(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-[5px] rounded-full border transition-all"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border-soft)",
                      color: "var(--color-muted)",
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    New
                  </button>
                </div>
                {creatingGroup && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name..."
                      className="flex-1 px-3 py-2 rounded-[9px] border text-[13px] outline-none focus:border-[var(--color-accent)]"
                      style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateGroup(); if (e.key === "Escape") { setCreatingGroup(false); setNewGroupName(""); } }}
                    />
                    <button
                      onClick={handleCreateGroup}
                      className="text-[12px] font-medium px-3 py-2 rounded-lg text-white"
                      style={{ background: "var(--color-accent)" }}
                    >Create</button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Position</label>
                <div className="flex gap-1.5">
                  {(["top", "center", "bottom"] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => { setCustomY(PRESET_Y[pos]); setCustomX(50); }}
                      className="text-xs px-3 py-[6px] rounded-[7px] font-medium border transition-all capitalize"
                      style={{
                        background: isPresetActive(pos) ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                        color: isPresetActive(pos) ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                        borderColor: isPresetActive(pos) ? "var(--color-accent)" : "transparent",
                      }}
                    >{pos}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Font</label>
                <div className="flex gap-1.5">
                  {([
                    { key: "tiktok" as const, label: "TikTok" },
                    { key: "instagram" as const, label: "Instagram" },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setCaptionFont(key)}
                      className="text-xs px-3 py-[6px] rounded-[7px] font-medium border transition-all"
                      style={{
                        background: captionFont === key ? "var(--color-accent-soft)" : "var(--color-surface-2)",
                        color: captionFont === key ? "var(--color-accent-hover)" : "var(--color-ink-2)",
                        borderColor: captionFont === key ? "var(--color-accent)" : "transparent",
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-medium mb-2.5" style={{ color: "var(--color-ink-2)" }}>
                  <span>Font size</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-accent-hover)" }}>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none"
                  style={{ background: "var(--color-surface-2)", accentColor: "var(--color-accent)" }}
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>Text color</label>
                <div className="flex items-center gap-2.5">
                  <label className="relative w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: "var(--color-border)", background: fontColor }}>
                    <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                  </label>
                  <span className="text-[12px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-muted)" }}>{fontColor}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--color-ink-2)" }}>Text stroke</label>
                  <button
                    onClick={() => setStrokeEnabled(!strokeEnabled)}
                    className="w-7 h-4 rounded-full transition-colors relative shrink-0"
                    style={{ background: strokeEnabled ? "var(--color-accent)" : "var(--color-surface-2)", border: "1px solid", borderColor: strokeEnabled ? "var(--color-accent)" : "var(--color-border)" }}
                  >
                    <span className="absolute top-[1.5px] w-[11px] h-[11px] rounded-full bg-white shadow-sm transition-all" style={{ left: strokeEnabled ? 12 : 2 }} />
                  </button>
                </div>
                {strokeEnabled && (
                  <div className="flex items-center gap-2.5">
                    <label className="relative w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: "var(--color-border)", background: strokeColor }}>
                      <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                    </label>
                    <span className="text-[12px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-muted)" }}>{strokeColor}</span>
                  </div>
                )}
              </div>

              {/* Spacer for breathing room */}
              <div className="h-1" />
            </div>

            {/* Live preview — draggable */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-ink-2)" }}>
                Preview
                <span className="font-normal ml-1" style={{ color: "var(--color-muted)", fontSize: "10px" }}>drag to move · corners to resize</span>
              </label>
              <div
                ref={previewRef}
                className="rounded-[10px] overflow-hidden relative select-none"
                style={{
                  aspectRatio: "9/16",
                  background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                  cursor: text ? (isResizing ? "ns-resize" : isDragging ? "grabbing" : "grab") : "default",
                  touchAction: "none",
                }}
                onPointerDown={text ? handlePointerDown : undefined}
                onPointerMove={(text ? handlePointerMove : undefined)}
                onPointerUp={(text ? handlePointerUp : undefined)}
              >
                {/* Snap guide lines */}
                {(isDragging || showGuides) && SNAP_POINTS.map((snap) => {
                  const isSnapped = Math.abs(customY - snap.y) < 1.5;
                  return (
                    <div
                      key={snap.y}
                      className="absolute left-0 right-0 pointer-events-none transition-all duration-150"
                      style={{
                        top: `${snap.y}%`,
                        height: isSnapped ? 1.5 : 0.5,
                        background: isSnapped
                          ? "rgba(139,127,255,0.9)"
                          : "rgba(255,255,255,0.12)",
                        boxShadow: isSnapped ? "0 0 6px rgba(139,127,255,0.5)" : "none",
                      }}
                    >
                      {/* Label */}
                      <span
                        className="absolute right-1 pointer-events-none transition-opacity duration-150"
                        style={{
                          top: -12,
                          fontSize: 7,
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          color: isSnapped ? "rgba(139,127,255,0.95)" : "rgba(255,255,255,0.25)",
                          opacity: isSnapped ? 1 : (isDragging ? 0.6 : 0),
                        }}
                      >
                        {snap.label}
                      </span>
                    </div>
                  );
                })}

                {/* Vertical center guide */}
                {(isDragging || showGuides) && (
                  <div
                    className="absolute top-0 bottom-0 left-1/2 pointer-events-none transition-all duration-150"
                    style={{
                      width: isXCentered ? 1.5 : 0.5,
                      background: isXCentered
                        ? "rgba(139,127,255,0.9)"
                        : "rgba(255,255,255,0.12)",
                      boxShadow: isXCentered ? "0 0 6px rgba(139,127,255,0.5)" : "none",
                      transform: "translateX(-50%)",
                    }}
                  />
                )}

                {/* Caption text with resize handles */}
                {text && (
                  <div
                    className="absolute text-center pointer-events-none"
                    style={{
                      top: `${customY}%`,
                      left: `${customX}%`,
                      transform: `translate(-50%, -50%) scale(${textScale})`,
                      transition: isDragging || isResizing ? "none" : "top 150ms, left 150ms, transform 150ms",
                    }}
                  >
                    {/* Bounding box */}
                    <div
                      className="relative"
                      style={{
                        border: "1px dashed rgba(139,127,255,0.45)",
                        borderRadius: 3,
                        padding: "3px 8px",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "170px",
                          fontSize: `${previewFontSize}px`,
                          fontFamily: captionFont === "tiktok"
                            ? "'TikTok Sans', system-ui, sans-serif"
                            : "'Helvetica Neue', 'Arial', system-ui, sans-serif",
                          fontWeight: 700,
                          color: fontColor,
                          WebkitTextStroke: strokeEnabled ? `${previewStrokeWidth}px ${strokeColor}` : undefined,
                          paintOrder: "stroke fill" as const,
                          lineHeight: 1.25,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {text}
                      </div>

                      {/* Resize handles — corners */}
                      {([
                        { top: -5, left: -5, cursor: "nwse-resize" },
                        { top: -5, right: -5, cursor: "nesw-resize" },
                        { bottom: -5, left: -5, cursor: "nesw-resize" },
                        { bottom: -5, right: -5, cursor: "nwse-resize" },
                      ] as const).map((pos, idx) => (
                        <div
                          key={idx}
                          className="absolute pointer-events-auto"
                          style={{
                            ...pos,
                            width: 9,
                            height: 9,
                            borderRadius: 2,
                            background: "var(--color-accent)",
                            border: "1.5px solid rgba(255,255,255,0.9)",
                            cursor: pos.cursor,
                          }}
                          onPointerDown={handleResizeDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        />
                      ))}
                    </div>

                    {/* Scale indicator */}
                    {isResizing && (
                      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{
                        bottom: -18,
                        fontSize: 8,
                        fontWeight: 600,
                        color: "rgba(139,127,255,0.9)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {Math.round(textScale * 100)}%
                      </div>
                    )}
                  </div>
                )}

                {/* Snapped label badge */}
                {snappedPoint && !isDragging && text && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: `${customY}%`,
                      left: `${customX}%`,
                      transform: "translate(-50%, 10px)",
                      fontSize: 7,
                      fontWeight: 600,
                      color: "rgba(139,127,255,0.7)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {snappedPoint.label}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0" style={{ borderColor: "var(--color-border-soft)" }}>
          <button onClick={onClose} className="text-[13px] font-medium px-4 py-2 rounded-lg border transition-all" style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-ink-2)",
          }}>Cancel</button>
          <button
            onClick={() => onSave({ text, position: getPosition(), font_size: Math.round(fontSize * textScale), font_color: fontColor, stroke_color: strokeEnabled ? strokeColor : "transparent", font_family: captionFont }, groupIds)}
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
