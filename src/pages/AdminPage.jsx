import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { memberNeedsRankUpdate } from "../utils/rankUtils";
import { useMembers, useMembersAdmin, useClaimRequests } from "../context/DataContext";

// Components
import AdminMemberTable from "../components/admin/AdminMemberTable";
import RankAlerts from "../components/RankAlerts";
import MemberEditor from "../components/MemberEditor";
import EventManagement from "../components/EventManagement";
import RunewatchAlerts from "../components/RunewatchAlerts";
import GenerateClaimCode from "../components/GenerateClaimCode";
import ClaimRequestManager from "../components/ClaimRequestManager";
import ClaimRequestsPreview from "../components/ClaimRequestsPreview";
import AdminUserManager from "../components/admin/AdminUserManager";
import AdminResetPassword from "../components/admin/AdminResetPassword";

// UI Components
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import StatGroup from "../components/ui/StatGroup";
import Tabs from "../components/ui/Tabs";
import SearchInput from "../components/ui/SearchInput";
import EmptyState from "../components/ui/EmptyState";

// Icons
import { 
  FaDownload, 
  FaEraser, 
  FaCheck, 
  FaBell, 
  FaUsers, 
  FaCalendarAlt, 
  FaUserCog, 
  FaKey, 
  FaExclamationTriangle 
} from "react-icons/fa";

import "./AdminPage.css";

