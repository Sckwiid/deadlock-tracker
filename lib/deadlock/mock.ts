import type {
  DeadlockHeroMetaStat,
  DeadlockItemMetaStat,
  DeadlockMatchDetail,
  DeadlockMetaPayload,
  DeadlockPlayerAggregates,
  DeadlockPlayerProfilePayload,
} from "@/lib/types/deadlock";

type Rng = () => number;

type CatalogItem = {
  name: string;
  tier: number;
  cost: number;
};

const HEROES = [
  "Abrams",
  "Bebop",
  "Dynamo",
  "Grey Talon",
  "Haze",
  "Infernus",
  "Ivy",
  "Kelvin",
  "Lady Geist",
  "Lash",
  "McGinnis",
  "Mirage",
  "Mo & Krill",
  "Paradox",
  "Pocket",
  "Seven",
  "Shiv",
  "Vindicta",
  "Viscous",
  "Warden",
  "Wraith",
  "Yamato",
] as const;

const ITEMS: readonly CatalogItem[] = [
  { name: "Headshot Booster", tier: 1, cost: 500 },
  { name: "Swift Strikes", tier: 1, cost: 500 },
  { name: "Spirit Flask", tier: 1, cost: 500 },
  { name: "Stamina Matrix", tier: 1, cost: 750 },
  { name: "Burst Magazine", tier: 2, cost: 1250 },
  { name: "Siphon Bullets", tier: 2, cost: 1250 },
  { name: "Phantom Rounds", tier: 2, cost: 1500 },
  { name: "Warp Stone", tier: 2, cost: 1500 },
  { name: "Reactive Armor", tier: 2, cost: 1750 },
  { name: "Mystic Reverb", tier: 2, cost: 1750 },
  { name: "Silencer Module", tier: 3, cost: 3000 },
  { name: "Titanic Magazine", tier: 3, cost: 3000 },
  { name: "Colossus Core", tier: 3, cost: 3250 },
  { name: "Soul Recycler", tier: 3, cost: 3250 },
  { name: "Ethereal Shift", tier: 3, cost: 3500 },
  { name: "Pristine Emblem", tier: 3, cost: 3500 },
  { name: "Unstoppable Drive", tier: 4, cost: 6200 },
  { name: "Ancient Reactor", tier: 4, cost: 6200 },
  { name: "Leviathan Plate", tier: 4, cost: 6400 },
  { name: "Soul Furnace", tier: 4, cost: 6500 },
] as const;

const REGIONS = ["EU", "NA", "SA", "APAC"] as const;
const MODES = ["Quickplay", "Ranked", "Quickplay", "Ranked", "Quickplay", "Custom"] as const;

const RANK_TIERS = [
  "Seeker I",
  "Seeker II",
  "Seeker III",
  "Rogue I",
  "Rogue II",
  "Rogue III",
  "Phantom I",
  "Phantom II",
  "Phantom III",
  "Archon I",
  "Archon II",
  "Archon III",
] as const;

const PATCHES = ["EA-0.8.2", "EA-0.8.3", "EA-0.9.0", "EA-0.9.1"] as const;
const SKILL_SEQUENCE = ["A1", "A2", "A1", "A3", "A1", "ULT", "A2", "A2", "A3", "A3", "ULT", "A1", "A2", "A3", "ULT", "A1"] as const;

let cachedMetaSnapshot: DeadlockMetaPayload | null = null;

