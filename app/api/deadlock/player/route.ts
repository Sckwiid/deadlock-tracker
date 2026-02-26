import { NextRequest, NextResponse } from "next/server";
import {
  getDeadlockPlayerProfile,
  isValidSteamId64,
} from "@/lib/deadlock/service";
import type {
  DeadlockApiErrorPayload,
  DeadlockPlayerLookupResponse,
} from "@/lib/types/deadlock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const steamId64 = request.nextUrl.searchParams.get("steamId64")?.trim() ?? "";
  const countRaw = request.nextUrl.searchParams.get("count")?.trim() ?? "20";
  const parsedCount = Number.parseInt(countRaw, 10);

  if (!steamId64) {
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "BAD_REQUEST",
        status: 400,
        error: "Paramètre `steamId64` requis.",
      },
      { status: 400 },
    );
  }

  if (!isValidSteamId64(steamId64)) {
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "INVALID_STEAM_ID64",
        status: 400,
        error: "Le SteamID64 doit contenir exactement 17 chiffres.",
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(parsedCount) || parsedCount < 1 || parsedCount > 50) {
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "INVALID_COUNT",
        status: 400,
        error: "Le paramètre `count` doit être un entier entre 1 et 50.",
      },
      { status: 400 },
    );
  }

  try {
    const payload = await getDeadlockPlayerProfile({
      steamId64,
      count: parsedCount,
    });

    return NextResponse.json<DeadlockPlayerLookupResponse>(payload, { status: 200 });
  } catch (error) {
    console.error("Unhandled deadlock player API error", error);
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        status: 500,
        error: "Erreur interne lors du chargement du profil Deadlock.",
      },
      { status: 500 },
    );
  }
}
