"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";

interface PillTabsProps<T extends string> {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}

export default function PillTabs<T extends string>({ tabs, active, onChange }: PillTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = () => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`);
    if (!activeBtn) return;
    setIndicator({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  };

  useLayoutEffect(updateIndicator, [active]);
  useEffect(() => {
    // Recalculate on resize
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex p-[3px] rounded-full border"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
      }}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-[3px] h-[calc(100%-6px)] rounded-full"
        style={{
          left: indicator.left,
          width: indicator.width,
          background: "var(--color-ink)",
          transition: "left 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }}
      />
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          data-tab={key}
          onClick={() => onChange(key)}
          className="relative z-10 text-[12.5px] px-3.5 py-[5px] rounded-full font-medium transition-colors duration-200"
          style={{
            color: active === key ? "var(--color-bg)" : "var(--color-muted)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
