interface VariationCardProps {
  id: string;
  index: number;
  gradient: string;
  status: "valid" | "invalid" | "processing" | "pending";
  hash: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaType?: "video" | "image";
  selected?: boolean;
  onClick?: () => void;
}

export default function VariationCard({ index, gradient, status, hash, videoUrl, thumbnailUrl, mediaType = "video", selected, onClick }: VariationCardProps) {
  const dotColor =
    status === "valid" ? "var(--color-green)" :
    status === "processing" || status === "pending" ? "var(--color-amber)" :
    "var(--color-red)";

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-2.5 border transition-all duration-200 cursor-pointer relative hover:-translate-y-0.5"
      style={{
        background: "var(--color-surface)",
        borderColor: selected ? "var(--color-accent)" : "var(--color-border-soft)",
        boxShadow: selected ? "0 0 0 3px var(--color-accent-ring)" : undefined,
      }}
    >
      <div className="w-full rounded-lg relative overflow-hidden mb-2.5" style={{ aspectRatio: "9/13" }}>
        {videoUrl ? (
          mediaType === "image" ? (
            <img
              src={videoUrl}
              alt={`Variant ${index}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              src={`${videoUrl}#t=0.1`}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )
        ) : thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Variant ${index} thumbnail`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: gradient }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-[40%] -translate-y-1/2">
              <div className="border-l-[10px] border-t-[7px] border-b-[7px] border-l-white/85 border-t-transparent border-b-transparent" />
            </div>
          </>
        )}
        <span className="absolute top-[7px] right-[7px] text-[10px] font-semibold px-1.5 py-0.5 rounded backdrop-blur" style={{
          background: "rgba(255,255,255,0.92)",
          color: "#1a1a1a",
          letterSpacing: "0.02em",
        }}>V{String(index).padStart(2, "0")}</span>
      </div>
      <div className="flex items-center justify-between text-xs font-medium mb-0.5" style={{ color: "var(--color-ink-2)" }}>
        Variation {String(index).padStart(2, "0")}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status === "processing" || status === "pending" ? "animate-pulse-dot" : ""}`} style={{
          background: dotColor,
        }} />
      </div>
      <div className="text-[10.5px] tracking-tight" style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: "var(--color-muted-2)",
      }}>{hash}</div>
    </div>
  );
}
