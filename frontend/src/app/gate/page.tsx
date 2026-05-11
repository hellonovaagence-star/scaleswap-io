"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function GatePage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // Force light mode on the gate page
  useEffect(() => {
    const el = document.documentElement;
    const wasDark = el.classList.contains("dark");
    if (wasDark) el.classList.remove("dark");
    return () => {
      if (wasDark) el.classList.add("dark");
    };
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(false);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d !== "")) {
      submit(newCode.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setCode(newCode);
    if (pasted.length === 6) {
      submit(pasted);
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  }

  async function submit(value: string) {
    setLoading(true);
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: value }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setCode(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    }
    setLoading(false);
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px] pointer-events-none"
        style={{ background: "var(--color-accent)" }}
      />

      <div className="flex flex-col items-center gap-10 max-w-sm w-full relative z-10">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/scaleswap-logo.svg"
            alt="Scaleswap"
            width={52}
            height={52}
            priority
          />
          <div className="flex flex-col items-center gap-1">
            <h1
              className="text-[22px] font-semibold tracking-[-0.02em]"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Scaleswap
            </h1>
            <span
              className="text-[11px] font-medium uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-full"
              style={{
                color: "var(--color-accent)",
                background: "var(--color-accent-soft)",
              }}
            >
              Private Beta
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col items-center gap-6"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)",
          }}
        >
          <div className="text-center">
            <p
              className="text-[15px] font-medium"
              style={{ color: "var(--color-ink)" }}
            >
              Enter your access code
            </p>
            <p
              className="text-[13px] mt-1.5"
              style={{ color: "var(--color-muted)" }}
            >
              6-digit code required to continue
            </p>
          </div>

          {/* Code inputs */}
          <div
            className={`flex gap-2.5 ${shake ? "animate-shake" : ""}`}
            onPaste={handlePaste}
          >
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="w-[46px] h-[54px] text-center text-lg font-semibold rounded-xl outline-none transition-all duration-150 tabular-nums"
                style={{
                  background: error
                    ? "var(--color-red-soft)"
                    : "var(--color-surface-2)",
                  border: `1.5px solid ${error ? "var(--color-red)" : "transparent"}`,
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-mono)",
                  caretColor: "var(--color-accent)",
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.target.style.borderColor = "var(--color-accent)";
                    e.target.style.boxShadow =
                      "0 0 0 3px var(--color-accent-ring)";
                    e.target.style.background = "var(--color-surface)";
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error
                    ? "var(--color-red)"
                    : "transparent";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = error
                    ? "var(--color-red-soft)"
                    : "var(--color-surface-2)";
                }}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <p
              className="text-[13px] font-medium flex items-center gap-1.5"
              style={{ color: "var(--color-red)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7.25 5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zM8 11a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
              Invalid code. Please try again.
            </p>
          )}

          {loading && (
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
            />
          )}
        </div>

        {/* Footer hint */}
        <p
          className="text-[12px] text-center"
          style={{ color: "var(--color-muted-2)" }}
        >
          Don&apos;t have a code?{" "}
          <a
            href="mailto:hellonova.agence@gmail.com?subject=Scaleswap%20Access%20Request"
            className="underline underline-offset-2 transition-colors hover:opacity-80"
            style={{ color: "var(--color-muted)" }}
          >
            Request access
          </a>
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