export function buildMockPlayerProfile(params: {
  steamId64: string;
  count: number;
}): DeadlockPlayerProfilePayload {
  const steamId64 = params.steamId64;
  const count = clamp(params.count, 5, 50);
  const seed = hashString(`player:${steamId64}`);
  const rng = mulberry32(seed);

  const personaName = buildPersonaName(steamId64, rng);
  const region = pick(REGIONS, rng);
  const accountLevel = randomInt(rng, 18, 240);
  const totalPlaytimeSeconds = randomInt(rng, 90, 1800) * 3600 + randomInt(rng, 0, 3599);
  const hiddenMmr = randomInt(rng, 950, 3400);
  const rankTier = rankTierFromMmr(hiddenMmr);

  const mainPool = uniqueHeroes(rng, 4);
  const matches: DeadlockMatchDetail[] = [];
  const now = Date.now();
  let cursorMs = now - randomInt(rng, 40, 360) * 60_000;

  for (let index = 0; index < count; index += 1) {
    const hero = chooseHero(mainPool, rng);
    const mode = pick(MODES, rng);
    const durationSeconds = randomInt(rng, 980, 2450);
    const performanceBias = (hiddenMmr - 1800) / 1000 + (heroBias(hero) - 0.5) * 0.25;
    const winChance = clamp01(0.48 + performanceBias * 0.08 + (rng() - 0.5) * 0.08);
    const didWin = rng() <= winChance;

    const killsBase = didWin ? randomInt(rng, 5, 18) : randomInt(rng, 2, 14);
    const deathsBase = didWin ? randomInt(rng, 1, 8) : randomInt(rng, 4, 13);
    const assistsBase = didWin ? randomInt(rng, 7, 24) : randomInt(rng, 4, 20);
    const kills = Math.max(0, killsBase + randomInt(rng, -2, 2));
    const deaths = Math.max(0, deathsBase + randomInt(rng, -1, 2));
    const assists = Math.max(0, assistsBase + randomInt(rng, -3, 3));
    const minutes = durationSeconds / 60;
    const kdaRatio = round2((kills + assists) / Math.max(1, deaths));
    const kdaPerMinute = round2((kills + assists) / Math.max(1, minutes));

    const spmBase = didWin ? randomInt(rng, 560, 930) : randomInt(rng, 420, 780);
    const soulsPerMinute = round1(spmBase + (hiddenMmr - 1800) / 30 + randomInt(rng, -55, 55));
    const totalSouls = Math.max(6500, Math.round(soulsPerMinute * minutes));

    const breakdown = splitSouls(totalSouls, rng);
    const playerDamage = Math.max(2000, Math.round(totalSouls * (0.55 + rng() * 0.85)));
    const objectiveDamage = Math.max(300, Math.round(totalSouls * (0.12 + rng() * 0.4)));
    const healing = Math.max(
      0,
      Math.round(totalSouls * (healingProfile(hero) * (0.08 + rng() * 0.25))),
    );

    const items = buildItemPurchaseOrder(durationSeconds, rng);
    const skills = buildSkillBuild(durationSeconds, rng);

    cursorMs -= durationSeconds * 1000;
    cursorMs -= randomInt(rng, 25, 230) * 60_000;

    matches.push({
      matchId: buildMatchId(steamId64, index, seed),
      hero,
      result: didWin ? "WIN" : "LOSS",
      mode,
      patchVersion: pick(PATCHES, rng),
      startedAt: new Date(cursorMs).toISOString(),
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
        breakdown,
      },
      combat: {
        playerDamage,
        objectiveDamage,
        healing,
      },
      build: {
        items,
        skills,
      },
    });
  }

  const aggregates = aggregatePlayerMatches(matches);

  return {
    ok: true,
    source: "mock",
    fetchedAt: new Date().toISOString(),
    player: {
      steamId64,
      personaName,
      region,
      accountLevel,
      totalPlaytimeSeconds,
      rankTier,
      hiddenMmr,
      profileSeed: `mock-${seed}`,
    },
    aggregates,
    matches,
    notes: [
      "Mode démo: données synthétiques cohérentes générées à partir du SteamID64.",
      "Schéma Prisma inclus pour brancher un pipeline d’ingestion Deadlock dès qu’une source fiable est disponible.",
    ],
  };
}

