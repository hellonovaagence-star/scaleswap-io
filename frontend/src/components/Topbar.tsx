"use client";

import { usePathname } from "next/navigation";

const breadcrumbs: Record<string, string> = {
  "/library": "Content library",
  "/upload": "New project",
  "/captions": "Caption list",
  "/settings": "Settings",
};

export default function Topbar() {
  const pathname = usePathname();
  const isDetail = pathname.startsWith("/library/");
  const current = isDetail ? "Project details" : breadcrumbs[pathname] || "Dashboard";

  return (
    <div className="flex items-center shrink-0" style={{
      padding: "14px 32px",
      borderBottom: "1px solid var(--color-border-soft)",
      background: "var(--color-bg)",
      height: 58,
    }}>
      <nav className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
        <a href="/library" className="hover:text-[var(--color-ink-2)] transition-colors">Peakly Studio</a>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--color-muted-2)" }}><path d="M9 18l6-6-6-6"/></svg>
        <span className="font-medium" style={{ color: "var(--color-ink)" }}>{current}</span>
      </nav>

      <div className="ml-auto">
        <a
          href="https://discord.gg/t3ZjPbrFBY"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[12.5px] font-medium px-3.5 py-[7px] rounded-[9px] text-white transition-all duration-150 hover:-translate-y-0.5"
          style={{
            background: "var(--color-accent)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(139,127,255,0.25)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/discord-logo.png" alt="Discord" width={16} height={16} className="brightness-0 invert" />
          Join Discord
        </a>
      </div>
    </div>
  );
}
