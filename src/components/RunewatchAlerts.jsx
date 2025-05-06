import React, { useState, useEffect, useCallback } from 'react';
import { useMembers } from "../hooks/useMembers";
import Button from './ui/Button';
import Modal from './ui/Modal';
import { FaExclamationTriangle, FaCheck, FaShieldAlt, FaTimes } from 'react-icons/fa';
import './RunewatchAlerts.css';

export default function RunewatchAlerts() {
  const [whitelistReason, setWhitelistReason] = useState("");
  const [memberToWhitelist, setMemberToWhitelist] = useState(null);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  // Use the members hook
  const {
    members,
    loading,
    error: membersError,
    refreshMembers,
    whitelistRunewatchMember,
    updateMember
  } = useMembers();

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

  const handleWhitelist = async () => {
    if (!memberToWhitelist) return;

    try {
      // Update the member using the hook
      await whitelistRunewatchMember(
        memberToWhitelist.wom_id,
        whitelistReason || "Manually whitelisted by admin"
      );
      // Refresh data from context
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

  // Main return - content only, no card or header
  return (
    <div className="ui-runewatch-content">
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
        <>
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
        </>
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
