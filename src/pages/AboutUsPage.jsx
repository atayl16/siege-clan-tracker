import React from "react";
import ClanRanks from "../components/ClanRanks";
import { useMembers } from "../hooks/useMembers";
import { 
  FaCalendarDay, 
  FaDiscord, 
  FaChartLine, 
  FaChartBar, 
  FaMedal,
  FaTimes
} from "react-icons/fa";

// Import UI components
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatGroup from "../components/ui/StatGroup";

import "./AboutUsPage.css";

export default function AboutUsPage() {
  const { members, loading: membersLoading, error: membersError, refreshMembers } = useMembers();

  return (
    <div className="ui-page-container">
      {membersLoading && (
        <div className="ui-loading-container">
          <div className="ui-loading-spinner"></div>
          <div className="ui-loading-text">Loading clan data...</div>
        </div>
      )}

      {membersError && (
        <div className="ui-error-container">
          <div className="ui-error-icon">
            <FaTimes />
          </div>
          <div className="ui-error-message">
            <h3>Error Loading Data</h3>
            <p>{membersError.message || "Failed to load data"}</p>
            <Button onClick={refreshMembers} variant="danger">
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="ui-content-header">
        <h2>About the Siege Clan</h2>
      </div>

      {/* Clan Overview Section */}
      <div className="ui-section-container">
        <h3 className="ui-section-title">
          <FaChartBar className="ui-section-icon" /> Clan Stats
        </h3>
        <StatGroup className="ui-stats-group">
          <StatGroup.Stat label="Members" value={members?.length || 0} />
          <StatGroup.Stat
            label="Total XP"
            value={(() => {
              if (!members || members.length === 0) return "0";

              const xpInMillions = Math.floor(
                members.reduce(
                  (sum, m) => sum + (parseInt(m.current_xp) || 0),
                  0
                ) / 1000000
              );

              return xpInMillions >= 1000
                ? `${(xpInMillions / 1000).toFixed(1)}B`
                : `${xpInMillions}M`;
            })()}
          />
          <StatGroup.Stat
            label="Avg. Level"
            value={(() => {
              if (!members || members.length === 0) return "0";

              return Math.floor(
                members.reduce(
                  (sum, m) => sum + (parseInt(m.current_lvl) || 0),
                  0
                ) / Math.max(1, members.length)
              );
            })()}
          />
        </StatGroup>

        {/* Clan Information section */}
        <h3 className="ui-section-title">Clan Information</h3>
        <div className="ui-clan-info-row">
          <Card className="ui-info-card" variant="dark">
            <Card.Body>
              <div className="ui-info-label">
                <FaCalendarDay /> Founded
              </div>
              <div className="ui-info-value">April 23, 2022</div>
            </Card.Body>
          </Card>
          <Card className="ui-info-card" variant="dark">
            <Card.Body>
              <div className="ui-info-label">Community Links</div>
              <div className="ui-info-links">
                <a
                  href="https://discord.gg/aXYHD6UdQJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-resource-link"
                >
                  <FaDiscord /> Discord Server
                </a>
                <a
                  href="https://wiseoldman.net/groups/2928"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-resource-link"
                >
                  <FaChartLine /> WiseOldMan Stats
                </a>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Clan Ranks Section */}
      <div className="ui-section-container">
        <h3 className="ui-section-title">
          <FaMedal className="ui-section-icon" /> Clan Ranks
        </h3>
        <ClanRanks />
      </div>
    </div>
  );
}
