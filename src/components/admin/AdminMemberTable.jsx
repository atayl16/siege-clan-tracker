import React, { useState, useMemo } from "react";
import { useMembers, useWomGroup, useData } from "../../context/DataContext";
import { 
  FaEdit, FaTrash, FaPlus, FaExchangeAlt, 
  FaExclamationTriangle, FaEye, FaEyeSlash, FaChevronDown, FaChevronUp
} from "react-icons/fa";
import { titleize } from "../../utils/stringUtils";

// Import UI components
import Button from "../ui/Button"; 
import Badge from "../ui/Badge";   
import Card from "../ui/Card";     
import "./AdminMemberTable.css";

export default function AdminMemberTable({
  onEditClick,
  onDeleteClick,
  onRefresh,
}) {
  const { fetchers } = useData();
  const [expandedRow, setExpandedRow] = useState(null);
  const [refreshing, setRefreshing] = useState(null);

  // Get WOM data from context
  const { groupData, loading: womLoading } = useWomGroup();

  // Get members data from context
  const { members } = useMembers();

  // Enhanced member data with WOM data
  const enhancedMembers = useMemo(() => {
    if (!members || !groupData?.memberships) return members;

    // Create a map of WOM members by ID for fast lookups
    const womMembersMap = {};
    groupData.memberships.forEach((membership) => {
      if (membership.player?.id) {
        womMembersMap[membership.player.id] = {
          ...membership.player,
          role: membership.role,
        };
      }
    });

    // Enhance local members with fresh WOM data
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
  }, [members, groupData]);

  // Calculate the correct role for a member based on their stats
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
    return { hasCorrectRole: true };
  };

  // Handle adding +2 to siege score
  const handleAddPoints = async (member) => {
    try {
      setRefreshing(`score-${member.wom_id}`);
      const newScore = (parseInt(member.siege_score) || 0) + 2;

      await fetchers.supabase.updateMember({
        wom_id: member.wom_id,
        siege_score: newScore,
      });

      // Refresh the members list after update
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error updating siege score:", err);
      alert("Failed to update siege score");
    } finally {
      setRefreshing(null);
    }
  };

  // Handle toggling between fighter and skiller ranks
  const handleToggleRankType = async (member) => {
    try {
      // Determine current rank type
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

      // If neither, default to making them a skiller
      let newRankType = "opal";

      if (isSkiller) {
        // Convert to fighter based on EHB
        const ehb = parseInt(member.ehb) || 0;
        if (ehb >= 1500) newRankType = "tzkal";
        else if (ehb >= 1300) newRankType = "monarch";
        else if (ehb >= 1100) newRankType = "senator";
        else if (ehb >= 900) newRankType = "executive";
        else if (ehb >= 700) newRankType = "superior";
        else if (ehb >= 500) newRankType = "supervisor";
        else if (ehb >= 300) newRankType = "leader";
        else if (ehb >= 100) newRankType = "prefect";
        else newRankType = "mentor";
      } else if (isFighter) {
        // Convert to skiller based on XP
        const clanXp =
          (parseInt(member.current_xp) || 0) - (parseInt(member.first_xp) || 0);
        if (clanXp >= 500000000) newRankType = "zenyte";
        else if (clanXp >= 150000000) newRankType = "onyx";
        else if (clanXp >= 90000000) newRankType = "dragonstone";
        else if (clanXp >= 40000000) newRankType = "diamond";
        else if (clanXp >= 15000000) newRankType = "ruby";
        else if (clanXp >= 8000000) newRankType = "emerald";
        else if (clanXp >= 3000000) newRankType = "sapphire";
        else newRankType = "opal";
      }

      if (
        window.confirm(`Change ${member.name}'s rank type to ${newRankType}?`)
      ) {
        setRefreshing(`rank-${member.wom_id}`);

        await fetchers.supabase.updateMember({
          wom_id: member.wom_id,
          womrole: newRankType,
        });

        // Refresh the members list after update
        onRefresh && onRefresh();
      }
    } catch (err) {
      console.error("Error toggling rank type:", err);
      alert("Failed to update rank type");
    }
  };

  // Handle updating to the correct role
  const handleUpdateToCorrectRole = async (member, correctRole) => {
    try {
      setRefreshing(`fix-${member.wom_id}`);

      await fetchers.supabase.updateMember({
        wom_id: member.wom_id,
        womrole: correctRole,
      });

      // Show a brief success message
      const successToast = document.createElement("div");
      successToast.className = "update-success-toast";
      successToast.textContent = `Updated ${member.name} to ${correctRole}`;
      document.body.appendChild(successToast);

      // Remove the toast after 2 seconds
      setTimeout(() => {
        successToast.classList.add("toast-fade-out");
        setTimeout(() => {
          document.body.removeChild(successToast);
        }, 300);
      }, 2000);

      // Refresh the members list after update
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error updating rank:", err);
      alert("Failed to update rank");
    } finally {
      setRefreshing(null);
    }
  };

  const handleToggleVisibility = async (member) => {
    try {
      setRefreshing(`visibility-${member.wom_id}`);

      // If we're unhiding a member, we need to refresh their WOM data
      if (member.hidden) {
        if (
          window.confirm(`Unhide ${member.name} and refresh their WOM data?`)
        ) {
          // Use the latest WOM data from context
          const womMember = groupData?.memberships?.find(
            (m) => m.player?.id === member.wom_id
          )?.player;

          if (womMember) {
            // Update with latest WOM data
            await updateMemberWithWomData(member.wom_id, womMember);
          }
        } else {
          setRefreshing(null);
          return; // User cancelled
        }
      }

      // Toggle the hidden status using fetchers
      await fetchers.supabase.updateMember({
        wom_id: member.wom_id,
        hidden: !member.hidden,
      });

      // Refresh the members list after update
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error toggling member visibility:", err);
      alert("Failed to update member visibility");
    } finally {
      setRefreshing(null);
    }
  };

  // New function that uses WomData context data
  const updateMemberWithWomData = async (womId, womData) => {
    try {
      // Extract the relevant data
      const updatedData = {
        wom_id: womId,
        current_xp:
          womData.latestSnapshot?.data?.skills?.overall?.experience || 0,
        ehb: womData.ehb || 0,
        current_lvl: womData.latestSnapshot?.data?.skills?.overall?.level || 0,
        hidden: false,
        updated_at: new Date().toISOString(),
      };

      // Update the member using the fetchers
      await fetchers.supabase.updateMember(updatedData);
      return true;
    } catch (error) {
      console.error("Error updating from WOM data:", error);
      throw error;
    }
  };

  // Fallback function for direct API access
  const refreshMemberWomData = async (womId) => {
    try {
      setRefreshing(`wom-${womId}`);

      // Use context method to fetch WOM player data
      const womData = await fetchers.wom.player(null, womId);

      if (!womData) {
        throw new Error("Failed to fetch player data from WOM");
      }

      // Update the member with fresh WOM data
      const updatedData = {
        wom_id: womId,
        first_xp: womData.exp || 0,
        current_xp: womData.exp || 0,
        ehb: womData.ehb || 0,
        level: womData.level || 0,
        current_lvl: womData.level || 0,
        updated_at: new Date().toISOString(),
      };

      // Use context method to update member
      await fetchers.supabase.updateMember(updatedData);

      // Refresh local data
      if (onRefresh) {
        onRefresh();
      }

      return true;
    } catch (error) {
      console.error("Error refreshing member WOM data:", error);
      throw error;
    } finally {
      setRefreshing(null);
    }
  };

  // Sort members to put incorrect ranks at the top and hidden members at the bottom
  const sortedMembers = useMemo(() => {
    if (!enhancedMembers || enhancedMembers.length === 0) return [];

    return [...enhancedMembers].sort((a, b) => {
      // First prioritize hidden status - push hidden members to bottom
      if (a.hidden && !b.hidden) return 1;
      if (!a.hidden && b.hidden) return -1;

      // For non-hidden members (or comparing two hidden members), prioritize incorrect roles
      const aStatus = calculateCorrectRole(a);
      const bStatus = calculateCorrectRole(b);

      // If one has incorrect role and the other doesn't, prioritize the incorrect one
      if (!aStatus.hasCorrectRole && bStatus.hasCorrectRole) return -1;
      if (aStatus.hasCorrectRole && !bStatus.hasCorrectRole) return 1;

      // If both have same hidden status and same role correctness, sort alphabetically
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [enhancedMembers]);

  // Show loading state if WOM data is being fetched
  if (womLoading) {
    return (
      <div className="ui-loading-state">
        <div className="ui-loading-spinner"></div>
        <p>Refreshing member data from Wise Old Man...</p>
      </div>
    );
  }

  return (
    <div className="ui-admin-table-container">
      <div className="ui-table-responsive">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Player Name</th>
              <th className="ui-text-center">Siege Score</th>
              <th className="ui-text-center">WOM Role</th>
              <th className="ui-text-center">EHB</th>
              <th className="ui-text-center">Clan XP</th>
              <th className="ui-text-center">Joined</th>
              <th className="ui-text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => {
              const roleStatus = calculateCorrectRole(member);
              const isExpanded = expandedRow === member.wom_id;
              const isRefreshing =
                refreshing && refreshing.includes(member.wom_id);

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
                    <td className="ui-text-center">
                      {member.siege_score || 0}
                    </td>
                    <td className="ui-text-center ui-position-relative">
                      {titleize(member.womrole) || "-"}
                      {!roleStatus.hasCorrectRole && (
                        <Badge
                          variant="warning"
                          className="ui-role-badge"
                          title={`Should be: ${roleStatus.correctRole}`}
                        >
                          <FaExclamationTriangle />
                        </Badge>
                      )}
                    </td>
                    <td className="ui-text-center">{member.ehb || 0}</td>
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
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "-"}
                    </td>
                    <td>
                      <div className="ui-admin-actions-cell">
                        {!roleStatus.hasCorrectRole && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateToCorrectRole(
                                member,
                                roleStatus.correctRole
                              );
                            }}
                            title={`Update to correct role: ${roleStatus.correctRole}`}
                            disabled={refreshing === `fix-${member.wom_id}`}
                          >
                            {refreshing === `fix-${member.wom_id}` ? (
                              <div className="ui-button-spinner"></div>
                            ) : (
                              "Fix Rank"
                            )}
                          </Button>
                        )}
                        <Button
                          variant="info"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPoints(member);
                          }}
                          title="+2 Siege Score"
                          disabled={refreshing === `score-${member.wom_id}`}
                        >
                          {refreshing === `score-${member.wom_id}` ? (
                            <div className="ui-button-spinner"></div>
                          ) : (
                            <>
                              <FaPlus /> 2
                            </>
                          )}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRankType(member);
                          }}
                          title="Switch fighter/skiller rank"
                          disabled={refreshing === `rank-${member.wom_id}`}
                        >
                          {refreshing === `rank-${member.wom_id}` ? (
                            <div className="ui-button-spinner"></div>
                          ) : (
                            <FaExchangeAlt />
                          )}
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick(member);
                          }}
                          title="Edit member"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVisibility(member);
                          }}
                          title={
                            member.hidden ? "Unhide member" : "Hide member"
                          }
                          disabled={
                            refreshing === `visibility-${member.wom_id}`
                          }
                        >
                          {refreshing === `visibility-${member.wom_id}` ? (
                            <div className="ui-button-spinner"></div>
                          ) : member.hidden ? (
                            <FaEye />
                          ) : (
                            <FaEyeSlash />
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
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
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
