import React, { useState } from "react";
import Leaderboard from "../components/Leaderboard";
import { useMembers } from "../hooks/useMembers";
import { useEvents } from "../hooks/useEvents";
import { useCurrentXpWeek } from "../hooks/useWeeklyXp";
import { FaTrophy, FaMedal, FaInfoCircle, FaRegCalendarAlt, FaRegClock } from "react-icons/fa";
import WeeklyXpLeaderboard from "../components/WeeklyXpLeaderboard";
import { TitleHolders, TitleRaces } from "../components/WeeklyTitles";
import { XP_AWARD_POINTS, formatUkTime } from "../utils/xpWeek";
import { WEEKLY_TITLES, GAINER, TITLE_POINTS, formatMinimum } from "../utils/weeklyTitles";

// Import UI components
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";

import "./LeaderboardPage.css";
import LoadError from "../components/ui/LoadError";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];

const dayMonth = (date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }).format(date);

/** Which week is running and when it closes. */
function WeekBar() {
  const week = useCurrentXpWeek();
  return (
    <div className="leaderboard-week-bar">
      <div className="leaderboard-week-bar-main">
        <FaRegClock className="leaderboard-week-bar-icon" aria-hidden="true" />
        <div>
          <div className="leaderboard-week-bar-title">Week of {dayMonth(week.start)}</div>
          <div className="leaderboard-week-bar-sub">Monday 19:00 to Monday 19:00 UK, with SotW and BotW</div>
        </div>
      </div>
      <div className="leaderboard-week-bar-end">
        Ends <strong>{formatUkTime(week.end)} UK</strong> · points land within the hour
      </div>
    </div>
  );
}

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
          <h3>Weekly titles</h3>
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
  const { events, loading: eventsLoading } = useEvents();
  const [activeTab, setActiveTab] = useState("week");
  const [showFullScoreLeaderboard, setShowFullScoreLeaderboard] = useState(false);
  const [showFullWinsLeaderboard, setShowFullWinsLeaderboard] = useState(false);

  // Determine if there are enough players for "show more" buttons
  const hasEnoughScorePlayers = members &&
    members.filter(m => (parseInt(m.siege_score) || 0) > 0).length > 10;

  // Calculate number of event winners
  const eventWinnerCount = events ?
    new Set(events.filter(e => e.winner_username).map(e => e.winner_username.toLowerCase())).size : 0;

  const hasEnoughWinners = eventWinnerCount > 10;

  return (
    <div className="ui-page-container">
      <div className="ui-content-header">
        <h2>Clan Leaderboards</h2>
      </div>

      <Tabs activeTab={activeTab} onChange={setActiveTab} className="leaderboard-tabs">
        <Tabs.Tab tabId="week" label="This week" icon={<FaRegCalendarAlt />}>
          <div className="leaderboard-week">
            <WeekBar />
            <TitleHolders />
            <WeeklyXpLeaderboard variant="full" />
            <TitleRaces />
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="all" label="All-time" icon={<FaTrophy />}>
          {(membersLoading || eventsLoading) && (
            <div className="ui-loading-container">
              <div className="ui-loading-spinner"></div>
              <div className="ui-loading-text">Loading leaderboard data...</div>
            </div>
          )}

          {membersError && (
            <LoadError what="the leaderboard" error={membersError} onRetry={refreshMembers} />
          )}

          {/* Side-by-side container for the leaderboards */}
          <div className="ui-leaderboards-container">
            {/* Points Leaderboard Section */}
            <div className="ui-section-container">
              <h3 className="ui-section-title">
                <FaTrophy className="ui-section-icon" /> Siege Score Leaderboard
              </h3>

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

            {/* Event Wins Leaderboard Section */}
            <div className="ui-section-container">
              <h3 className="ui-section-title">
                <FaMedal className="ui-section-icon" /> Event Wins Leaderboard
              </h3>

              <Leaderboard
                members={members || []}
                events={events || []}
                showTitle={false}
                limit={showFullWinsLeaderboard ? null : 10}
                loading={membersLoading || eventsLoading}
                type="wins"
              />

              {hasEnoughWinners && (
                <div className="ui-button-center">
                  <Button
                    variant="secondary"
                    onClick={() => setShowFullWinsLeaderboard(!showFullWinsLeaderboard)}
                  >
                    {showFullWinsLeaderboard ? "Show Less" : "Show Full Leaderboard"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Tabs.Tab>

        <Tabs.Tab tabId="how" label="How points work" icon={<FaInfoCircle />}>
          <HowPointsWork />
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
