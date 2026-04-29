interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  deltaColor?: string;
  dotColor?: string;
}

export default function StatCard({ label, value, unit, delta, deltaColor, dotColor }: StatCardProps) {
  return (
    <div className="relative overflow-hidden p-4" style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border-soft)",
      borderRadius: 12,
    }}>
      <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{
          background: dotColor || "var(--color-accent)",
          boxShadow: `0 0 0 3px ${dotColor ? dotColor + "33" : "var(--color-accent-soft)"}`,
        }} />
        {label}
      </div>
      <div className="text-[28px] font-medium tracking-tight leading-none mt-1.5" style={{ letterSpacing: "-0.03em" }}>
        {value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color: "var(--color-muted)" }}>{unit}</span>}
      </div>
      <div className="text-[11.5px] font-medium mt-1.5 flex items-center gap-1" style={{ color: deltaColor || "var(--color-green)" }}>
        {delta}
      </div>
    </div>
  );
}
