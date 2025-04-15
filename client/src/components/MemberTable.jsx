import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ClanIcon, GemIcon, AdminIcon, ADMIN_RANKS } from "./RankIcons";
import "./MemberTable.css";

// Define lists of rank names for each type
const SKILLER_RANK_NAMES = ["Opal", "Sapphire", "Emerald", "Ruby", "Diamond", "Dragonstone", "Onyx", "Zenyte"];
const FIGHTER_RANK_NAMES = ["Mentor", "Prefect", "Leader", "Supervisor", "Superior", "Executive", "Senator", "Monarch", "TzKal"];
const ADMIN_RANK_ORDER = ["Owner", "Deputy Owner", "General", "Captain", "PvM Organizer"];

// Define rank ranges for skillers (XP thresholds)
const SKILLER_RANKS = [
  { name: "Opal", range: [0, 3000000] },
  { name: "Sapphire", range: [3000000, 8000000] },
  { name: "Emerald", range: [8000000, 15000000] },
  { name: "Ruby", range: [15000000, 40000000] },
  { name: "Diamond", range: [40000000, 90000000] },
  { name: "Dragonstone", range: [90000000, 150000000] },
  { name: "Onyx", range: [150000000, 500000000] },
  { name: "Zenyte", range: [500000000, Infinity] }
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
  { name: "TzKal", range: [1500, Infinity] }
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

const calculateNextLevel = (member) => {
  if (!member) return null;

  const womRole = (member.womrole || "").toLowerCase().trim();

  // Determine if the member is a skiller or fighter based on their womrole
  const isSkiller = SKILLER_RANK_NAMES.some((rank) =>
    womRole.includes(rank.toLowerCase())
  );
  const isFighter = FIGHTER_RANK_NAMES.some((rank) =>
    womRole.includes(rank.toLowerCase())
  );

  if (isSkiller) {
    // Calculate clan XP (current - initial) with safe parsing
    const clanXp = safeParseInt(member.current_xp) - safeParseInt(member.first_xp);

    // Find which rank range the member is in
    for (const rank of SKILLER_RANKS) {
      if (clanXp >= rank.range[0] && clanXp < rank.range[1]) {
        // Return the XP needed to reach the next rank
        return rank.range[1] - clanXp;
      }
    }

    // If they're at the highest rank already
    const highestRank = SKILLER_RANKS[SKILLER_RANKS.length - 1];
    if (clanXp >= highestRank.range[0]) {
      return null; // No next level
    }
  } else if (isFighter) {
    // Use EHB for fighters with safe parsing
    const clanEhb = safeParseInt(member.ehb);

    // Find which rank range the member is in
    for (const rank of FIGHTER_RANKS) {
      if (clanEhb >= rank.range[0] && clanEhb < rank.range[1]) {
        // Return the EHB needed to reach the next rank
        return rank.range[1] - clanEhb;
      }
    }

    // If they're at the highest rank already
    const highestRank = FIGHTER_RANKS[FIGHTER_RANKS.length - 1];
    if (clanEhb >= highestRank.range[0]) {
      return null; // No next level
    }
  }

  // Default return if we couldn't determine the next level
  return null;
};

// Main MemberTable component
export default function MemberTable({ members, isAdmin = false, onRowClick, onDeleteClick }) {
  // Sort members before passing them to the table
  const sortedMembers = React.useMemo(() => {
    return [...(members || [])].sort((a, b) => {
      const aRole = (a.womrole || "").toLowerCase().trim();
      const bRole = (b.womrole || "").toLowerCase().trim();

      // Check if the roles are admin ranks
      const aAdminIndex = ADMIN_RANK_ORDER.findIndex((rank) =>
        aRole.includes(rank.toLowerCase())
      );
      const bAdminIndex = ADMIN_RANK_ORDER.findIndex((rank) =>
        bRole.includes(rank.toLowerCase())
      );

      // Admin ranks come first, sorted by their order in ADMIN_RANK_ORDER
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
  }, [members]);

  // Define base columns that are shown in both public and admin views
  const baseColumns = React.useMemo(() => [
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

        // Check if the womrole matches any admin, skiller, or fighter rank
        const isAdmin = ADMIN_RANKS.find((title) =>
          womRole.includes(title.toLowerCase())
        );
        const matchedSkillerRank = SKILLER_RANK_NAMES.find((name) =>
          womRole.includes(name.toLowerCase())
        );
        const matchedFighterRank = FIGHTER_RANK_NAMES.find((name) =>
          womRole.includes(name.toLowerCase())
        );

        return (
          <div style={{ textAlign: "center" }}>
            {isAdmin && <AdminIcon title={isAdmin} />}
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
    {
      accessorKey: "clan_xp_gained",
      header: "Clan XP Gained",
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
    },
    {
      accessorKey: "next_level",
      header: "Next Level",
      cell: ({ row }) => {
        const nextLevel = calculateNextLevel(row.original);
        return (
          <div style={{ textAlign: "center" }}>
            {nextLevel !== null && nextLevel > 0 ? safeFormat(nextLevel) : ""}
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
    },
  ], []);

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
    <table className="table table-striped table-dark table-hover table-sm table-responsive">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} style={{ textAlign: "center" }}>
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
              <td key={cell.id} style={{ textAlign: "center" }}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
