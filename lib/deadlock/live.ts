import type {
  DeadlockCombatStats,
  DeadlockHeroMetaStat,
  DeadlockItemMetaStat,
  DeadlockMatchDetail,
  DeadlockMetaPayload,
  DeadlockPlayerProfilePayload,
  DeadlockSkillUpgrade,
} from "@/lib/types/deadlock";

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

type SteamProfileApi = {
  account_id?: number;
  personaname?: string;
  countrycode?: string | null;
  avatar?: string;
  avatarmedium?: string;
  avatarfull?: string;
};

type PlayerMatchHistoryEntryApi = {
  account_id?: number;
  match_id?: number;
  hero_id?: number;
  start_time?: number;
  game_mode?: number;
  match_mode?: number;
  player_team?: number;
  player_kills?: number;
  player_deaths?: number;
  player_assists?: number;
  net_worth?: number;
  last_hits?: number;
  denies?: number;
  hero_level?: number;
  match_duration_s?: number;
  match_result?: number;
  brawl_score_team0?: number | null;
  brawl_score_team1?: number | null;
};

type MmrHistoryApi = {
  account_id?: number;
  match_id?: number;
  start_time?: number;
  player_score?: number;
  rank?: number;
  division?: number;
  division_tier?: number;
};

type PlayerCardApi = {
  account_id?: number;
  ranked_badge_level?: number | null;
  ranked_rank?: number | null;
  ranked_subrank?: number | null;
};

type PlayerHeroStatsApi = {
  account_id?: number;
  hero_id?: number;
  matches_played?: number;
  time_played?: number;
  wins?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  kills_per_min?: number;
  deaths_per_min?: number;
  assists_per_min?: number;
  networth_per_min?: number;
  damage_per_min?: number;
  obj_damage_per_min?: number;
  matches?: number[];
};

type ItemStatsApi = {
  item_id?: number;
  bucket?: number;
  wins?: number;
  losses?: number;
  matches?: number;
  players?: number;
  avg_buy_time_s?: number;
  avg_sell_time_s?: number;
  avg_buy_time_relative?: number;
  avg_sell_time_relative?: number;
};

type AbilityOrderStatsApi = {
  abilities?: number[];
  wins?: number;
  losses?: number;
  matches?: number;
  players?: number;
};

type AnalyticsHeroStatsApi = {
  hero_id?: number;
  bucket?: number;
  wins?: number;
  losses?: number;
  matches?: number;
  matches_per_bucket?: number;
  players?: number;
  total_player_damage?: number;
  total_net_worth?: number;
};

type MetricsBucketApi = {
  avg?: number;
  std?: number;
  percentile1?: number;
  percentile5?: number;
  percentile10?: number;
  percentile25?: number;
  percentile50?: number;
  percentile75?: number;
  percentile90?: number;
  percentile95?: number;
  percentile99?: number;
};

type MetricsMapApi = Record<string, MetricsBucketApi>;

type PatchApi = {
  title?: string;
  pub_date?: string;
};

type RankAssetApi = {
  badge_level?: number;
  rank?: number;
  id?: number;
  level?: number;
  [key: string]: unknown;
};

type HeroCatalogRecord = {
  id: number;
  name: string;
  abilities: Map<number, string>;
  iconUrl: string | null;
};

type ItemCatalogRecord = {
  id: number;
  name: string;
  cost: number;
  tier: number;
  iconUrl: string | null;
};

type RankCatalogRecord = {
  badgeLevel: number;
  iconUrl: string | null;
};

type DeadlockAssetsCatalog = {
  heroesById: Map<number, HeroCatalogRecord>;
  itemsById: Map<number, ItemCatalogRecord>;
  ranksByBadgeLevel: Map<number, RankCatalogRecord>;
};

type HeroEnrichment = {
  metrics: MetricsMapApi | null;
  itemRows: ItemStatsApi[];
  abilityOrders: AbilityOrderStatsApi[];
};

const STEAM_ID64_OFFSET = BigInt("76561197960265728");
const LIVE_TIMEOUT_MS = parseEnvInt("DEADLOCK_API_TIMEOUT_MS", 8_000);
const LIVE_API_BASE_URL =
  process.env.DEADLOCK_API_BASE_URL?.trim() || "https://api.deadlock-api.com";
const ASSETS_BASE_URL =
  process.env.DEADLOCK_ASSETS_BASE_URL?.trim() || "https://assets.deadlock-api.com";

const ASSETS_TTL_MS = 1000 * 60 * 60;
const META_TTL_MS = 1000 * 60 * 5;

let assetsCache: { expiresAt: number; data: DeadlockAssetsCatalog } | null = null;
let assetsCachePromise: Promise<DeadlockAssetsCatalog> | null = null;

