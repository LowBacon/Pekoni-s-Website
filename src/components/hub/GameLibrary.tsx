"use client";

import { useMemo, useState } from "react";
import { GAME_CATALOG, type GameMeta } from "@/lib/games/config";
import { EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icons";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import GameTile from "./GameTile";

type Filter = "All" | "MineBet" | "Arcade" | "Multiplayer" | "Cases" | "New" | "Popular";
type Sort = "played" | "newest" | "rewards";

const FILTERS: Filter[] = ["All", "MineBet", "Arcade", "Multiplayer", "Cases", "New", "Popular"];

const SORT_LABELS: Record<Sort, string> = {
  played: "Most Played",
  newest: "Newest",
  rewards: "Biggest Rewards",
};

/**
 * The game library. Play counts come from the server so "Most Played" reflects
 * what the community is actually playing rather than a hand-picked order.
 */
export default function GameLibrary({
  playCounts,
}: {
  playCounts: Record<string, number>;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [sort, setSort] = useState<Sort>("played");
  const { sound } = usePreferences();

  const games = useMemo(() => {
    const matches = (game: GameMeta) => {
      if (filter === "All") return true;
      if (filter === "MineBet") return game.category === "originals";
      if (filter === "Cases") return game.category === "cases";
      return game.tags.includes(filter);
    };

    const list = GAME_CATALOG.filter(matches);

    return [...list].sort((a, b) => {
      if (sort === "played") return (playCounts[b.key] ?? 0) - (playCounts[a.key] ?? 0);
      if (sort === "newest") {
        const aNew = a.tags.includes("New") ? 1 : 0;
        const bNew = b.tags.includes("New") ? 1 : 0;
        return bNew - aNew;
      }
      return b.maxBet - a.maxBet;
    });
  }, [filter, sort, playCounts]);

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="hide-scrollbar -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 py-1">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                sound("click");
                setFilter(option);
              }}
              aria-pressed={filter === option}
              className={`min-h-[36px] shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
                filter === option
                  ? "border-[color-mix(in_oklab,var(--color-moss-500)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-moss-500)_13%,transparent)] text-[var(--color-moss-300)]"
                  : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text-dim)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="flex shrink-0 items-center gap-2">
          <Icon name="filter" size={15} className="text-[var(--text-faint)]" />
          <span className="sr-only">Järjestys</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="field min-h-[36px] w-auto py-1.5 pr-8 text-[13px]"
          >
            {(Object.keys(SORT_LABELS) as Sort[]).map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {games.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon="search"
          title="Ei pelejä tällä suodattimella."
          description="Kokeile toista kategoriaa — kaikki Pekonin pelit löytyvät All-välilehdeltä."
          action={
            <button type="button" onClick={() => setFilter("All")} className="btn btn-ghost btn-sm">
              Näytä kaikki
            </button>
          }
        />
      ) : (
        <div className="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameTile key={game.key} game={game} />
          ))}
        </div>
      )}
    </>
  );
}
