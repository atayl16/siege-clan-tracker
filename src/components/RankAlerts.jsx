import React, { useState, useEffect, useMemo } from "react";
import {
  memberNeedsRankUpdate,
  calculateAppropriateRank,
  safeFormat,
  SKILLER_RANK_NAMES,
  FIGHTER_RANK_NAMES,
} from "../utils/rankUtils";
import { titleize } from "../utils/stringUtils";
import { useMembers, useMembersAdmin } from "../context/DataContext";
import { FaExchangeAlt, FaCheck, FaExclamationTriangle } from "react-icons/fa";

// Import UI components
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

import "./RankAlerts.css";

export default function RankAlerts({ previewMode = false, onRankUpdate }) {
  const [alerts, setAlerts] = useState([]);
  
  // Use the context hooks instead of direct Supabase queries
  const { 
    members, 
    loading: membersLoading, 
    error: membersError,
    refreshMembers 
  } = useMembers();
  
  const { updateMember } = useMembersAdmin();

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
    return 2;
  };

  // Process the members data whenever it changes
  useMemo(() => {
    if (!members) return;
    
    try {
      // Filter hidden members
      const visibleMembers = members.filter(member => !member.hidden);
      
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
    } catch (err) {
      console.error("Error processing members for rank alerts:", err);
    }
  }, [members]);

  useEffect(() => {
    // Set up an interval to refresh data every few minutes if in preview mode
    let intervalId;
    if (previewMode) {
      intervalId = setInterval(refreshMembers, 180000); // 3 minutes
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [previewMode, refreshMembers]);

  // Function to handle manual update of a member's rank
  const handleUpdateRank = async (member) => {
    try {
      if (!member.calculated_rank) return;

      // Create updated member object with new rank
      const updatedMember = {
        ...member,
        womrole: member.calculated_rank.toLowerCase()
      };
      
      // Use the updateMember function from the context
      await updateMember(updatedMember);

      // Remove the updated member from alerts
      setAlerts(alerts.filter((m) => m.wom_id !== member.wom_id));

      // Notify parent component if onRankUpdate is provided
      if (onRankUpdate && typeof onRankUpdate === 'function') {
        onRankUpdate();
      }

      // Refresh the members data after update
      refreshMembers();

      // Show a brief success toast
      const successToast = document.createElement("div");
      successToast.className = "ui-rank-update-toast";
      successToast.textContent = `Updated ${member.name} to ${member.calculated_rank}`;
      document.body.appendChild(successToast);

      // Remove the toast after 2 seconds
      setTimeout(() => {
        successToast.classList.add("ui-toast-fade-out");
        setTimeout(() => {
          document.body.removeChild(successToast);
        }, 300);
      }, 2000);
    } catch (err) {
      console.error("Error updating member rank:", err);
      alert("Failed to update rank");
    }
  };

  // Loading state
  if (membersLoading) {
    return (
      <div className="ui-loading-container ui-rank-alerts-loading">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading rank alerts...</div>
      </div>
    );
  }
  
  // Error state
  if (membersError) {
    return (
      <div className="ui-message ui-message-error ui-rank-alerts-error">
        <FaExclamationTriangle className="ui-message-icon" />
        <span>Failed to load rank alerts: {membersError.message || String(membersError)}</span>
      </div>
    );
  }
  
  // In preview mode with no alerts, show a shorter message
  if (alerts.length === 0) {
    if (previewMode) {
      return (
        <div className="ui-no-alerts">
          <FaCheck className="ui-success-icon" />
          <span>No rank updates required</span>
        </div>
      );
    } else {
      return (
        <EmptyState
          title="No Rank Updates Required"
          description="All members currently have the correct rank."
          icon={<FaCheck className="ui-empty-state-icon" />}
        />
      );
    }
  }

  // Limit the number of alerts shown in preview mode
  const displayedAlerts = previewMode ? alerts.slice(0, 3) : alerts;
  const hasMoreAlerts = previewMode && alerts.length > 3;

  return (
    <Card variant="dark" className="ui-rank-alerts-container">
      <Card.Header className="ui-rank-alerts-header">
        <h3 className="ui-rank-alerts-title">
          Members Needing Rank Updates
          <Badge variant="warning" pill className="ui-alerts-count">
            {alerts.length}
          </Badge>
        </h3>
      </Card.Header>
      
      <Card.Body>
        <ul className="ui-reported-members-list">
          {displayedAlerts.map((member) => {
            const priority = getRankUpdatePriority(member);
            
            return (
              <li
                key={member.wom_id}
                className={`ui-reported-member-item ui-priority-${priority}`}
              >
                <div className="ui-member-info">
                  <div className="ui-reported-member-name">{member.name}</div>
                  <div className="ui-rank-details">
                    <div className="ui-current-rank">
                      Current: <strong>{titleize(member.womrole)}</strong>
                    </div>
                    <div className="ui-recommended-rank">
                      Should be: <strong>{member.calculated_rank}</strong>
                    </div>
                    
                    {/* Show relevant stats based on whether they're a skiller or fighter */}
                    {member.calculated_rank &&
                    SKILLER_RANK_NAMES.includes(member.calculated_rank) ? (
                      <div className="ui-member-stats">
                        XP: <strong>{safeFormat(member.current_xp - member.first_xp)}</strong>
                      </div>
                    ) : (
                      <div className="ui-member-stats">
                        EHB: <strong>{safeFormat(member.ehb)}</strong>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUpdateRank(member)}
                  icon={<FaExchangeAlt />}
                >
                  Update Rank
                </Button>
              </li>
            );
          })}
        </ul>
        
        {hasMoreAlerts && previewMode && (
          <div className="ui-view-all-container">
            <Button
              variant="secondary"
              size="sm"
              className="ui-view-all-button"
              onClick={() => {
                document.querySelector('button[data-tab="alerts"]')?.click();
              }}
            >
              View all {alerts.length} alerts
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