let metaCache: { expiresAt: number; data: DeadlockMetaPayload } | null = null;
let metaCachePromise: Promise<DeadlockMetaPayload> | null = null;

export async function buildLiveDeadlockPlayerProfile(params: {
  steamId64: string;
  count: number;
}): Promise<DeadlockPlayerProfilePayload> {
  const accountId = steamId64ToAccountId(params.steamId64);
  const count = clamp(params.count, 1, 50);

  const [assets, steamProfiles, matchHistoryRaw, cardRaw, mmrHistoryRaw, heroStatsRaw] =
    await Promise.all([
      getAssetsCatalog(),
      fetchDeadlockJson<SteamProfileApi[]>("/v1/players/steam", {
        account_ids: [accountId],
      }),
      fetchDeadlockJson<PlayerMatchHistoryEntryApi[]>(
        `/v1/players/${accountId}/match-history`,
      ),
      fetchDeadlockJson<PlayerCardApi[]>(`/v1/players/${accountId}/card`).catch(() => []),
      fetchDeadlockJson<MmrHistoryApi[]>(`/v1/players/${accountId}/mmr-history`).catch(
        () => [],
      ),
      fetchDeadlockJson<PlayerHeroStatsApi[]>("/v1/players/hero-stats", {
        account_ids: [accountId],
      }).catch(() => []),
    ]);

  const steamProfile = steamProfiles.find((profile) => toInt(profile.account_id) === accountId) ?? null;
  const matchHistory = Array.isArray(matchHistoryRaw)
    ? [...matchHistoryRaw]
        .filter((entry) => toInt(entry.match_id) > 0)
        .sort((a, b) => toInt(b.start_time) - toInt(a.start_time))
        .slice(0, count)
    : [];

  if (matchHistory.length === 0) {
    throw new Error(`No live match history returned for account ${accountId}`);
  }

  const heroStats = Array.isArray(heroStatsRaw)
    ? heroStatsRaw.filter((entry) => toInt(entry.account_id) === accountId)
    : [];
  const heroStatsByHeroId = new Map<number, PlayerHeroStatsApi>();
  for (const entry of heroStats) {
    const heroId = toInt(entry.hero_id);
    if (heroId > 0) {
      heroStatsByHeroId.set(heroId, entry);
    }
  }

  const rankedMatchIds = new Set<number>(
    (Array.isArray(mmrHistoryRaw) ? mmrHistoryRaw : [])
      .map((row) => toInt(row.match_id))
      .filter((id) => id > 0),
  );

  const uniqueHeroIds = Array.from(
    new Set(matchHistory.map((entry) => toInt(entry.hero_id)).filter((id) => id > 0)),
  );

  const heroEnrichmentByHeroId = await loadHeroEnrichments({
    accountId,
    heroIds: uniqueHeroIds,
  });

  const matches: DeadlockMatchDetail[] = matchHistory.map((entry) =>
    mapLiveMatchEntry({
      entry,
      assets,
      heroStats: heroStatsByHeroId.get(toInt(entry.hero_id)) ?? null,
      heroEnrichment: heroEnrichmentByHeroId.get(toInt(entry.hero_id)) ?? null,
      rankedMatchIds,
    }),
  );

  const totalPlaytimeSecondsFromHeroStats = heroStats.reduce(
    (sum, entry) => sum + Math.max(0, toInt(entry.time_played)),
    0,
  );
  const totalPlaytimeSeconds =
    totalPlaytimeSecondsFromHeroStats > 0
      ? totalPlaytimeSecondsFromHeroStats
      : matches.reduce((sum, match) => sum + match.durationSeconds, 0);

  const latestCard = Array.isArray(cardRaw) ? cardRaw[0] ?? null : null;
  const latestMmrHistory = [...(Array.isArray(mmrHistoryRaw) ? mmrHistoryRaw : [])]
    .sort((a, b) => toInt(b.start_time) - toInt(a.start_time))[0] ?? null;

  const rankTier = formatRankTier(latestCard, latestMmrHistory);
  const rankBadgeLevel = deriveRankBadgeLevel(latestCard, latestMmrHistory);
  const latestPlayerScore = finiteOrNull(latestMmrHistory?.player_score);
  const hiddenMmr = latestPlayerScore !== null ? Math.round(latestPlayerScore) : null;

  const heroStatsFavorite = [...heroStats]
    .sort((a, b) => toInt(b.matches_played) - toInt(a.matches_played))[0];
  const favoriteHeroId = toInt(heroStatsFavorite?.hero_id);
  const favoriteHeroName =
    (favoriteHeroId > 0 ? assets.heroesById.get(favoriteHeroId)?.name : null) ??
    deriveFavoriteHeroFromMatches(matches);

  const wins = matches.filter((match) => match.result === "WIN").length;
  const losses = matches.length - wins;
  const totalSouls = matches.reduce((sum, match) => sum + match.economy.totalSouls, 0);
  const totalHeroDamage = matches.reduce((sum, match) => sum + match.combat.playerDamage, 0);
  const totalObjectiveDamage = matches.reduce(
    (sum, match) => sum + match.combat.objectiveDamage,
    0,
  );
  const totalHealing = matches.reduce((sum, match) => sum + match.combat.healing, 0);
  const avgKdaRatio =
    matches.length > 0
      ? round2(matches.reduce((sum, match) => sum + match.kda.ratio, 0) / matches.length)
      : 0;
  const avgKdaPerMinute =
    matches.length > 0
      ? round2(matches.reduce((sum, match) => sum + match.kda.perMinute, 0) / matches.length)
      : 0;
  const avgSpm =
    matches.length > 0
      ? round1(matches.reduce((sum, match) => sum + match.economy.soulsPerMinute, 0) / matches.length)
      : 0;

  return {
    ok: true,
    source: "live_api",
    fetchedAt: new Date().toISOString(),
    player: {
      steamId64: params.steamId64,
      personaName: steamProfile?.personaname?.trim() || `Account_${accountId}`,
      region: steamProfile?.countrycode?.trim()?.toUpperCase() || "N/A",
      accountLevel: null,
      totalPlaytimeSeconds,
      rankTier,
      hiddenMmr,
      profileSeed: `deadlock-api-${accountId}`,
      avatarUrl:
        steamProfile?.avatarfull?.trim() ||
        steamProfile?.avatarmedium?.trim() ||
        steamProfile?.avatar?.trim() ||
        null,
      rankBadgeIconUrl:
        (rankBadgeLevel > 0
          ? assets.ranksByBadgeLevel.get(rankBadgeLevel)?.iconUrl
          : null) ?? null,
    },
    aggregates: {
      totalMatches: matches.length,
      wins,
      losses,
      winrate: matches.length > 0 ? round1((wins / matches.length) * 100) : 0,
      averageKdaRatio: avgKdaRatio,
      averageKdaPerMinute: avgKdaPerMinute,
      averageSpm: avgSpm,
      totalSouls,
      totalHeroDamage,
      totalObjectiveDamage,
      totalHealing,
      favoriteHero: favoriteHeroName,
      lastMatchAt: matches[0]?.startedAt ?? null,
    },
    matches,
    notes: [
      "Source live: deadlock-api.com (sans clé API obligatoire pour ces endpoints).",
      "Profil, historique, KDA, durée, résultat, net worth (souls), rang et méta sont des données réelles.",
      "Détail de dégâts/healing/build/skill build est enrichi depuis des stats analytics agrégées par héros du joueur quand la metadata protobuf de match n’est pas décodée.",
      "Répartition détaillée des Souls (creeps/joueurs/objectifs) n’est pas exposée en JSON direct par les endpoints utilisés ici.",
    ],
  };
}

