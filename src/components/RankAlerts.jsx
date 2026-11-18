import React, { useMemo } from "react";
import { useMembers } from "../hooks/useMembers";
import { titleize } from "../utils/stringUtils";
import { memberNeedsRankUpdate, rankPromotionFor, safeFormat, safeParseInt } from "../utils/rankUtils";
import { FaExclamationTriangle, FaCheck } from "react-icons/fa";
import "./RankAlerts.css";

/**
 * Members who have earned a higher rank than they hold (rankPromotionFor:
 * ranks only go up), for the Alerts tab. The staff Discord channel gets
 * the same list once per rank (scripts/sync-tasks/rank-up-alerts.cjs).
 *
 * There is no button to change the rank here: the hourly sync copies each
 * member's rank from Wise Old Man, so a rank set on the site would be put
 * back within the hour. Promote them in game, and they drop off this list
 * once Wise Old Man shows the new rank.
 */
export function rankUpsDue(members) {
  return (members || [])
    .filter(memberNeedsRankUpdate)
    .map((member) => ({ member, promotion: rankPromotionFor(member) }))
    .filter(({ promotion }) => promotion)
    .sort((a, b) => String(a.member.name || "").localeCompare(String(b.member.name || "")));
}

export default function RankAlerts() {
  const { members, loading, error } = useMembers();
  const due = useMemo(() => rankUpsDue(members), [members]);

  if (loading) {
    return (
      <div className="ui-loading-container">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading members data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-message ui-message-error">
        <FaExclamationTriangle className="ui-message-icon" />
        <span>{error.message || String(error)}</span>
      </div>
    );
  }

  if (due.length === 0) {
    return (
      <div className="ui-no-alerts">
        <FaCheck className="ui-success-icon" />
        <span>No rank-ups due</span>
      </div>
    );
  }

  return (
    <div className="ui-rank-alerts-content">
      <p className="ui-rank-alerts-note">
        Promote these members in game. Each drops off this list once Wise Old Man shows their new rank.
      </p>
      <ul className="ui-reported-members-list">
        {due.map(({ member, promotion }) => (
          <li key={member.wom_id} className="ui-reported-member-item ui-priority-normal">
            <div className="ui-member-info">
              <div className="ui-reported-member-name">{member.name}</div>
              <div className="ui-rank-details">
                <div className="ui-current-rank">
                  Current: <strong>{titleize(member.womrole)}</strong>
                </div>
                <div className="ui-recommended-rank">
                  Earned: <strong>{titleize(promotion.rank)}</strong>
                </div>
                <div className="ui-member-stats">
                  {promotion.type === "skiller" ? (
                    <>
                      Clan XP:{" "}
                      <strong>{safeFormat(safeParseInt(member.current_xp) - safeParseInt(member.first_xp))}</strong>
                    </>
                  ) : (
                    <>
                      EHB: <strong>{safeFormat(Math.floor(Number(member.ehb) || 0))}</strong>
                    </>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
