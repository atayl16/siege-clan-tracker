import React, { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ClanIcon, GemIcon, AdminIcon } from "./RankIcons";
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
const safeFormat = (value) => {
  if (value === null || value === undefined) return "0";
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
    const clanXp = safeParseInt(member.current_xp) - safeParseInt(member.first_xp);
    
    // Find the next rank
    for (let i = 0; i < SKILLER_RANKS.length; i++) {
      if (clanXp < SKILLER_RANKS[i].range[1]) {
        // If this isn't the highest rank, return the current rank's upper limit amount
        // and the next rank's name
        if (i < SKILLER_RANKS.length - 1) {
          return {
            amount: SKILLER_RANKS[i].range[1] - clanXp,
            rank: SKILLER_RANKS[i + 1].name
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
            rank: FIGHTER_RANKS[i + 1].name
          };
        }
      }
    }
  }

  return { amount: null, rank: null };
};

// Main MemberTable component
  export default function MemberTable({
    members,
    isAdmin = false,
    onRowClick,
    onDeleteClick,
  }) {
    // Add state to track screen width
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Add resize listener
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const sortedMembers = React.useMemo(() => {
      // First filter members to remove hidden ones (when not in admin view)
      const visibleMembers = isAdmin 
        ? members || []
        : (members || []).filter(member => !member.hidden);
      
      // Then sort the visible members
      return [...visibleMembers].sort((a, b) => {
        const aRole = (a.womrole || "").toLowerCase().trim().replace(/_/g, ' ');
        const bRole = (b.womrole || "").toLowerCase().trim().replace(/_/g, ' ');
    
        // Helper function for more accurate rank detection
        const getRankIndex = (role) => {
          if (role === "owner" || (role.includes("owner") && !role.includes("deputy"))) {
            return 0; // Owner rank
          } else if (role.includes("deputy owner") || role.includes("deputy_owner")) {
            return 1; // Deputy owner rank
          } else if (role.includes("general")) {
            return 2;
          } else if (role.includes("captain")) {
            return 3;
          } else if (role.includes("pvm organizer") || role.includes("pvm_organizer")) {
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
    }, [members, isAdmin]);

    // Define base columns that are shown in both public and admin views
    const baseColumns = React.useMemo(() => {
      // Start with the columns that always show
      const columns = [
        {
          accessorKey: "name",
          header: "Name",
          cell: ({ row }) => (
            <div style={{ textAlign: "center" }}>
              {row.original.name || row.original.wom_name || "N/A"}
            </div>
          ),
        },        
        {
          accessorKey: "rank",
          header: "Clan Rank",
          cell: ({ row }) => {
            const womRole = (row.original.womrole || "").toLowerCase().trim();
        
            // Normalize the role for comparison
            const normalizedRole = womRole.replace(/_/g, ' ');
        
            // Check for admin rank - try to match with normalized versions
            let adminRank = null;
            if (normalizedRole.includes('owner') && !normalizedRole.includes('deputy')) {
              adminRank = 'Owner';
            } else if (normalizedRole.includes('deputy owner') || normalizedRole.includes('deputy_owner')) {
              adminRank = 'Deputy Owner';
            } else if (normalizedRole.includes('general')) {
              adminRank = 'General';
            } else if (normalizedRole.includes('captain')) {
              adminRank = 'Captain';
            } else if (normalizedRole.includes('pvm organizer') || normalizedRole.includes('pvm_organizer')) {
              adminRank = 'PvM Organizer';
            }
        
            // Check for skiller/fighter ranks (no change)
            const matchedSkillerRank = SKILLER_RANK_NAMES.find((name) =>
              womRole.includes(name.toLowerCase())
            );
            const matchedFighterRank = FIGHTER_RANK_NAMES.find((name) =>
              womRole.includes(name.toLowerCase())
            );
        
            return (
              <div style={{ textAlign: "center" }}>
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
            <div style={{ textAlign: "center" }}>
              {safeFormat(row.original.ehb)}
            </div>
          ),
        },
      ];

      // Only add Clan XP Gained column if not on mobile
      if (!isMobile) {
        columns.push({
          accessorKey: "clan_xp_gained",
          header: "Clan XP",
          cell: ({ row }) => {
            // Safe calculation of XP gained
            let gainedXp = 0;
            if (
              row.original.current_xp !== undefined &&
              row.original.first_xp !== undefined
            ) {
              gainedXp =
                safeParseInt(row.original.current_xp) -
                safeParseInt(row.original.first_xp);
            }

            return (
              <div style={{ textAlign: "center" }}>{safeFormat(gainedXp)}</div>
            );
          },
        });

        columns.push({
          accessorKey: "join_date",
          header: "Joined",
          cell: ({ row }) => {
            const joinDate = row.original.join_date
              ? new Date(row.original.join_date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
              : "N/A";
            return <div style={{ textAlign: "center" }}>{joinDate}</div>;
          },
        });
      }

      // Add remaining columns
      columns.push(
        {
          accessorKey: "next_level",
          header: "Next Level",
          cell: ({ row }) => {
            const nextRankInfo = getNextRankInfo(row.original);
            
            return (
              <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {nextRankInfo.amount !== null && nextRankInfo.amount > 0 ? (
                  <>
                    {nextRankInfo.rank && (
                      <span style={{ marginRight: "5px" }}>
                        {SKILLER_RANK_NAMES.includes(nextRankInfo.rank) ? 
                          <GemIcon gemType={nextRankInfo.rank} /> : 
                          <ClanIcon name={nextRankInfo.rank} />}
                      </span>
                    )}
                    {safeFormat(nextRankInfo.amount)}
                  </>
                ) : ""}
              </div>
            );
          },
        },
        {
          accessorKey: "siege_score",
          header: "Siege Score",
          cell: ({ row }) => (
            <div style={{ textAlign: "center" }}>
              {safeFormat(row.original.siege_score)}
            </div>
          ),
        }
      );

      return columns;
    }, [isMobile]); // Add isMobile as a dependency to re-render when screen size changes

    // Admin-only columns - only added if isAdmin=true
    const adminColumns = React.useMemo(
      () => [
        {
          accessorKey: "actions",
          header: "Actions",
          cell: ({ row }) => (
            <div style={{ textAlign: "center" }}>
              <button
                className="btn btn-sm btn-outline-info mx-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowClick && onRowClick(row.original);
                }}
              >
                Edit
              </button>
              <button
                className="btn btn-sm btn-outline-danger mx-1"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Deleting member:", row.original);

                  if (!row.original.wom_id) {
                    console.error(
                      "Cannot delete: wom_id is missing",
                      row.original
                    );
                    alert("Cannot delete: Member ID (wom_id) is missing");
                    return;
                  }

                  onDeleteClick && onDeleteClick(row.original);
                }}
              >
                Delete
              </button>
            </div>
          ),
        },
      ],
      [onRowClick, onDeleteClick]
    );

    // Combine columns based on whether this is the admin view
    const columns = React.useMemo(
      () => (isAdmin ? [...baseColumns, ...adminColumns] : baseColumns),
      [isAdmin, baseColumns, adminColumns]
    );

    const table = useReactTable({
      data: sortedMembers,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    if (!members || members.length === 0) {
      return <div>No members found.</div>;
    }
    return (
      <table className="member-table w-100">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    textAlign: "center",
                    width: getColumnWidth(header.id),
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => isAdmin && onRowClick && onRowClick(row.original)}
              style={isAdmin ? { cursor: "pointer" } : {}}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{
                    textAlign: "center",
                    width: getColumnWidth(cell.column.id),
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  
  // Helper function to distribute column widths
  function getColumnWidth(columnId) {
    // Set appropriate widths for each column
    switch(columnId) {
      case 'name':
        return '20%';
      case 'rank':
        return '12%';
      case 'ehb':
        return '10%';
      case 'join_date':
        return '13%';  // New column for join date
      case 'clan_xp_gained':
        return '15%';
      case 'next_level':
        return '15%';
      case 'siege_score':
        return '10%';
      case 'actions':
        return '10%';  // Only used in admin view
      default:
        return 'auto';
    }
  }
