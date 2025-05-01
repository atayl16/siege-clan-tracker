import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ClanIcon, GemIcon, AdminIcon, IronmanIcon } from "./RankIcons";
import { useMembers } from "../hooks/useMembers"; // Updated to use new hook
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
export default function MemberTable() {
  const { members, loading: membersLoading } = useMembers(); // Use the new hook
  const [expandedRow, setExpandedRow] = useState(null);

  const sortedMembers = useMemo(() => {
    if (!members) return [];

    // Filter out hidden members
    const visibleMembers = members.filter((member) => !member.hidden);

    // Then sort the visible members
    return [...visibleMembers].sort((a, b) => {
      const aClanXpGained =
        parseInt(a.current_xp || 0, 10) - parseInt(a.first_xp || 0, 10) || 0;
      const bClanXpGained =
        parseInt(b.current_xp || 0, 10) - parseInt(b.first_xp || 0, 10) || 0;

      return bClanXpGained - aClanXpGained;
    });
  }, [members]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="ui-cell-content ui-name-cell">
            <span>{row.original.name || "N/A"}</span>
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
        cell: ({ row }) => (
          <div className="ui-cell-content ui-center-content ui-rank-cell">
            {row.original.womrole || "N/A"}
          </div>
        ),
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

  if (membersLoading) {
    return (
      <div className="ui-loading-state">
        Loading member data...
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
                <th key={header.id} className="ui-table-header-cell">
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
                  <td key={cell.id} className="ui-table-cell">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
