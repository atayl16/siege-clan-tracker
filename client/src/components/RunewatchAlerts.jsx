import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FaExclamationTriangle, FaCheck, FaSync } from 'react-icons/fa';
import './RunewatchAlerts.css';

export default function RunewatchAlerts() {
  const [reportedMembers, setReportedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingRunewatch, setCheckingRunewatch] = useState(false);
  const [error, setError] = useState(null);
  const [whitelistReason, setWhitelistReason] = useState('');
  const [memberToWhitelist, setMemberToWhitelist] = useState(null);

  useEffect(() => {
    fetchReportedMembers();
  }, []);

  const fetchReportedMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('runewatch_reported', true)
        .eq('runewatch_whitelisted', false);

      if (error) throw error;
      setReportedMembers(data || []);
    } catch (err) {
      console.error('Error fetching reported members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkRunewatch = async () => {
    try {
      setCheckingRunewatch(true);
      const response = await fetch('/.netlify/functions/runewatch-check');
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      
      // Show result in a toast notification
      const toast = document.createElement('div');
      toast.className = 'runewatch-toast';
      toast.innerHTML = `
        <div class="runewatch-toast-content">
          <strong>RuneWatch Check Complete</strong>
          <p>${result.matchedMembers.length} reported members found</p>
          ${result.newlyReportedMembers.length > 0 ? 
            `<p>Newly reported: ${result.newlyReportedMembers.join(', ')}</p>` : 
            ''}
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 5000);
      
      // Refresh the members list
      fetchReportedMembers();
      
    } catch (err) {
      console.error('Error checking RuneWatch:', err);
      setError(`Failed to check RuneWatch: ${err.message}`);
    } finally {
      setCheckingRunewatch(false);
    }
  };

  const handleWhitelist = async () => {
    if (!memberToWhitelist) return;
    
    try {
      const { error } = await supabase
        .from('members')
        .update({
          runewatch_whitelisted: true,
          runewatch_whitelist_reason: whitelistReason,
          runewatch_whitelisted_at: new Date().toISOString()
        })
        .eq('wom_id', memberToWhitelist.wom_id);
      
      if (error) throw error;
      
      // Remove from the list
      setReportedMembers(reportedMembers.filter(m => m.wom_id !== memberToWhitelist.wom_id));
      
      // Reset state
      setMemberToWhitelist(null);
      setWhitelistReason('');
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'whitelist-success-toast';
      toast.textContent = `${memberToWhitelist.name} has been whitelisted`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
      
    } catch (err) {
      console.error('Error whitelisting member:', err);
      setError(`Failed to whitelist member: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="runewatch-loading">Loading reported members...</div>;
  }

  return (
    <div className="runewatch-alerts-container">
      <div className="runewatch-header">
        <h4>
          <FaExclamationTriangle className="text-warning" /> RuneWatch Alerts
        </h4>
        <button 
          className="btn btn-sm btn-outline-primary" 
          onClick={checkRunewatch}
          disabled={checkingRunewatch}
        >
          {checkingRunewatch ? (
            <>
              <FaSync className="icon-spin" /> Checking...
            </>
          ) : (
            <>
              <FaSync /> Check RuneWatch
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      {reportedMembers.length === 0 ? (
        <div className="no-alerts-message">
          <FaCheck className="text-success" /> No reported clan members found
        </div>
      ) : (
        <>
          <div className="alert alert-warning">
            <strong>Warning:</strong> The following clan members have been reported on RuneWatch
          </div>
          
          <ul className="reported-members-list">
            {reportedMembers.map(member => (
              <li key={member.wom_id} className="reported-member-item">
                <div className="reported-member-name">
                  {member.name || member.wom_name}
                </div>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setMemberToWhitelist(member)}
                >
                  Whitelist
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      
      {/* Whitelist Modal */}
      {memberToWhitelist && (
        <div className="whitelist-modal-backdrop">
          <div className="whitelist-modal">
            <div className="whitelist-modal-header">
              <h5>Whitelist {memberToWhitelist.name}</h5>
              <button 
                className="close-button"
                onClick={() => setMemberToWhitelist(null)}
              >
                &times;
              </button>
            </div>
            <div className="whitelist-modal-body">
              <label htmlFor="whitelist-reason">Reason for whitelisting:</label>
              <textarea
                id="whitelist-reason"
                className="form-control"
                placeholder="e.g., Case was closed, False positive, etc."
                value={whitelistReason}
                onChange={(e) => setWhitelistReason(e.target.value)}
              />
            </div>
            <div className="whitelist-modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setMemberToWhitelist(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleWhitelist}
              >
                Whitelist Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
