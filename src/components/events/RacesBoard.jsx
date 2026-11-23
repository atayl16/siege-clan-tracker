import React, { useMemo, useState } from "react";
import { FaTrophy } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useRaces } from "../../hooks/useRaces";
import { canEditRace } from "../../utils/races";
import { filterRaces } from "../../utils/boardFilters";
import LoadingIndicator from "../ui/LoadingIndicator";
import EmptyState from "../ui/EmptyState";
import RaceCard from "../RaceCard";
import BoardFilters from "../BoardFilters";
import NoMatches from "./NoMatches";

/**
 * The Events page's Races tab: every public race. Your own races, and
 * creating one, live on your profile.
 */
export default function RacesBoard() {
  const { user } = useAuth();
  // RLS (races_read) limits `races` to public races plus your own; the board
  // shows only the public ones.
  const { races, loading, refreshProgress } = useRaces(user?.id);
  // The Refresh button asks WiseOldMan for fresh hiscores, which needs a
  // signed-in member; visitors still get the automatic refresh on open.
  const refreshRace = user ? (raceId) => refreshProgress([raceId], { force: true }) : undefined;
  const publicRaces = useMemo(() => (races ?? []).filter((race) => race.public === true), [races]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const shown = useMemo(() => filterRaces(publicRaces, { query, status }), [publicRaces, query, status]);
  const clear = () => {
    setQuery("");
    setStatus("all");
  };

  if (loading) return <LoadingIndicator />;
  if (publicRaces.length === 0) {
    return (
      <EmptyState
        icon={<FaTrophy />}
        title="No Public Races"
        description="No public races yet. Start one from your profile and challenge your clan mates."
      />
    );
  }

  return (
    <>
      <BoardFilters
        query={query}
        onQueryChange={setQuery}
        placeholder="Search races or racers"
        groups={[
          {
            label: "Race status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "finished", label: "Finished" },
            ],
          },
        ]}
        shown={shown.length}
        total={publicRaces.length}
        onClear={clear}
      />
      {shown.length === 0 ? (
        <NoMatches what="races" onClear={clear} />
      ) : (
        <div className="ui-races-grid">
          {shown.map((race) => (
            <RaceCard key={race.id} race={race} isOwner={canEditRace(race, user)} onRefresh={refreshRace} />
          ))}
        </div>
      )}
    </>
  );
}
