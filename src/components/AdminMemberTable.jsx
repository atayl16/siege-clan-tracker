import React, { useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { FaEdit, FaTrash, FaPlus, FaExchangeAlt, FaExclamationTriangle, FaUserSlash } from "react-icons/fa";
import "./AdminMemberTable.css";
import { titleize } from "../utils/stringUtils";

export default function AdminMemberTable({
  members,
  onEditClick,
  onDeleteClick,
  onRefresh,
}) {
  const [expandedRow, setExpandedRow] = useState(null);

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
      const newScore = (parseInt(member.siege_score) || 0) + 2;

      const { error } = await supabase
        .from("members")
        .update({ siege_score: newScore })
        .eq("wom_id", member.wom_id);

      if (error) throw error;

      // Refresh the members list after update
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error updating siege score:", err);
      alert("Failed to update siege score");
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
        const { error } = await supabase
          .from("members")
          .update({ womrole: newRankType })
          .eq("wom_id", member.wom_id);

        if (error) throw error;

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
      const { error } = await supabase
        .from("members")
        .update({ womrole: correctRole })
        .eq("wom_id", member.wom_id);

      if (error) throw error;

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
    }
  };

  // Sort members to put incorrect ranks at the top
  const sortedMembers = useMemo(() => {
    if (!members || members.length === 0) return [];
    
    return [...members].sort((a, b) => {
      // Calculate role status for both members
      const aStatus = calculateCorrectRole(a);
      const bStatus = calculateCorrectRole(b);
      
      // If one has incorrect role and the other doesn't, prioritize the incorrect one
      if (!aStatus.hasCorrectRole && bStatus.hasCorrectRole) return -1;
      if (aStatus.hasCorrectRole && !bStatus.hasCorrectRole) return 1;
      
      // If both have incorrect or correct roles, sort alphabetically by name
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [members]);

  return (
    <div className="admin-table-container">
      <table className="table table-dark table-hover table-responsive">
        <thead>
          <tr>
            <th>Player Name</th>
            <th className="text-center">Siege Score</th>
            <th className="text-center">WOM Role</th>
            <th className="text-center">EHB</th>
            <th className="text-center">Clan XP</th>
            <th className="text-center">Joined</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((member) => {
            const roleStatus = calculateCorrectRole(member);

            return (
              <React.Fragment key={member.wom_id || member.id}>
                <tr
                  className={`${
                    expandedRow === member.wom_id ? "row-expanded" : ""
                  } ${!roleStatus.hasCorrectRole ? "role-mismatch-row" : ""} ${
                    member.not_in_wom ? "not-in-wom-row" : ""
                  }`}
                  onClick={() =>
                    setExpandedRow(
                      expandedRow === member.wom_id ? null : member.wom_id
                    )
                  }
                >
                  <td className="player-name-cell">
                    {member.name || member.wom_name || "Unknown"}
                    {member.not_in_wom && (
                      <span
                        className="not-in-wom-indicator"
                        title="Member not found in WOM group"
                      >
                        <FaUserSlash className="text-danger ms-2" />
                      </span>
                    )}
                  </td>
                  <td className="text-center">{member.siege_score || 0}</td>
                  <td className="text-center position-relative">
                    {titleize(member.womrole) || "-"}
                    {!roleStatus.hasCorrectRole && (
                      <span
                        className="role-mismatch-indicator"
                        title={`Should be: ${roleStatus.correctRole}`}
                      >
                        <FaExclamationTriangle className="text-warning ms-2" />
                      </span>
                    )}
                  </td>
                  <td className="text-center">{member.ehb || 0}</td>
                  <td className="text-center">
                    {Number(
                      (parseInt(member.current_xp) || 0) -
                        (parseInt(member.first_xp) || 0)
                    ).toLocaleString()}
                  </td>
                  <td className="text-center">
                    {member.created_at
                      ? new Date(member.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <div className="admin-actions-cell">
                      {!roleStatus.hasCorrectRole && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateToCorrectRole(
                              member,
                              roleStatus.correctRole
                            );
                          }}
                          title={`Update to correct role: ${roleStatus.correctRole}`}
                        >
                          Fix Rank
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-info"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddPoints(member);
                        }}
                        title="+2 Siege Score"
                      >
                        <FaPlus /> 2
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRankType(member);
                        }}
                        title="Switch fighter/skiller rank"
                      >
                        <FaExchangeAlt />
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick(member);
                        }}
                        title="Edit member"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(member);
                        }}
                        title="Delete member"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRow === member.wom_id && (
                  <tr className="expanded-details">
                    <td colSpan={7}>
                      <div className="expanded-details-content">
                        <div className="details-section">
                          {member.not_in_wom && (
                            <div className="detail-item not-in-wom-alert">
                              <span className="detail-label">WOM Status:</span>
                              <span className="detail-value">
                                <strong className="text-danger">
                                  Not in WOM Group
                                </strong>
                                {member.not_in_wom_date && (
                                  <>
                                    {" "}
                                    since{" "}
                                    {new Date(
                                      member.not_in_wom_date
                                    ).toLocaleDateString()}
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                          {!roleStatus.hasCorrectRole && (
                            <div className="detail-item role-mismatch-alert">
                              <span className="detail-label">
                                Role Mismatch:
                              </span>
                              <span className="detail-value">
                                Current:{" "}
                                <strong>{titleize(member.womrole)}</strong> →
                                Should be:{" "}
                                <strong>{roleStatus.correctRole}</strong> (
                                {roleStatus.currentType})
                              </span>
                            </div>
                          )}
                          <div className="detail-item">
                            <span className="detail-label">WOM ID:</span>
                            <span className="detail-value">
                              {member.wom_id || "-"}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">WOM Name:</span>
                            <span className="detail-value">
                              {member.wom_name || "-"}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Current Level:</span>
                            <span className="detail-value">
                              {member.current_lvl || 0}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Current XP:</span>
                            <span className="detail-value">
                              {Number(member.current_xp || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Initial XP:</span>
                            <span className="detail-value">
                              {Number(member.first_xp || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Updated At:</span>
                            <span className="detail-value">
                              {member.updated_at
                                ? new Date(member.updated_at).toLocaleString()
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
