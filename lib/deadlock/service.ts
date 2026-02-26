import {
  buildMockMetaSnapshot,
  buildMockPlayerProfile,
} from "@/lib/deadlock/mock";
import {
  buildLiveDeadlockMetaSnapshot,
  buildLiveDeadlockPlayerProfile,
} from "@/lib/deadlock/live";
import type {
  DeadlockMetaPayload,
  DeadlockPlayerProfilePayload,
} from "@/lib/types/deadlock";

export function isValidSteamId64(value: string) {
  return /^\d{17}$/.test(value);
}

export async function getDeadlockPlayerProfile(params: {
  steamId64: string;
  count: number;
}): Promise<DeadlockPlayerProfilePayload> {
  try {
    return await buildLiveDeadlockPlayerProfile(params);
  } catch (error) {
    console.error("Deadlock live player profile failed, falling back to mock", error);
    return buildMockPlayerProfile(params);
  }
}

export async function getDeadlockMetaStats(): Promise<DeadlockMetaPayload> {
  try {
    return await buildLiveDeadlockMetaSnapshot();
  } catch (error) {
    console.error("Deadlock live meta failed, falling back to mock", error);
    return buildMockMetaSnapshot();
  }
}
