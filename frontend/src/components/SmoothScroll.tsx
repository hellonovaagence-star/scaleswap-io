"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      lerp: 0.1,
      duration: 1.2,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      autoRaf: true,
    });
    setLenis(instance);

    return () => instance.destroy();
  }, []);

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  );
}
