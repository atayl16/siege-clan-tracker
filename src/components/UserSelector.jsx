import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DataSelector from './ui/DataSelector';
import Badge from './ui/Badge';
import './UserSelector.css';

export default function UserSelector({
  onUserSelect,
  selectedUserId = null,
  disabled = false,
  viewMode = 'table',
  excludeAdmins = false,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define columns for the table view
  const columns = [
    {
      header: 'Username',
      accessor: 'username',
    },
    {
      header: 'Created At',
      accessor: 'created_at',
      render: (user) => new Date(user.created_at).toLocaleDateString(),
    },
    {
      header: 'Status',
      accessor: 'is_admin',
      render: (user) => (
        <Badge variant={user.is_admin ? 'orange' : 'secondary'} pill>
          {user.is_admin ? 'Admin' : 'User'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (user) => (
        <button
          className="select-user-btn"
          onClick={() => onUserSelect(user)}
          disabled={disabled}
        >
          Select
        </button>
      ),
    },
  ];

  // Fetch users when the component mounts or when excludeAdmins changes
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        let query = supabase
          .from('users')
          .select('id, username, created_at, is_admin')
          .order('username', { ascending: true });

        // Add filter for excluding admins if needed
        if (excludeAdmins) {
          query = query.eq('is_admin', false);
        }

        const { data, error } = await query;

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [excludeAdmins]);

  return (
    <DataSelector
      data={users}
      columns={columns}
      onSelect={onUserSelect}
      selectedId={selectedUserId}
      keyField="id"
      searchFields={['username']}
      searchPlaceholder="Search users by username"
      viewMode={viewMode}
      labelField="username"
      valueField="id"
      loading={loading}
      error={error}
      disabled={disabled}
      emptyMessage="No users found"
      className="user-selector"
    />
  );
}
