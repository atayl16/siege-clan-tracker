import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./UserSelector.css";

export default function UserSelector({
  onUserSelect,
  selectedUserId = null,
  disabled = false,
  viewMode = "table", // 'table' or 'dropdown'
  excludeAdmins = false, // This prop was already defined correctly
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Fetch users when the component mounts or when excludeAdmins changes
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        let query = supabase
          .from("users")
          .select("id, username, email, created_at, is_admin")
          .order("username", { ascending: true });

        // Add filter for excluding admins if needed
        if (excludeAdmins) {
          query = query.eq("is_admin", false);
        }

        const { data, error } = await query;

        if (error) throw error;
        setUsers(data || []);
        setFilteredUsers(data || []);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [excludeAdmins]); // Dependency array is correct

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(lowercaseSearch) ||
        (user.email && user.email.toLowerCase().includes(lowercaseSearch))
    );

    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  if (loading) return <div className="loading-indicator">Loading users...</div>;
  if (error) return <div className="error-message">{error}</div>;

  // Render dropdown view
  if (viewMode === "dropdown") {
    return (
      <div className="form-group">
        <label>Select User:</label>
        <select
          value={selectedUserId || ""}
          onChange={(e) => {
            const selectedUser = users.find((u) => u.id === e.target.value);
            if (selectedUser) onUserSelect(selectedUser);
          }}
          disabled={disabled}
          className="user-select"
          required
        >
          <option value="">Select a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username} {user.is_admin ? "(Admin)" : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Render table view
  return (
    <div className="user-selector">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search users by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          disabled={disabled}
        />
        {searchTerm && (
          <button
            className="clear-search"
            onClick={() => setSearchTerm("")}
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Created At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className={`${user.is_admin ? "admin-user" : ""} ${
                  user.id === selectedUserId ? "selected-user" : ""
                }`}
              >
                <td>{user.username}</td>
                <td>{user.email || "—"}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <span
                    className={`user-status-badge ${
                      user.is_admin ? "admin" : "regular"
                    }`}
                  >
                    {user.is_admin ? "Admin" : "User"}
                  </span>
                </td>
                <td>
                  <button
                    className="select-user-btn"
                    onClick={() => onUserSelect(user)}
                    disabled={disabled}
                  >
                    Select
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
