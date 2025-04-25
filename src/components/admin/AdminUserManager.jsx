import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserSelector from '../UserSelector';
import { supabase } from '../../supabaseClient';
import { FaUserShield, FaUser, FaCheckCircle, FaExclamationTriangle, FaKey } from 'react-icons/fa';

// Import UI components
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import DataTable from '../ui/DataTable';

import './AdminUserManager.css';

export default function AdminUserManager() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [message, setMessage] = useState(null);
  const [supabaseUUID, setSupabaseUUID] = useState('');
  const { toggleAdminStatus, linkUserToSupabaseAuth } = useAuth();

  // Fetch all admin users when the component loads
  useEffect(() => {
    async function fetchAdminUsers() {
      try {
        setLoadingAdmins(true);
        const { data, error } = await supabase
          .from('users')
          .select('id, username, created_at, is_admin')
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
    setSupabaseUUID(''); // Reset UUID field when selecting a new user
    setMessage(null);
  };

  const handleToggleAdmin = async (userId, makeAdmin, username) => {
    try {
      setLoading(true);
      const result = await toggleAdminStatus(userId, makeAdmin);
      
      if (result.success) {
        // Link with Supabase Auth if UUID is provided (optional)
        if (makeAdmin && supabaseUUID.trim() && typeof linkUserToSupabaseAuth === 'function') {
          try {
            const linkResult = await linkUserToSupabaseAuth(userId, supabaseUUID.trim());
            if (!linkResult.success) {
              setMessage({
                type: 'warning',
                text: `${username} is now an admin, but linking to Supabase Auth failed: ${linkResult.error}`
              });
            } else {
              setMessage({
                type: 'success',
                text: `${username} is now an admin and linked to Supabase Auth`
              });
            }
          } catch (err) {
            console.error('Error linking to Supabase Auth:', err);
            setMessage({
              type: 'warning',
              text: `${username} is now an admin, but linking to Supabase Auth failed: ${err.message}`
            });
          }
        } else if (makeAdmin && supabaseUUID.trim()) {
          // We have a UUID but the linking function isn't available
          setMessage({
            type: 'warning',
            text: `${username} is now an admin, but Supabase Auth linking is not available.`
          });
        } else {
          setMessage({
            type: 'success',
            text: `${username} is now ${makeAdmin ? 'an admin' : 'a regular user'}`
          });
        }
        
        // Update the admin users list
        if (makeAdmin) {
          // Find the full user data and add to admins list
          const { data: userData } = await supabase
            .from('users')
            .select('id, username, created_at')
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
        
        // Reset UUID field
        if (makeAdmin) setSupabaseUUID('');
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

  // Define columns for admin users table
  const adminColumns = [
    {
      header: 'Username',
      accessor: 'username'
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (user) => new Date(user.created_at).toLocaleDateString()
    },
    {
      header: 'Actions',
      render: (user) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleToggleAdmin(user.id, false, user.username)}
          disabled={loading}
          icon={<FaUser />}
        >
          Remove Admin
        </Button>
      )
    }
  ];

  return (
    <div className="ui-admin-user-manager">
      <Card variant="dark">
        <Card.Header>
          <h2 className="ui-section-title">
            <FaUserShield className="ui-icon-left" /> Admin User Management
          </h2>
        </Card.Header>
        
        <Card.Body>
          {message && (
            <div className={`ui-message ui-message-${message.type}`}>
              {message.type === 'error' ? (
                <FaExclamationTriangle className="ui-message-icon" />
              ) : message.type === 'warning' ? (
                <FaExclamationTriangle className="ui-message-icon" />
              ) : (
                <FaCheckCircle className="ui-message-icon" />
              )}
              <span>{message.text}</span>
            </div>
          )}
          
          <div className="ui-section">
            <h3 className="ui-section-subtitle">
              <FaUserShield className="ui-icon-left" /> Current Admin Users
            </h3>
            
            {loadingAdmins ? (
              <div className="ui-loading-indicator">Loading admin users...</div>
            ) : adminUsers.length === 0 ? (
              <EmptyState 
                title="No Admin Users" 
                description="There are currently no users with admin privileges."
                icon={<FaUserShield className="ui-empty-state-icon" />}
              />
            ) : (
              <DataTable
                columns={adminColumns}
                data={adminUsers}
                keyField="id"
                emptyMessage="No admin users found"
                className="ui-admin-users-table"
              />
            )}
          </div>
          
          <div className="ui-section ui-promote-section">
            <h3 className="ui-section-subtitle">
              <FaUser className="ui-icon-left" /> Promote Regular User to Admin
            </h3>
            <p className="ui-section-description">
              Search for a user below and grant them admin privileges.
            </p>
            
            <UserSelector
              onUserSelect={handleUserSelect}
              selectedUserId={selectedUser?.id}
              disabled={loading}
              viewMode="table"
              excludeAdmins={true}
            />
            
            {selectedUser && !selectedUser.is_admin && (
              <div className="ui-user-actions">
                <Card variant="dark" className="ui-selected-user-card">
                  <Card.Body>
                    <h4 className="ui-selected-user-title">
                      Selected User: {selectedUser.username}
                    </h4>
                    
                    <div className="ui-form-group ui-supabase-uuid-field">
                      <label htmlFor="supabase-uuid" className="ui-form-label">
                        <FaKey className="ui-icon-left" /> Supabase Auth UUID (optional):
                      </label>
                      <input
                        type="text"
                        id="supabase-uuid"
                        value={supabaseUUID}
                        onChange={e => setSupabaseUUID(e.target.value)}
                        placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                        disabled={loading}
                        className="ui-form-input"
                      />
                      <p className="ui-field-help">
                        This field is completely optional. Users will have admin access in the app without a Supabase Auth ID.
                        Only provide this if you need the user to have database-level admin access.
                      </p>
                    </div>
                    
                    <div className="ui-form-actions">
                      <Button 
                        variant="primary"
                        onClick={() => handleToggleAdmin(selectedUser.id, true, selectedUser.username)}
                        disabled={loading}
                        icon={<FaUserShield />}
                      >
                        {loading ? 'Processing...' : 'Grant Admin Status'}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
