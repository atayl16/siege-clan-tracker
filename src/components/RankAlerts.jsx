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

export default function RankAlerts({ previewMode = false, onRankUpdate }) {
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
  
      const { data, error } = await supabase
        .from("members")
        .select("*");  
      if (error) throw error;
      
      // Filter hidden members in JavaScript instead
      const visibleMembers = data.filter(member => !member.hidden);
  
      // Use the memberNeedsRankUpdate utility function
      const membersNeedingUpdate = visibleMembers
        .filter(member => memberNeedsRankUpdate(member))
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
    
    // Set up an interval to refresh data every few minutes if in preview mode
    let intervalId;
    if (previewMode) {
      intervalId = setInterval(fetchMembers, 180000); // 3 minutes
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchMembers, previewMode]);

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

      // Notify parent component if onRankUpdate is provided
      if (onRankUpdate && typeof onRankUpdate === 'function') {
        onRankUpdate();
      }

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

  // Add a refresh button
  const handleRefresh = () => {
    fetchMembers();
  };

  if (loading)
    return <div className="alerts-loading">Loading rank alerts...</div>;
  if (error) return <div className="alerts-error">Error: {error}</div>;
  
  // In preview mode with no alerts, show a shorter message
  if (alerts.length === 0) {
    if (previewMode) {
      return <div className="alerts-empty">No rank updates required.</div>;
    } else {
      return (
        <div className="alerts-empty">
          <p>No rank updates required at this time.</p>
          <button onClick={handleRefresh} className="refresh-button">
            Refresh Data
          </button>
        </div>
      );
    }
  }

  // Limit the number of alerts shown in preview mode
  const displayedAlerts = previewMode ? alerts.slice(0, 3) : alerts;
  const hasMoreAlerts = previewMode && alerts.length > 3;

  return (
    <div className="rank-alerts">
      <div className="rank-alerts__header">
        <h4 className="rank-alerts__title">Members Needing Rank Updates</h4>
        {!previewMode && (
          <button onClick={handleRefresh} className="refresh-button">
            Refresh
          </button>
        )}
      </div>
      
      <div className="rank-alerts__count">
        {alerts.length} {alerts.length === 1 ? "member" : "members"} need
        updates
      </div>

      <ul className="rank-alerts__list">
        {displayedAlerts.map((member) => {
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
      
      {hasMoreAlerts && previewMode && (
        <div className="view-all-link">
          <button
            className="view-all-button"
            onClick={() => {
              document.querySelector('button[data-tab="alerts"]')?.click();
            }}
          >
            View all {alerts.length} alerts
          </button>
        </div>
      )}
    </div>
  );
}
