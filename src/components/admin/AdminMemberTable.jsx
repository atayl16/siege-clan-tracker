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
  FaShieldAlt,
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
    // Existing code...
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

  // Calculate the correct role - no changes here
  const calculateCorrectRole = (member) => {
    // Existing code...
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

  // Function implementations - no changes here
  const handleAddPoints = async (member) => {
    // Existing code...
    try {
      setRefreshing(`score-${member.wom_id}`);
      const newScore = (parseInt(member.siege_score) || 0) + 2;

      await updateMember({
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

  const handleToggleRankType = async (member) => {
    // Existing code...
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

      // Calculate new rank type based on stats
      let newRankType;
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
      } else {
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

        await updateMember({
          wom_id: member.wom_id,
          womrole: newRankType,
        });

        onRefresh && onRefresh();
      }
    } catch (err) {
      console.error("Error toggling rank type:", err);
      alert("Failed to update rank type");
    } finally {
      setRefreshing(null);
    }
  };

  const handleToggleVisibility = async (member) => {
    // Existing code...
    try {
      setRefreshing(`visibility-${member.wom_id}`);

      // If we're unhiding a member, sync with latest WOM data
      if (
        member.hidden &&
        window.confirm(`Unhide ${member.name} and refresh their WOM data?`)
      ) {
        const womMembership = group?.memberships?.find(
          (m) => m.player?.id === member.wom_id
        );

        if (womMembership?.player) {
          const womPlayer = womMembership.player;

          // Update with fresh WOM data
          await updateMember({
            wom_id: member.wom_id,
            name: member.name, // Keep existing name
            current_xp:
              womPlayer.latestSnapshot?.data?.skills?.overall?.experience ||
              member.current_xp,
            current_lvl:
              womPlayer.latestSnapshot?.data?.skills?.overall?.level ||
              member.current_lvl,
            ehb: womPlayer.ehb || member.ehb,
            womrole: womMembership.role || member.womrole,
            hidden: false,
          });
        }
      } else if (!member.hidden) {
        // Just hide the member
        await updateMember({
          wom_id: member.wom_id,
          hidden: true,
        });
      } else {
        setRefreshing(null);
        return; // User cancelled
      }

      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error toggling visibility:", err);
      alert("Failed to update visibility");
    } finally {
      setRefreshing(null);
    }
  };

  const handleWhitelistMember = async (member) => {
    // Existing code...
    try {
      setRefreshing(`whitelist-${member.wom_id}`);

      const reason = prompt("Enter reason for whitelisting:");
      if (!reason) {
        setRefreshing(null);
        return; // User cancelled
      }

      // Use the new function from the hook
      await whitelistRunewatchMember(member.wom_id, reason);

      // Show success message
      const successToast = document.createElement("div");
      successToast.className = "update-success-toast";
      successToast.textContent = `Whitelisted ${member.name} on Runewatch`;
      document.body.appendChild(successToast);

      // Remove the toast after 2 seconds
      setTimeout(() => {
        successToast.classList.add("toast-fade-out");
        setTimeout(() => {
          document.body.removeChild(successToast);
        }, 300);
      }, 2000);

      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error whitelisting member:", err);
      alert("Failed to whitelist member");
    } finally {
      setRefreshing(null);
    }
  };

  const syncMemberWithWom = async (member) => {
    // Existing code...
    try {
      setRefreshing(`sync-${member.wom_id}`);

      // First fetch fresh data from WOM API
      console.log("Fetching fresh WOM data...");
      await refreshWomData();

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

      if (window.confirm(`Update ${member.name} with latest WOM data?`)) {
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
      }
    } catch (err) {
      console.error("Error syncing member:", err);
      alert(`Failed to sync: ${err.message}`);
    } finally {
      setRefreshing(null);
    }
  };

  // Sort members - no changes here
  const sortedMembers = useMemo(() => {
    // Existing code...
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
              <th>Player Name</th>
              <th className="ui-text-center ui-score-column">Siege Score</th>
              <th className="ui-text-center ui-role-column">WOM Role</th>
              <th className="ui-text-center">EHB</th>
              <th className="ui-text-center">Clan XP</th>
              <th className="ui-text-center">Joined</th>
              <th className="ui-text-center ui-actions-column">Actions</th>
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
                    <td className="ui-score-cell">
                      <div className="ui-score-with-button">
                        <div className="ui-score-value">{member.siege_score || 0}</div>
                        <Button
                          variant="info"
                          size="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPoints(member);
                          }}
                          title="Add 2 points to Siege Score"
                          disabled={isRefreshing}
                          className="ui-add-points-btn"
                        >
                          {refreshing === `score-${member.wom_id}` ? (
                            <div className="ui-button-spinner"></div>
                          ) : (
                            <>
                              +2 Points
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="ui-role-cell">
                      <div className="ui-role-with-button">
                        <div className="ui-role-value ui-position-relative">
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
                        </div>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRankType(member);
                          }}
                          title="Switch between fighter and skiller rank"
                          disabled={isRefreshing}
                          className="ui-toggle-rank-btn"
                        >
                          {refreshing === `rank-${member.wom_id}` ? (
                            <div className="ui-button-spinner"></div>
                          ) : (
                            <>
                              <FaExchangeAlt /> Switch Rank
                            </>
                          )}
                        </Button>
                      </div>
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
                            { year: "numeric", month: "short", day: "numeric" }
                          )
                        : "-"}
                    </td>
                    <td>
                      <div className="ui-admin-actions-cell">
                        <div className="ui-action-button-group">
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
                                <FaSync /> Sync WOM
                              </>
                            )}
                          </Button>

                          <Button
                            variant="warning"
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditClick(member);
                            }}
                            title="Edit member details"
                            disabled={isRefreshing}
                            className="ui-action-button"
                          >
                            <FaEdit /> Edit
                          </Button>

                          <Button
                            variant="secondary"
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVisibility(member);
                            }}
                            title={
                              member.hidden ? "Unhide member" : "Hide member"
                            }
                            disabled={isRefreshing}
                            className="ui-action-button"
                          >
                            {refreshing === `visibility-${member.wom_id}` ? (
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

                          {/* Runewatch whitelist button */}
                          {member.runewatch_flagged &&
                            !member.runewatch_whitelisted && (
                              <Button
                                variant="danger"
                                size="md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhitelistMember(member);
                                }}
                                title="Whitelist on Runewatch"
                                disabled={isRefreshing}
                                className="ui-action-button"
                              >
                                {refreshing === `whitelist-${member.wom_id}` ? (
                                  <div className="ui-button-spinner"></div>
                                ) : (
                                  <>
                                    <FaShieldAlt /> Whitelist
                                  </>
                                )}
                              </Button>
                            )}
                        </div>

                        {/* Delete button - separate for safety */}
                        <div className="ui-delete-button-container">
                          <Button
                            variant="danger"
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClick(member);
                            }}
                            title="Delete member"
                            disabled={isRefreshing}
                            className="ui-delete-button"
                          >
                            <FaTrash /> Delete
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row with details - no changes here */}
                  {isExpanded && (
                    <tr className="ui-expanded-details-row">
                      <td colSpan={7}>
                        <Card variant="dark">
                          <Card.Body>
                            <div className="ui-details-grid">
                              {/* Existing expanded row content */}
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
