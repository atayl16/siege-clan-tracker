import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import AdminMemberTable from "../components/AdminMemberTable";
import RankAlerts from "../components/RankAlerts";
import MemberEditor from "../components/MemberEditor";
import EventManagement from "../components/EventManagement";
import WomSyncButton from "../components/WomSyncButton";
import RunewatchAlerts from "../components/RunewatchAlerts";
import { FaDownload, FaEraser, FaSearch } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import {
  memberNeedsRankUpdate
} from "../utils/rankUtils";
import "./AdminPage.css";

export default function AdminPage() {
  const { isAuthenticated } = useAuth();
  const [selectedMember, setSelectedMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("members");
  const [alertsCount, setAlertsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const searchInputRef = useRef(null);

  // Fetch members data when component mounts
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Use Supabase to fetch members
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setMembers(data || []);
      setFilteredMembers(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching members:", err);
      setError("Failed to load members data");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAlertsCount = async () => {
    try {
      // Fetch members from Supabase, filtering out hidden members at the DB level
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('hidden', false);  // Filter hidden members at the database level
        
      if (error) throw error;
      
      // Additional validation to ensure all required fields exist
      const validMembers = data.filter(member => 
        member.name && 
        member.womrole && 
        member.first_xp && 
        member.current_xp && 
        member.ehb !== undefined
      );
      
      // Use the same memberNeedsRankUpdate function from rankUtils
      const needsUpdates = validMembers.filter(member => memberNeedsRankUpdate(member));
      
      setAlertsCount(needsUpdates.length);
    } catch (err) {
      console.error("Error calculating rank alerts count:", err);
      setAlertsCount(0);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchAlertsCount();
    
    // Focus search input when switching to members tab
    if (activeTab === "members" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab]);
  
  // Filter members when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMembers(members);
      return;
    }
    
    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = members.filter(member => 
      (member.name || "").toLowerCase().includes(lowercaseSearch) ||
      (member.wom_name || "").toLowerCase().includes(lowercaseSearch) ||
      (member.womrole || "").toLowerCase().includes(lowercaseSearch)
    );
    
    setFilteredMembers(filtered);
  }, [searchTerm, members]);

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
      // Use Supabase client to delete
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('wom_id', member.wom_id);
        
      if (error) throw error;
      
      // Remove from local state
      setMembers(prev => prev.filter(m => m.wom_id !== member.wom_id));
      
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
  const handleSaveMember = (updatedMember) => {
    // Update the members list
    if (updatedMember.wom_id) {
      setMembers(prev => 
        prev.map(m => m.wom_id === updatedMember.wom_id ? updatedMember : m)
      );
    } else {
      setMembers(prev => [...prev, updatedMember]);
    }
    
    // Clear selection
    setSelectedMember(null);
    setIsAddingMember(false);
    
    // Show notification
    setNotification({
      type: 'success',
      message: `${updatedMember.name || updatedMember.wom_name} was successfully saved.`,
      id: Date.now()
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
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
  
  // Reset all siege scores
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
      
      // Update all members' siege scores to 0
      const { error } = await supabase
        .from('members')
        .update({ siege_score: 0 })
        .neq('wom_id', 'no-match'); // Update all rows
        
      if (error) throw error;
      
      // Update local state
      setMembers(prev => prev.map(m => ({ ...m, siege_score: 0 })));
      
      // Hide confirmation
      setShowResetConfirm(false);
      setResetConfirmText("");
      
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

  // Notification component
  const Notification = ({ notification, onDismiss }) => {
    if (!notification) return null;
    
    const typeClass = notification.type === 'success' ? 'notification-success' : 'notification-error';
    
    return (
      <div className={`notification ${typeClass}`}>
        <span>{notification.message}</span>
        <button 
          className="notification-close"
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
    );
  };

  // Edit modal
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    // Prevent clicks inside the modal from closing it
    const handleModalClick = (e) => {
      e.stopPropagation();
    };
    
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={handleModalClick}>
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
            {children}
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-auth-error">
        <div className="auth-error-icon">🔒</div>
        <h2>Access Restricted</h2>
        <p>You must be logged in as an administrator to view this page.</p>
        <button className="auth-login-button" onClick={() => window.location.href = '/login'}>
          Log In
        </button>
      </div>
    );
  }
  
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Clan Administration</h1>
        <div className="admin-actions">
          <button
            className="primary-button add-member-button"
            onClick={() => {
              setSelectedMember(null);
              setIsAddingMember(true);
            }}
          >
            <span className="button-icon">+</span> Add New Member
          </button>

          {alertsCount > 0 && (
            <button
              className="alert-button"
              onClick={() => setActiveTab("alerts")}
            >
              <span className="alert-icon">🔔</span>
              {alertsCount} Rank Alert{alertsCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {notification && (
        <Notification
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Modal for adding/editing members */}
      <Modal
        isOpen={selectedMember !== null || isAddingMember}
        onClose={() => {
          setSelectedMember(null);
          setIsAddingMember(false);
        }}
        title={isAddingMember ? "Add New Member" : "Edit Member"}
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
          <div className="alert alert-danger">
            <strong>Warning!</strong> This action will set all members' siege
            scores to 0. This cannot be undone.
          </div>

          <p>
            A backup CSV of the current data will be automatically downloaded
            before resetting.
          </p>

          <div className="form-group">
            <label>
              Type <strong>RESET ALL SCORES</strong> to confirm:
            </label>
            <input
              type="text"
              className="form-control"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET ALL SCORES"
            />
          </div>

          <div className="button-group">
            <button
              className="btn btn-danger"
              onClick={handleResetScores}
              disabled={resetConfirmText !== "RESET ALL SCORES"}
            >
              Reset All Scores
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowResetConfirm(false);
                setResetConfirmText("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Admin tab navigation */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          <span className="tab-icon">👥</span> Members
        </button>
        <button
          className={`admin-tab ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          <span className="tab-icon">📅</span> Events
        </button>
        <button
          className={`admin-tab ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          <span className="tab-icon">🔔</span> Alerts
          {alertsCount > 0 && (
            <span className="alert-badge">{alertsCount}</span>
          )}
        </button>
        <button
          className={`admin-tab ${activeTab === "sync" ? "active" : ""}`}
          onClick={() => setActiveTab("sync")}
        >
          <span className="tab-icon">↻</span> Sync
        </button>
      </div>

      {/* Tab content */}
      <div className="admin-content">
        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="tab-content members-content">
            <div className="content-header">
              <h2>Member Management</h2>

              <div className="admin-toolbar">
                <div className="search-container">
                  <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search members by name, WOM name, or role..."
                      className="search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      ref={searchInputRef}
                    />
                    {searchTerm && (
                      <button
                        className="clear-search"
                        onClick={() => setSearchTerm("")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading members data...</div>
              </div>
            ) : error ? (
              <div className="error-container">
                <div className="error-icon">⚠️</div>
                <div className="error-message">{error}</div>
              </div>
            ) : (
              <>
                <div className="stats-and-table">
                  <div className="stats-panel">
                    <div className="stat-item">
                      <div className="stat-label">Total Members</div>
                      <div className="stat-value">{members.length}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Total Siege Points</div>
                      <div className="stat-value">
                        {members.reduce(
                          (sum, m) => sum + (parseInt(m.siege_score) || 0),
                          0
                        )}
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Search Results</div>
                      <div className="stat-value">{filteredMembers.length}</div>
                    </div>
                  </div>

                  <AdminMemberTable
                    members={filteredMembers}
                    onEditClick={(member) => {
                      setSelectedMember(member);
                      setIsAddingMember(false);
                    }}
                    onDeleteClick={handleDeleteMember}
                    onRefresh={fetchMembers}
                  />
                </div>

                {/* Move Export/Reset buttons to a footer */}
                <div className="admin-footer">
                  <h3>Administration Actions</h3>
                  <div className="admin-footer-actions">
                    <button
                      className="admin-action-btn export-btn"
                      onClick={exportToCSV}
                      title="Export to CSV"
                    >
                      <FaDownload /> Export Members to CSV
                    </button>

                    <button
                      className="admin-action-btn reset-btn"
                      onClick={() => setShowResetConfirm(true)}
                      title="Reset all siege scores"
                    >
                      <FaEraser /> Reset All Siege Scores
                    </button>
                  </div>
                  <p className="admin-footer-note">
                    Note: These actions are typically performed once per year
                    during clan resets.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="tab-content events-content">
            <div className="content-header">
              <h2>Event Management</h2>
            </div>
            <div className="events-management-container">
              <EventManagement />
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="tab-content alerts-content">
            <div className="content-header">
              <h2>Rank Alerts</h2>
            </div>
            <div className="alerts-container">
              <RankAlerts
                onRankUpdate={() => {
                  fetchMembers();
                  fetchAlertsCount();
                }}
              />
              <RunewatchAlerts />
            </div>
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === "sync" && (
          <div className="tab-content sync-content">
            <div className="content-header">
              <h2>Data Synchronization</h2>
              <h3> Only for emergencies!</h3>
            </div>
            <div className="sync-container">
              <div className="sync-cards">
                <div className="sync-card">
                  <h3>Member Data Sync</h3>
                  <p>Update member stats, levels, and EHB from Wise Old Man</p>
                  <WomSyncButton
                    type="members"
                    buttonText="Sync Members"
                    onSyncComplete={fetchMembers}
                  />
                </div>

                <div className="sync-card">
                  <h3>Event & Competition Sync</h3>
                  <p>Import WOM competitions and sync event participation</p>
                  <WomSyncButton
                    type="events"
                    buttonText="Sync WOM Competitions"
                    onSyncComplete={() => {
                      // Refresh any event data if needed
                      if (typeof window !== "undefined") {
                        const eventTab = document.querySelector(
                          ".admin-tab:nth-child(2)"
                        );
                        if (eventTab) {
                          // Flash the events tab to indicate new data
                          eventTab.classList.add("flash-highlight");
                          setTimeout(() => {
                            eventTab.classList.remove("flash-highlight");
                          }, 1000);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="sync-info">
                <h4>About Synchronization</h4>
                <p>
                  Regular data synchronization keeps your clan tracker up to
                  date with the latest information from Wise Old Man:
                </p>
                <ul className="sync-info-list">
                  <li>
                    <strong>Member Data Sync:</strong> Updates XP, levels, boss
                    kills, and EHB for all clan members
                  </li>
                  <li>
                    <strong>Event & Competition Sync:</strong> Imports official
                    WOM competitions and updates participation data
                  </li>
                </ul>
                <p className="note">
                  Synchronization is done automatically, but if you need to
                  update it sooner than the daily tasks, you can do so here. WOM
                  competitions will appear in the Events tab.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
