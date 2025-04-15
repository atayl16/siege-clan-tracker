import React, { useState, useEffect } from 'react';
import {
  memberNeedsRankUpdate,
  calculateAppropriateRank,
  safeFormat,
  SKILLER_RANK_NAMES,
} from "../utils/rankUtils";
import { supabase } from '../supabaseClient';

export default function RankAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch all members from Supabase
      const { data, error } = await supabase
        .from('members')
        .select('*');
        
      if (error) throw error;
      
      // Process members to find those needing rank updates
      const membersNeedingUpdate = data
        .filter(member => memberNeedsRankUpdate(member))
        .map(member => ({
          ...member,
          calculated_rank: calculateAppropriateRank(member)
        }));
      
      setAlerts(membersNeedingUpdate);
      setError(null);
    } catch (err) {
      console.error("Error fetching members for rank alerts:", err);
      setError("Failed to load rank alerts");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle manual update of a member's rank
  const handleUpdateRank = async (member) => {
    try {
      if (!member.calculated_rank) return;
      
      const { error } = await supabase
        .from('members')
        .update({ womrole: member.calculated_rank.toLowerCase() })
        .eq('wom_id', member.wom_id);
        
      if (error) throw error;
      
      // Remove the updated member from alerts
      setAlerts(alerts.filter(m => m.wom_id !== member.wom_id));
      
      // Show success message (you can add this functionality)
      console.log(`Successfully updated ${member.name}'s rank to ${member.calculated_rank}`);
    } catch (err) {
      console.error("Error updating member rank:", err);
      // Show error message
    }
  };
  
  if (loading) return <div className="alerts-loading">Loading rank alerts...</div>;
  if (error) return <div className="alerts-error">Error: {error}</div>;
  if (alerts.length === 0) return <div className="alerts-empty">No rank updates required.</div>;

  return (
    <div className="rank-alerts">
      <h4 className="rank-alerts__title">Members Needing Rank Updates</h4>
      <div className="rank-alerts__count">{alerts.length} {alerts.length === 1 ? 'member' : 'members'} need updates</div>
      
      <ul className="rank-alerts__list">
        {alerts.map((member) => (
          <li key={member.wom_id} className="rank-alert">
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
                Current rank: <span className="rank-value">{member.womrole}</span>
              </div>
              <div className="rank-alert__recommended">
                Should be: <span className="rank-value">{member.calculated_rank}</span>
              </div>
              
              {/* Show relevant stats based on whether they're a skiller or fighter */}
              {member.calculated_rank && SKILLER_RANK_NAMES.includes(member.calculated_rank) ? (
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
        ))}
      </ul>
    </div>
  );
}
