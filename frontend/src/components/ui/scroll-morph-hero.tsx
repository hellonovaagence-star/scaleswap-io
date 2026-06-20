"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useTransform, useSpring, useScroll, useMotionValue, useMotionValueEvent } from "motion/react";

// --- Types ---
export type AnimationPhase = "scatter" | "line" | "circle";

interface FlipCardProps {
    src: string;
    index: number;
    total: number;
    phase: AnimationPhase;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

// --- FlipCard Component ---
const IMG_WIDTH_DESKTOP = 60;
const IMG_HEIGHT_DESKTOP = 85;
const IMG_WIDTH_MOBILE = 44;
const IMG_HEIGHT_MOBILE = 62;

function FlipCard({ src, index, target, isMobile }: FlipCardProps & { isMobile?: boolean }) {
    const w = isMobile ? IMG_WIDTH_MOBILE : IMG_WIDTH_DESKTOP;
    const h = isMobile ? IMG_HEIGHT_MOBILE : IMG_HEIGHT_DESKTOP;
    return (
        <motion.div
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            transition={{ type: "spring", stiffness: 40, damping: 15 }}
            style={{
                position: "absolute",
                width: w,
                height: h,
                transformStyle: "preserve-3d",
                perspective: "1000px",
            }}
            className="cursor-pointer group"
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180 }}
            >
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-200"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <img src={src} alt={`hero-${index}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />
                </div>
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-900 flex flex-col items-center justify-center p-4 border border-gray-700"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <div className="text-center">
                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-1">View</p>
                        <p className="text-xs font-medium text-white">Details</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- Config ---
const TOTAL_IMAGES = 20;

const IMAGES = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=300&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80",
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=300&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&q=80",
    "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=300&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&q=80",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&q=80",
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300&q=80",
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=300&q=80",
    "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=300&q=80",
    "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=300&q=80",
];

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

// --- Sticky inner component (reads scroll progress) ---
function StickyScene({ scrollProgress }: { scrollProgress: import("motion/react").MotionValue<number> }) {
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const stickyRef = useRef<HTMLDivElement>(null);
    const introPhase: AnimationPhase = "circle";

    // Container size
    useEffect(() => {
        if (!stickyRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        observer.observe(stickyRef.current);
        setContainerSize({ width: stickyRef.current.offsetWidth, height: stickyRef.current.offsetHeight });
        return () => observer.disconnect();
    }, []);

    // Morph: 0→0.2 of scroll = circle → arc
    const morphProgress = useTransform(scrollProgress, [0, 0.2], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 60, damping: 20 });

    // Shuffle: 0.2→1 of scroll = rotate arc
    const scrollRotate = useTransform(scrollProgress, [0.2, 1], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 60, damping: 20 });

    // End fade: clear the cards + text out before the section releases so the
    // scroll experience ends clean instead of on a half-rotated arc.
    const endFade = useTransform(scrollProgress, [0.78, 0.94], [1, 0]);

    // Mouse parallax
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const el = stickyRef.current;
        if (!el) return;
        const handleMouseMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseX.set(normalizedX * 100);
        };
        el.addEventListener("mousemove", handleMouseMove);
        return () => el.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    // Use refs instead of state to avoid re-rendering at 60fps
    const morphRef = useRef(0);
    const rotateRef = useRef(0);
    const parallaxRef = useRef(0);
    const fadeRef = useRef(1);
    const [, forceRender] = useState(0);

    // Throttled update: only re-render when values change meaningfully
    const lastRenderTime = useRef(0);
    const rafId = useRef<number>(0);

    useEffect(() => {
        const update = () => {
            morphRef.current = smoothMorph.get();
            rotateRef.current = smoothScrollRotate.get();
            parallaxRef.current = smoothMouseX.get();
            fadeRef.current = endFade.get();

            const now = performance.now();
            if (now - lastRenderTime.current > 32) { // ~30fps max for card positions
                lastRenderTime.current = now;
                forceRender((v) => v + 1);
            }
            rafId.current = requestAnimationFrame(update);
        };
        rafId.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId.current);
    }, [smoothMorph, smoothScrollRotate, smoothMouseX, endFade]);

    const morphValue = morphRef.current;
    const rotateValue = rotateRef.current;
    const parallaxValue = parallaxRef.current;
    const fadeValue = fadeRef.current;

    const contentOpacity = useTransform([smoothMorph, endFade] as const, ([m, f]: number[]) => {
        const reveal = Math.max(0, Math.min(1, (m - 0.8) / 0.2));
        return reveal * f;
    });
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

    return (
        <div ref={stickyRef} className="sticky top-0 w-full h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
            <div className="flex h-full w-full flex-col items-center justify-center" style={{ perspective: "1000px" }}>
                {/* Intro Text */}
                <div className="absolute z-0 flex flex-col items-center justify-center text-center pointer-events-none top-1/2 -translate-y-1/2">
                    <motion.h1
                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        className="text-[22px] leading-[1.2] md:text-4xl px-6"
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em", color: "var(--color-ink)" }}
                    >
                        Your reels deserve to
                        <br />
                        exist more than once.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.5 - morphValue } : { opacity: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="mt-4 text-xs font-bold tracking-[0.2em]"
                        style={{ color: "var(--color-muted)" }}
                    >
                        SCROLL TO EXPLORE
                    </motion.p>
                </div>

                {/* Arc Content */}
                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[18%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4"
                >
                    <h2 className="text-3xl md:text-5xl tracking-tight mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em", color: "var(--color-ink)" }}>
                        Duplicate. Modify. Scale.
                    </h2>
                    <p className="text-sm md:text-base max-w-lg leading-relaxed" style={{ color: "var(--color-muted)" }}>
                        Clone your reels with altered metadata, unique fingerprints,{" "}
                        <br className="hidden md:block" />
                        and scale your content infinitely — undetected.
                    </p>
                </motion.div>

                {/* Cards */}
                <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
                    {(() => {
                        const isMobile = containerSize.width < 768;
                        const cardCount = isMobile ? 16 : TOTAL_IMAGES;
                        return IMAGES.slice(0, cardCount).map((src, i) => {
                        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

                        {
                            const minDimension = Math.min(containerSize.width, containerSize.height);
                            // Mobile: tighter ring (fits the portrait width) so the full circle
                            // is visible like on desktop, with the intro text centered inside it.
                            const circleRadius = Math.min(minDimension * (isMobile ? 0.42 : 0.35), 350);
                            const circleAngle = (i / cardCount) * 360;
                            const circleRad = (circleAngle * Math.PI) / 180;
                            const circlePos = {
                                x: Math.cos(circleRad) * circleRadius,
                                y: Math.sin(circleRad) * circleRadius,
                                rotation: circleAngle + 90,
                            };

                            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
                            // Mobile: smaller radius + apex near center keeps the arc on-screen
                            // instead of sweeping far below the fold as it rotates.
                            const arcRadius = baseRadius * (isMobile ? 0.55 : 1.1);
                            const arcApexY = containerSize.height * (isMobile ? -0.1 : 0.12);
                            const arcCenterY = arcApexY + arcRadius;
                            const spreadAngle = isMobile ? 110 : 130;
                            const startAngle = -90 - (spreadAngle / 2);
                            const step = spreadAngle / (cardCount - 1);

                            const scrollProgressVal = Math.min(Math.max(rotateValue / 360, 0), 1);
                            // Mobile: only a subtle shuffle — a big rotation turns the small arc
                            // lopsided and ugly before it fades out.
                            const maxRotation = spreadAngle * (isMobile ? 0.16 : 0.8);
                            const boundedRotation = -scrollProgressVal * maxRotation;

                            const currentArcAngle = startAngle + (i * step) + boundedRotation;
                            const arcRad = (currentArcAngle * Math.PI) / 180;

                            const arcPos = {
                                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                                rotation: currentArcAngle + 90,
                                scale: isMobile ? 1.0 : 1.8,
                            };

                            target = {
                                x: lerp(circlePos.x, arcPos.x, morphValue),
                                y: lerp(circlePos.y, arcPos.y, morphValue),
                                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                                scale: lerp(1, arcPos.scale, morphValue),
                                opacity: fadeValue,
                            };
                        }

                        return (
                            <FlipCard key={i} src={src} index={i} total={cardCount} phase={introPhase} target={target} isMobile={isMobile} />
                        );
                    });
                    })()}
                </div>
            </div>
        </div>
    );
}

