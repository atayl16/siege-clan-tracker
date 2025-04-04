import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

// Define lists of rank names for each type
const SKILLER_RANK_NAMES = ["Opal", "Sapphire", "Emerald", "Ruby", "Diamond", "Dragonstone", "Onyx", "Zenyte"];
const FIGHTER_RANK_NAMES = ["Mentor", "Prefect", "Leader", "Supervisor", "Superior", "Executive", "Senator", "Monarch", "TzKal"];

// Define rank ranges for skillers (XP thresholds)
const SKILLER_RANKS = [
  { name: "Opal", range: [0, 3000000] },
  { name: "Sapphire", range: [3000000, 8000000] },
  { name: "Emerald", range: [8000000, 15000000] },
  { name: "Ruby", range: [15000000, 40000000] },
  { name: "Diamond", range: [40000000, 90000000] },
  { name: "Dragonstone", range: [90000000, 150000000] },
  { name: "Onyx", range: [150000000, 500000000] },
  { name: "Zenyte", range: [500000000, Number.MAX_SAFE_INTEGER] }
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
  { name: "TzKal", range: [1500, Number.MAX_SAFE_INTEGER] }
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

// Function to calculate next level requirement - XP needed for next rank for skillers, EHB needed for fighters
const calculateNextLevel = (member) => {
  if (!member) return 0;
  
  const womRole = (member.womrole || "").toLowerCase().trim();
  
  // Determine if the member is a skiller or fighter based on their womrole
  const isSkiller = SKILLER_RANK_NAMES.some(rank => womRole.includes(rank.toLowerCase()));
  const isFighter = FIGHTER_RANK_NAMES.some(rank => womRole.includes(rank.toLowerCase()));
  
  if (isSkiller) {
    // Calculate clan XP (current - initial) with safe parsing
    const clanXp = safeParseInt(member.current_xp) - safeParseInt(member.xp);
    
    // Find which rank range the member is in
    for (const rank of SKILLER_RANKS) {
      if (clanXp >= rank.range[0] && clanXp < rank.range[1]) {
        // Return the XP needed to reach the next rank
        return rank.range[1] - clanXp;
      }
    }
    
    // If they're at the highest rank already
    if (clanXp >= SKILLER_RANKS[SKILLER_RANKS.length - 1].range[0]) {
      return 0; // Already at max rank
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
    if (clanEhb >= FIGHTER_RANKS[FIGHTER_RANKS.length - 1].range[0]) {
      return 0; // Already at max rank
    }
  }
  
  // Default return if we couldn't determine the next level
  return 0;
};

export default function MemberTable({ members }) {
  const columns = React.useMemo(
    () => [
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
        cell: ({ row }) => (
          <div style={{ textAlign: "center" }}>
            {row.original.rank || "N/A"}
          </div>
        ),
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
        accessorKey: "xp",
        header: "Starting XP",
        cell: ({ row }) => (
          <div style={{ textAlign: "center" }}>
            {safeFormat(row.original.xp)}
          </div>
        ),
      },
      {
        accessorKey: "clan_xp_gained",
        header: "Clan XP Gained",
        cell: ({ row }) => {
          // Safe calculation of XP gained
          let gainedXp = 0;
          if (row.original.current_xp !== undefined && row.original.xp !== undefined) {
            gainedXp = safeParseInt(row.original.current_xp) - safeParseInt(row.original.xp);
          } else if (row.original.gained_xp !== undefined) {
            gainedXp = safeParseInt(row.original.gained_xp);
          }
          
          return (
            <div style={{ textAlign: "center" }}>
              {safeFormat(gainedXp)}
            </div>
          );
        },
      },
      {
        accessorKey: "next_level",
        header: "Next Level",
        cell: ({ row }) => (
          <div style={{ textAlign: "center" }}>
            {safeFormat(calculateNextLevel(row.original))}
          </div>
        ),
      },
      {
        accessorKey: "joined_date",
        header: "Joined",
        cell: ({ row }) => (
          <div style={{ textAlign: "center" }}>
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString()
              : "N/A"}
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: members || [],
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
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} style={{ textAlign: "center" }}>
                {flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext()
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
