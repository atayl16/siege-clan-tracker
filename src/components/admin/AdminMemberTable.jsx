import React, { useState, useMemo } from "react";
import { useData } from "../../context/DataContext";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaChevronDown,
  FaChevronUp,
  FaSync,
} from "react-icons/fa";
import { titleize } from "../../utils/stringUtils";
import { useCallback } from "react";

// Import UI components
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import "./AdminMemberTable.css";

export default function AdminMemberTable({
  members,
  onEditClick,
  onDeleteClick,
  onRefresh,
}) {
  const {
    group,
    loading: womLoading,
    updateMember,
    refreshWomData,
  } = useData();
  const [expandedRow, setExpandedRow] = useState(null);
  const [refreshing, setRefreshing] = useState(null);

  // Enhanced member data with WOM data - no changes here
  const enhancedMembers = useMemo(() => {
    if (!members || !group?.memberships) return members;

    const womMembersMap = {};
    group.memberships.forEach((membership) => {
      if (membership.player?.id) {
        womMembersMap[membership.player.id] = {
          ...membership.player,
          role: membership.role,
        };
      }
    });

    return members.map((member) => {
      const womMember = member.wom_id ? womMembersMap[member.wom_id] : null;

      if (womMember) {
        return {
          ...member,
          current_xp:
            womMember.latestSnapshot?.data?.skills?.overall?.experience ||
            member.current_xp,
          current_lvl:
            womMember.latestSnapshot?.data?.skills?.overall?.level ||
            member.current_lvl,
          womrole: womMember.role || member.womrole,
          ehb: womMember.ehb || member.ehb,
        };
      }
      return member;
    });
  }, [members, group]);

  const isAdmin = (member) => {
    const role = (member.womrole || "").toLowerCase();
    return (
      role.includes("admin") ||
      role.includes("moderator") ||
      role.includes("owner") ||
      role.includes("mod")
    );
  };

  // Calculate the correct role
  const calculateCorrectRole = (member) => {
    const womRole = (member.womrole || "").toLowerCase();
    const isSkiller =
      womRole.includes("opal") ||
      womRole.includes("sapphire") ||
      womRole.includes("emerald") ||
      womRole.includes("ruby") ||
      womRole.includes("diamond") ||
      womRole.includes("dragonstone") ||
      womRole.includes("onyx") ||
      womRole.includes("zenyte");

    const isFighter =
      womRole.includes("mentor") ||
      womRole.includes("prefect") ||
      womRole.includes("leader") ||
      womRole.includes("supervisor") ||
      womRole.includes("superior") ||
      womRole.includes("executive") ||
      womRole.includes("senator") ||
      womRole.includes("monarch") ||
      womRole.includes("tzkal");

    // If current role is skiller, check if it's the correct skiller rank
    if (isSkiller) {
      const clanXp =
        (parseInt(member.current_xp) || 0) - (parseInt(member.first_xp) || 0);

      let correctRole;
      if (clanXp >= 500000000) correctRole = "zenyte";
      else if (clanXp >= 150000000) correctRole = "onyx";
      else if (clanXp >= 90000000) correctRole = "dragonstone";
      else if (clanXp >= 40000000) correctRole = "diamond";
      else if (clanXp >= 15000000) correctRole = "ruby";
      else if (clanXp >= 8000000) correctRole = "emerald";
      else if (clanXp >= 3000000) correctRole = "sapphire";
      else correctRole = "opal";

      if (!womRole.includes(correctRole)) {
        return { hasCorrectRole: false, correctRole, currentType: "skiller" };
      }
    }

    // If current role is fighter, check if it's the correct fighter rank
    else if (isFighter) {
      const ehb = parseInt(member.ehb) || 0;

      let correctRole;
      if (ehb >= 1500) correctRole = "tzkal";
      else if (ehb >= 1300) correctRole = "monarch";
      else if (ehb >= 1100) correctRole = "senator";
      else if (ehb >= 900) correctRole = "executive";
      else if (ehb >= 700) correctRole = "superior";
      else if (ehb >= 500) correctRole = "supervisor";
      else if (ehb >= 300) correctRole = "leader";
      else if (ehb >= 100) correctRole = "prefect";
      else correctRole = "mentor";

      if (!womRole.includes(correctRole)) {
        return { hasCorrectRole: false, correctRole, currentType: "fighter" };
      }
    }

    // Default - role is correct or couldn't determine
    return { hasCorrectRole: true, currentType: isSkiller ? "skiller" : isFighter ? "fighter" : "unknown" };
  };

  const calculateAlternativeRank = (member) => {
    const womRole = (member.womrole || "").toLowerCase();
    const isSkiller =
      womRole.includes("opal") ||
      womRole.includes("sapphire") ||
      womRole.includes("emerald") ||
      womRole.includes("ruby") ||
      womRole.includes("diamond") ||
      womRole.includes("dragonstone") ||
      womRole.includes("onyx") ||
      womRole.includes("zenyte");
  
    // If they're currently a skiller, calculate fighter rank
    if (isSkiller) {
      const ehb = parseInt(member.ehb) || 0;
  
      if (ehb >= 1500) return "Tzkal";
      else if (ehb >= 1300) return "Monarch";
      else if (ehb >= 1100) return "Senator";
      else if (ehb >= 900) return "Executive";
      else if (ehb >= 700) return "Superior";
      else if (ehb >= 500) return "Supervisor";
      else if (ehb >= 300) return "Leader";
      else if (ehb >= 100) return "Prefect";
      else return "Mentor";
    } 
    // If they're currently a fighter, calculate skiller rank
    else {
      const clanXp =
        (parseInt(member.current_xp) || 0) - (parseInt(member.first_xp) || 0);
  
      if (clanXp >= 500000000) return "Zenyte";
      else if (clanXp >= 150000000) return "Onyx";
      else if (clanXp >= 90000000) return "Dragonstone";
      else if (clanXp >= 40000000) return "Diamond";
      else if (clanXp >= 15000000) return "Ruby";
      else if (clanXp >= 8000000) return "Emerald";
      else if (clanXp >= 3000000) return "Sapphire";
      else return "Opal";
    }
  };

  // Function implementations - Updated to take a pointValue parameter
  const handleAddPoints = async (member, pointValue = 2) => {
    try {
      // Add validation to ensure wom_id exists
      if (!member.wom_id) {
        console.error("Cannot update member without wom_id:", member);
        alert("Cannot update: Member ID is missing");
        return;
      }
  
      setRefreshing(`score-${member.wom_id}`);
      
      // Parse the current score with better error handling
      const currentScore = parseInt(member.siege_score) || 0;
      const newScore = currentScore + pointValue;
      
      console.log("Updating score:", {
        memberId: member.wom_id,
        name: member.name,
        currentScore,
        pointValue,
        newScore
      });
  
      await updateMember({
        wom_id: member.wom_id,
        siege_score: newScore,
      });
  
      // Show success message
      const successToast = document.createElement("div");
      successToast.className = "update-success-toast";
      successToast.textContent = `Added ${pointValue} points to ${member.name}`;
      document.body.appendChild(successToast);
  
      setTimeout(() => {
        successToast.classList.add("toast-fade-out");
        setTimeout(() => {
          document.body.removeChild(successToast);
        }, 300);
      }, 2000);
  
      // Make sure we refresh the UI
      if (onRefresh) {
        console.log("Refreshing member list...");
        onRefresh();
      } else {
        console.warn("onRefresh function is not available");
      }
    } catch (err) {
      console.error("Error updating siege score:", err);
      alert(`Failed to update siege score: ${err.message}`);
    } finally {
      setRefreshing(null);
    }
  };

  const handleToggleVisibility = async (member) => {
    try {
      setRefreshing(`visibility-${member.wom_id}`);
      await toggleMemberVisibility(member);
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error toggling visibility:", err);
      alert("Failed to update visibility");
    } finally {
      setRefreshing(null);
    }
  };
  
  const handleToggleRankType = async (member) => {
    try {
      // Determine new rank type logic...
      const newRankType = calculateNewRankType(member);
      
      if (window.confirm(`Change ${member.name}'s rank type to ${newRankType}?`)) {
        setRefreshing(`rank-${member.wom_id}`);
        await changeMemberRank(member, newRankType);
        onRefresh && onRefresh();
      }
    } catch (err) {
      console.error("Error toggling rank type:", err);
      alert("Failed to update rank type");
    } finally {
      setRefreshing(null);
    }
  };

  const syncMemberWithWom = async (member) => {
    try {
      setRefreshing(`sync-${member.wom_id}`);
  
      // First fetch fresh data from WOM API
      console.log("Fetching fresh WOM data...");
      
      // Add a try/catch specifically for the refreshWomData call
      try {
        if (typeof refreshWomData === 'function') {
          await refreshWomData();
        } else {
          console.warn("refreshWomData is not a function, skipping refresh step");
        }
      } catch (refreshError) {
        console.warn("Error refreshing WOM data:", refreshError);
        // Continue with the process anyway since it seems to work
      }
  
      // Get the latest data after refresh
      const womMembership = group?.memberships?.find(
        (m) => m.player?.id === member.wom_id
      );
  
      if (!womMembership || !womMembership.player) {
        throw new Error("Member not found in WOM group data");
      }
  
      const womPlayer = womMembership.player;
      const womRole = womMembership.role;
  
      console.log("Found member in WOM data:", {
        name: womPlayer.displayName,
        role: womRole,
        ehb: womPlayer.ehb,
      });
  
      const updatedData = {
        wom_id: member.wom_id,
        name: member.name, // Preserve name
        current_xp:
          womPlayer.latestSnapshot?.data?.skills?.overall?.experience ||
          member.current_xp,
        current_lvl:
          womPlayer.latestSnapshot?.data?.skills?.overall?.level ||
          member.current_lvl,
        ehb: womPlayer.ehb || member.ehb,
        womrole: womRole || member.womrole,
        updated_at: new Date().toISOString(),
      };
  
      // Removed confirmation dialog - execute sync immediately
      await updateMember(updatedData);
  
      // Show success message
      const successToast = document.createElement("div");
      successToast.className = "update-success-toast";
      successToast.textContent = `Updated ${member.name} with fresh WOM data`;
      document.body.appendChild(successToast);
  
      setTimeout(() => {
        successToast.classList.add("toast-fade-out");
        setTimeout(() => {
          document.body.removeChild(successToast);
        }, 300);
      }, 2000);
  
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error syncing member:", err);
      alert(`Failed to sync: ${err.message}`);
    } finally {
      setRefreshing(null);
    }
  };

  // Sort members
  const sortedMembers = useMemo(() => {
    if (!enhancedMembers || enhancedMembers.length === 0) return [];

    return [...enhancedMembers].sort((a, b) => {
      // First prioritize hidden status
      if (a.hidden && !b.hidden) return 1;
      if (!a.hidden && b.hidden) return -1;

      // Then prioritize incorrect roles
      const aStatus = calculateCorrectRole(a);
      const bStatus = calculateCorrectRole(b);
      if (!aStatus.hasCorrectRole && bStatus.hasCorrectRole) return -1;
      if (aStatus.hasCorrectRole && !bStatus.hasCorrectRole) return 1;

      // Then by name alphabetically
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [enhancedMembers]);

  // Loading state
  if (womLoading) {
    return (
      <div className="ui-loading-state">
        <div className="ui-loading-spinner"></div>
        <p>Loading member data...</p>
      </div>
    );
  }

  return (
    <div className="ui-admin-table-container">
      <div className="ui-table-responsive">
        <table className="ui-table">
          <thead>
            <tr>
              <th className="ui-text-center ui-table-header-cell">Player Name</th>
              <th className="ui-text-center ui-table-header-cell ui-score-column">Siege Score</th>
              <th className="ui-text-center ui-table-header-cell ui-role-column">WOM Role</th>
              <th className="ui-text-center ui-table-header-cell">EHB</th>
              <th className="ui-text-center ui-table-header-cell">Clan XP</th>
              <th className="ui-text-center ui-table-header-cell">Joined</th>
              <th className="ui-text-center ui-table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => {
              const roleStatus = calculateCorrectRole(member);
              const isExpanded = expandedRow === member.wom_id;
              const isRefreshing =
                refreshing && refreshing.includes(member.wom_id);
              
              // Determine if member is a fighter or skiller
              const womRole = (member.womrole || "").toLowerCase();
              const isSkiller =
                womRole.includes("opal") ||
                womRole.includes("sapphire") ||
                womRole.includes("emerald") ||
                womRole.includes("ruby") ||
                womRole.includes("diamond") ||
                womRole.includes("dragonstone") ||
                womRole.includes("onyx") ||
                womRole.includes("zenyte");

              const rowClasses = [
                isExpanded ? "ui-row-expanded" : "",
                !roleStatus.hasCorrectRole ? "ui-role-mismatch-row" : "",
                member.not_in_wom ? "ui-not-in-wom-row" : "",
                member.hidden ? "ui-hidden-member-row" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <React.Fragment key={member.wom_id || member.id}>
                  <tr
                    className={rowClasses}
                    onClick={() =>
                      setExpandedRow(isExpanded ? null : member.wom_id)
                    }
                  >
                    <td className="ui-player-name-cell">
                      <div className="ui-player-name-wrapper">
                        <span>
                          {member.name || member.wom_name || "Unknown"}
                        </span>
                        {member.not_in_wom && (
                          <Badge
                            variant="danger"
                            className="ui-not-in-wom-badge"
                            title="Not found in WOM"
                          >
                            !
                          </Badge>
                        )}
                        {isExpanded ? (
                          <FaChevronUp className="ui-expand-icon" />
                        ) : (
                          <FaChevronDown className="ui-expand-icon" />
                        )}
                      </div>
                    </td>
                    <td className="ui-score-cell">
                      <div className="ui-score-with-button">
                        <div className="ui-score-value">
                          {member.siege_score || 0}
                        </div>
                        <Button
                          variant="info"
                          size="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPoints(member, 2);
                          }}
                          title="Add 2 points to Siege Score"
                          disabled={isRefreshing}
                          className="ui-add-points-btn"
                        >
                          {refreshing === `score-${member.wom_id}` ? (
                            <div className="ui-button-spinner"></div>
                          ) : (
                            <>+2 Points</>
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="ui-role-cell">
                      <div className="ui-role-with-button">
                        <div className="ui-role-value ui-position-relative">
                          {titleize(member.womrole) || "-"}
                          {!roleStatus.hasCorrectRole && (
                            <>
                              <Badge
                                variant="warning"
                                className="ui-role-badge"
                                title={`Should be: ${titleize(roleStatus.correctRole)}`}
                              >
                                <FaExclamationTriangle />
                              </Badge>
                              <div className="ui-correct-role-suggestion">
                                <span className="ui-arrow">→</span> {titleize(roleStatus.correctRole)}
                              </div>
                            </>
                          )}
                        </div>
                        {!isAdmin(member) && (
                          <div
                            className="ui-alternative-rank-info"
                            title={`Player would be this rank if switched to ${isSkiller ? "fighter" : "skiller"} type`}
                          >
                            <small>
                              {isSkiller ? "Fighter: " : "Skiller: "}
                              <strong>{calculateAlternativeRank(member)}</strong>
                            </small>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="ui-text-center">
                      {Math.floor(member.ehb) || 0}
                    </td>
                    <td className="ui-text-center">
                      {Number(
                        (parseInt(member.current_xp) || 0) -
                          (parseInt(member.first_xp) || 0)
                      ).toLocaleString()}
                    </td>
                    <td className="ui-text-center">
                      {member.join_date
                        ? new Date(member.join_date).toLocaleDateString(
                            undefined,
                            { year: "numeric", month: "short", day: "numeric" }
                          )
                        : "-"}
                    </td>
                    <td className="ui-text-center">
                      <Button
                        variant="success"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          syncMemberWithWom(member);
                        }}
                        title="Sync with latest WOM data"
                        disabled={isRefreshing}
                        className="ui-action-button"
                      >
                        {refreshing === `sync-${member.wom_id}` ? (
                          <div className="ui-button-spinner"></div>
                        ) : (
                          <>
                            <FaSync /> Sync
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>

                  {/* Expanded row with details */}
                  {isExpanded && (
                    <tr className="ui-expanded-details-row">
                      <td colSpan={7}>
                        <Card variant="dark">
                          <Card.Body>
                            <div className="ui-details-grid">
                              {!roleStatus.hasCorrectRole && (
                                <div className="ui-detail-item ui-role-mismatch-alert">
                                  <span className="ui-detail-label">
                                    Role Mismatch:
                                  </span>
                                  <span className="ui-detail-value">
                                    Current:{" "}
                                    <strong>{titleize(member.womrole)}</strong>{" "}
                                    → Should be:{" "}
                                    <strong>{roleStatus.correctRole}</strong> (
                                    {roleStatus.currentType})
                                  </span>
                                </div>
                              )}

                              {member.runewatch_flagged && (
                                <div className="ui-detail-item ui-runewatch-alert">
                                  <span className="ui-detail-label">
                                    Runewatch:
                                  </span>
                                  <span className="ui-detail-value">
                                    <strong>Flagged on Runewatch</strong> -
                                    {member.runewatch_whitelisted
                                      ? ` Whitelisted: ${
                                          member.runewatch_whitelist_reason ||
                                          "No reason provided"
                                        }`
                                      : " Not whitelisted"}
                                  </span>
                                </div>
                              )}

                              <div className="ui-detail-item">
                                <span className="ui-detail-label">WOM ID:</span>
                                <span className="ui-detail-value">
                                  {member.wom_id || "-"}
                                </span>
                              </div>

                              <div className="ui-detail-item">
                                <span className="ui-detail-label">
                                  WOM Name:
                                </span>
                                <span className="ui-detail-value">
                                  {member.wom_name || "-"}
                                </span>
                              </div>

                              <div className="ui-detail-item">
                                <span className="ui-detail-label">
                                  Current Level:
                                </span>
                                <span className="ui-detail-value">
                                  {member.current_lvl || 0}
                                </span>
                              </div>

                              <div className="ui-detail-item">
                                <span className="ui-detail-label">
                                  Current XP:
                                </span>
                                <span className="ui-detail-value">
                                  {Number(
                                    member.current_xp || 0
                                  ).toLocaleString()}
                                </span>
                              </div>

                              <div className="ui-detail-item">
                                <span className="ui-detail-label">
                                  Initial XP:
                                </span>
                                <span className="ui-detail-value">
                                  {Number(
                                    member.first_xp || 0
                                  ).toLocaleString()}
                                </span>
                              </div>

                              <div className="ui-detail-item">
                                <span className="ui-detail-label">
                                  Updated At:
                                </span>
                                <span className="ui-detail-value">
                                  {member.updated_at
                                    ? new Date(
                                        member.updated_at
                                      ).toLocaleString()
                                    : "-"}
                                </span>
                              </div>

                              {member.not_in_wom && (
                                <div className="ui-detail-item ui-not-in-wom-alert">
                                  <span className="ui-detail-label">
                                    WOM Status:
                                  </span>
                                  <span className="ui-detail-value">
                                    <strong>Not found in WOM data</strong> - The
                                    player may have changed names or been
                                    removed from the group.
                                  </span>
                                </div>
                              )}

                              {/* New additional buttons section in expanded row */}
                              <div className="ui-detail-item ui-expanded-actions">
                                <span className="ui-detail-label">
                                  Add Siege Points:
                                </span>
                                <div className="ui-points-button-group">
                                  <Button
                                    variant="info"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddPoints(member, 5);
                                    }}
                                    disabled={isRefreshing}
                                  >
                                    +5
                                  </Button>
                                  <Button
                                    variant="info"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddPoints(member, 10);
                                    }}
                                    disabled={isRefreshing}
                                  >
                                    +10
                                  </Button>
                                  <Button
                                    variant="info"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddPoints(member, 15);
                                    }}
                                    disabled={isRefreshing}
                                  >
                                    +15
                                  </Button>
                                </div>
                              </div>

                              <div className="ui-detail-item ui-expanded-actions">
                                <span className="ui-detail-label">
                                  Member Actions:
                                </span>
                                <div className="ui-member-action-buttons">
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditClick(member);
                                    }}
                                    title="Edit member details"
                                    disabled={isRefreshing}
                                  >
                                    <FaEdit /> Edit Member
                                  </Button>

                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleVisibility(member);
                                    }}
                                    title={
                                      member.hidden
                                        ? "Unhide member"
                                        : "Hide member"
                                    }
                                    disabled={isRefreshing}
                                  >
                                    {refreshing ===
                                    `visibility-${member.wom_id}` ? (
                                      <div className="ui-button-spinner"></div>
                                    ) : member.hidden ? (
                                      <>
                                        <FaEye /> Unhide
                                      </>
                                    ) : (
                                      <>
                                        <FaEyeSlash /> Hide
                                      </>
                                    )}
                                  </Button>

                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteClick(member);
                                    }}
                                    title="Delete member"
                                    disabled={isRefreshing}
                                  >
                                    <FaTrash /> Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
