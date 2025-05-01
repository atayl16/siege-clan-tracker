import React from "react";
import { useMembers } from "../hooks/useMembers"; // Updated to use new hook
import DataSelector from "./ui/DataSelector";
import Badge from "./ui/Badge";
import "./MemberSelector.css";

export default function MemberSelector({
  onMemberSelect,
  selectedMemberId = null,
  disabled = false,
  viewMode = "table",
  filterClaimed = false,
}) {
  const { members, loading, error } = useMembers(); // Use the new hook

  // Filter members if needed
  const filteredMembers = React.useMemo(() => {
    if (!members) return [];

    if (filterClaimed) {
      return members.filter((m) => !m.claimed);
    }
    return members;
  }, [members, filterClaimed]);

  const memberLabelFormatter = (member) => {
    return `${member.name} (Lvl ${member.current_lvl || "?"})`;
  };

  // Define columns for the table view
  const columns = [
    {
      header: "Name",
      accessor: "name",
    },
    {
      header: "Level",
      accessor: "current_lvl",
    },
    {
      header: "Status",
      accessor: "is_claimed",
      render: (member) => (
        <Badge variant={member.is_claimed ? "success" : "primary"} pill>
          {member.is_claimed ? "Claimed" : "Available"}
        </Badge>
      ),
    },
    {
      header: "EHB",
      accessor: "ehb",
      render: (member) => member.ehb || "0",
    },
    {
      header: "Actions",
      render: (member) => (
        <button
          className="select-member-btn"
          onClick={() => onMemberSelect(member)}
          disabled={disabled || member.is_claimed}
        >
          Select
        </button>
      ),
    },
  ];

  return (
    <div className="member-selector-container">
      <DataSelector
        data={filteredMembers}
        columns={columns}
        onSelect={onMemberSelect}
        selectedId={selectedMemberId}
        keyField="wom_id"
        searchFields={["name", "wom_name"]}
        searchPlaceholder="Search players by name"
        viewMode={viewMode}
        labelField={viewMode === "dropdown" ? memberLabelFormatter : "name"} // Use custom formatter for dropdown
        valueField="wom_id"
        loading={loading}
        error={error}
        disabled={disabled}
        emptyMessage="No members found"
        className="member-selector"
      />
    </div>
  );
}