export async function buildLiveDeadlockMetaSnapshot(): Promise<DeadlockMetaPayload> {
  const now = Date.now();
  if (metaCache && metaCache.expiresAt > now) {
    return structuredClone(metaCache.data);
  }
  if (metaCachePromise) {
    return structuredClone(await metaCachePromise);
  }

  metaCachePromise = buildLiveDeadlockMetaSnapshotUncached();

  try {
    const result = await metaCachePromise;
    metaCache = { expiresAt: now + META_TTL_MS, data: result };
    return structuredClone(result);
  } finally {
    metaCachePromise = null;
  }
}

async function buildLiveDeadlockMetaSnapshotUncached(): Promise<DeadlockMetaPayload> {
  const [assets, heroStatsRaw, itemStatsRaw, patchesRaw] = await Promise.all([
    getAssetsCatalog(),
    fetchDeadlockJson<AnalyticsHeroStatsApi[]>("/v1/analytics/hero-stats", {
      bucket: "no_bucket",
      game_mode: "normal",
    }),
    fetchDeadlockJson<ItemStatsApi[]>("/v1/analytics/item-stats", {
      bucket: "hero",
      game_mode: "normal",
      min_matches: 100,
    }),
    fetchDeadlockJson<PatchApi[]>("/v1/patches").catch(() => []),
  ]);

  const heroStatsRows = (Array.isArray(heroStatsRaw) ? heroStatsRaw : []).filter(
    (row) => toInt(row.hero_id) > 0 && toInt(row.matches) > 0,
  );

  if (heroStatsRows.length === 0) {
    throw new Error("Deadlock live meta hero-stats returned no rows");
  }

  const totalHeroPicks = heroStatsRows.reduce((sum, row) => sum + Math.max(0, toInt(row.matches)), 0);
  const populationMatches =
    Math.max(
      0,
      ...heroStatsRows.map((row) => toInt(row.matches_per_bucket)),
    ) || Math.max(0, Math.round(totalHeroPicks / 12));
  const populationPlayers =
    Math.max(0, ...heroStatsRows.map((row) => toInt(row.players))) ||
    heroStatsRows.reduce((sum, row) => sum + Math.max(0, toInt(row.players)), 0);

  const heroStats: DeadlockHeroMetaStat[] = heroStatsRows
    .map((row) => {
      const heroId = toInt(row.hero_id);
      const wins = toInt(row.wins);
      const losses = toInt(row.losses);
      const picks = wins + losses > 0 ? wins + losses : Math.max(0, toInt(row.matches));
      return {
        hero: assets.heroesById.get(heroId)?.name || `Hero ${heroId}`,
        heroIconUrl: assets.heroesById.get(heroId)?.iconUrl ?? null,
        picks,
        wins,
        matches: Math.max(0, toInt(row.matches)),
        pickRate: totalHeroPicks > 0 ? round1((picks / totalHeroPicks) * 100) : 0,
        winRate: picks > 0 ? round1((wins / picks) * 100) : 0,
        banRate: null,
      };
    })
    .sort((a, b) => b.picks - a.picks || b.winRate - a.winRate);

  const itemStatsRows = (Array.isArray(itemStatsRaw) ? itemStatsRaw : []).filter(
    (row) => toInt(row.item_id) > 0 && toInt(row.matches) > 0,
  );

  const itemOrderRankByHeroAndItem = new Map<string, number>();
  const itemRowsGroupedByHero = new Map<number, ItemStatsApi[]>();

  for (const row of itemStatsRows) {
    const heroId = toInt(row.bucket);
    if (heroId <= 0) {
      continue;
    }
    const rows = itemRowsGroupedByHero.get(heroId) ?? [];
    rows.push(row);
    itemRowsGroupedByHero.set(heroId, rows);
  }

  for (const [heroId, rows] of itemRowsGroupedByHero.entries()) {
    rows
      .sort((a, b) => {
        const tA = finiteOrInfinity(a.avg_buy_time_s);
        const tB = finiteOrInfinity(b.avg_buy_time_s);
        if (tA !== tB) {
          return tA - tB;
        }
        return toInt(b.matches) - toInt(a.matches);
      })
      .forEach((row, index) => {
        const key = `${heroId}:${toInt(row.item_id)}`;
        itemOrderRankByHeroAndItem.set(key, index + 1);
      });
  }

  const itemStats: DeadlockItemMetaStat[] = itemStatsRows
    .map((row) => {
      const heroId = toInt(row.bucket);
      const itemId = toInt(row.item_id);
      const wins = toInt(row.wins);
      const losses = toInt(row.losses);
      const matches = Math.max(0, toInt(row.matches));
      const denom = wins + losses > 0 ? wins + losses : matches;
      return {
        hero: assets.heroesById.get(heroId)?.name || `Hero ${heroId}`,
        heroIconUrl: assets.heroesById.get(heroId)?.iconUrl ?? null,
        item: assets.itemsById.get(itemId)?.name || `Item ${itemId}`,
        itemIconUrl: assets.itemsById.get(itemId)?.iconUrl ?? null,
        sampleSize: matches,
        winRate: denom > 0 ? round1((wins / denom) * 100) : 0,
        avgPurchaseOrder: itemOrderRankByHeroAndItem.get(`${heroId}:${itemId}`) ?? 0,
      };
    })
    .filter((row) => row.sampleSize > 0 && row.avgPurchaseOrder > 0)
    .sort((a, b) => b.winRate - a.winRate || b.sampleSize - a.sampleSize)
    .slice(0, 14);

  const latestPatch = [...(Array.isArray(patchesRaw) ? patchesRaw : [])]
    .filter((patch) => typeof patch?.title === "string")
    .sort((a, b) => {
      const aTime = Date.parse(a.pub_date ?? "");
      const bTime = Date.parse(b.pub_date ?? "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    })[0];

  return {
    ok: true,
    source: "live_api",
    fetchedAt: new Date().toISOString(),
    patchLabel: latestPatch?.title?.trim() || "Deadlock API (live)",
    populationPlayers,
    populationMatches,
    heroStats,
    itemStats,
    notes: [
      "Source live: endpoints analytics de deadlock-api.com.",
      "Ban Rate non fourni par les endpoints hero-stats utilisés ici (affiché N/A).",
      "Le classement d’achat des items est dérivé des `avg_buy_time_s` (ordre moyen réel estimé par héros).",
    ],
  };
}

async function loadHeroEnrichments(params: {
  accountId: number;
  heroIds: number[];
}): Promise<Map<number, HeroEnrichment>> {
  const result = new Map<number, HeroEnrichment>();

  await Promise.all(
    params.heroIds.map(async (heroId) => {
      const [metrics, itemRows, abilityOrders] = await Promise.all([
        fetchDeadlockJson<MetricsMapApi>("/v1/analytics/player-stats/metrics", {
          account_ids: [params.accountId],
          hero_ids: String(heroId),
          max_matches: 200,
        }).catch(() => null),
        fetchDeadlockJson<ItemStatsApi[]>("/v1/analytics/item-stats", {
          account_id: params.accountId,
          hero_id: heroId,
          game_mode: "normal",
          min_matches: 1,
        }).catch(() => []),
        fetchDeadlockJson<AbilityOrderStatsApi[]>("/v1/analytics/ability-order-stats", {
          hero_id: heroId,
          account_ids: [params.accountId],
          game_mode: "normal",
          min_matches: 1,
        }).catch(() => []),
      ]);

      result.set(heroId, {
        metrics,
        itemRows: Array.isArray(itemRows) ? itemRows : [],
        abilityOrders: Array.isArray(abilityOrders) ? abilityOrders : [],
      });
    }),
  );

  return result;
}

function mapLiveMatchEntry(params: {
  entry: PlayerMatchHistoryEntryApi;
  assets: DeadlockAssetsCatalog;
  heroStats: PlayerHeroStatsApi | null;
  heroEnrichment: HeroEnrichment | null;
  rankedMatchIds: Set<number>;
}): DeadlockMatchDetail {
  const { entry, assets, heroStats, heroEnrichment, rankedMatchIds } = params;

  const matchId = toInt(entry.match_id);
  const heroId = toInt(entry.hero_id);
  const heroName = assets.heroesById.get(heroId)?.name || `Hero ${heroId}`;
  const durationSeconds = Math.max(1, toInt(entry.match_duration_s));
  const minutes = durationSeconds / 60;

  const kills = Math.max(0, toInt(entry.player_kills));
  const deaths = Math.max(0, toInt(entry.player_deaths));
  const assists = Math.max(0, toInt(entry.player_assists));
  const kdaRatio = round2((kills + assists) / Math.max(1, deaths));
  const kdaPerMinute = round2((kills + assists) / Math.max(1, minutes));

  const totalSouls = Math.max(0, toInt(entry.net_worth));
  const soulsPerMinute = round1(totalSouls / Math.max(1, minutes));

  const heroDamagePerMin =
    finiteOrNull(heroStats?.damage_per_min) ??
    finiteOrNull(heroEnrichment?.metrics?.player_damage_per_min?.avg) ??
    0;
  const objectiveDamagePerMin =
    finiteOrNull(heroStats?.obj_damage_per_min) ??
    finiteOrNull(heroEnrichment?.metrics?.boss_damage_per_min?.avg) ??
    0;
  const healingPerMin =
    finiteOrNull(heroEnrichment?.metrics?.healing_per_min?.avg) ??
    finiteOrNull(heroEnrichment?.metrics?.player_healing_per_min?.avg) ??
    finiteOrNull(heroEnrichment?.metrics?.self_healing_per_min?.avg) ??
    0;

  const combat: DeadlockCombatStats = {
    playerDamage: Math.max(0, Math.round(heroDamagePerMin * minutes)),
    objectiveDamage: Math.max(0, Math.round(objectiveDamagePerMin * minutes)),
    healing: Math.max(0, Math.round(healingPerMin * minutes)),
  };

  const avgDurationFromHeroStats =
    heroStats && toInt(heroStats.matches_played) > 0
      ? Math.round(toInt(heroStats.time_played) / Math.max(1, toInt(heroStats.matches_played)))
      : durationSeconds;

  const items = buildHeroItemOrder({
    heroId,
    assets,
    itemRows: heroEnrichment?.itemRows ?? [],
  });

  const skills = buildHeroSkillOrder({
    heroId,
    assets,
    abilityOrders: heroEnrichment?.abilityOrders ?? [],
    durationSeconds: avgDurationFromHeroStats > 0 ? avgDurationFromHeroStats : durationSeconds,
  });

  return {
    matchId: String(matchId),
    hero: heroName,
    heroIconUrl: assets.heroesById.get(heroId)?.iconUrl ?? null,
    result: toInt(entry.match_result) > 0 ? "WIN" : "LOSS",
    mode: mapMatchMode(entry, rankedMatchIds, matchId),
    patchVersion: "Deadlock API",
    startedAt: unixSecondsToIso(toInt(entry.start_time)),
    durationSeconds,
    kda: {
      kills,
      deaths,
      assists,
      ratio: kdaRatio,
      perMinute: kdaPerMinute,
    },
    economy: {
      totalSouls,
      soulsPerMinute,
      // This endpoint exposes net worth but not a JSON souls source breakdown.
      breakdown: {
        creeps: 0,
        players: 0,
        objectives: 0,
        other: totalSouls,
      },
    },
    combat,
    build: {
      items,
      skills,
    },
  };
}

function buildHeroItemOrder(params: {
  heroId: number;
  assets: DeadlockAssetsCatalog;
  itemRows: ItemStatsApi[];
}) {
  const rows = [...params.itemRows]
    .filter((row) => toInt(row.item_id) > 0 && toInt(row.matches) > 0)
    .sort((a, b) => {
      const tA = finiteOrInfinity(a.avg_buy_time_s);
      const tB = finiteOrInfinity(b.avg_buy_time_s);
      if (tA !== tB) {
        return tA - tB;
      }
      return toInt(b.matches) - toInt(a.matches);
    })
    .slice(0, 12);

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row, index) => {
    const itemId = toInt(row.item_id);
    const catalog = params.assets.itemsById.get(itemId);
    const avgBuyTime = Math.max(45, Math.round(finiteOrNull(row.avg_buy_time_s) ?? (index + 1) * 180));
    return {
      order: index + 1,
      itemName: catalog?.name || `Item ${itemId}`,
      tier: catalog?.tier ?? inferTierFromCost(catalog?.cost ?? 0),
      cost: catalog?.cost ?? 0,
      atSecond: avgBuyTime,
      iconUrl: catalog?.iconUrl ?? null,
    };
  });
}

function buildHeroSkillOrder(params: {
  heroId: number;
  assets: DeadlockAssetsCatalog;
  abilityOrders: AbilityOrderStatsApi[];
  durationSeconds: number;
}): DeadlockSkillUpgrade[] {
  const bestOrder = [...params.abilityOrders]
    .filter((row) => Array.isArray(row.abilities) && row.abilities.length > 0)
    .sort((a, b) => {
      const matchDiff = toInt(b.matches) - toInt(a.matches);
      if (matchDiff !== 0) {
        return matchDiff;
      }
      return toInt(b.wins) - toInt(a.wins);
    })[0];

  const abilityIds = Array.isArray(bestOrder?.abilities) ? bestOrder.abilities.slice(0, 16) : [];

  if (abilityIds.length === 0) {
    return [];
  }

  const heroAbilities = params.assets.heroesById.get(params.heroId)?.abilities ?? new Map<number, string>();
  const counters = new Map<string, number>();
  const totalSteps = abilityIds.length;

  return abilityIds.map((abilityIdRaw, index) => {
    const abilityId = toInt(abilityIdRaw);
    const abilityLabel = heroAbilities.get(abilityId) || `Ability ${abilityId}`;
    const nextLevel = (counters.get(abilityLabel) ?? 0) + 1;
    counters.set(abilityLabel, nextLevel);

    return {
      order: index + 1,
      ability: abilityLabel,
      levelAfter: nextLevel,
      atSecond: Math.max(
        30,
        Math.round(((index + 1) * params.durationSeconds) / (totalSteps + 2)),
      ),
    };
  });
}

function mapMatchMode(
  entry: PlayerMatchHistoryEntryApi,
  rankedMatchIds: Set<number>,
  matchId: number,
): "Quickplay" | "Ranked" | "Custom" {
  if (rankedMatchIds.has(matchId)) {
    return "Ranked";
  }

  if (
    entry.brawl_score_team0 !== null &&
    entry.brawl_score_team0 !== undefined &&
    entry.brawl_score_team1 !== null &&
    entry.brawl_score_team1 !== undefined
  ) {
    return "Quickplay";
  }

  const matchMode = toInt(entry.match_mode);
  if (matchMode >= 100) {
    return "Custom";
  }

  return "Quickplay";
}

async function getAssetsCatalog(): Promise<DeadlockAssetsCatalog> {
  const now = Date.now();
  if (assetsCache && assetsCache.expiresAt > now) {
    return assetsCache.data;
  }
  if (assetsCachePromise) {
    return assetsCachePromise;
  }

  assetsCachePromise = (async () => {
    const [heroesRaw, itemsRaw, ranksRaw] = await Promise.all([
      fetchJson<any[]>(new URL("/v2/heroes", ASSETS_BASE_URL)),
      fetchJson<any[]>(new URL("/v2/items", ASSETS_BASE_URL)),
      fetchJson<RankAssetApi[]>(new URL("/v2/ranks", ASSETS_BASE_URL)).catch(() => []),
    ]);

    const heroesById = new Map<number, HeroCatalogRecord>();
    for (const hero of Array.isArray(heroesRaw) ? heroesRaw : []) {
      const heroId = toInt(hero?.id ?? hero?.hero_id);
      if (heroId <= 0) {
        continue;
      }
      const heroName =
        toStringSafe(hero?.name) ||
        toStringSafe(hero?.localized_name) ||
        toStringSafe(hero?.display_name) ||
        `Hero ${heroId}`;

      const abilities = new Map<number, string>();
      const abilityCollections = [
        hero?.abilities,
        hero?.skills,
        hero?.ability_list,
      ];

      for (const collection of abilityCollections) {
        if (!Array.isArray(collection)) {
          continue;
        }
        for (const ability of collection) {
          const abilityId = toInt(ability?.id ?? ability?.ability_id);
          if (abilityId <= 0) {
            continue;
          }
          const abilityName =
            toStringSafe(ability?.name) ||
            toStringSafe(ability?.localized_name) ||
            toStringSafe(ability?.display_name) ||
            toStringSafe(ability?.class_name) ||
            `Ability ${abilityId}`;
          abilities.set(abilityId, abilityName);
        }
      }

      heroesById.set(heroId, {
        id: heroId,
        name: heroName,
        abilities,
        iconUrl: extractAssetImageUrl(hero, "hero"),
      });
    }

    const itemsById = new Map<number, ItemCatalogRecord>();
    for (const item of Array.isArray(itemsRaw) ? itemsRaw : []) {
      const itemId = toInt(item?.id ?? item?.item_id);
      if (itemId <= 0) {
        continue;
      }
      const itemName =
        toStringSafe(item?.name) ||
        toStringSafe(item?.localized_name) ||
        toStringSafe(item?.display_name) ||
        `Item ${itemId}`;
      const cost = Math.max(
        0,
        toInt(item?.cost ?? item?.item_cost ?? item?.shop_cost ?? item?.price),
      );
      const tier = Math.max(
        1,
        toInt(item?.tier ?? item?.item_tier ?? item?.shop_tier) || inferTierFromCost(cost),
      );
      itemsById.set(itemId, {
        id: itemId,
        name: itemName,
        cost,
        tier,
        iconUrl: extractAssetImageUrl(item, "item"),
      });
    }

    const ranksByBadgeLevel = new Map<number, RankCatalogRecord>();
    for (const rank of Array.isArray(ranksRaw) ? ranksRaw : []) {
      const badgeLevel = toInt(rank?.badge_level ?? rank?.rank ?? rank?.id ?? rank?.level);
      if (badgeLevel <= 0) {
        continue;
      }
      const iconUrl = extractAssetImageUrl(rank, "rank");
      ranksByBadgeLevel.set(badgeLevel, { badgeLevel, iconUrl });
    }

    const catalog: DeadlockAssetsCatalog = { heroesById, itemsById, ranksByBadgeLevel };
    assetsCache = { expiresAt: now + ASSETS_TTL_MS, data: catalog };
    return catalog;
  })();

  try {
    return await assetsCachePromise;
  } finally {
    assetsCachePromise = null;
  }
}

async function fetchDeadlockJson<T>(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<T> {
  const url = new URL(path, LIVE_API_BASE_URL);
  applyQuery(url, query);
  return fetchJson<T>(url);
}

async function fetchJson<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    const apiKey = process.env.DEADLOCK_API_KEY?.trim();
    if (apiKey) {
      headers["X-API-KEY"] = apiKey;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} for ${url.toString()} :: ${truncate(
          text,
          300,
        )}`,
      );
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function applyQuery(url: URL, query?: Record<string, QueryValue>) {
  if (!query) {
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      url.searchParams.set(key, value.map((entry) => String(entry)).join(","));
      continue;
    }
    url.searchParams.set(key, String(value));
  }
}

function steamId64ToAccountId(steamId64: string) {
  const value = BigInt(steamId64);
  const accountId = value - STEAM_ID64_OFFSET;
  if (accountId <= BigInt(0) || accountId > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Invalid SteamID64 for account conversion: ${steamId64}`);
  }
  return Number(accountId);
}

