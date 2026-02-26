"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  Crown,
  ChevronRight,
  Crosshair,
  Flame,
  HardDriveDownload,
  Loader2,
  Search,
  Shield,
  Swords,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import type {
  DeadlockMetaPayload,
  DeadlockMetaResponse,
  DeadlockPlayerLookupResponse,
  DeadlockPlayerProfilePayload,
} from "@/lib/types/deadlock";

const DEFAULT_STEAM_ID64 = "76561198000000007";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const [query, setQuery] = useState(DEFAULT_STEAM_ID64);
  const [count, setCount] = useState("20");
  const [playerPayload, setPlayerPayload] = useState<DeadlockPlayerProfilePayload | null>(null);
  const [metaPayload, setMetaPayload] = useState<DeadlockMetaPayload | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const selectedMatch = useMemo(() => {
    if (!playerPayload) {
      return null;
    }
    if (!selectedMatchId) {
      return playerPayload.matches[0] ?? null;
    }
    return playerPayload.matches.find((match) => match.matchId === selectedMatchId) ?? null;
  }, [playerPayload, selectedMatchId]);

  useEffect(() => {
    void loadMeta();
    const params = new URLSearchParams(window.location.search);
    const steamIdFromUrl = params.get("steamId64")?.trim() ?? "";
    const countFromUrl = Number.parseInt(params.get("count")?.trim() ?? "20", 10);
    const initialSteamId = /^\d{17}$/.test(steamIdFromUrl) ? steamIdFromUrl : DEFAULT_STEAM_ID64;
    const initialCount =
      Number.isFinite(countFromUrl) && countFromUrl >= 1 && countFromUrl <= 50 ? countFromUrl : 20;
    setQuery(initialSteamId);
    setCount(String(initialCount));
    void loadPlayer(initialSteamId, initialCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMeta() {
    setMetaLoading(true);
    setMetaError(null);

    try {
      const response = await fetch("/api/deadlock/meta", {
        method: "GET",
        cache: "no-store",
      });
      const json = (await response.json()) as DeadlockMetaResponse;

      if (!json.ok) {
        setMetaError(json.error);
        setMetaPayload(null);
        return;
      }

      if (!response.ok) {
        setMetaError("Réponse API méta invalide.");
        setMetaPayload(null);
        return;
      }

      setMetaPayload(json);
    } catch {
      setMetaError("Impossible de charger la méta Deadlock.");
      setMetaPayload(null);
    } finally {
      setMetaLoading(false);
    }
  }

  async function loadPlayer(steamId64: string, matchCount: number) {
    setPlayerLoading(true);
    setPlayerError(null);

    try {
      const response = await fetch(
        `/api/deadlock/player?steamId64=${encodeURIComponent(steamId64)}&count=${matchCount}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const json = (await response.json()) as DeadlockPlayerLookupResponse;

      if (!json.ok) {
        setPlayerError(json.error);
        setPlayerPayload(null);
        setSelectedMatchId(null);
        return;
      }

      if (!response.ok) {
        setPlayerError("Réponse API joueur invalide.");
        setPlayerPayload(null);
        setSelectedMatchId(null);
        return;
      }

      setPlayerPayload(json);
      setSelectedMatchId(json.matches[0]?.matchId ?? null);
    } catch {
      setPlayerError("Impossible de contacter le backend du tracker Deadlock.");
      setPlayerPayload(null);
      setSelectedMatchId(null);
    } finally {
      setPlayerLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const steamId64 = query.trim();
    const parsedCount = clamp(Number.parseInt(count, 10) || 20, 1, 50);

    if (!/^\d{17}$/.test(steamId64)) {
      setPlayerError("Entre un SteamID64 valide (17 chiffres).");
      return;
    }

    await loadPlayer(steamId64, parsedCount);
  }

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,127,0.12),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(0,255,255,0.1),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(191,255,0,0.08),transparent_45%)]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.45 }}
          className="flex flex-col items-start gap-4"
        >
          <span className="hero-kicker px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
            Deadlock Tracker • SteamID64 • Match Analytics • Meta Dashboard
          </span>

          <div className="max-w-5xl">
            <h1 className="display-text text-5xl font-extrabold uppercase leading-[0.88] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Deadlock stats <span className="text-neon-pink">profil + matchs</span> et{" "}
              <span className="text-neon-cyan">méta globale</span> dans la même interface.
            </h1>
            <p className="mt-4 max-w-3xl text-sm text-zinc-300 sm:text-base">
              Même direction artistique que ton tracker 2XKO, adaptée à Deadlock: profil joueur,
              historique de matchs, détails KDA / Souls / build / skill build et agrégation méta
              (pick rate, win rate, ban rate, items).
            </p>
          </div>
        </motion.div>

        <motion.form
          {...fadeUp}
          transition={{ duration: 0.45, delay: 0.06 }}
          onSubmit={onSubmit}
          className="panel-cut animate-pulse-neon relative p-3 shadow-panel"
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto]">
            <label htmlFor="steam-id64" className="sr-only">
              SteamID64
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="steam-id64"
                type="text"
                placeholder="76561198000000000"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 w-full bg-black/30 pl-11 pr-4 text-base text-white outline-none ring-1 ring-white/10 transition focus:ring-cyan-300/40"
                autoComplete="off"
                spellCheck={false}
                inputMode="numeric"
              />
            </div>

            <div className="relative">
              <label htmlFor="match-count" className="sr-only">
                Nombre de matchs
              </label>
              <input
                id="match-count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="h-14 w-full bg-black/30 px-4 text-base text-white outline-none ring-1 ring-white/10 transition focus:ring-lime-300/40"
              />
            </div>

            <button
              type="submit"
              disabled={playerLoading}
              className="display-text inline-flex h-14 min-w-40 items-center justify-center gap-2 bg-neon-pink px-6 text-xl font-extrabold uppercase tracking-[0.14em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink"
              style={{
                clipPath:
                  "polygon(0 10px, 10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
              }}
            >
              {playerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {playerLoading ? "Scan..." : "Scan"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
            <span>Recherche par `SteamID64`</span>
            <span>•</span>
            <span>Historique `1-50` matchs</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => void loadMeta()}
              disabled={metaLoading}
              className="inline-flex items-center gap-1 text-neon-cyan hover:brightness-110 disabled:opacity-70"
            >
              {metaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDriveDownload className="h-3.5 w-3.5" />}
              Rafraîchir la méta
            </button>
            <span>•</span>
            <Link href="/leaderboard" className="inline-flex items-center gap-1 text-neon-lime hover:brightness-110">
              <Crown className="h-3.5 w-3.5" />
              Leaderboard
            </Link>
          </div>

          {playerError ? (
            <ErrorBanner message={playerError} />
          ) : null}
          {metaError ? (
            <div className="mt-3">
              <ErrorBanner message={metaError} compact />
            </div>
          ) : null}
        </motion.form>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]"
        >
          <div className="space-y-6">
            <div className="panel-cut grid gap-5 p-5 shadow-panel sm:grid-cols-[1.15fr_0.85fr]">
              <div>
                <SectionHeader
                  icon={<UserRound className="h-4 w-4 text-neon-cyan" />}
                  title="Profil Joueur"
                  suffix="SteamID64"
                />

                {playerPayload ? (
                  <>
                    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
                      <div className="flex min-w-0 items-end gap-3">
                        <GameIcon
                          src={playerPayload.player.avatarUrl}
                          alt={playerPayload.player.personaName}
                          size={56}
                          shape="square"
                          kind="avatar"
                        />
                        <h2 className="display-text min-w-0 truncate text-4xl font-extrabold uppercase text-white sm:text-5xl">
                          {playerPayload.player.personaName}
                        </h2>
                        <RankBadgeVisual
                          iconUrl={playerPayload.player.rankBadgeIconUrl}
                          label={playerPayload.player.rankTier}
                        />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        {playerPayload.player.region}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <IdentityRow
                        label="SteamID64"
                        value={playerPayload.player.steamId64}
                        tone="cyan"
                        mono
                      />
                      <IdentityRow
                        label="Rang / MMR"
                        value={
                          playerPayload.player.rankTier && playerPayload.player.hiddenMmr
                            ? `${playerPayload.player.rankTier} • MMR ${formatNumber(playerPayload.player.hiddenMmr)}`
                            : "Non disponible"
                        }
                        tone="lime"
                        visual={
                          <RankBadgeVisual
                            iconUrl={playerPayload.player.rankBadgeIconUrl}
                            label={playerPayload.player.rankTier}
                            compact
                          />
                        }
                      />
                      <IdentityRow
                        label="Progression"
                        value={`Niveau ${playerPayload.player.accountLevel ?? "N/A"} • ${formatHours(playerPayload.player.totalPlaytimeSeconds)} en match`}
                        tone="pink"
                      />
                    </div>
                  </>
                ) : (
                  <EmptyPanel
                    icon={<UserRound className="h-5 w-5 text-neon-cyan" />}
                    title="Aucun profil chargé"
                    description="Entre un SteamID64 pour charger les statistiques joueur Deadlock."
                  />
                )}
              </div>

              <div className="panel-cut panel-cut-lime grid-faint p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  Résumé Tracker
                </p>

                {playerPayload ? (
                  <div className="mt-4 space-y-3">
                    <StatusLine
                      label="Winrate global"
                      value={`${playerPayload.aggregates.winrate}% (${playerPayload.aggregates.wins}W/${playerPayload.aggregates.losses}L)`}
                      tone="lime"
                    />
                    <StatusLine
                      label="Héros principal"
                      value={playerPayload.aggregates.favoriteHero ?? "N/A"}
                      tone="cyan"
                    />
                    <StatusLine
                      label="Dernier scan"
                      value={formatDateTime(playerPayload.fetchedAt)}
                      tone="pink"
                    />
                  </div>
                ) : (
                  <EmptyPanel
                    icon={<Shield className="h-5 w-5 text-neon-lime" />}
                    title="Prêt au scan"
                    description="Le tracker affichera profil, matchs et détails d’économie Souls."
                  />
                )}
              </div>
            </div>

            {playerPayload ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="panel-cut p-5 shadow-panel">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="display-text text-2xl font-bold uppercase text-white">
                      Stats Globales
                    </h3>
                    <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                      Profil
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Winrate" value={`${playerPayload.aggregates.winrate}%`} tone="lime" />
                    <MetricCard
                      label="Matchs"
                      value={String(playerPayload.aggregates.totalMatches)}
                      tone="cyan"
                    />
                    <MetricCard
                      label="KDA Moyen"
                      value={String(playerPayload.aggregates.averageKdaRatio)}
                      tone="pink"
                    />
                    <MetricCard
                      label="KDA/min"
                      value={String(playerPayload.aggregates.averageKdaPerMinute)}
                      tone="cyan"
                    />
                    <MetricCard
                      label="SPM Moyen"
                      value={String(playerPayload.aggregates.averageSpm)}
                      tone="lime"
                    />
                    <MetricCard
                      label="Souls Totales"
                      value={compactNumber(playerPayload.aggregates.totalSouls)}
                      tone="pink"
                    />
                  </div>

                  <div className="mt-4 grid gap-2">
                    <SimpleLine
                      label="Player Damage cumulé"
                      value={compactNumber(playerPayload.aggregates.totalHeroDamage)}
                      icon={<Target className="h-4 w-4 text-neon-cyan" />}
                    />
                    <SimpleLine
                      label="Objective Damage cumulé"
                      value={compactNumber(playerPayload.aggregates.totalObjectiveDamage)}
                      icon={<Swords className="h-4 w-4 text-neon-pink" />}
                    />
                    <SimpleLine
                      label="Healing cumulé"
                      value={compactNumber(playerPayload.aggregates.totalHealing)}
                      icon={<Flame className="h-4 w-4 text-neon-lime" />}
                    />
                  </div>
                </div>

                <div className="panel-cut panel-cut-lime p-5 shadow-panel">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="display-text text-2xl font-bold uppercase text-white">
                      Historique des Matchs
                    </h3>
                    <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                      {playerPayload.matches.length} récents
                    </span>
                  </div>

                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {playerPayload.matches.map((match) => (
                      <button
                        key={match.matchId}
                        type="button"
                        onClick={() => setSelectedMatchId(match.matchId)}
                        className={`grid w-full grid-cols-[auto_auto_1fr_auto] items-center gap-3 border px-3 py-2 text-left transition ${
                          selectedMatch?.matchId === match.matchId
                            ? "border-cyan-300/30 bg-cyan-300/5"
                            : "border-white/5 bg-black/20 hover:border-white/15"
                        }`}
                        style={{
                          clipPath:
                            "polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
                        }}
                      >
                        <span
                          className={`display-text inline-flex min-w-9 justify-center px-2 py-1 text-lg font-bold ${
                            match.result === "WIN"
                              ? "bg-lime-300/15 text-neon-lime"
                              : "bg-pink-300/10 text-neon-pink"
                          }`}
                          style={{
                            clipPath:
                              "polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%)",
                          }}
                        >
                          {match.result === "WIN" ? "W" : "L"}
                        </span>

                        <GameIcon
                          src={match.heroIconUrl}
                          alt={match.hero}
                          size={36}
                          shape="square"
                          kind="hero"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">
                            {match.hero} • {match.mode}
                          </p>
                          <p className="truncate text-xs text-zinc-400">
                            {formatShortDate(match.startedAt)} • KDA {match.kda.kills}/{match.kda.deaths}/
                            {match.kda.assists} • SPM {match.economy.soulsPerMinute}
                          </p>
                        </div>

                        <span className="text-xs text-zinc-400">{formatDuration(match.durationSeconds)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="panel-cut p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="display-text text-2xl font-bold uppercase text-white">
                  Détails de Match
                </h3>
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                  Match_ID
                </span>
              </div>

              {selectedMatch ? (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="border border-white/5 bg-black/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="display-text text-3xl font-extrabold uppercase text-white">
                            {selectedMatch.hero}
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {selectedMatch.mode} • Patch {selectedMatch.patchVersion} •{" "}
                            {formatDateTime(selectedMatch.startedAt)}
                          </p>
                          <p className="mt-2 font-mono text-xs text-zinc-400">
                            {selectedMatch.matchId}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`display-text inline-flex items-center px-3 py-1 text-xl font-bold ${
                              selectedMatch.result === "WIN"
                                ? "bg-lime-300/15 text-neon-lime"
                                : "bg-pink-300/10 text-neon-pink"
                            }`}
                            style={{
                              clipPath:
                                "polygon(0 7px, 7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%)",
                            }}
                          >
                            {selectedMatch.result}
                          </span>
                          <span className="text-xs text-zinc-400">
                            Durée {formatDuration(selectedMatch.durationSeconds)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <MetricCard
                          label="KDA"
                          value={`${selectedMatch.kda.kills}/${selectedMatch.kda.deaths}/${selectedMatch.kda.assists}`}
                          tone="cyan"
                        />
                        <MetricCard
                          label="Ratio KDA"
                          value={String(selectedMatch.kda.ratio)}
                          tone="pink"
                        />
                        <MetricCard
                          label="KDA/min"
                          value={String(selectedMatch.kda.perMinute)}
                          tone="lime"
                        />
                        <MetricCard
                          label="SPM"
                          value={String(selectedMatch.economy.soulsPerMinute)}
                          tone="cyan"
                        />
                      </div>
                    </div>

                    <div className="panel-cut panel-cut-lime grid-faint p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                        Performance de combat
                      </p>
                      <div className="mt-4 grid gap-3">
                        <CombatStatRow
                          label="Player Damage"
                          value={selectedMatch.combat.playerDamage}
                          tone="cyan"
                          icon={<Crosshair className="h-4 w-4" />}
                        />
                        <CombatStatRow
                          label="Objective Damage"
                          value={selectedMatch.combat.objectiveDamage}
                          tone="pink"
                          icon={<Target className="h-4 w-4" />}
                        />
                        <CombatStatRow
                          label="Healing"
                          value={selectedMatch.combat.healing}
                          tone="lime"
                          icon={<Flame className="h-4 w-4" />}
                        />
                        <CombatStatRow
                          label="Souls Totales"
                          value={selectedMatch.economy.totalSouls}
                          tone="lime"
                          icon={<Wallet className="h-4 w-4" />}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="panel-cut p-5 shadow-panel">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="display-text text-xl font-bold uppercase text-white">
                          Économie (Souls)
                        </h4>
                        <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                          Répartition
                        </span>
                      </div>

                      <div className="space-y-3">
                        <BreakdownRow
                          label="Creeps"
                          value={selectedMatch.economy.breakdown.creeps}
                          total={selectedMatch.economy.totalSouls}
                          tone="cyan"
                        />
                        <BreakdownRow
                          label="Joueurs"
                          value={selectedMatch.economy.breakdown.players}
                          total={selectedMatch.economy.totalSouls}
                          tone="pink"
                        />
                        <BreakdownRow
                          label="Objectifs"
                          value={selectedMatch.economy.breakdown.objectives}
                          total={selectedMatch.economy.totalSouls}
                          tone="lime"
                        />
                        <BreakdownRow
                          label="Autres"
                          value={selectedMatch.economy.breakdown.other}
                          total={selectedMatch.economy.totalSouls}
                          tone="cyan"
                          faint
                        />
                      </div>

                      <div className="mt-4 border border-white/5 bg-black/20 p-3 text-xs text-zinc-300">
                        <p>
                          Total Souls: <span className="font-semibold text-white">{formatNumber(selectedMatch.economy.totalSouls)}</span>
                        </p>
                        <p className="mt-1">
                          Souls per Minute (SPM):{" "}
                          <span className="font-semibold text-white">
                            {selectedMatch.economy.soulsPerMinute}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="panel-cut panel-cut-lime p-5 shadow-panel">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="display-text text-xl font-bold uppercase text-white">
                          Build & Équipement
                        </h4>
                        <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                          Ordre d’achat
                        </span>
                      </div>

                      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {selectedMatch.build.items.map((item) => (
                          <div
                            key={`${selectedMatch.matchId}-item-${item.order}`}
                            className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 border border-white/5 bg-black/20 px-3 py-2"
                          >
                            <span className="display-text text-lg font-bold text-neon-cyan">
                              #{item.order}
                            </span>
                            <GameIcon
                              src={item.iconUrl}
                              alt={item.itemName}
                              size={32}
                              shape="square"
                              kind="item"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm text-white">{item.itemName}</p>
                              <p className="text-xs text-zinc-400">
                                Tier {item.tier} • {formatNumber(item.cost)} souls • {formatDuration(item.atSecond)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-zinc-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="panel-cut p-5 shadow-panel">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="display-text text-xl font-bold uppercase text-white">
                        Skill Build
                      </h4>
                      <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                        Ordre d’amélioration
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {selectedMatch.build.skills.map((skill) => (
                        <div
                          key={`${selectedMatch.matchId}-skill-${skill.order}`}
                          className="border border-white/5 bg-black/20 px-3 py-2"
                          style={{
                            clipPath:
                              "polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
                          }}
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                            Upgrade #{skill.order}
                          </p>
                          <p className="display-text mt-1 text-lg font-bold text-white">
                            {skill.ability}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Niveau {skill.levelAfter} • {formatDuration(skill.atSecond)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyPanel
                  icon={<Boxes className="h-5 w-5 text-neon-pink" />}
                  title="Aucun match sélectionné"
                  description="Sélectionne une partie dans l’historique pour voir KDA, Souls, dégâts, build et skill build."
                />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel-cut panel-cut-lime p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="display-text text-2xl font-bold uppercase text-white">
                  Méta Globale (Héros)
                </h3>
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                  Pick / Win / Ban
                </span>
              </div>

              {metaPayload ? (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <MetricCard label="Joueurs" value={String(metaPayload.populationPlayers)} tone="cyan" />
                    <MetricCard label="Matchs" value={String(metaPayload.populationMatches)} tone="lime" />
                  </div>

                  <div className="space-y-2">
                    {[...metaPayload.heroStats]
                      .sort(
                        (a, b) =>
                          b.winRate - a.winRate ||
                          b.pickRate - a.pickRate ||
                          b.picks - a.picks,
                      )
                      .slice(0, 10)
                      .map((hero) => (
                        <MetaHeroRow
                          key={hero.hero}
                          stat={hero}
                          totalMatches={metaPayload.populationMatches}
                        />
                      ))}
                  </div>

                  <p className="mt-3 text-xs text-zinc-400">
                    {metaPayload.patchLabel} • MAJ {formatDateTime(metaPayload.fetchedAt)}
                  </p>
                </>
              ) : (
                <EmptyPanel
                  icon={<TrendingUp className="h-5 w-5 text-neon-lime" />}
                  title="Méta indisponible"
                  description="Le panneau affichera le pick rate, win rate et ban rate agrégés."
                />
              )}
            </div>

            <div className="panel-cut p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="display-text text-2xl font-bold uppercase text-white">
                  Win Rate par Item
                </h3>
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                  Par héros
                </span>
              </div>

              {metaPayload ? (
                <div className="space-y-2">
                  {metaPayload.itemStats.slice(0, 12).map((itemStat, index) => (
                    <div
                      key={`${itemStat.hero}-${itemStat.item}-${index}`}
                      className="grid grid-cols-[1fr_auto] gap-3 border border-white/5 bg-black/20 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">
                          {itemStat.hero} • {itemStat.item}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Sample {itemStat.sampleSize} • achat moyen #{itemStat.avgPurchaseOrder}
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden bg-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan"
                            style={{ width: `${clamp(itemStat.winRate, 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex min-w-20 flex-col items-end justify-center">
                        <p className="display-text text-2xl font-extrabold text-neon-pink">
                          {itemStat.winRate}%
                        </p>
                        <p className="text-xs text-zinc-400">WR</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  icon={<Wallet className="h-5 w-5 text-neon-cyan" />}
                  title="Items indisponibles"
                  description="La table affichera les items qui corrèlent avec la victoire selon le héros."
                />
              )}
            </div>
          </div>
        </motion.section>
      </section>
    </main>
  );
}

function ErrorBanner({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <div
      className={`mt-3 flex items-start gap-2 border border-pink-300/20 bg-pink-300/5 px-3 py-2 text-pink-100 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
      <p>{message}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  suffix,
}: {
  icon: ReactNode;
  title: string;
  suffix?: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
      {icon}
      <span>{title}</span>
      <span className="h-px flex-1 bg-white/10" />
      {suffix ? <span>{suffix}</span> : null}
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-2 border border-white/5 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="display-text text-xl font-bold uppercase text-white">{title}</p>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}

function IdentityRow({
  label,
  value,
  tone,
  mono,
  visual,
}: {
  label: string;
  value: string;
  tone: "pink" | "cyan" | "lime";
  mono?: boolean;
  visual?: ReactNode;
}) {
  const toneClass =
    tone === "pink"
      ? "border-pink-300/20 bg-pink-300/5"
      : tone === "cyan"
        ? "border-cyan-300/20 bg-cyan-300/5"
        : "border-lime-300/20 bg-lime-300/5";

  return (
    <div className={`border px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {visual}
        <p className={`text-sm font-medium text-white ${mono ? "font-mono break-all" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "pink" | "cyan" | "lime";
}) {
  const color =
    tone === "pink"
      ? "text-neon-pink"
      : tone === "cyan"
        ? "text-neon-cyan"
        : "text-neon-lime";

  return (
    <div className="flex items-center justify-between gap-3 border border-white/5 bg-black/20 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.15em] text-zinc-300">{label}</span>
      <span className={`text-right text-xs font-semibold uppercase tracking-[0.14em] ${color}`}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "pink" | "cyan" | "lime";
}) {
  const color =
    tone === "pink"
      ? "text-neon-pink"
      : tone === "cyan"
        ? "text-neon-cyan"
        : "text-neon-lime";

  return (
    <div className="border border-white/5 bg-black/20 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">{label}</p>
      <p className={`display-text mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function SimpleLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-white/5 bg-black/20 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate text-sm text-zinc-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function CombatStatRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "pink" | "cyan" | "lime";
}) {
  const color =
    tone === "pink"
      ? "text-neon-pink"
      : tone === "cyan"
        ? "text-neon-cyan"
        : "text-neon-lime";

  return (
    <div className="flex items-center justify-between gap-3 border border-white/5 bg-black/20 px-3 py-2">
      <div className="flex items-center gap-2 text-zinc-300">
        <span className={color}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className={`display-text text-xl font-bold ${color}`}>{compactNumber(value)}</span>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  total,
  tone,
  faint,
}: {
  label: string;
  value: number;
  total: number;
  tone: "pink" | "cyan" | "lime";
  faint?: boolean;
}) {
  const pct = total > 0 ? clamp((value / total) * 100, 0, 100) : 0;
  const colorClass =
    tone === "pink"
      ? "from-neon-pink to-pink-300"
      : tone === "cyan"
        ? "from-neon-cyan to-cyan-300"
        : "from-neon-lime to-lime-300";

  return (
    <div className={`border px-3 py-3 ${faint ? "border-white/5 bg-black/20" : "border-white/10 bg-black/25"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-200">{label}</span>
        <span className="text-xs text-zinc-400">
          {formatNumber(value)} • {round1(pct)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden bg-white/5">
        <div
          className={`h-full bg-gradient-to-r ${colorClass}`}
          style={{ width: `${pct}%`, opacity: faint ? 0.7 : 1 }}
        />
      </div>
    </div>
  );
}

function MetaHeroRow({
  stat,
  totalMatches,
}: {
  stat: DeadlockMetaPayload["heroStats"][number];
  totalMatches: number;
}) {
  return (
    <div className="border border-white/5 bg-black/20 px-3 py-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GameIcon src={stat.heroIconUrl} alt={stat.hero} size={30} shape="square" kind="hero" />
            <p className="truncate text-sm text-white">{stat.hero}</p>
          </div>
          <p className="text-xs text-zinc-400">
            {stat.picks} picks / {totalMatches} matchs • {stat.wins} wins
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <MetaStatBadge label="Pick" value={`${stat.pickRate}%`} tone="cyan" />
          <MetaStatBadge label="Win" value={`${stat.winRate}%`} tone="lime" />
          <MetaStatBadge
            label="Ban"
            value={stat.banRate !== null ? `${stat.banRate}%` : "N/A"}
            tone="pink"
          />
        </div>
      </div>
    </div>
  );
}

function GameIcon({
  src,
  alt,
  size = 32,
  shape = "square",
  kind = "hero",
}: {
  src?: string | null;
  alt: string;
  size?: number;
  shape?: "square" | "circle";
  kind?: "hero" | "item" | "avatar" | "rank";
}) {
  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-[6px]";
  const borderClass =
    kind === "item"
      ? "border-cyan-300/15"
      : kind === "rank"
        ? "border-lime-300/20"
        : "border-white/10";

  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center border bg-black/30 text-[10px] uppercase tracking-[0.14em] text-zinc-500 ${roundedClass} ${borderClass}`}
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 2)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden border bg-black/30 ${roundedClass} ${borderClass}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

function RankBadgeVisual({
  iconUrl,
  label,
  compact,
}: {
  iconUrl?: string | null;
  label?: string | null;
  compact?: boolean;
}) {
  if (!iconUrl && !label) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 border border-lime-300/15 bg-lime-300/5 ${
        compact ? "px-2 py-1" : "px-2 py-1.5"
      }`}
      style={{
        clipPath:
          "polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
      }}
    >
      <GameIcon src={iconUrl} alt={label ?? "Rank"} size={compact ? 20 : 24} shape="square" kind="rank" />
      {!compact ? (
        <span className="text-[10px] uppercase tracking-[0.16em] text-neon-lime">
          {label ?? "Rank"}
        </span>
      ) : null}
    </div>
  );
}

function MetaStatBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "pink" | "cyan" | "lime";
}) {
  const toneClass =
    tone === "pink"
      ? "text-neon-pink"
      : tone === "cyan"
        ? "text-neon-cyan"
        : "text-neon-lime";
  return (
    <div className="min-w-[66px] border border-white/5 bg-black/30 px-2 py-1">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className={`display-text text-base font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "N/A";
  }
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatHours(seconds: number) {
  const hours = seconds / 3600;
  return `${round1(hours)} h`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
