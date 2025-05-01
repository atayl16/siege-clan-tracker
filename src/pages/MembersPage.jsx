import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import MemberTable from "../components/MemberTable";
import { useMembers } from "../hooks/useMembers";
import { FaSearch, FaUsers, FaTimes } from "react-icons/fa";

// Import UI components
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";

import "./MembersPage.css";

export default function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get data from hooks
  const {
    members,
    loading: membersLoading,
    error: membersError,
    refreshMembers,
  } = useMembers();

  // Initialize state from URL parameters
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!members || !searchTerm) return members || [];
    return members.filter((member) =>
      (member.name || member.wom_name || "")
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  // Update URL when search term changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Only update URL params if search has content
    if (value) {
      setSearchParams({ search: value });
    } else {
      // Remove search param if empty
      searchParams.delete("search");
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="ui-page-container">
      {membersLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading clan data...</div>
        </div>
      )}

      {membersError && (
        <div className="ui-error-container">
          <div className="ui-error-icon">
            <FaTimes />
          </div>
          <div className="ui-error-message">
            <h3>Error Loading Data</h3>
            <p>{membersError.message || "Failed to load data"}</p>
            <Button onClick={refreshMembers} variant="danger">
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="ui-content-header">
        <h2>Clan Members</h2>
        <div className="ui-actions-container">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={() => {
              setSearchTerm("");
              searchParams.delete("search");
              setSearchParams(searchParams);
            }}
            placeholder="Search members..."
          />
        </div>
      </div>

      <div className="ui-member-table-container">
        <MemberTable />
      </div>
    </div>
  );
}