function deriveRankBadgeLevel(card: PlayerCardApi | null, mmr: MmrHistoryApi | null) {
  const cardBadge = toInt(card?.ranked_badge_level);
  if (cardBadge > 0) {
    return cardBadge;
  }
  const mmrRank = toInt(mmr?.rank);
  if (mmrRank > 0) {
    return mmrRank;
  }
  return 0;
}

function formatRankTier(card: PlayerCardApi | null, mmr: MmrHistoryApi | null) {
  const badgeLevel = toInt(card?.ranked_badge_level);
  if (badgeLevel > 0) {
    return `Badge ${badgeLevel}`;
  }
  const rank = toInt(mmr?.rank);
  if (rank > 0) {
    return `Badge ${rank}`;
  }
  const rankedRank = toInt(card?.ranked_rank);
  const rankedSubrank = toInt(card?.ranked_subrank);
  if (rankedRank > 0 || rankedSubrank > 0) {
    return `Rank ${Math.max(0, rankedRank)}.${Math.max(0, rankedSubrank)}`;
  }
  return null;
}

function extractAssetImageUrl(entity: unknown, kind: "hero" | "item" | "rank") {
  if (!entity || typeof entity !== "object") {
    return null;
  }

  const candidatePaths =
    kind === "hero"
      ? [
          "icon",
          "icon_url",
          "image",
          "image_url",
          "small_image",
          "portrait_image",
          "images.icon",
          "images.small",
          "images.portrait",
          "images.hero",
          "images.card",
          "images.top_bar",
        ]
      : kind === "item"
        ? [
            "icon",
            "icon_url",
            "image",
            "image_url",
            "shop_image",
            "images.icon",
            "images.small",
            "images.shop",
            "images.item",
          ]
        : [
            "icon",
            "icon_url",
            "image",
            "image_url",
            "badge_image",
            "images.icon",
            "images.badge",
            "images.small",
          ];

  for (const path of candidatePaths) {
    const raw = getByPath(entity, path);
    const url = normalizeAssetUrl(asUrlString(raw));
    if (url) {
      return url;
    }
  }

  const allUrls = collectUrlsDeep(entity);
  if (allUrls.length === 0) {
    return null;
  }

  const scored = allUrls
    .map((url) => ({ url: normalizeAssetUrl(url), score: scoreAssetUrl(url, kind) }))
    .filter((entry): entry is { url: string; score: number } => Boolean(entry.url))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.url ?? null;
}

