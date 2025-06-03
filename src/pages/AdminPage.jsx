import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { memberNeedsRankUpdate } from "../utils/rankUtils";
import { useData } from "../context/DataContext";
import { useSearchParams } from "react-router-dom";
import { useClaimRequests } from "../hooks/useClaimRequests";

// Components
import AdminMemberTable from "../components/admin/AdminMemberTable";
import RankAlerts from "../components/RankAlerts";
import MemberEditor from "../components/MemberEditor";
import RunewatchAlerts from "../components/RunewatchAlerts";

// UI Components
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import Tabs from "../components/ui/Tabs";
import SearchInput from "../components/ui/SearchInput";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";

// Icons
import {
  FaDownload,
  FaEraser,
  FaBell,
  FaUsers,
  FaUserTag,
  FaUserPlus,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaUser,
  FaCalendarAlt,
} from "react-icons/fa";

import "./AdminPage.css";

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams(); // Use search params hook
  const { isAuthenticated, isAdmin } = useAuth();

  // Initialize state from URL parameters or defaults
  const [selectedMember, setSelectedMember] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "members"
  );
  const [alertsCount, setAlertsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const searchInputRef = useRef(null);
  const [runewatchAlertCount, setRunewatchAlertCount] = useState(0);

  const [processingClaimId, setProcessingClaimId] = useState(null);
  const [claimAction, setClaimAction] = useState(null);
  const [claimNotes, setClaimNotes] = useState("");
  const [showClaimNotesModal, setShowClaimNotesModal] = useState(false);
  const [currentClaimRequest, setCurrentClaimRequest] = useState(null);

  // Use DataContext hooks for all data access
  const {
    members,
    loading: membersLoading,
    error: membersError,
    refreshMembers,
    updateMember,
    deleteMember,
  } = useData();

  const {
    requests: claimRequests,
    loading: claimRequestsLoading,
    error: claimRequestsError,
    refresh: refreshClaimRequests,
    processClaimRequest,
  } = useClaimRequests();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Update URL with new tab
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tabId);
    setSearchParams(newParams);
  };

  // Update URL when search term changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Update URL with search term
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("search", value);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams);
  };

  // Clear search and update URL
  const handleSearchClear = () => {
    setSearchTerm("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("search");
    setSearchParams(newParams);
  };

  const handleProcessClaim = async () => {
    if (!currentClaimRequest || !claimAction) return;

    setProcessingClaimId(currentClaimRequest.id);
    try {
      await processClaimRequest(
        currentClaimRequest.id,
        claimAction,
        claimNotes,
        currentClaimRequest.user_id,
        currentClaimRequest.wom_id
      );

      setNotification({
        type: "success",
        message: `Request ${
          claimAction === "approved" ? "approved" : "denied"
        } successfully`,
      });

      refreshClaimRequests();
      setShowClaimNotesModal(false);
    } catch (err) {
      setNotification({
        type: "error",
        message: `Failed to process claim: ${err.message}`,
      });
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleReleaseClaim = async (memberId, memberName) => {
    if (
      !confirm(`Are you sure you want to release the claim for ${memberName}?`)
    ) {
      return;
    }

    try {
      // Update the member to remove the claimed_by field
      await updateMember({
        wom_id: memberId,
        claimed_by: null,
      });

      setNotification({
        type: "success",
        message: `Released claim for ${memberName}`,
      });

      refreshMembers();
    } catch (err) {
      setNotification({
        type: "error",
        message: `Failed to release claim: ${err.message}`,
      });
    }
  };

  // Calculate and set alerts count whenever members data changes
  useEffect(() => {
    if (members) {
      const visibleMembers = members.filter((member) => !member.hidden);
      const needsUpdates = visibleMembers.filter((member) =>
        memberNeedsRankUpdate(member)
      );
      setAlertsCount(needsUpdates.length);
    }
  }, [members]);

  // Filter members based on search term
  useEffect(() => {
    if (!members || !members.length) return;

    if (!searchTerm.trim()) {
      setFilteredMembers(members);
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = members.filter(
      (member) =>
        (member.name || "").toLowerCase().includes(lowercaseSearch) ||
        (member.wom_name || "").toLowerCase().includes(lowercaseSearch) ||
        (member.womrole || "").toLowerCase().includes(lowercaseSearch)
    );

    setFilteredMembers(filtered);
  }, [searchTerm, members]);

  useEffect(() => {
    if (members) {
      const reportedMembers = members.filter(
        (m) => m.runewatch_reported && !m.runewatch_whitelisted
      );
      setRunewatchAlertCount(reportedMembers.length);
    }
  }, [members]);

  // Handle deleting a member
  const handleDeleteMember = async (member) => {
    if (!member || !member.wom_id) {
      setNotification({
        type: "error",
        message: "Cannot delete member: Missing identifier",
      });
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${member.name || member.wom_name}?`
      )
    ) {
      return;
    }

    try {
      await deleteMember(member.wom_id);

      if (selectedMember?.wom_id === member.wom_id) {
        setSelectedMember(null);
      }

      setNotification({
        type: "success",
        message: `${member.name || member.wom_name} was successfully deleted.`,
      });

      refreshMembers();
    } catch (err) {
      setNotification({
        type: "error",
        message: `Failed to delete ${member.name || member.wom_name}: ${
          err.message
        }`,
      });
    }
  };

  // Handle saving member data
  const handleSaveMember = async (updatedMember) => {
    try {
      await updateMember(updatedMember);

      setSelectedMember(null);
      setIsAddingMember(false);

      setNotification({
        type: "success",
        message: `${
          updatedMember.name || updatedMember.wom_name
        } was successfully saved.`,
      });

      refreshMembers();
    } catch (err) {
      setNotification({
        type: "error",
        message: `Failed to save ${
          updatedMember.name || updatedMember.wom_name
        }: ${err.message}`,
      });
    }
  };

  // Export members to CSV
  const exportToCSV = () => {
    try {
      const headers = [
        "Name",
        "WOM ID",
        "WOM Name",
        "Title",
        "WOM Role",
        "Current Level",
        "Current XP",
        "Initial Level",
        "Initial XP",
        "EHB",
        "Siege Score",
        "Join Date",
        "Updated At",
      ];

      const csvRows = [headers.join(",")];

      members.forEach((member) => {
        const row = [
          `"${member.name || ""}"`,
          member.wom_id || "",
          `"${member.wom_name || ""}"`,
          `"${member.title || ""}"`,
          `"${member.womrole || ""}"`,
          member.current_lvl || 0,
          member.current_xp || 0,
          member.first_lvl || 0,
          member.first_xp || 0,
          member.ehb || 0,
          member.siege_score || 0,
          member.created_at
            ? new Date(member.created_at).toISOString().split("T")[0]
            : "",
          member.updated_at
            ? new Date(member.updated_at).toISOString().split("T")[0]
            : "",
        ];

        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");

      const fileName = `siege-members-${
        new Date().toISOString().split("T")[0]
      }.csv`;

      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, fileName);
      } else {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setNotification({
        type: "success",
        message: `Exported ${members.length} members to CSV.`,
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: `Failed to export to CSV: ${err.message}`,
      });
    }
  };

  // Reset all siege scores
  const handleResetScores = async () => {
    if (resetConfirmText !== "RESET ALL SCORES") {
      setNotification({
        type: "error",
        message: "Confirmation text doesn't match. Scores not reset.",
      });
      return;
    }

    try {
      exportToCSV();

      const updatePromises = members.map((member) =>
        updateMember({ ...member, siege_score: 0 })
      );

      await Promise.all(updatePromises);

      setShowResetConfirm(false);
      setResetConfirmText("");

      refreshMembers();

      setNotification({
        type: "success",
        message: `Reset all siege scores to 0. A backup CSV was downloaded.`,
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: `Failed to reset scores: ${err.message}`,
      });
    }
  };
  
  const handleClaimAction = (request, action) => {
    console.log("Processing claim request:", request);
    setCurrentClaimRequest(request);
    setClaimAction(action);
    setClaimNotes("");
    setShowClaimNotesModal(true);
  };

  if (!isAuthenticated || !isAdmin()) {
    return (
      <EmptyState
        title="Access Restricted"
        description="You must be logged in as an administrator to view this page."
        icon={<FaExclamationTriangle size={32} />}
        action={
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/login")}
          >
            Log In
          </Button>
        }
        className="admin-auth-error"
      />
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Clan Administration</h1>
        <div className="admin-actions">
          <Button
            variant="primary"
            onClick={() => {
              setSelectedMember(null);
              setIsAddingMember(true);
            }}
            icon="+"
          >
            Add New Member
          </Button>
          {alertsCount > 0 && (
            <Button
              variant="danger"
              onClick={() => setActiveTab("alerts")}
              icon={<FaBell />}
            >
              {alertsCount} Rank Alert{alertsCount !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`ui-notification ${
            notification.type === "success"
              ? "ui-notification-success"
              : "ui-notification-error"
          }`}
        >
          <span>{notification.message}</span>
          <button
            className="ui-notification-close"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Member Editor Modal */}
      <Modal
        isOpen={selectedMember !== null || isAddingMember}
        onClose={() => {
          setSelectedMember(null);
          setIsAddingMember(false);
        }}
        title={isAddingMember ? "Add New Member" : "Edit Member"}
        size="large"
      >
        <MemberEditor
          member={isAddingMember ? null : selectedMember}
          onSave={handleSaveMember}
          onCancel={() => {
            setSelectedMember(null);
            setIsAddingMember(false);
          }}
        />
      </Modal>

      {/* Reset confirmation modal */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => {
          setShowResetConfirm(false);
          setResetConfirmText("");
        }}
        title="Reset All Siege Scores"
      >
        <div className="reset-confirmation">
          <div className="ui-message ui-message-error">
            <strong>Warning!</strong> This action will set all members' siege
            scores to 0. This cannot be undone.
          </div>

          <p>
            A backup CSV of the current data will be automatically downloaded
            before resetting.
          </p>

          <div className="ui-form-group">
            <label>
              Type <strong>RESET ALL SCORES</strong> to confirm:
            </label>
            <input
              type="text"
              className="ui-form-input"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET ALL SCORES"
            />
          </div>

          <Modal.Footer>
            <Button
              variant="danger"
              onClick={handleResetScores}
              disabled={resetConfirmText !== "RESET ALL SCORES"}
            >
              Reset All Scores
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setShowResetConfirm(false);
                setResetConfirmText("");
              }}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Admin Tabs - Simplified to only include Alerts, Members, and Events */}
      <Tabs
        activeTab={activeTab}
        onChange={handleTabChange}
        className="admin-tabs"
      >
        <Tabs.Tab tabId="members" label="Members" icon={<FaUsers />}>
          <div className="tab-content members-content">
            <div className="content-header">
              <h2>Member Management</h2>

              <div className="admin-toolbar">
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onClear={handleSearchClear}
                  placeholder="Search members by name, WOM name, or role..."
                  ref={searchInputRef}
                  className="search-container"
                />
              </div>
            </div>

            {membersLoading ? (
              <div className="ui-loading-container">
                <div className="ui-loading-spinner"></div>
                <div className="ui-loading-text">Loading members data...</div>
              </div>
            ) : membersError ? (
              <div className="ui-error-container">
                <FaExclamationTriangle className="ui-error-icon" />
                <div className="ui-error-message">
                  {membersError.message || String(membersError)}
                </div>
              </div>
            ) : (
              <>
                <div className="stats-and-table">
                  <AdminMemberTable
                    members={filteredMembers || []}
                    onEditClick={(member) => {
                      setSelectedMember(member);
                      setIsAddingMember(false);
                    }}
                    onDeleteClick={handleDeleteMember}
                    onRefresh={refreshMembers}
                  />
                </div>

                {/* Admin Footer */}
                <div className="admin-footer">
                  <h3>Administration Actions</h3>
                  <div className="admin-footer-actions">
                    <Button
                      variant="success"
                      onClick={exportToCSV}
                      icon={<FaDownload />}
                      className="export-btn"
                    >
                      Export Members to CSV
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => setShowResetConfirm(true)}
                      icon={<FaEraser />}
                      className="reset-btn"
                    >
                      Reset All Siege Scores
                    </Button>
                  </div>
                  <p className="admin-footer-note">
                    Note: These actions are typically performed once per year
                    during clan resets.
                  </p>
                </div>
              </>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab
          tabId="alerts"
          label="Alerts"
          icon={<FaBell />}
          badge={
            alertsCount + runewatchAlertCount > 0
              ? alertsCount + runewatchAlertCount
              : null
          }
        >
          <div className="tab-content alerts-content">
            <div className="content-header">
              <h2>Action Items Dashboard</h2>
              <p>All items requiring admin attention are shown here</p>
            </div>

            <div className="alerts-container">
              {/* Rank Updates */}
              <Card className="alert-section" variant="dark">
                <Card.Header className="ui-rank-alerts-header">
                  <h3 className="ui-rank-alerts-title">
                    <FaBell className="alert-icon" />
                    Rank Updates
                    {alertsCount > 0 && (
                      <Badge variant="warning" className="ui-alerts-count">
                        {alertsCount}
                      </Badge>
                    )}
                    {claimRequests &&
                      claimRequests.filter((r) => r.status === "pending")
                        .length > 0 && (
                        <Badge variant="warning" className="ui-alerts-count">
                          {
                            (claimRequests || []).filter(
                              (r) => r.status === "pending"
                            ).length
                          }
                        </Badge>
                      )}
                  </h3>
                </Card.Header>
                <Card.Body className="alert-section-content">
                  <RankAlerts
                    onRankUpdate={() => {
                      refreshMembers();
                    }}
                  />
                </Card.Body>
              </Card>

              {/* Runewatch Alerts */}
              <Card className="alert-section" variant="dark">
                <Card.Header className="ui-runewatch-header">
                  <h3 className="ui-card-title">
                    <FaExclamationTriangle className="alert-icon" />
                    RuneWatch Alerts
                    {runewatchAlertCount > 0 && (
                      <Badge variant="warning" className="ui-alerts-count">
                        {runewatchAlertCount}
                      </Badge>
                    )}
                  </h3>
                </Card.Header>
                <Card.Body className="alert-section-content">
                  <RunewatchAlerts />
                </Card.Body>
              </Card>

              {/* Claim Requests */}
              <Card className="alert-section" variant="dark">
                <Card.Header className="ui-claims-header">
                  <h3 className="ui-card-title">
                    <FaUserPlus className="alert-icon" />
                    Player Claim Requests
                    {claimRequests?.filter((r) => r.status === "pending")
                      .length > 0 && (
                      <Badge variant="warning" className="ui-alerts-count">
                        {
                          (claimRequests || []).filter(
                            (r) => r.status === "pending"
                          ).length
                        }
                      </Badge>
                    )}
                  </h3>
                </Card.Header>
                <Card.Body className="alert-section-content">
                  {claimRequestsLoading ? (
                    <div className="ui-loading-indicator">
                      <div className="ui-loading-spinner"></div>
                      <div className="ui-loading-text">
                        Loading claim requests...
                      </div>
                    </div>
                  ) : claimRequestsError ? (
                    <div className="ui-error-message">
                      <FaExclamationTriangle className="ui-error-icon" />
                      Error loading claim requests:{" "}
                      {claimRequestsError.message || claimRequestsError}
                    </div>
                  ) : !claimRequests ||
                    claimRequests.length === 0 ||
                    claimRequests.filter((r) => r.status === "pending")
                      .length === 0 ? (
                    <div className="ui-no-alerts">
                      <FaCheck className="ui-success-icon" />
                      <span>No pending claim requests</span>
                    </div>
                  ) : (
                    <div className="ui-claim-requests-list">
                      {claimRequests
                        .filter((r) => r.status === "pending")
                        .map((request) => (
                          <div
                            key={request.id}
                            className="ui-claim-request-item"
                          >
                            <div className="ui-claim-request-info">
                              <div className="ui-claim-request-name">
                                <strong>{request.rsn}</strong>
                              </div>
                              <div className="ui-claim-request-details">
                                <div>
                                  <FaUser className="ui-icon-left" />
                                  <span>Requested by: </span>
                                  <strong>
                                    {request.username ||
                                      (request.requester &&
                                        request.requester.username) ||
                                      "Unknown User"}
                                  </strong>
                                </div>
                                <div>
                                  <FaCalendarAlt className="ui-icon-left" />
                                  <span>
                                    {new Date(
                                      request.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                {request.message && (
                                  <div className="ui-claim-request-message">
                                    <em>"{request.message}"</em>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ui-claim-request-actions">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() =>
                                  handleClaimAction(request, "approved")
                                }
                                disabled={processingClaimId === request.id}
                              >
                                <FaCheck className="ui-icon-left" />
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  handleClaimAction(request, "denied")
                                }
                                disabled={processingClaimId === request.id}
                              >
                                <FaTimes className="ui-icon-left" />
                                Deny
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Claimed Members Management */}
              <Card className="alert-section" variant="dark">
                <Card.Header className="ui-claimed-members-header">
                  <h3 className="ui-card-title">
                    <FaUserTag className="alert-icon" />
                    Claimed Members
                  </h3>
                </Card.Header>
                <Card.Body className="alert-section-content">
                  {membersLoading ? (
                    <div className="ui-loading-indicator">
                      <div className="ui-loading-spinner"></div>
                      <div className="ui-loading-text">Loading members...</div>
                    </div>
                  ) : membersError ? (
                    <div className="ui-error-message">
                      <FaExclamationTriangle className="ui-error-icon" />
                      Error loading members:{" "}
                      {membersError.message || membersError}
                    </div>
                  ) : (
                    <div className="ui-claimed-members-list">
                      {members
                        .filter((m) => m.claimed_by)
                        .map((member) => (
                          <div
                            key={member.wom_id}
                            className="ui-claimed-member-item"
                          >
                            <div className="ui-claimed-member-info">
                              <div className="ui-claimed-member-name">
                                <strong>{member.name}</strong>
                              </div>
                              <div className="ui-claimed-member-details">
                                <span>Claimed by: </span>
                                <strong>
                                  {member.claimed_by_username ||
                                    member.claimed_by}
                                </strong>
                              </div>
                            </div>
                            <div className="ui-claimed-member-actions">
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() =>
                                  handleReleaseClaim(member.wom_id, member.name)
                                }
                              >
                                <FaTimes className="ui-icon-left" />
                                Release Claim
                              </Button>
                            </div>
                          </div>
                        ))}
                      {members.filter((m) => m.claimed_by).length === 0 && (
                        <div className="ui-no-alerts">
                          <span>No members have been claimed yet</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        </Tabs.Tab>
      </Tabs>

      {/* Claim Notes Modal */}
      <Modal
        isOpen={showClaimNotesModal}
        onClose={() => setShowClaimNotesModal(false)}
        title={
          claimAction === "approved"
            ? "Approve Claim Request"
            : "Deny Claim Request"
        }
      >
        {currentClaimRequest && (
          <div className="ui-claim-notes-modal">
            <p>
              <strong>Player:</strong> {currentClaimRequest.rsn}
            </p>
            <p>
              <strong>Requested by:</strong>{" "}
              {currentClaimRequest.username || "Unknown"}
            </p>

            <div className="ui-form-group">
              <label className="ui-form-label">Admin Notes (Optional):</label>
              <textarea
                className="ui-form-textarea"
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                placeholder="Add optional notes about your decision (visible to user)"
                rows={3}
              />
            </div>

            <Modal.Footer>
              <Button
                variant={claimAction === "approved" ? "success" : "danger"}
                onClick={handleProcessClaim}
                disabled={processingClaimId === currentClaimRequest.id}
              >
                {processingClaimId === currentClaimRequest.id
                  ? "Processing..."
                  : claimAction === "approved"
                  ? "Approve Request"
                  : "Deny Request"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowClaimNotesModal(false)}
              >
                Cancel
              </Button>
            </Modal.Footer>
          </div>
        )}
      </Modal>
    </div>
  );
}
