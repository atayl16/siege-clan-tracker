import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './AdminUserManager.css';

export default function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toggleAdminStatus } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('username', { ascending: true });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      const result = await toggleAdminStatus(userId, !currentStatus);
      
      if (result.success) {
        // Update local state
        setUsers(users.map(user => 
          user.id === userId ? {...user, is_admin: !currentStatus} : user
        ));
      } else {
        alert(result.error || 'Failed to update admin status');
      }
    } catch (err) {
      console.error('Error toggling admin status:', err);
      alert('An error occurred while updating admin status');
    }
  };

  if (loading) return <div className="admin-loading">Loading users...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="user-admin-manager">
      <h3>Manage Admin Users</h3>
      
      <div className="admin-users-table-container">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Created At</th>
              <th>Admin Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={user.is_admin ? 'admin-user' : ''}>
                <td>{user.username}</td>
                <td>{user.email || '—'}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={`admin-status-badge ${user.is_admin ? 'admin' : 'regular'}`}>
                    {user.is_admin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>
                  <button
                    className={`admin-toggle-btn ${user.is_admin ? 'remove' : 'add'}`}
                    onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