export function buildMockMetaSnapshot(): DeadlockMetaPayload {
  if (cachedMetaSnapshot) {
    return structuredClone(cachedMetaSnapshot);
  }

  const populationIds = Array.from({ length: 64 }, (_, index) => {
    const base = BigInt("76561198000000000") + BigInt(index * 12345 + 7);
    return base.toString();
  });

  const populationProfiles = populationIds.map((steamId64) =>
    buildMockPlayerProfile({ steamId64, count: 24 }),
  );

  const allMatches = populationProfiles.flatMap((profile) => profile.matches);
  const heroMap = new Map<
    string,
    { picks: number; wins: number; matches: number; bans: number }
  >();
  const itemHeroMap = new Map<
    string,
    { hero: string; item: string; wins: number; total: number; orderSum: number }
  >();

  for (const hero of HEROES) {
    heroMap.set(hero, { picks: 0, wins: 0, matches: allMatches.length, bans: 0 });
  }

  let rankedMatches = 0;

  for (const match of allMatches) {
    const heroEntry = heroMap.get(match.hero);
    if (heroEntry) {
      heroEntry.picks += 1;
      if (match.result === "WIN") {
        heroEntry.wins += 1;
      }
    }

    if (match.mode === "Ranked") {
      rankedMatches += 1;
      const banRng = mulberry32(hashString(`ban:${match.matchId}`));
      const banCount = randomInt(banRng, 2, 6);
      const bannedHeroes = new Set<string>();
      while (bannedHeroes.size < banCount) {
        bannedHeroes.add(pick(HEROES, banRng));
      }
      for (const bannedHero of bannedHeroes) {
        const entry = heroMap.get(bannedHero);
        if (entry) {
          entry.bans += 1;
        }
      }
    }

    for (const itemPurchase of match.build.items) {
      const key = `${match.hero}::${itemPurchase.itemName}`;
      const current = itemHeroMap.get(key) ?? {
        hero: match.hero,
        item: itemPurchase.itemName,
        wins: 0,
        total: 0,
        orderSum: 0,
      };
      current.total += 1;
      current.orderSum += itemPurchase.order;
      if (match.result === "WIN") {
        current.wins += 1;
      }
      itemHeroMap.set(key, current);
    }
  }

  const heroStats: DeadlockHeroMetaStat[] = Array.from(heroMap.entries())
    .map(([hero, value]) => ({
      hero,
      picks: value.picks,
      wins: value.wins,
      matches: value.matches,
      pickRate: allMatches.length > 0 ? round1((value.picks / allMatches.length) * 100) : 0,
      winRate: value.picks > 0 ? round1((value.wins / value.picks) * 100) : 0,
      banRate:
        rankedMatches > 0 ? round1((value.bans / rankedMatches) * 100) : null,
    }))
    .sort((a, b) => b.picks - a.picks || b.winRate - a.winRate);

  const itemStats: DeadlockItemMetaStat[] = Array.from(itemHeroMap.values())
    .filter((entry) => entry.total >= 18)
    .map((entry) => ({
      hero: entry.hero,
      item: entry.item,
      sampleSize: entry.total,
      winRate: round1((entry.wins / entry.total) * 100),
      avgPurchaseOrder: round1(entry.orderSum / entry.total),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.sampleSize - a.sampleSize)
    .slice(0, 14);

  cachedMetaSnapshot = {
    ok: true,
    source: "mock",
    fetchedAt: new Date().toISOString(),
    patchLabel: "Deadlock EA • Sample Meta (mock)",
    populationPlayers: populationProfiles.length,
    populationMatches: allMatches.length,
    heroStats,
    itemStats,
    notes: [
      "Pick/Win/Ban rates calculés sur la population mock locale tant qu’aucun collecteur réel n’est branché.",
      "La structure des données et l’UI sont prêtes pour être alimentées par une base Postgres sur Railway.",
    ],
  };

  return structuredClone(cachedMetaSnapshot);
}

function aggregatePlayerMatches(matches: DeadlockMatchDetail[]): DeadlockPlayerAggregates {
  let wins = 0;
  let losses = 0;
  let totalKdaRatio = 0;
  let totalKdaPerMinute = 0;
  let totalSpm = 0;
  let totalSouls = 0;
  let totalHeroDamage = 0;
  let totalObjectiveDamage = 0;
  let totalHealing = 0;
  const heroCounts = new Map<string, number>();

  for (const match of matches) {
    if (match.result === "WIN") {
      wins += 1;
    } else {
      losses += 1;
    }
    totalKdaRatio += match.kda.ratio;
    totalKdaPerMinute += match.kda.perMinute;
    totalSpm += match.economy.soulsPerMinute;
    totalSouls += match.economy.totalSouls;
    totalHeroDamage += match.combat.playerDamage;
    totalObjectiveDamage += match.combat.objectiveDamage;
    totalHealing += match.combat.healing;
    heroCounts.set(match.hero, (heroCounts.get(match.hero) ?? 0) + 1);
  }

  const favoriteHero =
    Array.from(heroCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const total = wins + losses;

  return {
    totalMatches: total,
    wins,
    losses,
    winrate: total > 0 ? round1((wins / total) * 100) : 0,
    averageKdaRatio: total > 0 ? round2(totalKdaRatio / total) : 0,
    averageKdaPerMinute: total > 0 ? round2(totalKdaPerMinute / total) : 0,
    averageSpm: total > 0 ? round1(totalSpm / total) : 0,
    totalSouls,
    totalHeroDamage,
    totalObjectiveDamage,
    totalHealing,
    favoriteHero,
    lastMatchAt: matches[0]?.startedAt ?? null,
  };
}

function buildPersonaName(steamId64: string, rng: Rng) {
  const suffix = steamId64.slice(-5);
  const prefixes = ["Soul", "Lane", "Hex", "Vanta", "Pulse", "Rift", "Apex"];
  const nouns = ["Runner", "Warden", "Shade", "Driver", "Keeper", "Hunter", "Pilot"];
  return `${pick(prefixes, rng)}${pick(nouns, rng)}_${suffix}`;
}

function chooseHero(mainPool: readonly string[], rng: Rng) {
  const roll = rng();
  if (roll < 0.62) {
    return pick(mainPool, rng);
  }
  if (roll < 0.84) {
    return pick(HEROES, rng);
  }

  const candidates = HEROES.filter((hero) => !mainPool.includes(hero));
  return pick(candidates.length > 0 ? candidates : HEROES, rng);
}

function uniqueHeroes(rng: Rng, count: number) {
  const pool = [...HEROES];
  shuffleInPlace(pool, rng);
  return pool.slice(0, count);
}

function heroBias(hero: string) {
  return (hashString(hero) % 100) / 100;
}

function healingProfile(hero: string) {
  if (hero === "Kelvin" || hero === "Dynamo" || hero === "Ivy" || hero === "Viscous") {
    return 1.45;
  }
  if (hero === "Abrams" || hero === "Mo & Krill") {
    return 1.15;
  }
  return 0.65;
}

function rankTierFromMmr(mmr: number) {
  const index = clamp(Math.floor((mmr - 900) / 220), 0, RANK_TIERS.length - 1);
  return RANK_TIERS[index] ?? null;
}

function buildMatchId(steamId64: string, index: number, seed: number) {
  const base = BigInt(steamId64) + BigInt(seed) + BigInt(index * 7919);
  return `DL-${base.toString()}`;
}

function splitSouls(totalSouls: number, rng: Rng) {
  const creepPct = 0.44 + rng() * 0.22;
  const playerPct = 0.15 + rng() * 0.18;
  const objectivePct = 0.12 + rng() * 0.16;

  const creeps = Math.round(totalSouls * creepPct);
  const players = Math.round(totalSouls * playerPct);
  const objectives = Math.round(totalSouls * objectivePct);
  const other = Math.max(0, totalSouls - creeps - players - objectives);

  return { creeps, players, objectives, other };
}

function buildItemPurchaseOrder(durationSeconds: number, rng: Rng) {
  const count = randomInt(rng, 8, 12);
  const pool = [...ITEMS];
  shuffleInPlace(pool, rng);
  const picked = pool.slice(0, count);
  picked.sort((a, b) => a.tier - b.tier || a.cost - b.cost || a.name.localeCompare(b.name));

  return picked.map((item, index) => {
    const timeFloor = Math.round((durationSeconds * (index + 1)) / (count + 2));
    return {
      order: index + 1,
      itemName: item.name,
      tier: item.tier,
      cost: item.cost,
      atSecond: Math.max(45, timeFloor + randomInt(rng, -45, 60)),
    };
  });
}

function buildSkillBuild(durationSeconds: number, rng: Rng) {
  const count = 16;
  return Array.from({ length: count }, (_, index) => {
    const order = index + 1;
    const ability = SKILL_SEQUENCE[index] ?? "A1";
    const repeatsSoFar = SKILL_SEQUENCE.slice(0, index + 1).filter((entry) => entry === ability).length;
    const evenSpacing = Math.round((durationSeconds * order) / (count + 2));
    return {
      order,
      ability,
      levelAfter: ability === "ULT" ? Math.min(3, repeatsSoFar) : Math.min(4, repeatsSoFar),
      atSecond: Math.max(30, evenSpacing + randomInt(rng, -20, 40)),
    };
  });
}

function pick<T>(array: readonly T[], rng: Rng): T {
  return array[Math.floor(rng() * array.length)] as T;
}

function randomInt(rng: Rng, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
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

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function shuffleInPlace<T>(array: T[], rng: Rng) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const current = array[i];
    array[i] = array[j] as T;
    array[j] = current as T;
  }
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
