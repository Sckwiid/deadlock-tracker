import {
  buildMockMetaSnapshot,
  buildMockPlayerProfile,
} from "@/lib/deadlock/mock";
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
  return buildMockPlayerProfile(params);
}

export async function getDeadlockMetaStats(): Promise<DeadlockMetaPayload> {
  return buildMockMetaSnapshot();
}
