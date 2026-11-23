import React, { useState } from "react";
import { FaBolt } from "react-icons/fa";
import { useClanActivity } from "../hooks/useRuneProfile";
import { RUNEPROFILE_URL, RUNEPROFILE_GUIDE_URL } from "../utils/runeProfile";
import ActivityList from "./ActivityList";

const SHOWN = 6;

/**
 * "Latest From the Clan" on the home page: members' recent collection log
 * items, drops, quests, diaries, combat achievements and level-ups, from
 * RuneProfile. One edge-cached request for every visitor.
 *
 * Shows nothing at all while loading, on an error, or with nothing to show,
 * so a RuneProfile outage never leaves a broken box on the home page.
 */
export default function ClanActivityFeed() {
  const { activities } = useClanActivity();
  const [more, setMore] = useState(false);
  if (!activities.length) return null;

  const shown = more ? activities : activities.slice(0, SHOWN);
  return (
    <section className="nm-section-container nm-activity" aria-labelledby="clan-activity-h">
      <h3 className="nm-section-title" id="clan-activity-h">
        <FaBolt className="nm-section-icon" /> Latest From the Clan
      </h3>
      <ActivityList activities={shown} showName />
      <div className="nm-activity-foot">
        {activities.length > SHOWN && (
          <button type="button" className="nm-activity-more" onClick={() => setMore(!more)}>
            {more ? "Show less" : "Show more"}
          </button>
        )}
        <span className="nm-activity-credit">
          From members using{" "}
          <a href={`${RUNEPROFILE_URL}/clan/Siege`} target="_blank" rel="noopener noreferrer">
            RuneProfile
          </a>
          .{" "}
          <a href={RUNEPROFILE_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            Add yours
          </a>
        </span>
      </div>
    </section>
  );
}
