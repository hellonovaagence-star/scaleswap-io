export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] flex font-sans" style={{ background: "var(--color-bg)" }}>
      {/* Left: Form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[440px]">{children}</div>
      </section>

      {/* Right: Visual panel */}
      <section className="hidden md:flex flex-1 relative p-4">
        <div
          className="w-full rounded-[24px] relative overflow-hidden flex flex-col items-center justify-end pb-12"
          style={{
            background: "linear-gradient(145deg, #1a1a2e 0%, #2d1b4e 40%, #4A3F8E 70%, #8B7FFF 100%)",
          }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(circle at 30% 20%, rgba(139,127,255,0.25), transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,185,154,0.15), transparent 50%)",
          }} />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          {/* Logo mark */}
          <div className="absolute top-10 left-10">
            <svg viewBox="0 0 100 100" fill="none" width="44" height="44">
              <rect x="8" y="8" width="60" height="60" rx="14" fill="rgba(184,173,255,0.35)" />
              <rect x="32" y="32" width="60" height="60" rx="14" fill="rgba(139,127,255,0.65)" />
            </svg>
          </div>

          {/* Center content */}
          <div className="relative z-10 text-center px-10 mb-8">
            <h2
              className="text-[32px] font-[500] tracking-tight leading-[1.15] text-white mb-3"
              style={{ letterSpacing: "-0.03em" }}
            >
              Scale your content,
              <br />
              <em
                className="not-italic font-normal"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "#B8ADFF" }}
              >
                effortlessly
              </em>
            </h2>
            <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Generate unique video variants that bypass platform fingerprinting. Upload once, publish everywhere.
            </p>
          </div>

          {/* Floating testimonial card */}
          <div
            className="relative z-10 rounded-[18px] p-5 mx-10 max-w-[340px]"
            style={{
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #FFB99A, #FF7E5F)" }}>
                AM
              </div>
              <div>
                <p className="text-[13px] font-medium text-white leading-tight">Alex Morgan</p>
                <p className="text-[11.5px] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Content Creator</p>
                <p className="text-[12.5px] leading-[1.5]" style={{ color: "rgba(255,255,255,0.65)" }}>
                  &ldquo;ScaleSwap saved me hours of work. I can now test 10+ variations of my content in minutes.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
