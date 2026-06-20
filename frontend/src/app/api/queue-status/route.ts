import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQueueStatus, forceResetQueue } from "@/lib/server-queue";

export const runtime = "nodejs";

/** GET /api/queue-status — check if the queue is stuck */
export async function GET() {
  return NextResponse.json(getQueueStatus());
}

/** POST /api/queue-status — force-reset the queue (auth required) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const before = getQueueStatus();
  const result = forceResetQueue();

  return NextResponse.json({
    ok: true,
    before,
    after: getQueueStatus(),
    cleared: result.cleared,
  });
}
