"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  const queueRef = useRef<QueueItem[]>([]);

  // Keep ref in sync with state so startQueue always reads the latest queue
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const addToQueue = useCallback((item: Omit<QueueItem, "status">) => {
    setQueue((prev) => [...prev, { ...item, status: "pending" }]);
  }, []);

  const startQueue = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    abortRef.current = false;
    const supabase = createClient();

    const items = queueRef.current;
    const CONCURRENCY = 2; // max 2 projects processing at once (2×2 FFmpeg = 4 processes)

    let nextToFire = 0;
    const inFlight = new Set<string>();
    const done = new Set<string>();

    const fireProject = (idx: number) => {
      const item = items[idx];
      inFlight.add(item.projectId);
      setQueue((prev) =>
        prev.map((q, i) => (i === idx ? { ...q, status: "processing" } : q))
      );
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.generatePayload),
      }).catch((err) => {
        console.error(`[bulk] Fire failed for ${item.projectId}:`, err);
      });
    };

    // Fire initial batch
    while (nextToFire < items.length && inFlight.size < CONCURRENCY) {
      fireProject(nextToFire++);
    }

    // Poll DB and auto-fill slots as projects complete
    const TIMEOUT = 20 * 60 * 1000; // 20 minutes
    const POLL_INTERVAL = 3000;
    const startedAt = Date.now();

    while (done.size < items.length && Date.now() - startedAt < TIMEOUT) {
      if (abortRef.current) break;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      // Poll all non-done projects
      const checkIds = items
        .filter((it) => !done.has(it.projectId))
        .map((it) => it.projectId);
      if (checkIds.length === 0) break;

      const { data } = await supabase
        .from("projects")
        .select("id, status")
        .in("id", checkIds);

      if (data) {
        for (const row of data) {
          if (row.status !== "processing" && !done.has(row.id)) {
            done.add(row.id);
            inFlight.delete(row.id);

            const finalStatus = row.status === "ready" ? "ready" : "error";
            setQueue((prev) =>
              prev.map((q) =>
                q.projectId === row.id ? { ...q, status: finalStatus } : q
              )
            );

            // Auto-fill: fire next project to keep pipeline full
            if (nextToFire < items.length) {
              fireProject(nextToFire++);
            }
          }
        }
      }
    }

    // Timeout remaining items as error
    for (const item of items) {
      if (!done.has(item.projectId)) {
        setQueue((prev) =>
          prev.map((q) =>
            q.projectId === item.projectId ? { ...q, status: "error" } : q
          )
        );
      }
    }

    setCurrentIndex(items.length - 1);
    setIsRunning(false);
  }, [isRunning]);

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
