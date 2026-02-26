export type DeadlockDataSource = "mock" | "database" | "live_api";
export type MatchOutcome = "WIN" | "LOSS";

export interface DeadlockPlayerIdentity {
  steamId64: string;
  personaName: string;
  region: string;
  accountLevel: number | null;
  totalPlaytimeSeconds: number;
  rankTier: string | null;
  hiddenMmr: number | null;
  profileSeed: string;
  avatarUrl?: string | null;
  rankBadgeIconUrl?: string | null;
}

export interface DeadlockPlayerAggregates {
  totalMatches: number;
  wins: number;
  losses: number;
  winrate: number;
  averageKdaRatio: number;
  averageKdaPerMinute: number;
  averageSpm: number;
  totalSouls: number;
  totalHeroDamage: number;
  totalObjectiveDamage: number;
  totalHealing: number;
  favoriteHero: string | null;
  lastMatchAt: string | null;
}

export interface DeadlockKdaStats {
  kills: number;
  deaths: number;
  assists: number;
  ratio: number;
  perMinute: number;
}

export interface DeadlockSoulBreakdown {
  creeps: number;
  players: number;
  objectives: number;
  other: number;
}

export interface DeadlockEconomyStats {
  totalSouls: number;
  soulsPerMinute: number;
  breakdown: DeadlockSoulBreakdown;
}

export interface DeadlockCombatStats {
  playerDamage: number;
  objectiveDamage: number;
  healing: number;
}

export interface DeadlockItemPurchase {
  order: number;
  itemName: string;
  tier: number;
  cost: number;
  atSecond: number;
  iconUrl?: string | null;
}

export interface DeadlockSkillUpgrade {
  order: number;
  ability: string;
  levelAfter: number;
  atSecond: number;
}

export interface DeadlockMatchDetail {
  matchId: string;
  hero: string;
  heroIconUrl?: string | null;
  result: MatchOutcome;
  mode: "Quickplay" | "Ranked" | "Custom";
  patchVersion: string;
  startedAt: string;
  durationSeconds: number;
  kda: DeadlockKdaStats;
  economy: DeadlockEconomyStats;
  combat: DeadlockCombatStats;
  build: {
    items: DeadlockItemPurchase[];
    skills: DeadlockSkillUpgrade[];
  };
}

export interface DeadlockPlayerProfilePayload {
  ok: true;
  source: DeadlockDataSource;
  fetchedAt: string;
  player: DeadlockPlayerIdentity;
  aggregates: DeadlockPlayerAggregates;
  matches: DeadlockMatchDetail[];
  notes: string[];
}

export interface DeadlockHeroMetaStat {
  hero: string;
  heroIconUrl?: string | null;
  picks: number;
  wins: number;
  matches: number;
  pickRate: number;
  winRate: number;
  banRate: number | null;
}

export interface DeadlockItemMetaStat {
  hero: string;
  heroIconUrl?: string | null;
  item: string;
  itemIconUrl?: string | null;
  sampleSize: number;
  winRate: number;
  avgPurchaseOrder: number;
}

export interface DeadlockMetaPayload {
  ok: true;
  source: DeadlockDataSource;
  fetchedAt: string;
  patchLabel: string;
  populationPlayers: number;
  populationMatches: number;
  heroStats: DeadlockHeroMetaStat[];
  itemStats: DeadlockItemMetaStat[];
  notes: string[];
}

export type DeadlockLeaderboardRegion =
  | "Europe"
  | "Asia"
  | "NAmerica"
  | "SAmerica"
  | "Oceania";

export interface DeadlockLeaderboardHeroRef {
  heroId: number;
  hero: string;
  heroIconUrl?: string | null;
}

export interface DeadlockLeaderboardEntry {
  position: number;
  accountName: string;
  primaryAccountId: number | null;
  steamId64: string | null;
  badgeLevel: number | null;
  rankLabel: string | null;
  rankBadgeIconUrl?: string | null;
  topHeroes: DeadlockLeaderboardHeroRef[];
}

export interface DeadlockLeaderboardPayload {
  ok: true;
  source: DeadlockDataSource;
  fetchedAt: string;
  region: DeadlockLeaderboardRegion;
  totalEntries: number;
  entries: DeadlockLeaderboardEntry[];
  notes: string[];
}

export interface DeadlockApiErrorPayload {
  ok: false;
  code:
    | "INVALID_STEAM_ID64"
    | "NOT_FOUND"
    | "INTERNAL_ERROR"
    | "INVALID_COUNT"
    | "BAD_REQUEST";
  status: number;
  error: string;
  details?: string;
}

export type DeadlockPlayerLookupResponse =
  | DeadlockPlayerProfilePayload
  | DeadlockApiErrorPayload;

export type DeadlockMetaResponse = DeadlockMetaPayload | DeadlockApiErrorPayload;
export type DeadlockLeaderboardResponse =
  | DeadlockLeaderboardPayload
  | DeadlockApiErrorPayload;
