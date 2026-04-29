"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/hooks/useTheme";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    label: "New project",
    href: "/upload",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
    ),
  },
  {
    label: "Content library",
    href: "/library",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    ),
  },
  {
    label: "Caption list",
    href: "/captions",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/><rect x="1" y="3" width="22" height="18" rx="2"/></svg>
    ),
  },
];

const gradientColors = [
  "linear-gradient(145deg, #4A3F8E 0%, #8B7FFF 60%, #FFB99A 100%)",
  "linear-gradient(160deg, #2A3D5C 0%, #5B7FD1 55%, #A8CCFF 100%)",
  "linear-gradient(135deg, #5C3A4A 0%, #C77F92 55%, #FFC6A8 100%)",
  "linear-gradient(155deg, #3E5A4A 0%, #6FAF8A 55%, #D0E8B9 100%)",
  "linear-gradient(130deg, #8C4A2E 0%, #E6926F 55%, #FFDBA8 100%)",
];

interface RecentProject {
  id: string;
  title: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const isSettingsActive = pathname === "/settings";
  const { user, signOut } = useUser();
  const { theme, toggle: toggleTheme } = useTheme();

  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from("projects")
      .select("id, title", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data, count }) => {
        if (data) setRecentProjects(data.map((p) => ({ id: p.id, title: p.title || "Untitled" })));
        if (count != null) setProjectCount(count);
      });
  }, [user]);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className="flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-200 ease-in-out shrink-0 relative z-10"
      style={{
        width: collapsed ? 56 : 248,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border-soft)",
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        boxShadow: "8px 0 32px rgba(0,0,0,0.07), 3px 0 12px rgba(0,0,0,0.04)",
        padding: collapsed ? "14px 6px" : "14px 10px",
      }}
    >
      {/* Logo + hamburger toggle */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className="w-[26px] h-[26px] shrink-0">
            <svg viewBox="0 0 100 100" fill="none" width="26" height="26">
              <rect x="8" y="8" width="60" height="60" rx="14" fill="#B8ADFF"/>
              <rect x="32" y="32" width="60" height="60" rx="14" fill="#8B7FFF"/>
            </svg>
          </div>
          <button
            onClick={onToggle}
            className="flex flex-col justify-center items-center gap-[3.5px] w-7 h-7 rounded-[6px] transition-colors duration-150 hover:bg-[var(--color-surface-2)] cursor-pointer"
            style={{ color: "var(--color-muted-2)" }}
          >
            <span className="block w-3.5 h-[1.5px] rounded-full" style={{ background: "currentColor" }} />
            <span className="block w-3.5 h-[1.5px] rounded-full" style={{ background: "currentColor" }} />
            <span className="block w-3.5 h-[1.5px] rounded-full" style={{ background: "currentColor" }} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg mb-3">
          <div className="w-[26px] h-[26px] shrink-0">
            <svg viewBox="0 0 100 100" fill="none" width="26" height="26">
              <rect x="8" y="8" width="60" height="60" rx="14" fill="#B8ADFF"/>
              <rect x="32" y="32" width="60" height="60" rx="14" fill="#8B7FFF"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>Scaleswap</div>
            <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>Dashboard</div>
          </div>
          <button
            onClick={onToggle}
            className="ml-auto flex flex-col justify-center items-center gap-[3.5px] w-7 h-7 rounded-[6px] transition-colors duration-150 hover:bg-[var(--color-surface-2)] shrink-0 cursor-pointer"
            style={{ color: "var(--color-muted-2)" }}
          >
            <span className="block w-3.5 h-[1.5px] rounded-full" style={{ background: "currentColor" }} />
            <span className="block w-3.5 h-[1.5px] rounded-full" style={{ background: "currentColor" }} />
            <span className="block w-3.5 h-[1.5px] rounded-full" style={{ background: "currentColor" }} />
          </button>
        </div>
      )}

      {/* Nav group */}
      {!collapsed && (
        <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] px-2 pt-2.5 pb-1" style={{ color: "var(--color-muted-2)" }}>Workspace</div>
      )}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/library" && pathname.startsWith("/library"));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 rounded-[7px] text-[13.5px] cursor-pointer transition-colors duration-150 select-none hover:bg-[var(--color-surface-2)] ${collapsed ? "justify-center px-0 py-2" : "px-2 py-2"}`}
              style={{
                background: isActive ? "var(--color-surface-2)" : undefined,
                color: isActive ? "var(--color-ink)" : "var(--color-ink-2)",
                fontWeight: isActive ? 500 : 450,
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: isActive ? "var(--color-accent)" : "var(--color-muted)" }}>
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  {item.label}
                  {item.href === "/library" && projectCount > 0 && (
                    <span className="ml-auto text-[11px] font-medium px-1.5 rounded-[5px] border" style={{
                      background: isActive ? "var(--color-accent-soft)" : "var(--color-surface)",
                      color: isActive ? "var(--color-accent-hover)" : "var(--color-muted)",
                      borderColor: isActive ? "transparent" : "var(--color-border-soft)",
                    }}>{projectCount}</span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>

      {/* Recent projects */}
      {!collapsed && (
        <>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] px-2 pt-3 pb-1" style={{ color: "var(--color-muted-2)" }}>Recent projects</div>
          {recentProjects.length > 0 ? (
            <div className="flex flex-col gap-px">
              {recentProjects.map((proj, i) => (
                <Link key={proj.id} href={`/library/${proj.id}`}
                  className="flex items-center gap-2 py-[5px] px-2 pl-[30px] rounded-[6px] text-[13px] cursor-pointer transition-colors duration-150 hover:bg-[var(--color-surface-2)]"
                  style={{ color: "var(--color-muted)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: gradientColors[i % gradientColors.length] }} />
                  <span className="truncate">{proj.title}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-[12.5px] px-2 pl-[30px] py-1" style={{ color: "var(--color-muted)" }}>No projects</div>
          )}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Usage */}
      {!collapsed && (
        <div className="p-3 rounded-[10px] mb-2" style={{ background: "var(--color-surface-2)" }}>
          <div className="flex justify-between items-center text-xs font-medium mb-1.5" style={{ color: "var(--color-ink-2)" }}>
            <span>Credits used</span>
            <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>24 / 50</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
            <div className="h-full rounded-full" style={{ width: "48%", background: "linear-gradient(90deg, var(--color-accent), #B8ADFF)" }} />
          </div>
          <a href="#" className="block text-[11.5px] font-medium mt-2" style={{ color: "var(--color-accent-hover)" }}>Upgrade to Studio →</a>
        </div>
      )}

      {/* Settings + Theme toggle */}
      <div className="flex flex-col gap-1 mt-2">
        <Link href="/settings"
          className={`flex items-center gap-2.5 rounded-[7px] text-[13.5px] cursor-pointer transition-colors duration-150 select-none hover:bg-[var(--color-surface-2)] ${collapsed ? "justify-center px-0 py-2" : "px-2 py-2"}`}
          style={{
            background: isSettingsActive ? "var(--color-surface-2)" : undefined,
            color: isSettingsActive ? "var(--color-ink)" : "var(--color-ink-2)",
            fontWeight: isSettingsActive ? 500 : 450,
          }}
          title={collapsed ? "Settings" : undefined}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: isSettingsActive ? "var(--color-accent)" : "var(--color-muted)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </span>
          {!collapsed && "Settings"}
        </Link>

        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2.5 rounded-[7px] text-[13.5px] cursor-pointer transition-colors duration-150 select-none hover:bg-[var(--color-surface-2)] ${collapsed ? "justify-center px-0 py-2" : "px-2 py-2"}`}
          style={{ color: "var(--color-ink-2)", fontWeight: 450 }}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: "var(--color-muted)" }}>
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </span>
          {!collapsed && (theme === "dark" ? "Light mode" : "Dark mode")}
        </button>
      </div>

      {/* Footer user + sign out */}
      <div className={`pt-2.5 px-2 border-t flex items-center gap-2.5 mt-2 ${collapsed ? "justify-center px-0" : ""}`} style={{ borderColor: "var(--color-border-soft)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, #FFB99A, #FF7E5F)" }}>
          {initials || "?"}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium leading-tight truncate">{displayName}</div>
              <div className="text-[11.5px] leading-tight truncate" style={{ color: "var(--color-muted)" }}>{displayEmail}</div>
            </div>
            <button
              onClick={signOut}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--color-surface-2)] shrink-0"
              style={{ color: "var(--color-muted)" }}
              title="Sign out"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
