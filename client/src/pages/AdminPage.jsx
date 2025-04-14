import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import MemberTable from "../components/MemberTable";
// import RankAlerts from "../components/RankAlerts";
import MemberEditor from "../components/MemberEditor";
// import EventProcessor from "../components/EventProcessor";
// import WomSyncButton from "../components/WomSyncButton";
import { supabase } from "../supabaseClient"; // Correct path to your Supabase client
import "./AdminPage.css";

export default function AdminPage() {
  const { isAuthenticated } = useAuth();
  const [selectedMember, setSelectedMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [notification, setNotification] = useState(null);

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

  useEffect(() => {
    fetchMembers();
  }, []);

  // Handle deleting a member
  const handleDeleteMember = async (member) => {
    if (!member || !member.wom_id) {
      console.error("Cannot delete: wom_id is missing", member);
      alert("Cannot delete member: Missing wom_id");
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
        id: Date.now() // unique id for the notification
      });
      
      // Auto-dismiss notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
      
    } catch (err) {
      console.error("Error deleting member:", err);
      
      // Set error notification instead of alert
      setNotification({
        type: 'error',
        message: `Failed to delete ${member.name || member.wom_name}: ${err.message}`,
        id: Date.now()
      });
      
      // Auto-dismiss notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
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
    
    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Add this component inside your AdminPage component, above the return statement
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
    return <div className="auth-error">Not authorized</div>;
  }

    // Fix the return statement with proper closing tags and indentation
  
  return (
    <>
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
      
      <div className="admin-container">
        <h1>Clan Administration</h1>
  
        <div className="admin-grid">
          {/* Left Panel */}
          <div className="management-section">
            <div className="header-with-actions">
              <h2>Member Management</h2>
              <button 
                className="btn btn-success btn-sm" 
                onClick={() => {
                  setSelectedMember(null);
                  setIsAddingMember(true);
                }}
              >
                Add New Member
              </button>
            </div>
            
            {loading ? (
              <div>Loading members data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <MemberTable 
                members={members} 
                isAdmin={true} 
                onRowClick={(member) => {
                  setSelectedMember(member);
                  setIsAddingMember(false);
                }}
                onDeleteClick={handleDeleteMember}
              />
            )}
          </div>
  
          {/* Right Panel */}
          <div className="monitoring-section">
            <div className="alert-panel">
              <h3>Active Alerts</h3>
              {/* <RankAlerts /> */}
              <div>Rank Alerts Placeholder</div>
            </div>
  
            <div className="event-panel">
              <h3>WOM Event Processing</h3>
              {/* <EventProcessor /> */}
              <div>Event Processor Placeholder</div>
            </div>
  
            <div className="wom-sync-panel">
              <h3>Wise Old Man Sync</h3>
              {/* <WomSyncButton /> */}
              <div>WOM Sync Placeholder</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
