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

function canFallbackToMock() {
  if (process.env.DEADLOCK_ALLOW_MOCK_FALLBACK === "true") {
    return true;
  }
  if (process.env.DEADLOCK_ALLOW_MOCK_FALLBACK === "false") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}

export async function getDeadlockPlayerProfile(params: {
  steamId64: string;
  count: number;
}): Promise<DeadlockPlayerProfilePayload> {
  try {
    return await buildLiveDeadlockPlayerProfile(params);
  } catch (error) {
    if (canFallbackToMock()) {
      console.error("Deadlock live player profile failed, falling back to mock", error);
      return buildMockPlayerProfile(params);
    }
    console.error("Deadlock live player profile failed (mock fallback disabled)", error);
    throw error;
  }
}

export async function getDeadlockMetaStats(): Promise<DeadlockMetaPayload> {
  try {
    return await buildLiveDeadlockMetaSnapshot();
  } catch (error) {
    if (canFallbackToMock()) {
      console.error("Deadlock live meta failed, falling back to mock", error);
      return buildMockMetaSnapshot();
    }
    console.error("Deadlock live meta failed (mock fallback disabled)", error);
    throw error;
  }
}
