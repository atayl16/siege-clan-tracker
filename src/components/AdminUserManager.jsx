import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserSelector from './UserSelector';
import { supabase } from '../supabaseClient';
import './AdminUserManager.css';

export default function AdminUserManager() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [message, setMessage] = useState(null);
  const { toggleAdminStatus } = useAuth();

  // Fetch all admin users when the component loads
  useEffect(() => {
    async function fetchAdminUsers() {
      try {
        setLoadingAdmins(true);
        const { data, error } = await supabase
          .from('users')
          .select('id, username, email, created_at')
          .eq('is_admin', true)
          .order('username', { ascending: true });

        if (error) throw error;
        setAdminUsers(data || []);
      } catch (err) {
        console.error('Error fetching admin users:', err);
        setMessage({
          type: 'error',
          text: 'Failed to load admin users'
        });
      } finally {
        setLoadingAdmins(false);
      }
    }

    fetchAdminUsers();
  }, []);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setMessage(null);
  };

  const handleToggleAdmin = async (userId, makeAdmin, username) => {
    try {
      setLoading(true);
      const result = await toggleAdminStatus(userId, makeAdmin);
      
      if (result.success) {
        // Update the admin users list
        if (makeAdmin) {
          // Find the full user data and add to admins list
          const { data: userData } = await supabase
            .from('users')
            .select('id, username, email, created_at')
            .eq('id', userId)
            .single();
            
          if (userData) {
            setAdminUsers(prev => [...prev, userData].sort((a, b) => 
              a.username.localeCompare(b.username)
            ));
          }
        } else {
          // Remove from admin list
          setAdminUsers(prev => prev.filter(user => user.id !== userId));
        }
        
        // Update selected user if it's the same one
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({
            ...selectedUser,
            is_admin: makeAdmin
          });
        }
        
        setMessage({
          type: 'success',
          text: `${username} is now ${makeAdmin ? 'an admin' : 'a regular user'}`
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to update admin status'
        });
      }
    } catch (err) {
      console.error('Error toggling admin status:', err);
      setMessage({
        type: 'error',
        text: 'An error occurred while updating admin status'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Admin User Management</h2>
      
      {message && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}
      
      <div className="admin-section">
        <h3>Current Admin Users</h3>
        {loadingAdmins ? (
          <div className="loading-indicator">Loading admin users...</div>
        ) : adminUsers.length === 0 ? (
          <div className="info-message">No admin users found</div>
        ) : (
          <div className="admins-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map(admin => (
                  <tr key={admin.id} className="admin-user">
                    <td>{admin.username}</td>
                    <td>{admin.email || '—'}</td>
                    <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="admin-toggle-btn remove"
                        onClick={() => handleToggleAdmin(admin.id, false, admin.username)}
                        disabled={loading}
                      >
                        Remove Admin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="promote-section">
        <h3>Promote Regular User to Admin</h3>
        <p className="section-description">
          Search for a user below and grant them admin privileges.
        </p>
        
        <UserSelector
          onUserSelect={handleUserSelect}
          selectedUserId={selectedUser?.id}
          disabled={loading}
          viewMode="table"
          excludeAdmins={true} // This would be a new prop to filter out admins
        />
        
        {selectedUser && !selectedUser.is_admin && (
          <div className="user-actions">
            <h4>Selected User: {selectedUser.username}</h4>
            <button
              className="admin-toggle-btn add"
              onClick={() => handleToggleAdmin(selectedUser.id, true, selectedUser.username)}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Grant Admin Status'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
