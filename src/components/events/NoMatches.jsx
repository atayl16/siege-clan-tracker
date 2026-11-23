import React from "react";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

/** The empty state when a search or filter hides everything. */
export default function NoMatches({ what, onClear }) {
  return (
    <EmptyState
      title={`No ${what} match`}
      description="Try a different search or filter."
      action={
        <Button variant="secondary" onClick={onClear}>
          Clear Filters
        </Button>
      }
    />
  );
}
