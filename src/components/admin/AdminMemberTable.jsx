import React, { useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
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

      if (window.confirm(`Change ${member.name}'s rank type to ${newRankType}?`)) {
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

  const handleToggleVisibility = async (member) => {
    try {
      // If we're unhiding a member, we need to refresh their WOM data
      if (member.hidden) {
        if (window.confirm(`Unhide ${member.name} and refresh their WOM data?`)) {
          // You'll need to implement or call a function to fetch fresh WOM data
          await refreshMemberWomData(member.wom_id);
        } else {
          return; // User cancelled
        }
      }
  
      // Toggle the hidden status
      const { error } = await supabase
        .from("members")
        .update({ hidden: !member.hidden })
        .eq("wom_id", member.wom_id);
  
      if (error) throw error;
  
      // Refresh the members list after update
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error toggling member visibility:", err);
      alert("Failed to update member visibility");
    }
  };
  
  // Sort members to put incorrect ranks at the top and hidden members at the bottom
  const sortedMembers = useMemo(() => {
    if (!members || members.length === 0) return [];
    
    return [...members].sort((a, b) => {
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
  }, [members]);
  
  const refreshMemberWomData = async (womId) => {
    try {
      // Fetch latest data from WOM API
      const response = await fetch(`https://api.wiseoldman.net/v2/players/${womId}`);
      const womData = await response.json();
      
      if (!womData || womData.error) {
        throw new Error(womData.error || "Failed to fetch WOM data");
      }
      
      // Extract the relevant data
      const updatedData = {
        first_xp: womData.exp, // Reset first_xp to current value
        current_xp: womData.exp,
        ehb: womData.ehb || 0,
        level: womData.level || 0,
        current_lvl: womData.level || 0,
        hidden: false,
        updated_at: new Date().toISOString()
      };
      
      // Update the member in the database
      const { error } = await supabase
        .from("members")
        .update(updatedData)
        .eq("wom_id", womId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error refreshing WOM data:", error);
      throw error;
    }
  };

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

              const rowClasses = [
                isExpanded ? "ui-row-expanded" : "",
                !roleStatus.hasCorrectRole ? "ui-role-mismatch-row" : "",
                member.not_in_wom ? "ui-not-in-wom-row" : "",
                member.hidden ? "ui-hidden-member-row" : ""
              ].filter(Boolean).join(" ");

              return (
                <React.Fragment key={member.wom_id || member.id}>
                  <tr
                    className={rowClasses}
                    onClick={() => setExpandedRow(isExpanded ? null : member.wom_id)}
                  >
                    <td className="ui-player-name-cell">
                      <div className="ui-player-name-wrapper">
                        <span>{member.name || member.wom_name || "Unknown"}</span>
                        {isExpanded ? (
                          <FaChevronUp className="ui-expand-icon" />
                        ) : (
                          <FaChevronDown className="ui-expand-icon" />
                        )}
                      </div>
                    </td>
                    <td className="ui-text-center">{member.siege_score || 0}</td>
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
                        ? new Date(member.join_date).toLocaleDateString(undefined, {
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric'
                          })
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
                              handleUpdateToCorrectRole(member, roleStatus.correctRole);
                            }}
                            title={`Update to correct role: ${roleStatus.correctRole}`}
                          >
                            Fix Rank
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
                        >
                          <FaPlus /> 2
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRankType(member);
                          }}
                          title="Switch fighter/skiller rank"
                        >
                          <FaExchangeAlt />
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
                          title={member.hidden ? "Unhide member" : "Hide member"}
                        >
                          {member.hidden ? <FaEye /> : <FaEyeSlash />}
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
                                  <span className="ui-detail-label">Role Mismatch:</span>
                                  <span className="ui-detail-value">
                                    Current: <strong>{titleize(member.womrole)}</strong> →
                                    Should be: <strong>{roleStatus.correctRole}</strong> ({roleStatus.currentType})
                                  </span>
                                </div>
                              )}
                              <div className="ui-detail-item">
                                <span className="ui-detail-label">WOM ID:</span>
                                <span className="ui-detail-value">{member.wom_id || "-"}</span>
                              </div>
                              <div className="ui-detail-item">
                                <span className="ui-detail-label">WOM Name:</span>
                                <span className="ui-detail-value">{member.wom_name || "-"}</span>
                              </div>
                              <div className="ui-detail-item">
                                <span className="ui-detail-label">Current Level:</span>
                                <span className="ui-detail-value">{member.current_lvl || 0}</span>
                              </div>
                              <div className="ui-detail-item">
                                <span className="ui-detail-label">Current XP:</span>
                                <span className="ui-detail-value">
                                  {Number(member.current_xp || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="ui-detail-item">
                                <span className="ui-detail-label">Initial XP:</span>
                                <span className="ui-detail-value">
                                  {Number(member.first_xp || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="ui-detail-item">
                                <span className="ui-detail-label">Updated At:</span>
                                <span className="ui-detail-value">
                                  {member.updated_at
                                    ? new Date(member.updated_at).toLocaleString()
                                    : "-"}
                                </span>
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
