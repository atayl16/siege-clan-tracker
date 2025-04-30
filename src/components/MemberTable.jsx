import React, { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ClanIcon, GemIcon, AdminIcon } from "./RankIcons";
import { useWomGroup } from "../context/DataContext";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import Card from "./ui/Card";
import "./MemberTable.css";

// Define lists of rank names for each type
const SKILLER_RANK_NAMES = [
  "Opal",
  "Sapphire",
  "Emerald",
  "Ruby",
  "Diamond",
  "Dragonstone",
  "Onyx",
  "Zenyte",
];

const FIGHTER_RANK_NAMES = [
  "Mentor",
  "Prefect",
  "Leader",
  "Supervisor",
  "Superior",
  "Executive",
  "Senator",
  "Monarch",
  "TzKal",
];

// Define rank ranges for skillers (XP thresholds)
const SKILLER_RANKS = [
  { name: "Opal", range: [0, 3000000] },
  { name: "Sapphire", range: [3000000, 8000000] },
  { name: "Emerald", range: [8000000, 15000000] },
  { name: "Ruby", range: [15000000, 40000000] },
  { name: "Diamond", range: [40000000, 90000000] },
  { name: "Dragonstone", range: [90000000, 150000000] },
  { name: "Onyx", range: [150000000, 500000000] },
  { name: "Zenyte", range: [500000000, Infinity] },
];

// Define rank ranges for fighters (EHB thresholds)
const FIGHTER_RANKS = [
  { name: "Mentor", range: [0, 100] },
  { name: "Prefect", range: [100, 300] },
  { name: "Leader", range: [300, 500] },
  { name: "Supervisor", range: [500, 700] },
  { name: "Superior", range: [700, 900] },
  { name: "Executive", range: [900, 1100] },
  { name: "Senator", range: [1100, 1300] },
  { name: "Monarch", range: [1300, 1500] },
  { name: "TzKal", range: [1500, Infinity] },
];

// Helper function to safely format numbers
const safeFormat = (value, options = {}) => {
  if (value === null || value === undefined) return "0";

  // Apply floor if requested
  if (options.floor) {
    value = Math.floor(value);
  }

  return Number(value).toLocaleString();
};

// Helper function to safely parse integers
const safeParseInt = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const getNextRankInfo = (member) => {
  if (!member) return { amount: null, rank: null };

  const womRole = (member.womrole || "").toLowerCase().trim();

  // Determine if member is skiller or fighter
  const isSkiller = SKILLER_RANK_NAMES.some((rank) =>
    womRole.includes(rank.toLowerCase())
  );
  const isFighter = FIGHTER_RANK_NAMES.some((rank) =>
    womRole.includes(rank.toLowerCase())
  );

  if (isSkiller) {
    const clanXp =
      safeParseInt(member.current_xp) - safeParseInt(member.first_xp);

    // Find the next rank
    for (let i = 0; i < SKILLER_RANKS.length; i++) {
      if (clanXp < SKILLER_RANKS[i].range[1]) {
        // If this isn't the highest rank, return the current rank's upper limit amount
        // and the next rank's name
        if (i < SKILLER_RANKS.length - 1) {
          return {
            amount: SKILLER_RANKS[i].range[1] - clanXp,
            rank: SKILLER_RANKS[i + 1].name,
          };
        }
      }
    }
  } else if (isFighter) {
    const clanEhb = safeParseInt(member.ehb);

    // Find the next rank
    for (let i = 0; i < FIGHTER_RANKS.length; i++) {
      if (clanEhb < FIGHTER_RANKS[i].range[1]) {
        // If this isn't the highest rank, return the current rank's upper limit amount
        // and the next rank's name
        if (i < FIGHTER_RANKS.length - 1) {
          return {
            amount: FIGHTER_RANKS[i].range[1] - clanEhb,
            rank: FIGHTER_RANKS[i + 1].name,
          };
        }
      }
    }
  }

  return { amount: null, rank: null };
};

