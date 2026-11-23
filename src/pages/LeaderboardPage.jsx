import React, { useState } from "react";
import { useTabParam } from "../hooks/useTabParam";
import HallOfFame from "../components/HallOfFame";
import Leaderboard from "../components/Leaderboard";
import { useMembers } from "../hooks/useMembers";
import { FaTrophy, FaInfoCircle, FaRegCalendarAlt, FaCrown } from "react-icons/fa";
import WeeklyXpLeaderboard from "../components/WeeklyXpLeaderboard";
import { TitleHolders, TitleRaces } from "../components/WeeklyTitles";
import { XP_AWARD_POINTS } from "../utils/xpWeek";
import { WEEKLY_TITLES, GAINER, TITLE_POINTS, formatMinimum } from "../utils/weeklyTitles";

// Import UI components
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";

import "./LeaderboardPage.css";
import LoadError from "../components/ui/LoadError";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];

// Tab ids a link can open with ?tab=, e.g. /leaderboard?tab=hall-of-fame.
export const LEADERBOARD_TABS = ["week", "score", "hall-of-fame", "how"];

/** Every way to earn Siege Score, from the same settings the awards use. */
function HowPointsWork() {
  return (
    <div className="leaderboard-how">
      <Card className="leaderboard-how-card" variant="dark">
        <Card.Body>
          <h3>Competitions</h3>
          <p className="leaderboard-how-sub">SotW, BotW and RotW, chosen by the Monday polls</p>
          <ul>
            <li>1st place: <strong>150</strong></li>
            <li>2nd place: <strong>100</strong></li>
            <li>3rd place: <strong>50</strong></li>
            <li>Everyone who takes part: <strong>20</strong></li>
            <li>Short events (1 to 2 hours): <strong>20</strong> each</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="leaderboard-how-card" variant="dark">
        <Card.Body>
          <h3>{GAINER.name} (weekly XP)</h3>
          <p className="leaderboard-how-sub">Most Overall XP, Monday 19:00 to Monday 19:00 UK</p>
          <ul>
            {XP_AWARD_POINTS.map((points, i) => (
              <li key={i}>
                {ORDINALS[i]}: <strong>{points}</strong>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>

      <Card className="leaderboard-how-card leaderboard-how-wide" variant="dark">
        <Card.Body>
          <h3>Weekly Titles</h3>
          <p className="leaderboard-how-sub">
            Top {TITLE_POINTS.length} over the minimum earn <strong>{TITLE_POINTS.join(" / ")}</strong>. 1st holds
            the title until the next week is awarded. No points for taking part, and a title nobody qualifies for
            is not awarded that week.
          </p>
          <div className="leaderboard-how-table-wrap">
            <table className="leaderboard-how-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Ranked by</th>
                  <th scope="col">Minimum to place</th>
                </tr>
              </thead>
              <tbody>
                {WEEKLY_TITLES.map((title) => (
                  <tr key={title.id}>
                    <td>{title.name}</td>
                    <td>{title.ranked}</td>
                    <td>{formatMinimum(title)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default function LeaderboardPage() {
  const { members, loading: membersLoading, error: membersError, refreshMembers } = useMembers();
  const [activeTab, setActiveTab] = useTabParam(LEADERBOARD_TABS);
  const [showFullScoreLeaderboard, setShowFullScoreLeaderboard] = useState(false);

  // Determine if there are enough players for "show more" buttons
  const hasEnoughScorePlayers = members &&
    members.filter(m => (parseInt(m.siege_score) || 0) > 0).length > 10;

  return (
    <div className="ui-page-container">
      <Tabs
        heading="Clan Leaderboards"
        activeTab={activeTab}
        onChange={setActiveTab}
        className="leaderboard-tabs"
      >
        <Tabs.Tab tabId="week" label="This Week" icon={<FaRegCalendarAlt />}>
          <div className="leaderboard-week">
            <TitleHolders />
            <WeeklyXpLeaderboard variant="full" />
            <TitleRaces />
          </div>
        </Tabs.Tab>

        {/* Siege Score is reset every few months, so not "All-time". */}
        <Tabs.Tab tabId="score" label="Siege Score" icon={<FaTrophy />}>
          {membersLoading && (
            <div className="ui-loading-container">
              <div className="ui-loading-spinner"></div>
              <div className="ui-loading-text">Loading leaderboard data...</div>
            </div>
          )}

          {membersError && (
            <LoadError what="the leaderboard" error={membersError} onRetry={refreshMembers} />
          )}

          {/* Event Wins used to sit beside this: an all-time count of competition
              wins, which newer members could never catch up with. Each
              competition still shows its winner on the Events page. */}
          <div className="ui-section-container">
            <Leaderboard
              members={members || []}
              showTitle={false}
              limit={showFullScoreLeaderboard ? null : 10}
              loading={membersLoading}
            />

            {hasEnoughScorePlayers && (
              <div className="ui-button-center">
                <Button
                  variant="secondary"
                  onClick={() => setShowFullScoreLeaderboard(!showFullScoreLeaderboard)}
                >
                  {showFullScoreLeaderboard ? "Show Less" : "Show Full Leaderboard"}
                </Button>
              </div>
            )}
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="hall-of-fame" label="Hall of Fame" icon={<FaCrown />}>
          <HallOfFame />
        </Tabs.Tab>

        <Tabs.Tab tabId="how" label="How Points Work" icon={<FaInfoCircle />}>
          <HowPointsWork />
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
