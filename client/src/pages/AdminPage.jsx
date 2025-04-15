import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import MemberTable from "../components/MemberTable";
import RankAlerts from "../components/RankAlerts";
import { memberNeedsRankUpdate } from "../utils/rankUtils";
import MemberEditor from "../components/MemberEditor";
import EventManagement from "../components/EventManagement";
import WomSyncButton from "../components/WomSyncButton";
import { supabase } from "../supabaseClient";
import "./AdminPage.css";

export default function AdminPage() {
  const { isAuthenticated } = useAuth();
  const [selectedMember, setSelectedMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("members");
  const [alertsCount, setAlertsCount] = useState(0);

  // Fetch members data when component mounts
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/members');
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setMembers(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching members:", err);
      setError("Failed to load members data");
      // Provide some sample data for testing
      setMembers([
        {
          id: 1,
          wom_id: "12345",
          name: "Sample Player",
          wom_name: "Sample Player",
          womrole: "zenyte",
          ehb: 250,
          current_xp: 1500000,
          first_xp: 500000,
          siege_score: 75,
          created_at: "2025-04-01T12:00:00Z"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAlertsCount = async () => {
    try {
      // Fetch all members from Supabase
      const { data, error } = await supabase
        .from('members')
        .select('*');
        
      if (error) throw error;
      
      // Process members to find those needing rank updates
      // This uses the same logic as RankAlerts component
      const membersNeedingUpdate = data.filter(member => 
        memberNeedsRankUpdate(member)
      );
      
      setAlertsCount(membersNeedingUpdate.length);
    } catch (err) {
      console.error("Error calculating rank alerts count:", err);
      setAlertsCount(0);
    }
  };


  useEffect(() => {
    fetchMembers();
    fetchAlertsCount();
  }, []);

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
      console.log("Deleting member with wom_id:", member.wom_id);
      
      // Use Supabase client directly
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('wom_id', member.wom_id);
        
      if (error) throw error;
      
      // Remove the member from the local state
      setMembers(members.filter(m => m.wom_id !== member.wom_id));
      
      // If we're editing this member, clear the selection
      if (selectedMember?.wom_id === member.wom_id) {
        setSelectedMember(null);
      }
      
      // Set success notification
      setNotification({
        type: 'success',
        message: `${member.name || member.wom_name} was successfully deleted.`,
        id: Date.now()
      });
      
      // Auto-dismiss notification after 5 seconds
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
      
      setTimeout(() => {
        setNotification(prev => prev?.id === Date.now() ? null : prev);
      }, 5000);
    }
  };

  // Handle saving member data
  const handleSaveMember = (updatedMember) => {
    // Update the members list using wom_id
    if (updatedMember.wom_id) {
      setMembers(members.map(m => 
        m.wom_id === updatedMember.wom_id ? updatedMember : m
      ));
    } else {
      setMembers([...members, updatedMember]);
    }
    
    // Clear selection and add mode
    setSelectedMember(null);
    setIsAddingMember(false);
    
    // Show success notification
    setNotification({
      type: 'success',
      message: `${updatedMember.name || updatedMember.wom_name} was successfully saved.`,
      id: Date.now()
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
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
              {alertsCount} Rank Alert{alertsCount !== 1 ? 's' : ''}
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
              <div className="filters">
                <input
                  type="text"
                  placeholder="Search members..."
                  className="search-input"
                />
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
              <div className="member-table-container">
                <MemberTable
                  members={members}
                  isAdmin={true}
                  onRowClick={(member) => {
                    setSelectedMember(member);
                    setIsAddingMember(false);
                  }}
                  onDeleteClick={handleDeleteMember}
                />
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="tab-content events-content">
            <div className="content-header">
              <h2>Event Management</h2>
              <button className="primary-button create-event-button">
                <span className="button-icon">+</span> Create Event
              </button>
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
              <RankAlerts />
            </div>
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === "sync" && (
          <div className="tab-content sync-content">
            <div className="content-header">
              <h2>Data Synchronization</h2>
            </div>
            <div className="sync-container">
              <div className="sync-cards">
                <div className="sync-card">
                  <h3>Wise Old Man Sync</h3>
                  <p>Update member stats and levels from Wise Old Man</p>
                  <WomSyncButton />
                </div>

                <div className="sync-card">
                  <h3>Event Participation Sync</h3>
                  <p>Update event participation and competition points</p>
                  <button className="wom-sync-button">
                    <span className="sync-icon">↻</span>
                    Sync Events
                  </button>
                </div>
              </div>

              <div className="sync-info">
                <h4>About Synchronization</h4>
                <p>
                  Data synchronization keeps your clan tracker up to date with
                  the latest information:
                </p>
                <ul>
                  <li>
                    <strong>Member Sync:</strong> Updates XP, levels, and boss
                    kills from Wise Old Man
                  </li>
                  <li>
                    <strong>Event Sync:</strong> Updates event participation and
                    leaderboard points
                  </li>
                </ul>
                <p className="note">
                  Synchronization should be performed at least once per week for
                  best results.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
