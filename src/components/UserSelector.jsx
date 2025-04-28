import React from 'react';
import { useUsers } from "../context/DataContext";
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
  // Use the context hook for all data fetching with our new DataContext
  const { users, loading, error } = useUsers({
    excludeAdmins,
  });

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
  
  return (
    <div className="user-selector-container">      
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
    </div>
  );
}
