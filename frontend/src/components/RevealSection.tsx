"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

interface RevealSectionProps {
  children: React.ReactNode;
  direction?: number;
  delay?: number;
  className?: string;
}

export default function RevealSection({
  children,
  direction = 60,
  delay = 0,
  className,
}: RevealSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: direction }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: direction }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
