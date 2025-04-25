import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Badge from './ui/Badge';
import { FaExclamationTriangle, FaCheck, FaSync, FaShieldAlt, FaTimes } from 'react-icons/fa';
import './RunewatchAlerts.css';

export default function RunewatchAlerts({ previewMode = false }) {
  const [reportedMembers, setReportedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingRunewatch, setCheckingRunewatch] = useState(false);
  const [error, setError] = useState(null);
  const [whitelistReason, setWhitelistReason] = useState('');
  const [memberToWhitelist, setMemberToWhitelist] = useState(null);
  const [notification, setNotification] = useState(null);

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
      setError(null);
      const response = await fetch('/.netlify/functions/runewatch-check');
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      
      // Show notification using state instead of direct DOM manipulation
      setNotification({
        type: 'success',
        message: (
          <>
            <strong>RuneWatch Check Complete</strong>
            <p>{result.matchedMembers.length} reported members found</p>
            {result.newlyReportedMembers.length > 0 && (
              <p>Newly reported: {result.newlyReportedMembers.join(', ')}</p>
            )}
          </>
        )
      });
      
      // Auto-dismiss notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
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
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `${memberToWhitelist.name || memberToWhitelist.wom_name} has been whitelisted`
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      // Reset state
      setMemberToWhitelist(null);
      setWhitelistReason('');
      
    } catch (err) {
      console.error('Error whitelisting member:', err);
      setError(`Failed to whitelist member: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="ui-loading-container ui-runewatch-loading">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading reported members...</div>
      </div>
    );
  }

  // For preview mode, show a simplified version with just the alert count
  if (previewMode) {
    return (
      <div className="ui-runewatch-preview">
        {reportedMembers.length === 0 ? (
          <div className="ui-no-alerts">
            <FaCheck className="ui-success-icon" /> No reported clan members found
          </div>
        ) : (
          <div className="ui-preview-alerts">
            <FaExclamationTriangle className="ui-warning-icon" />
            <span>{reportedMembers.length} member{reportedMembers.length !== 1 ? 's' : ''} reported on RuneWatch</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ui-runewatch-alerts">
      <div className="ui-runewatch-header">
        <Button 
          variant="secondary"
          onClick={checkRunewatch}
          disabled={checkingRunewatch}
          icon={<FaSync className={checkingRunewatch ? "ui-icon-spin" : ""} />}
        >
          {checkingRunewatch ? "Checking..." : "Check RuneWatch"}
        </Button>
      </div>
      
      {error && (
        <div className="ui-message ui-message-error">
          <FaExclamationTriangle className="ui-message-icon" />
          <span>{error}</span>
        </div>
      )}
      
      {notification && (
        <div className={`ui-message ${notification.type === 'success' ? 'ui-message-success' : 'ui-message-error'}`}>
          {notification.type === 'success' ? (
            <FaCheck className="ui-message-icon" />
          ) : (
            <FaExclamationTriangle className="ui-message-icon" />
          )}
          <span>{notification.message}</span>
        </div>
      )}
      
      {reportedMembers.length === 0 ? (
        <div className="ui-no-alerts">
          <FaCheck className="ui-success-icon" /> No reported clan members found
        </div>
      ) : (
        <Card variant="dark" className="ui-reported-members-card">
          <Card.Header>
            <h3 className="ui-card-title">
              <FaExclamationTriangle className="ui-warning-icon" />
              Reported Clan Members
            </h3>
          </Card.Header>
          <Card.Body>
            <div className="ui-message ui-message-warning">
              <FaExclamationTriangle className="ui-message-icon" />
              <span>The following clan members have been reported on RuneWatch</span>
            </div>
            
            <ul className="ui-reported-members-list">
              {reportedMembers.map(member => (
                <li key={member.wom_id} className="ui-reported-member-item">
                  <div className="ui-reported-member-name">
                    {member.name || member.wom_name}
                  </div>
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={() => setMemberToWhitelist(member)}
                    icon={<FaShieldAlt />}
                  >
                    Whitelist
                  </Button>
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
      
      {/* Whitelist Modal */}
      <Modal 
        isOpen={memberToWhitelist !== null}
        onClose={() => setMemberToWhitelist(null)}
        title={`Whitelist ${memberToWhitelist?.name || memberToWhitelist?.wom_name || 'Player'}`}
      >
        <div className="ui-whitelist-modal">
          <div className="ui-form-group">
            <label htmlFor="whitelist-reason">Reason for whitelisting:</label>
            <textarea
              id="whitelist-reason"
              className="ui-form-textarea"
              placeholder="e.g., Case was closed, False positive, etc."
              value={whitelistReason}
              onChange={(e) => setWhitelistReason(e.target.value)}
            />
          </div>

          <Modal.Footer>
            <Button 
              variant="primary"
              onClick={handleWhitelist}
              icon={<FaShieldAlt />}
            >
              Whitelist Player
            </Button>
            
            <Button 
              variant="secondary"
              onClick={() => setMemberToWhitelist(null)}
              icon={<FaTimes />}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}
