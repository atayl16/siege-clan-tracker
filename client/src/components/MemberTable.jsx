import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import AddPointsButton from "./AddPointsButton";

export default function MemberTable() {
  const { data: members, isLoading, error } = useQuery({
    queryKey: ["members"],
    queryFn: () => fetch("http://localhost:3001/api/members").then((res) => res.json()),
  });
  
  console.log("Members data:", members);
  console.log("Loading state:", isLoading);
  console.log("Error:", error);

  const columns = React.useMemo(
    () => [
      {
        accessorKey: "username",
        header: "Username",
      },
      {
        accessorKey: "member_type",
        header: "Type",
      },
      {
        accessorFn: (row) =>
          row.member_type === "skiller" ? row.skiller_rank : row.fighter_rank,
        header: "Rank",
      },
      {
        accessorKey: "siege_score",
        header: "Siege Score",
        cell: ({ row }) => (
          <div className="score-cell">
            {row.original.siege_score}
            <AddPointsButton memberId={row.original.wom_id} />
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

  if (isLoading) return <div>Loading...</div>;

  return (
    <table className="member-table">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
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
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
