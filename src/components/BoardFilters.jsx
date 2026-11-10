import React from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import "./BoardFilters.css";

/**
 * A search box, groups of toggle pills and an optional sort menu, with a
 * "Showing X of Y" line once anything narrows the list.
 *
 * @param {object} props
 * @param {string} props.query
 * @param {(q: string) => void} props.onQueryChange
 * @param {string} props.placeholder
 * @param {Array<{ label: string, value: string, onChange: (v: string) => void,
 *   options: Array<{ value: string, label: string }> }>} [props.groups]
 * @param {{ value: string, onChange: (v: string) => void,
 *   options: Array<{ value: string, label: string }> }} [props.sort]
 * @param {number} props.shown
 * @param {number} props.total
 * @param {() => void} props.onClear - resets the search and the groups
 */
export default function BoardFilters({
  query,
  onQueryChange,
  placeholder,
  groups = [],
  sort,
  shown,
  total,
  onClear,
}) {
  const narrowed = shown !== total;

  return (
    <div className="ui-board-filters">
      <div className="ui-board-filters-row">
        <label className="ui-board-search">
          <FaSearch aria-hidden="true" className="ui-board-search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
          />
        </label>

        {groups.map((group) => (
          <div key={group.label} className="ui-board-toggle" role="group" aria-label={group.label}>
            {group.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === group.value ? "active" : ""}
                aria-pressed={option.value === group.value}
                onClick={() => group.onChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ))}

        {sort && (
          <label className="ui-board-sort">
            <span>Sort</span>
            <select value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
              {sort.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {narrowed && (
        <div className="ui-board-filters-summary" role="status">
          Showing {shown} of {total}
          {/* With nothing shown, the empty state has its own Clear button. */}
          {shown > 0 && (
            <button type="button" className="ui-board-clear" onClick={onClear}>
              <FaTimes aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
