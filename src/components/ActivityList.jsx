import React from "react";
import { FaBook, FaGem, FaScroll, FaMapSigns, FaShieldAlt, FaStar, FaCircle } from "react-icons/fa";
import { SkillIcon } from "./OsrsIcons";
import { describeActivity, activityDate } from "../utils/runeProfile";
import { timeAgo, formatDate } from "../utils/dates";
import "./ActivityList.css";

const ICONS = { item: FaBook, drop: FaGem, quest: FaScroll, diary: FaMapSigns, ca: FaShieldAlt, maxed: FaStar, other: FaCircle };

/**
 * A list of RuneProfile activities, one line each: icon, (who), what, when.
 *
 * @param {object} props
 * @param {Array<object>} props.activities - slimmed activities from /api/runeprofile-*
 * @param {boolean} [props.showName] - name the player (the clan feed)
 */
export default function ActivityList({ activities, showName = false }) {
  return (
    <ul className="act-list">
      {activities.map((a, i) => {
        const { kind, text, skill } = describeActivity(a);
        const Icon = ICONS[kind];
        const when = activityDate(a.createdAt);
        return (
          <li key={`${a.createdAt}-${a.username}-${i}`} className={`act-row act-${kind}`}>
            <span className="act-icon" aria-hidden="true">
              {skill ? <SkillIcon skill={skill} /> : Icon ? <Icon /> : null}
            </span>
            <span className="act-text">
              {showName && a.username && <b>{a.username}</b>} {text}
            </span>
            {when && (
              <time className="act-when" dateTime={when.toISOString()} title={formatDate(when)}>
                {timeAgo(when)}
              </time>
            )}
          </li>
        );
      })}
    </ul>
  );
}
