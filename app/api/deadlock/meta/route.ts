import { NextResponse } from "next/server";
import { getDeadlockMetaStats } from "@/lib/deadlock/service";
import type {
  DeadlockApiErrorPayload,
  DeadlockMetaResponse,
} from "@/lib/types/deadlock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await getDeadlockMetaStats();
    return NextResponse.json<DeadlockMetaResponse>(payload, { status: 200 });
  } catch (error) {
    console.error("Unhandled deadlock meta API error", error);
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        status: 500,
        error: "Erreur interne lors du calcul de la méta Deadlock.",
      },
      { status: 500 },
    );
  }
}
