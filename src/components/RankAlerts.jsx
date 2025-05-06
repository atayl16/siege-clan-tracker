import React, { useState, useEffect } from 'react';
import { useMembers } from "../hooks/useMembers";
import Button from './ui/Button';
import { FaExclamationTriangle, FaCheck, FaExchangeAlt } from 'react-icons/fa';
import './RankAlerts.css';

// Utility functions (assuming these are in the original file)
const titleize = (str) => {
  if (!str) return '';
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const safeFormat = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
};

// Constants (assuming these are in the original file)
const SKILLER_RANK_NAMES = ['Skiller', 'High-Level Skiller', 'Elite Skiller'];

export default function RankAlerts({ onRankUpdate }) {
  const {
    members,
    loading,
    error: membersError,
    updateMember,
  } = useMembers();
  
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  // Filter members who need rank updates
  useEffect(() => {
    if (!members) return;
    
    const needsUpdate = members.filter(member => {
      // Logic to determine if a member needs a rank update
      return member.calculated_rank && member.calculated_rank !== member.womrole;
    });
    
    setAlerts(needsUpdate);
  }, [members]);

  // Handle update rank
  const handleUpdateRank = async (member) => {
    if (!member.calculated_rank) return;
    
    try {
      await updateMember({
        ...member,
        womrole: member.calculated_rank
      });
      
      if (onRankUpdate) {
        onRankUpdate();
      }
    } catch (err) {
      console.error("Error updating rank:", err);
      setError(`Failed to update rank: ${err.message}`);
    }
  };

  // Function to determine the priority of rank updates
  const getRankUpdatePriority = (member) => {
    // Determine priority based on rank discrepancy
    if (!member.womrole) return 'high';
    if (member.womrole === 'recruit' && member.calculated_rank !== 'recruit') return 'high';
    return 'normal';
  };

  if (loading) {
    return (
      <div className="ui-loading-container">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading members data...</div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="ui-message ui-message-error">
        <FaExclamationTriangle className="ui-message-icon" />
        <span>{membersError.message || String(membersError)}</span>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="ui-no-alerts">
        <FaCheck className="ui-success-icon" />
        <span>No rank updates required</span>
      </div>
    );
  }

  // Main return - content only, no card or header
  return (
    <div className="ui-rank-alerts-content">
      {error && (
        <div className="ui-message ui-message-error">
          <FaExclamationTriangle className="ui-message-icon" />
          <span>{error}</span>
        </div>
      )}
      
      <ul className="ui-reported-members-list">
        {alerts.map((member) => {
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
    </div>
  );
}
