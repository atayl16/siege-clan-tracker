import React, { useState, useEffect, useCallback } from "react";
import {
  memberNeedsRankUpdate,
  calculateAppropriateRank,
  safeFormat,
  SKILLER_RANK_NAMES,
  FIGHTER_RANK_NAMES,
} from "../utils/rankUtils";
import { titleize } from "../utils/stringUtils";
import { supabase } from "../supabaseClient";
import "./RankAlerts.css";

export default function RankAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine the priority of a rank update
  const getRankUpdatePriority = (member) => {
    if (!member.womrole || !member.calculated_rank) return 0;

    const currentRankLower = member.womrole.toLowerCase();
    const calcRankLower = member.calculated_rank.toLowerCase();

    // Highest priority: completely wrong category (skiller vs fighter)
    const isCurrentSkiller = SKILLER_RANK_NAMES.some((rank) =>
      currentRankLower.includes(rank.toLowerCase())
    );
    const isCurrentFighter = FIGHTER_RANK_NAMES.some((rank) =>
      currentRankLower.includes(rank.toLowerCase())
    );
    const isCalcSkiller = SKILLER_RANK_NAMES.some((rank) =>
      calcRankLower.includes(rank.toLowerCase())
    );

    // If they're in the wrong category entirely (should be skiller but is fighter or vice versa)
    if (
      (isCurrentSkiller && !isCalcSkiller) ||
      (isCurrentFighter && isCalcSkiller)
    ) {
      return 3; // Highest priority
    }

    // Medium priority: more than one rank difference
    // This would need more complex logic to determine rank distance
    // For now, we'll just assign a medium priority to all other mismatches
    return 2;
  };

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all members from Supabase
      const { data, error } = await supabase.from("members").select("*");

      if (error) throw error;

      // Process members to find those needing rank updates
      const membersNeedingUpdate = data
        .filter((member) => memberNeedsRankUpdate(member))
        .map((member) => ({
          ...member,
          calculated_rank: calculateAppropriateRank(member),
        }));

      // Sort members by priority (highest first) then alphabetically
      const sortedMembers = membersNeedingUpdate.sort((a, b) => {
        const priorityA = getRankUpdatePriority(a);
        const priorityB = getRankUpdatePriority(b);

        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }

        return (a.name || "").localeCompare(b.name || "");
      });

      setAlerts(sortedMembers);
      setError(null);
    } catch (err) {
      console.error("Error fetching members for rank alerts:", err);
      setError("Failed to load rank alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Function to handle manual update of a member's rank
  const handleUpdateRank = async (member) => {
    try {
      if (!member.calculated_rank) return;

      const { error } = await supabase
        .from("members")
        .update({ womrole: member.calculated_rank.toLowerCase() })
        .eq("wom_id", member.wom_id);

      if (error) throw error;

      // Remove the updated member from alerts
      setAlerts(alerts.filter((m) => m.wom_id !== member.wom_id));

      // Show a brief success toast
      const successToast = document.createElement("div");
      successToast.className = "rank-update-toast";
      successToast.textContent = `Updated ${member.name} to ${member.calculated_rank}`;
      document.body.appendChild(successToast);

      // Remove the toast after 2 seconds
      setTimeout(() => {
        successToast.classList.add("toast-fade-out");
        setTimeout(() => {
          document.body.removeChild(successToast);
        }, 300);
      }, 2000);
    } catch (err) {
      console.error("Error updating member rank:", err);
      alert("Failed to update rank");
    }
  };

  if (loading)
    return <div className="alerts-loading">Loading rank alerts...</div>;
  if (error) return <div className="alerts-error">Error: {error}</div>;
  if (alerts.length === 0)
    return <div className="alerts-empty">No rank updates required.</div>;

  return (
    <div className="rank-alerts">
      <h4 className="rank-alerts__title">Members Needing Rank Updates</h4>
      <div className="rank-alerts__count">
        {alerts.length} {alerts.length === 1 ? "member" : "members"} need
        updates
      </div>

      <ul className="rank-alerts__list">
        {alerts.map((member) => {
          const priority = getRankUpdatePriority(member);

          return (
            <li
              key={member.wom_id}
              className={`rank-alert priority-${priority}`}
            >
              <div className="rank-alert__header">
                <span className="rank-alert__name">{member.name}</span>
                <button
                  className="rank-alert__update-btn"
                  onClick={() => handleUpdateRank(member)}
                >
                  Update
                </button>
              </div>

              <div className="rank-alert__details">
                <div className="rank-alert__current">
                  Current rank:{" "}
                  <span className="rank-value">{titleize(member.womrole)}</span>
                </div>
                <div className="rank-alert__recommended">
                  Should be:{" "}
                  <span className="rank-value">{member.calculated_rank}</span>
                </div>

                {/* Show relevant stats based on whether they're a skiller or fighter */}
                {member.calculated_rank &&
                SKILLER_RANK_NAMES.includes(member.calculated_rank) ? (
                  <div className="rank-alert__stats">
                    XP: {safeFormat(member.current_xp - member.first_xp)}
                  </div>
                ) : (
                  <div className="rank-alert__stats">
                    EHB: {safeFormat(member.ehb)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
