import React, { useState, useEffect } from 'react';
import { useMembers, useData } from "../context/DataContext";
import { supabase } from "../supabaseClient"; // Add supabase import
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Badge from './ui/Badge';
import { FaExclamationTriangle, FaCheck, FaSync, FaShieldAlt, FaTimes } from 'react-icons/fa';
import './RunewatchAlerts.css';

export default function RunewatchAlerts({ previewMode = false }) {
  const [checkingRunewatch, setCheckingRunewatch] = useState(false);
  const [whitelistReason, setWhitelistReason] = useState("");
  const [memberToWhitelist, setMemberToWhitelist] = useState(null);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const { fetchers } = useData();
  
  // Get members data from context
  const { members, loading, error: membersError, refreshMembers } = useMembers();

  // Filter reported members
  const reportedMembers = React.useMemo(() => {
    if (!members) return [];
    return members.filter(
      (m) => m.runewatch_reported && !m.runewatch_whitelisted
    );
  }, [members]);

  // Add error from context if it exists
  useEffect(() => {
    if (membersError) {
      setError(`Error loading members: ${membersError.message}`);
    }
  }, [membersError]);

  // Implement the missing checkRunewatch function
  const checkRunewatch = async () => {
    try {
      setCheckingRunewatch(true);
      setError(null);
      
      // Guard if no members
      if (!members || members.length === 0) {
        setNotification({
          type: "warning",
          message: "No members to check"
        });
        return;
      }
      
      // Get all members that aren't already reported or whitelisted
      const membersToCheck = members.filter(
        m => !m.runewatch_reported && !m.runewatch_whitelisted
      );
      
      if (membersToCheck.length === 0) {
        setNotification({
          type: "info",
          message: "All members have already been checked"
        });
        return;
      }
      
      // Check each member against Runewatch (assuming you have an API endpoint)
      const checkedMembers = [];
      
      for (const member of membersToCheck) {
        // Note: You would need to implement or use a proper Runewatch API here
        // This is just a placeholder to show the concept
        try {
          const response = await fetch(`/api/runewatch?rsn=${encodeURIComponent(member.name || member.wom_name)}`);
          const data = await response.json();
          
          if (data.reported) {
            // Update the member in the database
            const { error } = await supabase
              .from("members")
              .update({
                runewatch_reported: true,
                runewatch_report_data: data,
                runewatch_checked_at: new Date().toISOString()
              })
              .eq("wom_id", member.wom_id);
              
            if (error) throw error;
            
            checkedMembers.push(member);
          }
        } catch (err) {
          console.error(`Error checking ${member.name || member.wom_name}:`, err);
        }
      }
      
      // Refresh the members list
      await refreshMembers();
      
      setNotification({
        type: "success",
        message: `${checkedMembers.length} members found on Runewatch`
      });
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err) {
      console.error("Error checking Runewatch:", err);
      setError(`Failed to check Runewatch: ${err.message}`);
    } finally {
      setCheckingRunewatch(false);
    }
  };

  const handleWhitelist = async () => {
    if (!memberToWhitelist) return;

    try {
      await fetchers.supabase.whitelistRunewatchMember(
        memberToWhitelist.wom_id,
        whitelistReason
      );

      if (supabaseError) throw supabaseError;

      // Refresh data from context instead of managing local state
      await refreshMembers();

      // Show success notification
      setNotification({
        type: "success",
        message: `${
          memberToWhitelist.name || memberToWhitelist.wom_name
        } has been whitelisted`,
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);

      // Reset state
      setMemberToWhitelist(null);
      setWhitelistReason("");
    } catch (err) {
      console.error("Error whitelisting member:", err);
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
            <FaCheck className="ui-success-icon" /> No reported clan members
            found
          </div>
        ) : (
          <div className="ui-preview-alerts">
            <FaExclamationTriangle className="ui-warning-icon" />
            <span>
              {reportedMembers.length} member
              {reportedMembers.length !== 1 ? "s" : ""} reported on RuneWatch
            </span>
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
        <div
          className={`ui-message ${
            notification.type === "success"
              ? "ui-message-success"
              : notification.type === "warning" 
              ? "ui-message-warning" 
              : notification.type === "info"
              ? "ui-message-info"
              : "ui-message-error"
          }`}
        >
          {notification.type === "success" ? (
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
              <span>
                The following clan members have been reported on RuneWatch
              </span>
            </div>

            <ul className="ui-reported-members-list">
              {reportedMembers.map((member) => (
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
        title={`Whitelist ${
          memberToWhitelist?.name || memberToWhitelist?.wom_name || "Player"
        }`}
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
