/**
 * Server-side semaphore to limit concurrent project generations.
 * Requests beyond MAX_CONCURRENT wait in-memory (no HTTP timeout — the
 * request stays alive while awaiting its slot).
 *
 * Safety:
 *  - Slots auto-release after SLOT_TIMEOUT to prevent deadlocks
 *  - Queue capped at MAX_QUEUE_LENGTH to prevent memory/PID exhaustion
 */

const MAX_CONCURRENT = 1;
const MAX_QUEUE_LENGTH = 5; // Reject beyond this — prevents 23+ requests piling up
const SLOT_TIMEOUT = 10 * 60 * 1000; // 10 minutes max per generation
let running = 0;
const waiting: (() => void)[] = [];
let slotTimer: ReturnType<typeof setTimeout> | null = null;

export class QueueFullError extends Error {
  constructor(queueLength: number) {
    super(`Queue full (${queueLength}/${MAX_QUEUE_LENGTH} waiting). Try again later.`);
    this.name = "QueueFullError";
  }
}

export async function acquireSlot(): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running++;
    startSlotTimer();
    console.log(`[queue] Slot acquired (${running}/${MAX_CONCURRENT})`);
    return;
  }
  if (waiting.length >= MAX_QUEUE_LENGTH) {
    console.warn(`[queue] Queue full (${waiting.length}/${MAX_QUEUE_LENGTH}), rejecting request`);
    throw new QueueFullError(waiting.length);
  }
  console.log(`[queue] All slots busy (${running}/${MAX_CONCURRENT}), waiting... (${waiting.length + 1} in queue)`);
  await new Promise<void>((resolve) => waiting.push(resolve));
  startSlotTimer();
  console.log(`[queue] Slot acquired after wait (${running}/${MAX_CONCURRENT})`);
}

export function releaseSlot(): void {
  clearSlotTimer();
  if (waiting.length > 0) {
    // Hand slot directly to next waiter (running count stays the same)
    waiting.shift()!();
  } else {
    running--;
  }
  console.log(`[queue] Slot released (${running}/${MAX_CONCURRENT}, ${waiting.length} waiting)`);
}

function startSlotTimer(): void {
  clearSlotTimer();
  slotTimer = setTimeout(() => {
    console.error(`[queue] ⚠ Slot timed out after ${SLOT_TIMEOUT / 1000}s — force-releasing to prevent deadlock`);
    releaseSlot();
  }, SLOT_TIMEOUT);
}

function clearSlotTimer(): void {
  if (slotTimer) {
    clearTimeout(slotTimer);
    slotTimer = null;
  }
}