export default function AdminPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [selectedMember, setSelectedMember] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("alerts");
  const [alertsCount, setAlertsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [userSubTab, setUserSubTab] = useState("requests");
  const searchInputRef = useRef(null);

  // Use context hooks instead of direct Supabase calls
  const { 
    members, 
    loading: membersLoading, 
    error: membersError,
    refreshMembers 
  } = useMembers();

  const { updateMember, deleteMember } = useMembersAdmin();

  // Get pending claim requests count
  const { 
    requests: pendingRequests, 
    refreshRequests 
  } = useClaimRequests({ status: "pending" });

  // Calculate and set alerts count whenever members data changes
  useEffect(() => {
    if (members) {
      // Filter visible members and count those needing rank updates
      const visibleMembers = members.filter(member => !member.hidden);
      const needsUpdates = visibleMembers.filter(member => memberNeedsRankUpdate(member));
      setAlertsCount(needsUpdates.length);
    }
  }, [members]);
  
  // Filter members based on search term
  useEffect(() => {
    if (!members) {
      console.log("No members data available yet");
      return;
    }
    
    if (!searchTerm.trim()) {
      console.log(`Setting all ${members.length} members as filteredMembers`);
      setFilteredMembers(members);
      return;
    }
    
    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = members.filter(member => 
      (member.name || "").toLowerCase().includes(lowercaseSearch) ||
      (member.wom_name || "").toLowerCase().includes(lowercaseSearch) ||
      (member.womrole || "").toLowerCase().includes(lowercaseSearch)
    );
    
    console.log(`Search term "${searchTerm}" matched ${filtered.length} members`);
    setFilteredMembers(filtered);
  }, [searchTerm, members]);
  
  // Make sure filteredMembers is properly initialized when members data is loaded
  useEffect(() => {
    if (members && members.length > 0) {
      setFilteredMembers(members);
    }
  }, [members]);

  // Focus search input when switching to members tab
  useEffect(() => {
    if (activeTab === "members" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab]);

  // Handle deleting a member
  const handleDeleteMember = async (member) => {
    if (!member || !member.wom_id) {
      console.error("Cannot delete: wom_id is missing", member);
      setNotification({
        type: 'error',
        message: "Cannot delete member: Missing identifier",
        id: Date.now()
      });
      return;
    }
  
    if (!window.confirm(`Are you sure you want to delete ${member.name || member.wom_name}?`)) {
      return;
    }
    
    try {
      // Use deleteMember function from useMembersAdmin hook
      const result = await deleteMember(member.wom_id);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete member");
      }
      
      // Clear selection if needed
      if (selectedMember?.wom_id === member.wom_id) {
        setSelectedMember(null);
      }
      
      // Show notification
      setNotification({
        type: 'success',
        message: `${member.name || member.wom_name} was successfully deleted.`,
        id: Date.now()
      });
      
      // Auto-dismiss
      setTimeout(() => {
        setNotification(prev => prev?.id === Date.now() ? null : prev);
      }, 5000);
      
    } catch (err) {
      console.error("Error deleting member:", err);
      setNotification({
        type: 'error',
        message: `Failed to delete ${member.name || member.wom_name}: ${err.message}`,
        id: Date.now()
      });
    }
  };

  // Handle saving member data
  const handleSaveMember = async (updatedMember) => {
    try {
      // Use updateMember function from useMembersAdmin hook
      await updateMember(updatedMember);
      
      // Clear selection
      setSelectedMember(null);
      setIsAddingMember(false);
      
      // Show notification
      setNotification({
        type: 'success',
        message: `${updatedMember.name || updatedMember.wom_name} was successfully saved.`,
        id: Date.now()
      });
      
      // Refresh members data
      refreshMembers();
      
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err) {
      console.error("Error saving member:", err);
      setNotification({
        type: 'error',
        message: `Failed to save ${updatedMember.name || updatedMember.wom_name}: ${err.message}`,
        id: Date.now()
      });
    }
  };
  
  // Export members to CSV
  const exportToCSV = () => {
    try {
      // Prepare CSV data
      const headers = [
        "Name", "WOM ID", "WOM Name", "Title", "WOM Role",
        "Current Level", "Current XP", "Initial Level", "Initial XP",
        "EHB", "Siege Score", "Join Date", "Updated At"
      ];
      
      const csvRows = [];
      csvRows.push(headers.join(','));
      
      members.forEach(member => {
        const row = [
          `"${member.name || ''}"`,
          member.wom_id || '',
          `"${member.wom_name || ''}"`,
          `"${member.title || ''}"`,
          `"${member.womrole || ''}"`,
          member.current_lvl || 0,
          member.current_xp || 0,
          member.first_lvl || 0,
          member.first_xp || 0,
          member.ehb || 0,
          member.siege_score || 0,
          member.created_at ? new Date(member.created_at).toISOString().split('T')[0] : '',
          member.updated_at ? new Date(member.updated_at).toISOString().split('T')[0] : ''
        ];
        
        csvRows.push(row.join(','));
      });
      
      // Create and download the CSV file
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      const fileName = `siege-members-${new Date().toISOString().split('T')[0]}.csv`;
      
      if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, fileName);
      } else {
        // Other browsers
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      setNotification({
        type: 'success',
        message: `Exported ${members.length} members to CSV.`,
        id: Date.now()
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 5000);
      
    } catch (err) {
      console.error("Error exporting to CSV:", err);
      setNotification({
        type: 'error',
        message: `Failed to export to CSV: ${err.message}`,
        id: Date.now()
      });
    }
  };
  
  // Reset all siege scores using the updateMember function
  const handleResetScores = async () => {
    if (resetConfirmText !== "RESET ALL SCORES") {
      setNotification({
        type: 'error',
        message: "Confirmation text doesn't match. Scores not reset.",
        id: Date.now()
      });
      return;
    }
    
    try {
      // First, export current scores for backup
      exportToCSV();
      
      // Update each member's siege score to 0
      const updatePromises = members.map(member => 
        updateMember({ ...member, siege_score: 0 })
      );
      
      await Promise.all(updatePromises);
      
      // Hide confirmation
      setShowResetConfirm(false);
      setResetConfirmText("");
      
      // Refresh members data
      refreshMembers();
      
      // Show notification
      setNotification({
        type: 'success',
        message: `Reset all siege scores to 0. A backup CSV was downloaded.`,
        id: Date.now()
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 5000);
      
    } catch (err) {
      console.error("Error resetting scores:", err);
      setNotification({
        type: 'error',
        message: `Failed to reset scores: ${err.message}`,
        id: Date.now()
      });
    }
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
            onClick={() => window.location.href = '/login'}
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
        <div className={`ui-notification ${notification.type === 'success' ? 'ui-notification-success' : 'ui-notification-error'}`}>
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

      {/* Admin Tabs */}
      <Tabs activeTab={activeTab} onChange={setActiveTab} className="admin-tabs">
        <Tabs.Tab 
          tabId="alerts" 
          label="Alerts" 
          icon={<FaBell />} 
          badge={alertsCount > 0 ? alertsCount : null}
        >
          <div className="tab-content alerts-content">
            <div className="content-header">
              <h2>Action Items Dashboard</h2>
              <p>All items requiring admin attention are shown here</p>
            </div>

            <div className="alerts-container">
              {/* Rank Updates */}
              <Card className="alert-section" variant="dark">
                <Card.Header>
                  <h3>
                    <FaBell className="alert-icon" />
                    Rank Updates
                    {alertsCount > 0 && (
                      <span className="count-badge">{alertsCount}</span>
                    )}
                  </h3>
                </Card.Header>
                <Card.Body className="alert-section-content">
                  <RankAlerts
                    onRankUpdate={() => {
                      refreshMembers();
                    }}
                    previewMode={true}
                  />
                </Card.Body>
              </Card>

              {/* Pending Claims */}
              <Card className="alert-section" variant="dark">
                <Card.Header>
                  <h3>
                    <FaKey className="alert-icon" />
                    Pending Player Claims
                  </h3>
                </Card.Header>
                <Card.Body className="alert-section-content">
                  {pendingRequests?.length > 0 ? (
                    <ClaimRequestsPreview
                      count={pendingRequests.length}
                      onViewAllClick={() => {
                        setActiveTab("users");
                        setUserSubTab("requests");
                      }}
                      onRequestProcessed={refreshRequests}
                    />
                  ) : (
                    <div className="ui-no-alerts">
                      <FaCheck className="ui-success-icon" />
                      <span>No pending claim requests</span>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Runewatch Alerts */}
              <Card className="alert-section full-width" variant="dark">
                <Card.Header>
                  <h3>
                    <FaExclamationTriangle className="alert-icon" /> Runewatch Alerts
                  </h3>
                </Card.Header>
                <Card.Body className="alert-section-content">
                  <RunewatchAlerts previewMode={true} />
                </Card.Body>
              </Card>
            </div>
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="members" label="Members" icon={<FaUsers />}>
          <div className="tab-content members-content">
            <div className="content-header">
              <h2>Member Management</h2>

              <div className="admin-toolbar">
                <SearchInput
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm("")}
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
                <div className="ui-error-message">{membersError.message || String(membersError)}</div>
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

        <Tabs.Tab tabId="events" label="Events" icon={<FaCalendarAlt />}>
          <div className="tab-content events-content">
            <div className="content-header">
              <h2>Event Management</h2>
            </div>
            <div className="events-management-container">
              <EventManagement />
            </div>
          </div>
        </Tabs.Tab>

        <Tabs.Tab 
          tabId="users" 
          label="Users" 
          icon={<FaUserCog />} 
        >
          <div className="tab-content users-content">
            <div className="content-header">
              <h2>User Management</h2>
            </div>

            <div className="users-management-container">
              <Tabs activeTab={userSubTab} onChange={setUserSubTab} className="users-tabs">
                <Tabs.Tab tabId="requests" label="Claim Requests">
                  <Card className="action-card" variant="dark">
                    <Card.Body>
                      <ClaimRequestManager />
                    </Card.Body>
                  </Card>
                </Tabs.Tab>
                
                <Tabs.Tab tabId="codes" label="Claim Codes">
                  <Card className="action-card" variant="dark">
                    <Card.Body>
                      <GenerateClaimCode />
                    </Card.Body>
                  </Card>
                </Tabs.Tab>
                
                <Tabs.Tab tabId="admins" label="Admin Users">
                  <Card className="action-card" variant="dark">
                    <Card.Body>
                      <AdminUserManager />
                    </Card.Body>
                  </Card>
                </Tabs.Tab>
                
                <Tabs.Tab tabId="passwords" label="Reset Passwords">
                  <Card className="action-card" variant="dark">
                    <Card.Body>
                      <AdminResetPassword />
                    </Card.Body>
                  </Card>
                </Tabs.Tab>
              </Tabs>
            </div>
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
