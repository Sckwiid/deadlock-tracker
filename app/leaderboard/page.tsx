"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Loader2,
  RefreshCw,
  Trophy,
  UserRound,
} from "lucide-react";
import type {
  DeadlockLeaderboardRegion,
  DeadlockLeaderboardResponse,
  DeadlockLeaderboardPayload,
} from "@/lib/types/deadlock";

const REGIONS: DeadlockLeaderboardRegion[] = [
  "Europe",
  "Asia",
  "NAmerica",
  "SAmerica",
  "Oceania",
];

export default function LeaderboardPage() {
  const [region, setRegion] = useState<DeadlockLeaderboardRegion>("Europe");
  const [limit, setLimit] = useState("100");
  const [payload, setPayload] = useState<DeadlockLeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadLeaderboard("Europe", 100);
  }, []);

  const topCount = useMemo(() => payload?.entries.length ?? 0, [payload]);

  async function loadLeaderboard(nextRegion: DeadlockLeaderboardRegion, nextLimit: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/deadlock/leaderboard?region=${encodeURIComponent(nextRegion)}&limit=${nextLimit}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const json = (await response.json()) as DeadlockLeaderboardResponse;
      if (!json.ok) {
        setError(json.error);
        setPayload(null);
        return;
      }
      if (!response.ok) {
        setError("Erreur lors du chargement du leaderboard.");
        setPayload(null);
        return;
      }
      setPayload(json);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Erreur réseau.";
      setError(message);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(limit, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
      setError("Le champ limite doit être entre 1 et 200.");
      return;
    }
    void loadLeaderboard(region, parsed);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-12">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Deadlock Tracker</p>
            <h1 className="display-text mt-2 text-4xl font-extrabold uppercase text-white sm:text-6xl">
              Leaderboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-300 sm:text-base">
              Classement global par région avec badges de rang et héros principaux. Même DA, page séparée.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/30 hover:text-neon-cyan"
            style={{
              clipPath:
                "polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour Tracker
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="panel-cut mb-6 grid gap-4 p-4 shadow-panel md:grid-cols-[1fr_180px_220px]"
        >
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">Région</span>
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value as DeadlockLeaderboardRegion)}
              className="h-12 border border-cyan-300/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-300/35"
            >
              {REGIONS.map((value) => (
                <option key={value} value={value} className="bg-zinc-900">
                  {formatRegion(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">Top</span>
            <input
              type="number"
              min={1}
              max={200}
              step={1}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="h-12 border border-cyan-300/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-cyan-300/35"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-auto inline-flex h-12 items-center justify-center gap-2 bg-neon-pink px-4 text-sm font-extrabold uppercase tracking-[0.2em] text-black transition hover:brightness-110 disabled:opacity-70"
            style={{
              clipPath:
                "polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Charger
          </button>

          {error ? (
            <div className="md:col-span-3">
              <ErrorBanner message={error} />
            </div>
          ) : null}
        </form>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="panel-cut p-5 shadow-panel">
              <SectionHeader
                icon={<Trophy className="h-4 w-4 text-neon-lime" />}
                title="Résumé"
                suffix="Leaderboard"
              />
              {payload ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Région" value={formatRegion(payload.region)} tone="cyan" />
                  <MetricCard label="Entrées Chargées" value={String(topCount)} tone="lime" />
                  <MetricCard label="Total API" value={String(payload.totalEntries)} tone="pink" />
                  <MetricCard label="MAJ" value={formatDateTime(payload.fetchedAt)} tone="cyan" compact />
                </div>
              ) : (
                <EmptyPanel
                  icon={<Trophy className="h-5 w-5 text-neon-lime" />}
                  title="Aucun leaderboard"
                  description="Choisis une région puis charge les données."
                />
              )}
            </div>

            <div className="panel-cut panel-cut-lime p-5 shadow-panel">
              <SectionHeader
                icon={<Crown className="h-4 w-4 text-neon-pink" />}
                title="Notes"
                suffix="API"
              />
              <div className="mt-3 space-y-2">
                {(payload?.notes ?? [
                  "Le leaderboard provient de deadlock-api.com.",
                  "Les account IDs possibles peuvent être ambigus selon le nom du compte Steam.",
                  "Utilise cette page pour explorer les top joueurs par région.",
                ]).map((note, index) => (
                  <p
                    key={`note-${index}`}
                    className="border border-white/5 bg-black/20 px-3 py-2 text-sm text-zinc-300"
                  >
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="panel-cut p-5 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="display-text text-2xl font-extrabold uppercase text-white">
                Top Joueurs
              </h2>
              <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                {payload ? formatRegion(payload.region) : "—"}
              </span>
            </div>

            {payload ? (
              <div className="max-h-[78vh] space-y-2 overflow-y-auto pr-1">
                {payload.entries.map((entry) => (
                  <LeaderboardRow key={`${entry.position}-${entry.accountName}`} entry={entry} />
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={<UserRound className="h-5 w-5 text-neon-cyan" />}
                title="En attente"
                description="Le classement s’affichera ici."
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function LeaderboardRow({
  entry,
}: {
  entry: DeadlockLeaderboardPayload["entries"][number];
}) {
  return (
    <div className="border border-white/5 bg-black/20 px-3 py-3">
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <div
          className="display-text inline-flex min-w-12 justify-center border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 text-lg font-bold text-neon-cyan"
          style={{
            clipPath:
              "polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
          }}
        >
          #{entry.position}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{entry.accountName}</p>
            <RankBadgeVisual iconUrl={entry.rankBadgeIconUrl} label={entry.rankLabel} compact />
          </div>

          <p className="mt-1 text-xs text-zinc-400">
            {entry.primaryAccountId ? `Account ID ${entry.primaryAccountId}` : "Account ID non résolu"}
            {entry.steamId64 ? ` • SteamID64 ${entry.steamId64}` : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Héros top
            </span>
            {entry.topHeroes.length > 0 ? (
              entry.topHeroes.map((hero) => (
                <span
                  key={`${entry.position}-hero-${hero.heroId}`}
                  className="inline-flex items-center gap-1 border border-white/5 bg-black/25 px-2 py-1"
                >
                  <GameIcon src={hero.heroIconUrl} alt={hero.hero} size={20} shape="square" kind="hero" />
                  <span className="text-xs text-zinc-300">{hero.hero}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">N/A</span>
            )}
          </div>
        </div>

        {entry.steamId64 ? (
          <Link
            href={`/?steamId64=${encodeURIComponent(entry.steamId64)}`}
            className="inline-flex items-center gap-1 border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-200 transition hover:border-cyan-300/25 hover:text-neon-cyan"
          >
            Tracker
          </Link>
        ) : null}
      </div>
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

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border border-pink-300/20 bg-pink-300/5 px-4 py-3 text-sm text-zinc-100">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-neon-pink">!</span>
        <p>{message}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone: "pink" | "cyan" | "lime";
  compact?: boolean;
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
      <p className={`${compact ? "mt-1 text-sm" : "display-text mt-1 text-2xl font-extrabold"} ${color}`}>
        {value}
      </p>
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
  kind?: "hero" | "rank";
}) {
  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-[6px]";
  const borderClass = kind === "rank" ? "border-lime-300/20" : "border-white/10";

  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center border bg-black/30 text-[9px] uppercase tracking-[0.14em] text-zinc-500 ${roundedClass} ${borderClass}`}
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
      <img src={src} alt={alt} width={size} height={size} loading="lazy" className="h-full w-full object-cover" />
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
      className={`inline-flex items-center gap-1.5 border border-lime-300/15 bg-lime-300/5 ${compact ? "px-2 py-1" : "px-2 py-1.5"}`}
      style={{
        clipPath:
          "polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
      }}
    >
      <GameIcon src={iconUrl} alt={label ?? "Rank"} size={compact ? 18 : 22} shape="square" kind="rank" />
      {label ? (
        <span className="text-[10px] uppercase tracking-[0.16em] text-neon-lime">{label}</span>
      ) : null}
    </div>
  );
}

function formatRegion(region: DeadlockLeaderboardRegion) {
  if (region === "NAmerica") return "Amérique du Nord";
  if (region === "SAmerica") return "Amérique du Sud";
  if (region === "Oceania") return "Océanie";
  if (region === "Asia") return "Asie";
  return "Europe";
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
