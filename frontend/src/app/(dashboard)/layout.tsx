"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex flex-col overflow-hidden flex-1" style={{ background: "var(--color-bg)" }}>
        <Topbar />
        <main className="flex-1 overflow-y-auto" style={{ padding: "28px 32px 60px" }}>
          <div key={pathname} className="animate-page-fade">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