function scoreAssetUrl(url: string, kind: "hero" | "item" | "rank") {
  const lower = url.toLowerCase();
  let score = 0;
  if (lower.includes("icon")) score += 20;
  if (lower.includes("small")) score += 8;
  if (lower.includes("thumb")) score += 8;
  if (lower.includes("badge")) score += kind === "rank" ? 20 : 2;
  if (lower.includes("portrait")) score += kind === "hero" ? 15 : 2;
  if (lower.includes("hero")) score += kind === "hero" ? 10 : 0;
  if (lower.includes("item")) score += kind === "item" ? 10 : 0;
  if (/\.(png|webp|jpg|jpeg|avif)(\?|$)/.test(lower)) score += 4;
  if (lower.includes("http")) score += 1;
  return score;
}

function collectUrlsDeep(input: unknown, depth = 0, maxDepth = 5, acc: string[] = []) {
  if (depth > maxDepth || input === null || input === undefined) {
    return acc;
  }

  if (typeof input === "string") {
    const url = asUrlString(input);
    if (url) {
      acc.push(url);
    }
    return acc;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectUrlsDeep(item, depth + 1, maxDepth, acc);
    }
    return acc;
  }

  if (typeof input === "object") {
    for (const value of Object.values(input as Record<string, unknown>)) {
      collectUrlsDeep(value, depth + 1, maxDepth, acc);
    }
  }

  return acc;
}

