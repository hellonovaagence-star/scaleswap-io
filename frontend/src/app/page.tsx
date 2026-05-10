"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import SmoothScroll from "@/components/SmoothScroll";
import RevealSection from "@/components/RevealSection";
import StackedPanels from "@/components/ui/stacked-panels-cursor-intereactive-component";
import ScrollMorphHero from "@/components/ui/scroll-morph-hero";

function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left text-[15px] font-medium"
              style={{ color: "var(--color-ink)" }}
            >
              {item.q}
              <motion.svg
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="w-4 h-4 flex-shrink-0 ml-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </motion.svg>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <p className="pb-5 text-[14px] leading-relaxed pr-8" style={{ color: "var(--color-muted)" }}>
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  return (
    <SmoothScroll>
      {/* NAV */}
      <nav className="sticky top-0 z-50 transition-all duration-300" style={{
        background: "rgba(250,250,247,0.5)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
      }}>
        <div className="max-w-[1180px] mx-auto px-7 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 text-base" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
            <Image src="/scaleswap-logo.svg" alt="Scaleswap" width={22} height={22} />
            Scaleswap
          </div>
          <ul className="hidden md:flex gap-7 list-none">
            {[
              { label: "Product", href: "#top" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ].map((item) => (
              <li key={item.label}>
                <a href={item.href} className="text-sm font-[450] transition-colors duration-150" style={{ color: "var(--color-ink)" }}>{item.label}</a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2.5">
            <a href="https://discord.gg/t3ZjPbrFBY" target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-[9px] transition-all duration-150" style={{ color: "var(--color-ink-2)" }}>
              <Image src="/discord-logo.png" alt="Discord" width={16} height={16} style={{ opacity: 0.7 }} />
              Discord
            </a>
            <Link href="/projects" className="text-sm font-medium px-3.5 py-2 rounded-[9px] transition-all duration-150" style={{ color: "var(--color-ink-2)" }}>
              Sign in
            </Link>
            <Link href="/upload" className="text-sm font-medium px-3.5 py-2.5 rounded-[9px] text-white transition-all duration-150" style={{
              background: "var(--color-ink)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.1)",
            }}>
              Try for free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="top" className="pt-[88px] pb-[60px] text-center relative overflow-hidden">
        <div className="absolute -top-[200px] left-1/2 w-[900px] h-[600px] -translate-x-1/2 pointer-events-none z-0"
          style={{ background: "radial-gradient(closest-side, rgba(139,127,255,0.14), transparent 70%)" }}
        />
        <div className="relative z-10 max-w-[1180px] mx-auto px-7">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 text-xs font-medium px-3 py-1.5 rounded-full mb-7" style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink-2)",
            boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
          }}>
            <div className="flex -space-x-1.5">
              <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="" className="w-5 h-5 rounded-full ring-2 ring-white object-cover" />
              <img src="https://randomuser.me/api/portraits/men/45.jpg" alt="" className="w-5 h-5 rounded-full ring-2 ring-white object-cover" />
              <img src="https://randomuser.me/api/portraits/men/67.jpg" alt="" className="w-5 h-5 rounded-full ring-2 ring-white object-cover" />
              <img src="https://randomuser.me/api/portraits/men/22.jpg" alt="" className="w-5 h-5 rounded-full ring-2 ring-white object-cover" />
            </div>
            +1,000 users scale with Scaleswap
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-6 max-w-[920px]" style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 600,
            fontSize: "clamp(42px, 6.2vw, 76px)",
            lineHeight: 1.02,
            letterSpacing: "-0.035em",
          }}>
            Turn 1 reel into{" "}
            <em className="not-italic font-normal" style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              color: "var(--color-accent)",
              letterSpacing: "-0.015em",
            }}>100 unique</em>{" "}
            variants
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg mx-auto mb-9 max-w-[580px] font-normal" style={{
            color: "var(--color-muted)",
            lineHeight: 1.55,
          }}>
            Scaleswap generates <strong className="font-medium" style={{ color: "var(--color-ink-2)" }}>technically unique</strong> but visually identical variants of your reels. Full bypass of deduplication systems.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/upload" className="inline-flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-[10px] text-white transition-all duration-150 hover:-translate-y-0.5 mb-7" style={{
                background: "var(--color-accent)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(139,127,255,0.25)",
              }}>
                Get started free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4">
            {/* Rating bar */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    {s === 5 && <defs><linearGradient id="half"><stop offset="80%" stopColor="#F5A623" /><stop offset="80%" stopColor="transparent" /></linearGradient></defs>}
                    {s === 5 && <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#half)" />}
                  </svg>
                ))}
              </div>
              <span className="text-[13.5px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>4.8 / 5</span>
              <span className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>from 500+ reviews</span>
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <RevealSection direction={60} delay={0.1} className="mt-16 relative hidden lg:block">
            <div className="rounded-3xl p-2 relative overflow-hidden" style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 24px 60px -20px rgba(11,11,10,0.18), 0 8px 20px rgba(11,11,10,0.06)",
            }}>
              <div className="grid grid-cols-[220px_1fr] rounded-[18px] overflow-hidden" style={{ background: "var(--color-bg)", minHeight: 520 }}>
                {/* Mini Sidebar */}
                <div className="p-[18px_12px] flex flex-col gap-1" style={{
                  background: "var(--color-surface)",
                  borderRadius: "0 16px 16px 0",
                  boxShadow: "4px 0 16px -2px rgba(11,11,10,0.06), 1px 0 4px rgba(11,11,10,0.03)",
                  zIndex: 1,
                  position: "relative",
                }}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-4">
                    <div className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[11px] font-semibold" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-hover)" }}>S</div>
                    <span className="text-[13px]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>Scaleswap</span>
                  </div>
                  <div className="text-[11px] font-medium uppercase tracking-wider px-2 pt-2 pb-1" style={{ color: "var(--color-muted-2)" }}>Workspace</div>
                  {[
                    { name: "All reels", active: true, badge: "24" },
                    { name: "New project", active: false },
                    { name: "Templates", active: false, badge: "8" },
                    { name: "History", active: false },
                  ].map((item) => (
                    <div key={item.name} className={`flex items-center gap-2.5 px-2 py-[7px] rounded-[7px] text-[13.5px]`}
                      style={{
                        background: item.active ? "var(--color-surface-2)" : undefined,
                        color: item.active ? "var(--color-ink)" : "var(--color-ink-2)",
                        fontWeight: item.active ? 500 : 450,
                      }}
                    >
                      <span className="w-4 h-4 rounded" style={{ background: item.active ? "var(--color-accent-soft)" : "var(--color-surface-2)" }} />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto text-[11px] font-medium px-1.5 rounded" style={{
                          background: "var(--color-accent-soft)",
                          color: "var(--color-accent-hover)",
                        }}>{item.badge}</span>
                      )}
                    </div>
                  ))}
                  <div className="mt-auto pt-2.5 px-2 flex items-center gap-2.5" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
                    <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #FFB99A, #FF7E5F)" }}>KG</div>
                    <div>
                      <div className="text-[13px] font-medium leading-tight">Kylian G.</div>
                      <div className="text-[11.5px] leading-tight" style={{ color: "var(--color-muted)" }}>Plan Pro</div>
                    </div>
                  </div>
                </div>
                {/* Mini Main */}
                <div className="p-[24px_28px] overflow-hidden">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-[19px] font-semibold tracking-tight mb-1">All reels</h3>
                      <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>24 projects · 247 variations this month</p>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="px-2.5 py-1.5 rounded-lg text-xs" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>Export</span>
                      <span className="px-2.5 py-1.5 rounded-lg text-xs text-white" style={{ background: "var(--color-accent)" }}>+ New</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5 mb-6">
                    {[
                      { label: "Active projects", value: "24", delta: "↑ 3 this week" },
                      { label: "Variations", value: "247 / 500", delta: "↑ 18% vs last month" },
                      { label: "Storage", value: "4.2 GB", delta: "8.4% used" },
                      { label: "Time saved", value: "38h", delta: "~ 1h30/project" },
                    ].map((s) => (
                      <div key={s.label} className="p-3 rounded-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-soft)" }}>
                        <div className="text-[10.5px] font-medium mb-1" style={{ color: "var(--color-muted)" }}>{s.label}</div>
                        <div className="text-lg font-medium tracking-tight">{s.value}</div>
                        <div className="text-[10.5px] mt-1" style={{ color: "var(--color-green)" }}>{s.delta}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { title: "Gym motivation hook", count: "10 variations", color: "linear-gradient(145deg, #4A3F8E 0%, #8B7FFF 60%, #FFB99A 100%)" },
                      { title: "Nutrition tips", count: "6/15 in progress", color: "linear-gradient(170deg, #5A4FAA 0%, #9D93FF 55%, #FFC6A8 100%)" },
                      { title: "Morning routine v3", count: "8 variations", color: "linear-gradient(120deg, #3F3475 0%, #7B6FF0 55%, #FFAD8A 100%)" },
                    ].map((p) => (
                      <div key={p.title} className="rounded-xl p-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-soft)" }}>
                        <div className="rounded-lg h-24 mb-2" style={{ background: p.color }} />
                        <div className="text-[12.5px] font-medium px-1">{p.title}</div>
                        <div className="text-[11px] px-1" style={{ color: "var(--color-muted)" }}>{p.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* SCROLL MORPH */}
      <ScrollMorphHero />

      {/* FEATURES */}
      <section className="pt-40 pb-24" id="features">
        <div className="max-w-[1180px] mx-auto px-7">
          <RevealSection direction={50} className="mb-28">
            <div className="grid lg:grid-cols-[2fr_3fr] gap-10 items-center">
              <div>
                <h2 className="tracking-tight mb-5" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: "clamp(48px, 5.5vw, 72px)", letterSpacing: "-0.035em", lineHeight: 1.05 }}>
                  10+ layers of{" "}
                  <em className="not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>transformation</em>
                </h2>
                <p className="text-lg max-w-lg" style={{ color: "var(--color-muted)", lineHeight: 1.6 }}>
                  Each variant goes through a multi-layer pipeline that makes it unique at the binary level, while preserving visual quality.
                </p>
              </div>
              <div className="h-[520px] overflow-hidden">
                <StackedPanels />
              </div>
            </div>
          </RevealSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { icon: "01", title: "Binary", desc: "Header randomization & data chunk injection" },
              { icon: "02", title: "Metadata", desc: "Full scrubbing + fake device profiles" },
              { icon: "03", title: "Container", desc: "MP4 atom & moov repositioning" },
              { icon: "04", title: "Spatial", desc: "Sub-pixel shifting & micro-cropping" },
              { icon: "05", title: "Temporal", desc: "Frame trimming & 0.999x speed" },
              { icon: "06", title: "Color", desc: "Gamma & Luma curve alteration" },
              { icon: "07", title: "Codec", desc: "GOP & encoding profile variation" },
              { icon: "08", title: "Audio", desc: "Resampling & inaudible micro-noise" },
              { icon: "09", title: "Adversarial", desc: "Noise to break pHash calculations" },
              { icon: "10", title: "Quantization", desc: "Dynamic CRF per segment" },
            ].map((f, i) => (
              <RevealSection key={f.icon} direction={30} delay={i * 0.04}>
                <div className="group p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 h-full" style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border-soft)",
                }}>
                  <div className="text-[11px] font-bold mb-2 px-1.5 py-0.5 rounded w-fit" style={{
                    background: "var(--color-accent-soft)",
                    color: "var(--color-accent-hover)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{f.icon}</div>
                  <h3 className="text-[13px] font-semibold tracking-tight mb-1">{f.title}</h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>{f.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <RevealSection direction={50}>
        <section className="py-28 relative overflow-hidden">
          {/* Subtle background accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none" style={{
            background: "radial-gradient(ellipse, rgba(139,127,255,0.06) 0%, transparent 70%)",
          }} />

          <div className="max-w-[1180px] mx-auto px-7 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl tracking-tight mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
                From upload to post{" "}
                <em className="not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>in seconds</em>.
              </h2>
              <p className="text-base max-w-md mx-auto" style={{ color: "var(--color-muted)" }}>
                Four steps. Zero complexity. Infinite scale.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-5 mb-14 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-[52px] left-[12%] right-[12%] h-px" style={{
                background: "linear-gradient(90deg, transparent, var(--color-border), var(--color-accent-soft-2), var(--color-border), transparent)",
              }} />

              {[
                { step: "1", title: "Upload", desc: "Drop your reel — any format, any length. We handle the rest.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
                { step: "2", title: "Configure", desc: "Choose your layers, set the variant count, pick the intensity.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
                { step: "3", title: "Process", desc: "10 layers run in parallel in under 30 seconds. Full quality preserved.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
                { step: "4", title: "Export", desc: "Download as ZIP or push directly to your accounts. Done.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
              ].map((s, i) => (
                <RevealSection key={s.step} direction={40} delay={i * 0.1}>
                  <div className="group relative text-center">
                    {/* Step circle */}
                    <div className="relative mx-auto mb-6 w-[72px] h-[72px] rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg" style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      boxShadow: "0 2px 8px rgba(11,11,10,0.04)",
                    }}>
                      {/* Number badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{
                        background: "var(--color-accent)",
                        boxShadow: "0 2px 6px rgba(139,127,255,0.3)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{s.step}</div>
                      <div style={{ color: "var(--color-ink)" }}>{s.icon}</div>
                    </div>

                    <h3 className="text-base font-semibold tracking-tight mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.title}</h3>
                    <p className="text-[13px] leading-relaxed max-w-[220px] mx-auto" style={{ color: "var(--color-muted)" }}>{s.desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>

            <div className="text-center">
              <Link href="/upload" className="inline-flex items-center gap-2.5 text-sm font-medium px-7 py-3.5 rounded-xl text-white transition-all duration-150 hover:-translate-y-0.5" style={{
                background: "var(--color-accent)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(139,127,255,0.25)",
              }}>
                Get access
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </section>
      </RevealSection>


      {/* BEFORE / AFTER */}
      <RevealSection direction={50}>
        <section className="py-24">
          <div className="max-w-[1180px] mx-auto px-7">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider mb-4 px-3 py-1.5 rounded-full" style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent-hover)",
              }}>Why Scaleswap</span>
              <h2 className="text-3xl md:text-5xl tracking-tight mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
                Stop wasting time.{" "}
                <em className="not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>Start scaling</em>.
              </h2>
              <p className="text-base max-w-md mx-auto" style={{ color: "var(--color-muted)" }}>
                See the difference Scaleswap makes for content creators.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-[960px] mx-auto">
              {/* BEFORE */}
              <div className="relative rounded-[20px] overflow-hidden" style={{
                background: "linear-gradient(145deg, #FEFCFB 0%, #FFF5F2 100%)",
                border: "1px solid rgba(238,90,36,0.12)",
                boxShadow: "0 1px 3px rgba(238,90,36,0.04)",
              }}>
                {/* Header */}
                <div className="px-7 pt-7 pb-5">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(238,90,36,0.1)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E05A33" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </div>
                    <span className="text-[18px] font-semibold tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.03em" }}>Before</span>
                  </div>
                  <p className="text-[12.5px] ml-11" style={{ color: "var(--color-muted)" }}>The manual grind</p>
                </div>

                {/* Items */}
                <div className="px-5 pb-6 space-y-2">
                  {[
                    { metric: "4-5h", label: "per day", desc: "Editing & re-exporting variations manually" },
                    { metric: "~$800", label: "/month", desc: "Paying a freelancer just to duplicate content" },
                    { metric: "0h", label: "for strategy", desc: "No time left for high-impact growth tasks" },
                    { metric: "1-3", label: "accounts max", desc: "Capped by time — impossible to scale further" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3.5 rounded-[14px] transition-all" style={{
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(238,90,36,0.06)",
                    }}>
                      <div className="flex-shrink-0 text-right" style={{ minWidth: 56 }}>
                        <span className="text-[20px] font-bold tracking-tight leading-none" style={{ color: "#E05A33", fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.03em" }}>{item.metric}</span>
                        <div className="text-[10px] font-medium mt-0.5" style={{ color: "#E05A33", opacity: 0.6 }}>{item.label}</div>
                      </div>
                      <div className="w-px h-8 flex-shrink-0" style={{ background: "rgba(238,90,36,0.1)" }} />
                      <p className="text-[12.5px] leading-snug" style={{ color: "var(--color-ink-2)" }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AFTER */}
              <div className="relative rounded-[20px] overflow-hidden" style={{
                background: "linear-gradient(145deg, #FAFAFF 0%, #F3F1FF 100%)",
                border: "1px solid rgba(139,127,255,0.2)",
                boxShadow: "0 4px 24px -4px rgba(139,127,255,0.12), 0 1px 3px rgba(139,127,255,0.06)",
              }}>
                {/* Popular badge */}
                <div className="absolute top-5 right-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white" style={{
                    background: "var(--color-accent)",
                    boxShadow: "0 2px 8px rgba(139,127,255,0.3)",
                  }}>With Scaleswap</span>
                </div>

                {/* Header */}
                <div className="px-7 pt-7 pb-5">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-soft)", boxShadow: "0 0 0 3px rgba(139,127,255,0.08)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-[18px] font-semibold tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.03em" }}>After</span>
                  </div>
                  <p className="text-[12.5px] ml-11" style={{ color: "var(--color-accent-hover)" }}>The Scaleswap way</p>
                </div>

                {/* Items */}
                <div className="px-5 pb-6 space-y-2">
                  {[
                    { metric: "+5h", label: "saved / day", desc: "Generate all variants in under a minute" },
                    { metric: "$0", label: "/month", desc: "No freelancer needed — Scaleswap does it all" },
                    { metric: "100%", label: "your content", desc: "Full control from creation to distribution" },
                    { metric: "20+", label: "accounts", desc: "Unlimited unique variants, post everywhere" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3.5 rounded-[14px] transition-all" style={{
                      background: "rgba(255,255,255,0.8)",
                      border: "1px solid rgba(139,127,255,0.08)",
                    }}>
                      <div className="flex-shrink-0 text-right" style={{ minWidth: 56 }}>
                        <span className="text-[20px] font-bold tracking-tight leading-none" style={{ color: "var(--color-accent)", fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.03em" }}>{item.metric}</span>
                        <div className="text-[10px] font-medium mt-0.5" style={{ color: "var(--color-accent)", opacity: 0.6 }}>{item.label}</div>
                      </div>
                      <div className="w-px h-8 flex-shrink-0" style={{ background: "rgba(139,127,255,0.12)" }} />
                      <p className="text-[12.5px] leading-snug" style={{ color: "var(--color-ink-2)" }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* REVIEWS */}
      <RevealSection direction={50}>
        <section className="py-24" style={{ background: "var(--color-surface)" }}>
          <div className="max-w-[1180px] mx-auto px-7">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider mb-4 px-3 py-1.5 rounded-full" style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent-hover)",
              }}>Reviews</span>
              <h2 className="text-3xl md:text-5xl tracking-tight mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
                Loved by{" "}
                <em className="not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>creators</em>{" "}
                💜
              </h2>
              <p className="text-base max-w-md mx-auto" style={{ color: "var(--color-muted)" }}>
                See what our users have to say about scaling their content.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-[1000px] mx-auto">
              {[
                {
                  name: "Marc D.",
                  handle: "@marc.fitness",
                  avatar: "https://randomuser.me/api/portraits/men/75.jpg",
                  platform: "TikTok",
                  stars: 5,
                  text: "I went from posting on 1 account to running 22 accounts simultaneously. My organic reach exploded — all from the same content. Scaleswap is a no-brainer.",
                },
                {
                  name: "Sofia L.",
                  handle: "@sofiaa.style",
                  avatar: "https://randomuser.me/api/portraits/women/44.jpg",
                  platform: "Instagram",
                  stars: 5,
                  text: "I used to spend entire days re-editing reels for each account. Now I upload once and get 15 unique variants in seconds. I can finally focus on creating, not duplicating.",
                },
                {
                  name: "Jordan K.",
                  handle: "@jk.media",
                  avatar: "https://randomuser.me/api/portraits/men/32.jpg",
                  platform: "TikTok",
                  stars: 5,
                  text: "Our agency manages 30+ creator accounts. Scaleswap cut our editing costs by 80%. We cancelled our freelancer contract the same week we started using it.",
                },
                {
                  name: "Emma T.",
                  handle: "@emma.travels",
                  avatar: "https://randomuser.me/api/portraits/women/68.jpg",
                  platform: "Instagram",
                  stars: 5,
                  text: "The variants are literally indistinguishable from the original. I was skeptical at first, but zero of my posts have been flagged. It just works.",
                },
                {
                  name: "Nathan R.",
                  handle: "@nate.ecom",
                  avatar: "https://randomuser.me/api/portraits/men/52.jpg",
                  platform: "TikTok",
                  stars: 4,
                  text: "Went from 50K to 400K views per month across my accounts. The mirror effect and metadata stripping alone are worth it. Game changer for e-commerce creators.",
                },
                {
                  name: "Lea M.",
                  handle: "@lea.mindset",
                  avatar: "https://randomuser.me/api/portraits/women/29.jpg",
                  platform: "Threads",
                  stars: 5,
                  text: "I was paying $900/month for an editor to do what Scaleswap does in 30 seconds. Saved me time, money, and honestly — my sanity.",
                },
              ].map((review, i) => (
                <RevealSection key={i} direction={30} delay={i * 0.06}>
                  <div className="h-full p-5 rounded-2xl flex flex-col" style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border-soft)",
                  }}>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-4">
                      {Array.from({ length: review.stars }).map((_, s) => (
                        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>

                    {/* Text */}
                    <p className="text-[13.5px] leading-relaxed flex-1 mb-5" style={{ color: "var(--color-ink-2)" }}>
                      &ldquo;{review.text}&rdquo;
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
                      <img src={review.avatar} alt={review.name} className="w-9 h-9 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>{review.name}</div>
                        <div className="text-[11.5px] truncate" style={{ color: "var(--color-muted)" }}>{review.handle}</div>
                      </div>
                      <span className="text-[10.5px] font-medium px-2 py-1 rounded-md flex-shrink-0" style={{
                        background: "var(--color-surface-2)",
                        color: "var(--color-muted)",
                      }}>{review.platform}</span>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* PRICING */}
      <RevealSection direction={50}>
        <section className="py-24" id="pricing">
          <div className="max-w-[1180px] mx-auto px-7">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider mb-4 px-3 py-1.5 rounded-full" style={{
                background: "var(--color-accent-soft)",
                color: "var(--color-accent-hover)",
              }}>Pricing</span>
              <h2 className="text-3xl md:text-4xl tracking-tight mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
                Scaleswap is currently{" "}
                <em className="not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>free</em>.
              </h2>
              <p className="text-base" style={{ color: "var(--color-muted)" }}>Get full access at no cost — no credit card required.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-[960px] mx-auto">
              {/* Starter */}
              <div className="relative p-6 rounded-2xl flex flex-col" style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
              }}>
                <div className="text-sm font-semibold mb-4">Starter</div>
                <div className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--color-accent)" }}>Free</div>
                <div className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>forever</div>
                <p className="text-[13px] mb-6" style={{ color: "var(--color-muted)" }}>To test out and for small accounts getting started.</p>
                <Link href="/upload" className="text-center text-sm font-medium py-2.5 rounded-xl mb-6 transition-all duration-150 hover:-translate-y-0.5" style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink)",
                }}>Sign up for free</Link>
                <p className="text-[12px] mt-auto" style={{ color: "var(--color-muted-2)" }}>Features coming soon</p>
              </div>

              {/* Creator — Featured */}
              <div className="relative p-6 rounded-2xl flex flex-col text-white" style={{
                background: "var(--color-ink)",
                border: "1px solid var(--color-ink)",
                boxShadow: "0 24px 60px -20px rgba(11,11,10,0.3), 0 8px 20px rgba(11,11,10,0.1)",
              }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-sm font-semibold">Creator</div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                    background: "rgba(139,127,255,0.15)",
                    color: "#B8ADFF",
                  }}>Popular</span>
                </div>
                <div className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--color-accent)" }}>Free</div>
                <div className="text-xs mb-4" style={{ color: "#9A988F" }}>during early access</div>
                <p className="text-[13px] mb-6" style={{ color: "#B8B5AE" }}>For creators who post every day.</p>
                <Link href="/upload" className="text-center text-sm font-medium py-2.5 rounded-xl mb-6 text-white transition-all duration-150 hover:-translate-y-0.5" style={{
                  background: "var(--color-accent)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(139,127,255,0.25)",
                }}>Sign up for free</Link>
                <p className="text-[12px] mt-auto" style={{ color: "#6B6963" }}>Features coming soon</p>
              </div>

              {/* Studio */}
              <div className="relative p-6 rounded-2xl flex flex-col" style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 1px 2px rgba(11,11,10,0.04)",
              }}>
                <div className="text-sm font-semibold mb-4">Studio</div>
                <div className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--color-accent)" }}>Free</div>
                <div className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>during early access</div>
                <p className="text-[13px] mb-6" style={{ color: "var(--color-muted)" }}>For agencies and power users.</p>
                <Link href="/upload" className="text-center text-sm font-medium py-2.5 rounded-xl mb-6 transition-all duration-150 hover:-translate-y-0.5" style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink)",
                }}>Sign up for free</Link>
                <p className="text-[12px] mt-auto" style={{ color: "var(--color-muted-2)" }}>Features coming soon</p>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* FAQ */}
      <RevealSection direction={50}>
        <section className="py-24" id="faq">
          <div className="max-w-[680px] mx-auto px-7">
            <h2 className="text-3xl md:text-4xl tracking-tight mb-12 text-center" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
              Frequently asked{" "}
              <em className="not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>questions</em>
            </h2>
            <FaqAccordion items={[
              { q: "What does Scaleswap actually do?", a: "Scaleswap takes a single reel and generates multiple technically unique variants. Each variant passes through 10+ transformation layers that alter metadata, binary structure, encoding, and more — while keeping the video visually identical." },
              { q: "Will platforms detect the duplicates?", a: "No. Each variant has a unique pHash fingerprint (distance ≥ 10) and completely different metadata. Platforms see them as entirely separate, original uploads." },
              { q: "Is the visual quality affected?", a: "Not at all. We guarantee an SSIM score of 0.995+, meaning the variants are virtually indistinguishable from the original to the human eye." },
              { q: "How fast is the processing?", a: "Each variant is generated in under 30 seconds. All 10 transformation layers run in parallel for maximum speed." },
              { q: "Is Scaleswap really free?", a: "Yes — during early access, all features are completely free. No credit card required. We'll introduce plans later, but early users will keep their benefits." },
              { q: "What formats are supported?", a: "We support all major video formats including MP4, MOV, and WebM. Output is always optimized MP4 for maximum platform compatibility." },
            ]} />
          </div>
        </section>
      </RevealSection>

      {/* CTA */}
      <RevealSection direction={50}>
        <section className="py-32">
          <div className="max-w-[1180px] mx-auto px-7 text-center">
            <h2 className="text-5xl md:text-6xl tracking-tight mb-6" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
              Ready to{" "}
              <em className="not-italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", color: "var(--color-accent)" }}>scale</em>
              {" "}your content?
            </h2>
            <p className="text-lg max-w-lg mx-auto mb-10" style={{ color: "var(--color-muted)" }}>
              Get started for free. No credit card required.
            </p>
            <Link href="/upload" className="inline-flex items-center gap-2.5 text-base font-medium px-8 py-4 rounded-xl text-white transition-all duration-150 hover:-translate-y-0.5" style={{
              background: "var(--color-accent)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(139,127,255,0.25)",
            }}>
              Start for free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </section>
      </RevealSection>

      {/* FOOTER */}
      <footer className="pt-16 pb-10" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 text-sm mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
                <Image src="/scaleswap-logo.svg" alt="Scaleswap" width={20} height={20} />
                Scaleswap
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-2)" }}>
                Turn 1 reel into 100 unique variants. Bypass deduplication, scale your content.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-muted)" }}>Product</h4>
              <ul className="flex flex-col gap-2.5">
                <li><Link href="/upload" className="text-xs transition-colors hover:opacity-80" style={{ color: "var(--color-muted-2)" }}>Get Started</Link></li>
                <li><Link href="/#pricing" className="text-xs transition-colors hover:opacity-80" style={{ color: "var(--color-muted-2)" }}>Pricing</Link></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-muted)" }}>Community</h4>
              <a href="https://discord.gg/t3ZjPbrFBY" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-sm font-medium px-5 py-3 rounded-xl text-white transition-all duration-150 hover:-translate-y-0.5" style={{
                background: "var(--color-accent)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(139,127,255,0.25)",
              }}>
                <Image src="/discord-logo.png" alt="Discord" width={20} height={20} className="brightness-0 invert" />
                Join Discord
              </a>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-muted)" }}>Legal</h4>
              <ul className="flex flex-col gap-2.5">
                <li><Link href="/privacy" className="text-xs transition-colors hover:opacity-80" style={{ color: "var(--color-muted-2)" }}>Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-xs transition-colors hover:opacity-80" style={{ color: "var(--color-muted-2)" }}>Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
            <div className="text-xs" style={{ color: "var(--color-muted-2)" }}>
              &copy; 2026 Scaleswap. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </SmoothScroll>
  );
}
