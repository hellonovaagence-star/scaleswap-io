/**
 * Server-side semaphore to limit concurrent project generations.
 * Requests beyond MAX_CONCURRENT wait in-memory (no HTTP timeout — the
 * request stays alive while awaiting its slot).
 */

const MAX_CONCURRENT = 1;
let running = 0;
const waiting: (() => void)[] = [];

export async function acquireSlot(): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running++;
    console.log(`[queue] Slot acquired (${running}/${MAX_CONCURRENT})`);
    return;
  }
  console.log(`[queue] All slots busy (${running}/${MAX_CONCURRENT}), waiting... (${waiting.length + 1} in queue)`);
  await new Promise<void>((resolve) => waiting.push(resolve));
  console.log(`[queue] Slot acquired after wait (${running}/${MAX_CONCURRENT})`);
}

export function releaseSlot(): void {
  if (waiting.length > 0) {
    // Hand slot directly to next waiter (running count stays the same)
    waiting.shift()!();
  } else {
    running--;
  }
  console.log(`[queue] Slot released (${running}/${MAX_CONCURRENT}, ${waiting.length} waiting)`);
}
