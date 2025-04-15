import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { FaEdit, FaTrash, FaPlus, FaExchangeAlt } from "react-icons/fa";
import "./AdminMemberTable.css";

export default function AdminMemberTable({ members, onEditClick, onDeleteClick, onRefresh }) {
  const [expandedRow, setExpandedRow] = useState(null);

  // Handle adding +2 to siege score
  const handleAddPoints = async (member) => {
    try {
      const newScore = (parseInt(member.siege_score) || 0) + 2;
      
      const { error } = await supabase
        .from('members')
        .update({ siege_score: newScore })
        .eq('wom_id', member.wom_id);
        
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
      const isSkiller = womRole.includes("opal") || womRole.includes("sapphire") || 
                       womRole.includes("emerald") || womRole.includes("ruby") ||
                       womRole.includes("diamond") || womRole.includes("dragonstone") ||
                       womRole.includes("onyx") || womRole.includes("zenyte");
      
      const isFighter = womRole.includes("mentor") || womRole.includes("prefect") ||
                        womRole.includes("leader") || womRole.includes("supervisor") ||
                        womRole.includes("superior") || womRole.includes("executive") ||
                        womRole.includes("senator") || womRole.includes("monarch") ||
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
        const clanXp = (parseInt(member.current_xp) || 0) - (parseInt(member.first_xp) || 0);
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
          .from('members')
          .update({ womrole: newRankType })
          .eq('wom_id', member.wom_id);
          
        if (error) throw error;
        
        // Refresh the members list after update
        onRefresh && onRefresh();
      }
    } catch (err) {
      console.error("Error toggling rank type:", err);
      alert("Failed to update rank type");
    }
  };

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
          {members.map((member) => (
            <React.Fragment key={member.wom_id || member.id}>
              <tr
                className={expandedRow === member.wom_id ? "row-expanded" : ""}
                onClick={() =>
                  setExpandedRow(
                    expandedRow === member.wom_id ? null : member.wom_id
                  )
                }
              >
                <td className="player-name-cell">
                  {member.name || member.wom_name || "Unknown"}
                </td>
                <td className="text-center">{member.siege_score || 0}</td>
                <td className="text-center">{member.womrole || "-"}</td>
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
                    <button
                      className="btn btn-sm btn-info"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row expansion
                        handleAddPoints(member);
                      }}
                      title="Add 2 points"
                    >
                      <FaPlus /> 2
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row expansion
                        handleToggleRankType(member);
                      }}
                      title="Toggle fighter/skiller rank"
                    >
                      <FaExchangeAlt />
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row expansion
                        onEditClick(member);
                      }}
                      title="Edit member"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row expansion
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
