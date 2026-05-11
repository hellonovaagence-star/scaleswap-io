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

    // Fire ALL generation requests in parallel (non-blocking)
    const projectIds: string[] = [];
    const fireResults = await Promise.allSettled(
      items.map(async (item, idx) => {
        setQueue((prev) =>
          prev.map((q, i) => (i === idx ? { ...q, status: "processing" } : q))
        );
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.generatePayload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return item.projectId;
      })
    );

    // Mark failed fires as error, collect successful project IDs
    fireResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        projectIds.push(result.value);
      } else {
        setQueue((prev) =>
          prev.map((q, i) => (i === idx ? { ...q, status: "error" } : q))
        );
      }
    });

    // Unified polling — check ALL projects at once every 2s
    if (projectIds.length > 0) {
      const TIMEOUT = 12 * 60 * 1000;
      const POLL_INTERVAL = 2000;
      const startedAt = Date.now();
      const remaining = new Set(projectIds);

      while (remaining.size > 0 && Date.now() - startedAt < TIMEOUT) {
        if (abortRef.current) break;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const { data } = await supabase
          .from("projects")
          .select("id, status")
          .in("id", Array.from(remaining));

        if (data) {
          for (const row of data) {
            if (row.status !== "processing") {
              remaining.delete(row.id);
              const finalStatus = row.status === "ready" ? "ready" : "error";
              setQueue((prev) =>
                prev.map((q) =>
                  q.projectId === row.id ? { ...q, status: finalStatus } : q
                )
              );
            }
          }
        }
      }

      // Timeout remaining items as error
      if (remaining.size > 0) {
        setQueue((prev) =>
          prev.map((q) =>
            remaining.has(q.projectId) ? { ...q, status: "error" } : q
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
