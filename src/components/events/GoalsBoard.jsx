import React, { useMemo, useState } from "react";
import { FaBullseye } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useUserGoals } from "../../hooks/useUserGoals";
import { useMembers } from "../../hooks/useMembers";
import { filterGoals, sortGoals } from "../../utils/boardFilters";
import LoadingIndicator from "../ui/LoadingIndicator";
import EmptyState from "../ui/EmptyState";
import GoalCard from "../GoalCard";
import BoardFilters from "../BoardFilters";
import NoMatches from "./NoMatches";

/**
 * The Events page's Goals tab: members' public goals, so clan mates can
 * cheer each other on. Your own goals live on your profile.
 */
export default function GoalsBoard() {
  const { user } = useAuth();
  // Without a user id, RLS returns your own goals plus everyone's public ones;
  // the hook's publicGoals keeps only the public ones.
  const { publicGoals: goals, loading } = useUserGoals();

  // user_goals has no player name, and GoalCard shows goal.player_name, so
  // look the character up by wom_id.
  const { members } = useMembers();
  const publicGoals = useMemo(() => {
    const nameById = new Map((members ?? []).map((m) => [Number(m.wom_id), m.name]));
    return (goals ?? []).map((goal) => ({
      ...goal,
      player_name: goal.player_name ?? nameById.get(Number(goal.wom_id)),
    }));
  }, [goals, members]);

  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("progress");
  const shown = useMemo(
    () => sortGoals(filterGoals(publicGoals, { query, type, status }), sort),
    [publicGoals, query, type, status, sort]
  );
  const clear = () => {
    setQuery("");
    setType("all");
    setStatus("all");
  };

  if (loading) return <LoadingIndicator />;
  if (publicGoals.length === 0) {
    return (
      <EmptyState
        icon={<FaBullseye />}
        title="No Public Goals"
        description="No members have shared their goals yet. Make one public from your profile."
      />
    );
  }

  return (
    <>
      <BoardFilters
        query={query}
        onQueryChange={setQuery}
        placeholder="Search characters, skills or bosses"
        groups={[
          {
            label: "Goal type",
            value: type,
            onChange: setType,
            options: [
              { value: "all", label: "All" },
              { value: "skill", label: "Skills" },
              { value: "boss", label: "Bosses" },
            ],
          },
          {
            label: "Goal status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "completed", label: "Completed" },
            ],
          },
        ]}
        sort={{
          value: sort,
          onChange: setSort,
          options: [
            { value: "progress", label: "Closest to done" },
            { value: "newest", label: "Newest" },
            { value: "deadline", label: "Deadline" },
          ],
        }}
        shown={shown.length}
        total={publicGoals.length}
        onClear={clear}
      />
      {shown.length === 0 ? (
        <NoMatches what="goals" onClear={clear} />
      ) : (
        <div className="ui-goals-grid">
          {shown.map((goal) => (
            <GoalCard key={goal.id} goal={goal} isOwner={Boolean(user) && goal.user_id === user.id} />
          ))}
        </div>
      )}
    </>
  );
}
