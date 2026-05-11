"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface QueueItem {
  projectId: string;
  title: string;
  status: "pending" | "processing" | "ready" | "error";
  sourceUrl: string;
  generatePayload: Record<string, unknown>;
}

export function useBulkQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

  const addToQueue = useCallback((item: Omit<QueueItem, "status">) => {
    setQueue((prev) => [...prev, { ...item, status: "pending" }]);
  }, []);

  const startQueue = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    abortRef.current = false;
    const supabase = createClient();

    for (let i = 0; i < queue.length; i++) {
      if (abortRef.current) break;
      setCurrentIndex(i);
      const item = queue[i];

      // Mark processing
      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: "processing" } : q))
      );

      // Fire generation
      try {
        await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.generatePayload),
        });
      } catch {
        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "error" } : q))
        );
        continue;
      }

      // Poll until status != "processing" (max 12 min)
      const TIMEOUT = 12 * 60 * 1000;
      const POLL_INTERVAL = 2000;
      const startedAt = Date.now();
      let finalStatus: "ready" | "error" = "error";

      while (Date.now() - startedAt < TIMEOUT) {
        if (abortRef.current) break;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const { data } = await supabase
          .from("projects")
          .select("status")
          .eq("id", item.projectId)
          .single();

        if (data && data.status !== "processing") {
          finalStatus = data.status === "ready" ? "ready" : "error";
          break;
        }
      }

      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: finalStatus } : q))
      );
    }

    setIsRunning(false);
  }, [isRunning, queue]);

  const completedCount = queue.filter((q) => q.status === "ready").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return {
    queue,
    currentIndex,
    isRunning,
    addToQueue,
    startQueue,
    completedCount,
    errorCount,
    setQueue,
  };
}
