import React from "react";
import { FaAward } from "react-icons/fa";
import { ordinal } from "../utils/xpWeek";
import "./PlaceBadge.css";

/**
 * A finishing place. 1st, 2nd and 3rd are a gold, silver or bronze rosette
 * (Font Awesome's award icon) with the number on a ringed disc over its
 * centre; anything lower is a plain numbered circle.
 *
 * `size` is the badge's height in px; a rosette is 3/4 as wide.
 */
export default function PlaceBadge({ place, size = 30, className = "" }) {
  const label = `${ordinal(place)} place`;

  if (place >= 1 && place <= 3) {
    return (
      <span
        className={`place-badge place-badge-rosette place-badge-${place} ${className}`.trim()}
        style={{ "--place-badge-size": `${size}px` }}
        role="img"
        aria-label={label}
      >
        <FaAward className="place-badge-icon" aria-hidden="true" focusable="false" />
        <span className="place-badge-number" aria-hidden="true">
          {place}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`place-badge place-badge-circle ${className}`.trim()}
      style={{ "--place-badge-size": `${Math.round(size * 0.85)}px` }}
      role="img"
      aria-label={label}
    >
      <span aria-hidden="true">{place}</span>
    </span>
  );
}
