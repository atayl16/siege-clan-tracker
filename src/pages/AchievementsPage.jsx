import React, { useState, useMemo } from "react";
import { useGroupAchievements } from "../hooks/useGroupAchievements";
import { FaExclamationTriangle } from "react-icons/fa";
import MetricIcon from "../components/MetricIcon";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SearchInput from "../components/ui/SearchInput";
import Tabs from "../components/ui/Tabs";
import ActivityList from "../components/ActivityList";
import { useClanActivity } from "../hooks/useRuneProfile";
import { RUNEPROFILE_URL, RUNEPROFILE_GUIDE_URL, describeActivity } from "../utils/runeProfile";
import "./AchievementsPage.css";

/** Wise Old Man's milestones for the clan: 99s, base stats, kill counts. */
function Milestones() {
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useGroupAchievements(showAll ? 100 : 10);

  // Filter achievements based on search term
  const filteredAchievements = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase().trim();
    return data.filter(
      (achievement) =>
        (achievement.name && achievement.name.toLowerCase().includes(term)) ||
        (achievement.player && achievement.player.displayName && 
         achievement.player.displayName.toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  return (
    <>
      {isLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading achievements...</div>
        </div>
      )}

      {error && (
        <Card className="ui-section-container ui-message-card">
          <Card.Body className="ui-centered-message">
            <div className="ui-message-icon-large">
              <FaExclamationTriangle className="ui-warning-icon" />
            </div>
            <h3>Unable to Load Achievements</h3>
            <p>We're having trouble connecting to the achievements service right now. Please try again later.</p>
            <Button 
              variant="primary" 
              onClick={() => window.location.reload()} 
              className="ui-retry-button"
            >
              Try Again
            </Button>
          </Card.Body>
        </Card>
      )}

      <div className="ui-content-header">
        <h2>
         Recent Achievements
        </h2>
        <div className="ui-actions-container">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            placeholder="Search achievements or players..."
          />
        </div>
      </div>

      {!isLoading && filteredAchievements && (
        <div className="ui-section-container">
          {filteredAchievements.length > 0 ? (
            <div className="achievement-wrapper">
              <div className="achievement-table-container">
                <table className="achievement-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Achievement</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAchievements.map((achievement, index) => (
                      <tr key={index} className="achievement-row">
                        <td className="achievement-player-name">
                          {achievement.player.displayName}
                        </td>
                        <td className="achievement-name">
                          <span className="achievement-icon">
                            <MetricIcon metric={achievement.metric} />
                          </span>
                          <span className="achievement-name-text">
                            {achievement.name}
                            {/* Phones hide the Date column; show it here. */}
                            <span className="achievement-date-inline">
                              {new Date(achievement.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </span>
                        </td>
                        <td className="achievement-date">
                          {new Date(achievement.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="achievement-empty-message">
              <p>No achievements found{searchTerm ? " matching your search" : ""}</p>
            </div>
          )}
          
          {data && data.length > 0 && (
            <div className="ui-button-center">
              <Button 
                variant="secondary" 
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show Less" : "Show More Achievements"}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * What the milestones miss, from members using RuneProfile: new collection
 * log items, valuable drops, quests, diaries and combat achievements. Level-ups
 * and XP milestones are left out, since Milestones has them. Fetched only
 * when this tab is opened; edge-cached.
 */
function ClanActivity() {
  const { activities, loading, error } = useClanActivity("page");
  const [searchTerm, setSearchTerm] = useState("");
  const term = searchTerm.toLowerCase().trim();
  const shown = term
    ? activities.filter(
        (a) => (a.username || "").toLowerCase().includes(term) || describeActivity(a).text.toLowerCase().includes(term)
      )
    : activities;

  return (
    <>
      <div className="ui-content-header">
        <h2>Clan Activity</h2>
        <div className="ui-actions-container">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            placeholder="Search drops, quests or players..."
            className="ui-achievements-search"
          />
        </div>
      </div>
      <div className="ui-section-container achievement-activity">
        {loading && (
          <div className="ui-loading-container">
            <div className="ui-loading-spinner"></div>
            <div className="ui-loading-text">Loading clan activity...</div>
          </div>
        )}
        {!loading && error && <p className="achievement-activity-note">Could not load clan activity from RuneProfile. Try again later.</p>}
        {!loading && !error && (shown.length ? <ActivityList activities={shown} showName /> : <p className="achievement-activity-note">Nothing found.</p>)}
        <p className="achievement-activity-note">
          From members using{" "}
          <a href={`${RUNEPROFILE_URL}/clan/Siege`} target="_blank" rel="noopener noreferrer">
            RuneProfile
          </a>
          , a RuneLite plugin.{" "}
          <a href={RUNEPROFILE_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            Add yours
          </a>
        </p>
      </div>
    </>
  );
}

/**
 * Two tabs: Milestones (Wise Old Man) and Clan activity (RuneProfile). Only
 * the open tab is mounted, so each source is fetched only when looked at.
 */
export default function AchievementsPage() {
  const [tab, setTab] = useState("milestones");
  return (
    <div className="ui-page-container">
      <Tabs activeTab={tab} onChange={setTab} className="achievements-tabs">
        <Tabs.Tab tabId="milestones" label="Milestones">
          <Milestones />
        </Tabs.Tab>
        <Tabs.Tab tabId="activity" label="Clan Activity">
          <ClanActivity />
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
