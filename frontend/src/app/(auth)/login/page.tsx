"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/library");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-2">
        <svg viewBox="0 0 100 100" fill="none" width="30" height="30">
          <rect x="8" y="8" width="60" height="60" rx="14" fill="#B8ADFF" />
          <rect x="32" y="32" width="60" height="60" rx="14" fill="#8B7FFF" />
        </svg>
        <span
          className="text-[17px] font-semibold"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            letterSpacing: "-0.035em",
            color: "var(--color-ink)",
          }}
        >
          Scaleswap
        </span>
      </div>

      {/* Title */}
      <div>
        <h1
          className="text-[32px] font-semibold leading-tight"
          style={{ letterSpacing: "-0.03em", color: "var(--color-ink)" }}
        >
          Welcome{" "}
          <em
            className="not-italic font-normal"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              color: "var(--color-accent)",
            }}
          >
            back
          </em>
        </h1>
        <p className="text-[14px] mt-1.5" style={{ color: "var(--color-muted)" }}>
          Sign in to your account to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="text-[13px] font-medium mb-2 block" style={{ color: "var(--color-muted)" }}>
            Email address
          </label>
          <div
            className="rounded-2xl border transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_var(--color-accent-ring)]"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border)",
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="w-full bg-transparent text-[14px] px-4 py-3.5 rounded-2xl outline-none"
              style={{ color: "var(--color-ink)" }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-[13px] font-medium mb-2 block" style={{ color: "var(--color-muted)" }}>
            Password
          </label>
          <div
            className="rounded-2xl border transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_var(--color-accent-ring)]"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-transparent text-[14px] px-4 py-3.5 pr-12 rounded-2xl outline-none"
                style={{ color: "var(--color-ink)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" style={{ color: "var(--color-muted)" }} />
                ) : (
                  <Eye className="w-[18px] h-[18px]" style={{ color: "var(--color-muted)" }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Remember + Reset */}
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2.5 cursor-pointer" style={{ color: "var(--color-ink-2)" }}>
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-2 accent-[var(--color-accent)]"
              style={{ borderColor: "var(--color-border)" }}
            />
            Keep me signed in
          </label>
          <a href="#" className="font-medium transition-colors hover:underline" style={{ color: "var(--color-accent)" }}>
            Reset password
          </a>
        </div>

        {/* Error */}
        {error && (
          <div
            className="text-[13px] font-medium px-4 py-3 rounded-xl"
            style={{ background: "rgba(226,92,92,0.08)", color: "var(--color-red)" }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl py-3.5 text-[14px] font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
          style={{
            background: "var(--color-accent)",
            boxShadow: "0 2px 8px rgba(139,127,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-[13.5px]" style={{ color: "var(--color-muted)" }}>
        New to Scaleswap?{" "}
        <Link
          href="/signup"
          className="font-medium transition-colors hover:underline"
          style={{ color: "var(--color-accent)" }}
        >
          Create Account
        </Link>
      </p>
    </div>
  );
}