function getByPath(input: unknown, path: string): unknown {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const segments = path.split(".");
  let current: unknown = input;
  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function asUrlString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  if (/^[A-Za-z0-9/_-]+\.(png|webp|jpg|jpeg|avif)$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function normalizeAssetUrl(url: string | null) {
  if (!url) {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  try {
    if (url.startsWith("/")) {
      return new URL(url, ASSETS_BASE_URL).toString();
    }
    return new URL(`/${url}`, ASSETS_BASE_URL).toString();
  } catch {
    return null;
  }
}

function deriveFavoriteHeroFromMatches(matches: DeadlockMatchDetail[]) {
  const counts = new Map<string, number>();
  for (const match of matches) {
    counts.set(match.hero, (counts.get(match.hero) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function inferTierFromCost(cost: number) {
  if (cost >= 6000) return 4;
  if (cost >= 3000) return 3;
  if (cost >= 1200) return 2;
  return 1;
}

function unixSecondsToIso(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return new Date().toISOString();
  }
  return new Date(value * 1000).toISOString();
}

function toInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function finiteOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function finiteOrInfinity(value: unknown) {
  const numeric = finiteOrNull(value);
  return numeric === null ? Number.POSITIVE_INFINITY : numeric;
}

function toStringSafe(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

function parseEnvInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