// --- Mobile: a single fixed "screen" of the circle, no scroll choreography ---
function MobileCircleScene() {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        observer.observe(ref.current);
        setSize({ width: ref.current.offsetWidth, height: ref.current.offsetHeight });
        return () => observer.disconnect();
    }, []);

    const cardCount = 16;
    const minDimension = Math.min(size.width, size.height) || 375;
    const circleRadius = Math.min(minDimension * 0.42, 350);

    return (
        <div ref={ref} className="relative w-full overflow-hidden" style={{ height: "82vh", background: "var(--color-bg)" }}>
            {/* Center text */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                <h2 className="text-[22px] leading-[1.2]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em", color: "var(--color-ink)" }}>
                    Your reels deserve to
                    <br />
                    exist more than once.
                </h2>
            </div>

            {/* Static ring of cards */}
            <div className="absolute inset-0 flex items-center justify-center">
                {IMAGES.slice(0, cardCount).map((src, i) => {
                    const angle = (i / cardCount) * 360;
                    const rad = (angle * Math.PI) / 180;
                    const x = Math.cos(rad) * circleRadius;
                    const y = Math.sin(rad) * circleRadius;
                    const rotation = angle + 90;
                    return (
                        <div
                            key={i}
                            className="absolute overflow-hidden rounded-xl shadow-lg bg-gray-200"
                            style={{
                                width: IMG_WIDTH_MOBILE,
                                height: IMG_HEIGHT_MOBILE,
                                left: "50%",
                                top: "50%",
                                marginLeft: -IMG_WIDTH_MOBILE / 2,
                                marginTop: -IMG_HEIGHT_MOBILE / 2,
                                transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
                            }}
                        >
                            <img src={src} alt={`reel-${i}`} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/10" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- Outer wrapper: tall div that drives scroll progress (desktop) ---
export default function IntroAnimation() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start start", "end end"] });

    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // On phones the scroll-driven morph is replaced by a single fixed circle screen.
    if (isMobile) {
        return <MobileCircleScene />;
    }

    return (
        <div ref={wrapperRef} style={{ height: "500vh" }}>
            <StickyScene scrollProgress={scrollYProgress} />
        </div>
    );
}
