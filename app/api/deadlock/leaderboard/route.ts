import { NextRequest, NextResponse } from "next/server";
import { getDeadlockLeaderboard } from "@/lib/deadlock/service";
import type {
  DeadlockApiErrorPayload,
  DeadlockLeaderboardRegion,
  DeadlockLeaderboardResponse,
} from "@/lib/types/deadlock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REGIONS: DeadlockLeaderboardRegion[] = [
  "Europe",
  "Asia",
  "NAmerica",
  "SAmerica",
  "Oceania",
];

export async function GET(request: NextRequest) {
  const regionRaw = request.nextUrl.searchParams.get("region")?.trim() || "Europe";
  const limitRaw = request.nextUrl.searchParams.get("limit")?.trim() || "100";
  const heroIdRaw = request.nextUrl.searchParams.get("heroId")?.trim() || "";

  const region = REGIONS.find((value) => value === regionRaw);
  const limit = Number.parseInt(limitRaw, 10);
  const heroId = heroIdRaw ? Number.parseInt(heroIdRaw, 10) : null;

  if (!region) {
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "BAD_REQUEST",
        status: 400,
        error: "Paramètre `region` invalide.",
        details: `Valeurs autorisées: ${REGIONS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "BAD_REQUEST",
        status: 400,
        error: "Le paramètre `limit` doit être un entier entre 1 et 200.",
      },
      { status: 400 },
    );
  }

  if (heroIdRaw && (!Number.isFinite(heroId) || (heroId ?? 0) < 1)) {
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "BAD_REQUEST",
        status: 400,
        error: "Le paramètre `heroId` doit être un entier positif.",
      },
      { status: 400 },
    );
  }

  try {
    const payload = await getDeadlockLeaderboard({
      region,
      limit,
      heroId,
    });

    return NextResponse.json<DeadlockLeaderboardResponse>(payload, { status: 200 });
  } catch (error) {
    console.error("Unhandled deadlock leaderboard API error", error);
    return NextResponse.json<DeadlockApiErrorPayload>(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        status: 500,
        error: "Erreur interne lors du chargement du leaderboard Deadlock.",
      },
      { status: 500 },
    );
  }
}
