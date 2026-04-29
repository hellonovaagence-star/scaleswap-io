"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { user, signOut } = useUser();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        else setDisplayName(user.email?.split("@")[0] || "");
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-[550] tracking-tight leading-tight" style={{ letterSpacing: "-0.025em" }}>
          <em className="not-italic font-normal" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>Settings</em>
        </h1>
        <p className="text-[13.5px] mt-1" style={{ color: "var(--color-muted)" }}>Manage your account and preferences</p>
      </div>

      <div className="max-w-[560px]">
        {/* Profile card */}
        <div className="rounded-[14px] border p-6" style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border-soft)",
        }}>
          <h3 className="text-[15px] font-semibold tracking-tight mb-1" style={{ letterSpacing: "-0.015em" }}>Profile</h3>
          <p className="text-[13px] mb-5" style={{ color: "var(--color-muted)" }}>Your account information</p>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium" style={{ color: "var(--color-ink-2)" }}>Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="px-3 py-2.5 rounded-lg border text-[13.5px] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-ring)]"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium" style={{ color: "var(--color-ink-2)" }}>Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="px-3 py-2.5 rounded-lg border text-[13.5px] outline-none opacity-60"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[13px] font-medium px-3.5 py-2 rounded-lg disabled:opacity-50"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-bg)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </button>
            <button
              onClick={signOut}
              className="text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors hover:bg-[var(--color-red-soft)]"
              style={{ color: "var(--color-red)" }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* Plan card */}
        <div className="rounded-[14px] border p-6 relative overflow-hidden mt-4" style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border-soft)",
        }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(circle at 85% 15%, rgba(139,127,255,0.12), transparent 50%)",
          }} />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-[3px] rounded-full mb-3" style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-accent-hover)",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
              Current plan
            </span>
            <h3 className="text-[22px] font-medium tracking-tight mb-0.5" style={{ letterSpacing: "-0.02em", color: "var(--color-ink)" }}>Free</h3>
            <p className="text-[13px] mb-5" style={{ color: "var(--color-muted)" }}>Early access — all features included</p>

            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--color-muted)" }}>
              <span>Credits used</span>
              <span className="font-medium" style={{ color: "var(--color-ink)" }}>000 / 000</span>
            </div>
            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
              <div className="h-full rounded-full" style={{ width: "0%", background: "linear-gradient(90deg, var(--color-accent), #B8ADFF)" }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