// Main MemberTable component
export default function MemberTable({ members }) {
  // Access WOM data using the updated context hook
  const { groupData, loading: womLoading } = useWomGroup();
  const [expandedRow, setExpandedRow] = useState(null);

  // Enhanced member data with WOM data
  const enhancedMembers = useMemo(() => {
    if (!members || !groupData?.memberships) return members;

    // Create a map of WOM members by ID for fast lookups
    const womMembersMap = {};
    groupData.memberships.forEach((membership) => {
      if (membership.player?.id) {
        womMembersMap[membership.player.id] = {
          ...membership.player,
          role: membership.role,
        };
      }
    });

    // Enhance local members with fresh WOM data
    return members.map((member) => {
      const womMember = member.wom_id ? womMembersMap[member.wom_id] : null;

      if (womMember) {
        // Use the most recent data from WOM if available
        return {
          ...member,
          // Only update these fields if you want the latest WOM data to override your DB
          current_xp:
            womMember.latestSnapshot?.data?.skills?.overall?.experience ||
            member.current_xp,
          current_lvl:
            womMember.latestSnapshot?.data?.skills?.overall?.level ||
            member.current_lvl,
          womrole: womMember.role || member.womrole,
          ehb: womMember.ehb || member.ehb,
          // Add any other fields you want to use from WOM
        };
      }
      return member;
    });
  }, [members, groupData]);

  const sortedMembers = useMemo(() => {
    // Filter out hidden members
    const visibleMembers = (enhancedMembers || []).filter((member) => !member.hidden);

    // Then sort the visible members
    return [...visibleMembers].sort((a, b) => {
      const aRole = (a.womrole || "").toLowerCase().trim().replace(/_/g, " ");
      const bRole = (b.womrole || "").toLowerCase().trim().replace(/_/g, " ");

      // Helper function for more accurate rank detection
      const getRankIndex = (role) => {
        if (
          role === "owner" ||
          (role.includes("owner") && !role.includes("deputy"))
        ) {
          return 0; // Owner rank
        } else if (
          role.includes("deputy owner") ||
          role.includes("deputy_owner")
        ) {
          return 1; // Deputy owner rank
        } else if (role.includes("general")) {
          return 2;
        } else if (role.includes("captain")) {
          return 3;
        } else if (
          role.includes("pvm organizer") ||
          role.includes("pvm_organizer")
        ) {
          return 4;
        }
        return -1; // Not an admin rank
      };

      const aAdminIndex = getRankIndex(aRole);
      const bAdminIndex = getRankIndex(bRole);

      // Admin ranks come first, sorted by their order
      if (aAdminIndex !== -1 && bAdminIndex !== -1) {
        return aAdminIndex - bAdminIndex;
      }
      if (aAdminIndex !== -1) return -1; // a is an admin, b is not
      if (bAdminIndex !== -1) return 1; // b is an admin, a is not

      // If neither is an admin, sort by "Clan XP Gained" in descending order
      const aClanXpGained =
        parseInt(a.current_xp || 0, 10) - parseInt(a.first_xp || 0, 10) || 0;
      const bClanXpGained =
        parseInt(b.current_xp || 0, 10) - parseInt(b.first_xp || 0, 10) || 0;

      return bClanXpGained - aClanXpGained;
    });
  }, [enhancedMembers]);

  // Define columns for the table
  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="ui-cell-content ui-name-cell">
            {row.original.name || row.original.wom_name || "N/A"}
            {expandedRow === row.original.wom_id ? (
              <FaChevronUp className="ui-expand-icon" />
            ) : (
              <FaChevronDown className="ui-expand-icon" />
            )}
          </div>
        ),
      },
      {
        accessorKey: "rank",
        header: "Clan Rank",
        cell: ({ row }) => {
          const womRole = (row.original.womrole || "").toLowerCase().trim();

          // Normalize the role for comparison
          const normalizedRole = womRole.replace(/_/g, " ");

          // Check for admin rank - try to match with normalized versions
          let adminRank = null;
          if (
            normalizedRole.includes("owner") &&
            !normalizedRole.includes("deputy")
          ) {
            adminRank = "Owner";
          } else if (
            normalizedRole.includes("deputy owner") ||
            normalizedRole.includes("deputy_owner")
          ) {
            adminRank = "Deputy Owner";
          } else if (normalizedRole.includes("general")) {
            adminRank = "General";
          } else if (normalizedRole.includes("captain")) {
            adminRank = "Captain";
          } else if (
            normalizedRole.includes("pvm organizer") ||
            normalizedRole.includes("pvm_organizer")
          ) {
            adminRank = "PvM Organizer";
          }

          // Check for skiller/fighter ranks
          const matchedSkillerRank = SKILLER_RANK_NAMES.find((name) =>
            womRole.includes(name.toLowerCase())
          );
          const matchedFighterRank = FIGHTER_RANK_NAMES.find((name) =>
            womRole.includes(name.toLowerCase())
          );

          return (
            <div className="ui-cell-content ui-center-content ui-rank-cell">
              {adminRank && <AdminIcon title={adminRank} />}
              {matchedSkillerRank && <GemIcon gemType={matchedSkillerRank} />}
              {matchedFighterRank && <ClanIcon name={matchedFighterRank} />}
            </div>
          );
        },
      },
      {
        accessorKey: "ehb",
        header: "EHB",
        cell: ({ row }) => (
          <div className="ui-cell-content ui-center-content">
            {safeFormat(row.original.ehb, { floor: true })}
          </div>
        ),
      },
      {
        accessorKey: "current_lvl",
        header: "Level",
        cell: ({ row }) => (
          <div className="ui-cell-content ui-center-content ui-level-cell">
            {row.original.current_lvl || "-"}
          </div>
        ),
      },
    ],
    [expandedRow]
  );

  const table = useReactTable({
    data: sortedMembers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Show loading state when fetching WOM data
  if (womLoading && members.length > 0) {
    return (
      <div className="ui-loading-state">
        Refreshing member data from Wise Old Man...
      </div>
    );
  }

  if (!members || members.length === 0) {
    return <div className="ui-empty-state">No members found.</div>;
  }

  return (
    <div className="ui-table-container ui-member-table-container">
      <table className="ui-table ui-member-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="ui-table-header-row">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="ui-table-header-cell"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr
                className="ui-table-row ui-clickable"
                onClick={() => {
                  const rowId = row.original.wom_id;
                  setExpandedRow(expandedRow === rowId ? null : rowId);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="ui-table-cell"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              
              {/* Expanded row with additional details */}
              {expandedRow === row.original.wom_id && (
                <tr className="ui-table-expanded-row">
                  <td colSpan={columns.length}>
                    <div className="ui-expanded-content">
                      <div className="ui-details-grid">
                        <div className="ui-detail-item">
                          <span className="ui-detail-label">Clan XP</span>
                          <span className="ui-detail-value">
                            {safeFormat(
                              (parseInt(row.original.current_xp) || 0) -
                                (parseInt(row.original.first_xp) || 0)
                            )}
                          </span>
                        </div>
                        <div className="ui-detail-item">
                          <span className="ui-detail-label">Siege Score</span>
                          <span className="ui-detail-value">
                            {safeFormat(row.original.siege_score || 0)}
                          </span>
                        </div>
                        <div className="ui-detail-item">
                          <span className="ui-detail-label">Joined</span>
                          <span className="ui-detail-value">
                            {row.original.join_date
                              ? new Date(row.original.join_date).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric"
                                })
                              : "N/A"}
                          </span>
                        </div>
                        {/* Next rank information */}
                        <div className="ui-detail-item">
                          <span className="ui-detail-label">Next Rank</span>
                          <span className="ui-detail-value">
                            {(() => {
                              const nextRankInfo = getNextRankInfo(row.original);
                              if (nextRankInfo.amount && nextRankInfo.rank) {
                                return (
                                  <>
                                    <span className="ui-next-rank-icon">
                                      {SKILLER_RANK_NAMES.includes(
                                        nextRankInfo.rank
                                      ) ? (
                                        <GemIcon gemType={nextRankInfo.rank} />
                                      ) : (
                                        <ClanIcon name={nextRankInfo.rank} />
                                      )}
                                    </span>
                                    <span>
                                      {nextRankInfo.rank}:{" "}
                                      {safeFormat(nextRankInfo.amount)}{" "}
                                      {SKILLER_RANK_NAMES.includes(
                                        nextRankInfo.rank
                                      )
                                        ? "XP"
                                        : "EHB"}{" "}
                                      needed
                                    </span>
                                  </>
                                );
                              }
                              return "Max rank achieved";
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
