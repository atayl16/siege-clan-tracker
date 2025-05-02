import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMembers } from "../hooks/useMembers";
import MemberTable from "../components/MemberTable";
import { FaTimes, FaFilter, FaCheck } from "react-icons/fa";

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

  // Filter states
  const [showAlts, setShowAlts] = useState(false); // Alt accounts hidden by default
  const [filterIronman, setFilterIronman] = useState(false);
  const [filterSkiller, setFilterSkiller] = useState(false);
  const [filterFighter, setFilterFighter] = useState(false);
  const [hideAdmin, setHideAdmin] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!members) return [];

    return members.filter((member) => {
      // Search filter
      if (
        searchTerm &&
        !(member.name || member.wom_name || "")
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Alt account filter
      if (!showAlts && member.alt) {
        return false;
      }

      // Ironman filter
      if (filterIronman) {
        const isIronman =
          member.build?.toLowerCase().includes("ironman") ||
          member.wom_account_type?.toLowerCase().includes("ironman") ||
          member.ironman_type;
        if (!isIronman) return false;
      }

      // Admin filter
      if (hideAdmin) {
        const role = (member.womrole || "").toLowerCase();
        if (
          role.includes("owner") ||
          role.includes("general") ||
          role.includes("captain") ||
          role.includes("organizer")
        ) {
          return false;
        }
      }

      // Skiller/Fighter filters
      if (filterSkiller || filterFighter) {
        const role = (member.womrole || "").toLowerCase();

        const isSkiller = [
          "opal",
          "sapphire",
          "emerald",
          "ruby",
          "diamond",
          "dragonstone",
          "onyx",
          "zenyte",
        ].some((gem) => role.includes(gem));

        const isFighter = [
          "mentor",
          "prefect",
          "leader",
          "supervisor",
          "superior",
          "executive",
          "senator",
          "monarch",
          "tzkal",
        ].some((rank) => role.includes(rank));

        if (filterSkiller && !isSkiller) return false;
        if (filterFighter && !isFighter) return false;
      }

      return true;
    });
  }, [
    members,
    searchTerm,
    showAlts,
    filterIronman,
    filterSkiller,
    filterFighter,
    hideAdmin,
  ]);

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

  // Count number of active filters
  const activeFilterCount = [
    showAlts, // Showing alts is considered an active filter
    filterIronman,
    filterSkiller,
    filterFighter,
    hideAdmin,
  ].filter(Boolean).length;

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
          <div className="ui-filter-button-wrapper">
            <Button
              variant="secondary"
              onClick={() => setShowFilterOptions(!showFilterOptions)}
              className={activeFilterCount > 0 ? "ui-active-filters" : ""}
            >
              <FaFilter /> Filters
              {activeFilterCount > 0 && (
                <span className="ui-filter-count">{activeFilterCount}</span>
              )}
            </Button>

            {showFilterOptions && (
              <div className="ui-filter-dropdown">
                <h4 className="ui-filter-section-title">Show/Hide</h4>
                <div className="ui-filter-option">
                  <label className="ui-filter-label">
                    <input
                      type="checkbox"
                      checked={showAlts}
                      onChange={() => setShowAlts(!showAlts)}
                    />
                    <span className="ui-filter-text">Show Alt Accounts</span>
                  </label>
                </div>
                <div className="ui-filter-option">
                  <label className="ui-filter-label">
                    <input
                      type="checkbox"
                      checked={hideAdmin}
                      onChange={() => setHideAdmin(!hideAdmin)}
                    />
                    <span className="ui-filter-text">Hide Admin Ranks</span>
                  </label>
                </div>

                <h4 className="ui-filter-section-title">Account Type</h4>
                <div className="ui-filter-option">
                  <label className="ui-filter-label">
                    <input
                      type="checkbox"
                      checked={filterIronman}
                      onChange={() => setFilterIronman(!filterIronman)}
                    />
                    <span className="ui-filter-text">Ironman Only</span>
                  </label>
                </div>

                <h4 className="ui-filter-section-title">Rank Type</h4>
                <div className="ui-filter-option">
                  <label className="ui-filter-label">
                    <input
                      type="checkbox"
                      checked={filterSkiller}
                      onChange={() => setFilterSkiller(!filterSkiller)}
                    />
                    <span className="ui-filter-text">Skillers Only</span>
                  </label>
                </div>
                <div className="ui-filter-option">
                  <label className="ui-filter-label">
                    <input
                      type="checkbox"
                      checked={filterFighter}
                      onChange={() => setFilterFighter(!filterFighter)}
                    />
                    <span className="ui-filter-text">Fighters Only</span>
                  </label>
                </div>

                <div className="ui-filter-actions">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setShowAlts(false);
                      setFilterIronman(false);
                      setFilterSkiller(false);
                      setFilterFighter(false);
                      setHideAdmin(false);
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={() => {
              setSearchTerm("");
              setSearchParams({});
            }}
            placeholder="Search members..."
          />
        </div>
      </div>

      <div className="ui-filter-summary">
        {activeFilterCount > 0 && (
          <>
            <span className="ui-filter-label">Active filters:</span>
            {showAlts && (
              <span className="ui-filter-tag">
                Show Alts <FaTimes onClick={() => setShowAlts(false)} />
              </span>
            )}
            {filterIronman && (
              <span className="ui-filter-tag">
                Ironman <FaTimes onClick={() => setFilterIronman(false)} />
              </span>
            )}
            {filterSkiller && (
              <span className="ui-filter-tag">
                Skillers <FaTimes onClick={() => setFilterSkiller(false)} />
              </span>
            )}
            {filterFighter && (
              <span className="ui-filter-tag">
                Fighters <FaTimes onClick={() => setFilterFighter(false)} />
              </span>
            )}
            {hideAdmin && (
              <span className="ui-filter-tag">
                No Admin <FaTimes onClick={() => setHideAdmin(false)} />
              </span>
            )}
          </>
        )}
      </div>

      <div className="ui-member-table-container">
        <MemberTable filteredMembers={filteredMembers} />
      </div>
    </div>
  );
}
