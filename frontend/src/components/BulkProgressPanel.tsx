"use client";

import Link from "next/link";
import type { QueueItem } from "@/hooks/useBulkQueue";

interface BulkProgressPanelProps {
  queue: QueueItem[];
  currentIndex: number;
  isRunning: boolean;
}

const statusConfig = {
  pending: {
    label: "Waiting",
    dotClass: "",
    dotStyle: { background: "var(--color-muted)" } as React.CSSProperties,
    labelStyle: { color: "var(--color-muted)" } as React.CSSProperties,
  },
  processing: {
    label: "Processing",
    dotClass: "animate-pulse",
    dotStyle: { background: "#F59E0B" } as React.CSSProperties,
    labelStyle: { color: "#F59E0B" } as React.CSSProperties,
  },
  ready: {
    label: "Done",
    dotClass: "",
    dotStyle: { background: "var(--color-green)" } as React.CSSProperties,
    labelStyle: { color: "var(--color-green)" } as React.CSSProperties,
  },
  error: {
    label: "Error",
    dotClass: "",
    dotStyle: { background: "var(--color-red)" } as React.CSSProperties,
    labelStyle: { color: "var(--color-red)" } as React.CSSProperties,
  },
};

export default function BulkProgressPanel({ queue, currentIndex, isRunning }: BulkProgressPanelProps) {
  const doneCount = queue.filter((q) => q.status === "ready" || q.status === "error").length;
  const progress = queue.length > 0 ? (doneCount / queue.length) * 100 : 0;
  const allDone = !isRunning && queue.length > 0 && doneCount === queue.length;

  return (
    <div className="rounded-[14px] border p-5" style={{
      background: "var(--color-surface)",
      borderColor: "var(--color-border-soft)",
    }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{
          background: allDone ? "var(--color-green-soft, rgba(34,197,94,0.1))" : "var(--color-accent-soft)",
          color: allDone ? "var(--color-green)" : "var(--color-accent)",
        }}>
          {allDone ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          )}
        </div>
        <div>
          <div className="text-[13.5px] font-medium" style={{ color: "var(--color-ink)" }}>
            {allDone ? "All projects completed" : `Processing ${currentIndex + 1} of ${queue.length}`}
          </div>
          <div className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            {doneCount} / {queue.length} done
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "var(--color-surface-2)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: allDone ? "var(--color-green)" : "linear-gradient(90deg, var(--color-accent), #B8ADFF)",
          }}
        />
      </div>

      {/* Queue list */}
      <div className="space-y-1.5">
        {queue.map((item, i) => {
          const config = statusConfig[item.status];
          return (
            <div key={item.projectId} className="flex items-center gap-3 px-3 py-2 rounded-[8px]" style={{
              background: i === currentIndex && isRunning ? "var(--color-surface-2)" : undefined,
            }}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} style={config.dotStyle} />
              <span className="text-[13px] font-medium flex-1 truncate" style={{ color: "var(--color-ink)" }}>
                {item.title}
              </span>
              <span className="text-[11px] font-medium shrink-0" style={config.labelStyle}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Done actions */}
      {allDone && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border-soft)" }}>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2.5 rounded-[10px] text-white"
            style={{
              background: "var(--color-accent)",
              boxShadow: "0 2px 8px rgba(139,127,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            View library
          </Link>
        </div>
      )}
    </div>
  );
}
