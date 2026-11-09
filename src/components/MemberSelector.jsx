import React, { useId, useMemo, useRef, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useMembers } from "../hooks/useMembers";
import "./MemberSelector.css";

const MAX_RESULTS = 8;

/**
 * Members matching `query`, best first: names that start with it, then names
 * that contain it. Matches on the display name and the WOM name.
 */
export function searchMembers(members, query, limit = MAX_RESULTS) {
  const q = query.trim().toLowerCase();
  if (!q || !members) return [];
  const starts = [];
  const contains = [];
  for (const m of members) {
    const names = [m.name, m.wom_name].filter(Boolean).map((n) => n.toLowerCase());
    if (names.some((n) => n.startsWith(q))) starts.push(m);
    else if (names.some((n) => n.includes(q))) contains.push(m);
  }
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, limit);
}

/**
 * Pick a clan member by typing their name.
 *
 * This used to render every member (130+) as a table row, which made the race
 * form a long scroll per participant. Now nothing is listed until you type;
 * matches appear below the box, and the chosen member collapses to one line
 * with a Change button.
 */
export default function MemberSelector({
  onMemberSelect,
  selectedMemberId = null,
  selectedMemberName = "",
  disabled = false,
}) {
  const { members, loading, error } = useMembers();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [changing, setChanging] = useState(false);
  const inputRef = useRef(null);
  const listId = useId();

  const results = useMemo(() => searchMembers(members, query), [members, query]);

  const selected =
    selectedMemberId != null && selectedMemberId !== ""
      ? members?.find((m) => Number(m.wom_id) === Number(selectedMemberId)) ?? {
          wom_id: selectedMemberId,
          name: selectedMemberName || `Player ${selectedMemberId}`,
        }
      : null;

  const choose = (member) => {
    onMemberSelect(member);
    setQuery("");
    setOpen(false);
    setActive(0);
    setChanging(false);
  };

  const startChange = () => {
    setChanging(true);
    // Focus once the input has rendered.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (selected && !changing) {
    return (
      <div className="member-picker-selected">
        <span className="member-picker-selected-name">{selected.name}</span>
        {selected.current_lvl ? (
          <span className="member-picker-meta">Lvl {selected.current_lvl}</span>
        ) : null}
        <button
          type="button"
          className="member-picker-change"
          onClick={startChange}
          disabled={disabled}
        >
          Change
        </button>
      </div>
    );
  }

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Never let Enter submit the surrounding race form from here.
      e.preventDefault();
      if (open && results[active]) choose(results[active]);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else if (changing) {
        setChanging(false);
      }
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div className="member-picker">
      <div className="member-picker-input-wrap">
        <FaSearch className="member-picker-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          className="member-picker-input"
          placeholder={loading ? "Loading members..." : "Type a player's name"}
          value={query}
          disabled={disabled || loading}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on a result lands before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          aria-label="Search players by name"
        />
        {changing && (
          <button
            type="button"
            className="member-picker-cancel"
            onClick={() => setChanging(false)}
            aria-label="Keep the current player"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {error && <div className="member-picker-empty">Couldn't load members.</div>}

      {showList && (
        <ul className="member-picker-list" role="listbox" id={listId}>
          {results.length === 0 ? (
            <li className="member-picker-empty" role="option" aria-disabled="true" aria-selected="false">
              No members match "{query.trim()}"
            </li>
          ) : (
            results.map((m, i) => (
              <li
                key={m.wom_id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`member-picker-option${i === active ? " is-active" : ""}`}
                // mousedown, not click: it fires before the input's blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(m);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="member-picker-option-name">{m.name}</span>
                <span className="member-picker-meta">
                  {m.current_lvl ? `Lvl ${m.current_lvl}` : ""}
                  {m.ehb ? ` · ${Math.floor(m.ehb)} EHB` : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
