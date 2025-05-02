import React from "react";
import ClanRanks from "../components/ClanRanks";
import { useClanStats } from "../hooks/useGroupStats";
import { useGroup } from "../hooks/useGroup";
import { 
  FaCalendarDay, 
  FaDiscord, 
  FaChartLine, 
  FaChartBar, 
  FaShieldAlt,
  FaGlobe,
  FaTrophy,
  FaLink,
} from "react-icons/fa";

// Import UI components
import StatGroup from "../components/ui/StatGroup";
import "./QuickStatsPage.css";

export default function QuickStatsPage() {
  const {
    data: clanStats,
    isLoading: statsLoading,
    error: statsError,
  } = useClanStats();
  const { memberCount, loading: groupLoading, error: groupError } = useGroup();

  if (statsLoading || groupLoading) {
    return (
      <div className="ui-loading-container">
        <div className="ui-loading-spinner"></div>
        <div className="ui-loading-text">Loading clan stats...</div>
      </div>
    );
  }

  if (statsError || groupError) {
    return (
      <div className="ui-error-container">
        <h3>Error Loading Clan Stats</h3>
        <p>
          {statsError?.message ||
            groupError?.message ||
            "Failed to load stats data"}
        </p>
      </div>
    );
  }

  return (
    <div className="ui-page-container">
      <div className="ui-content-header">
        <h2>Clan Quick Stats</h2>
      </div>

      <div className="ui-section-container">
        <h3 className="ui-section-title">
          <FaChartBar className="ui-section-icon" /> Clan Stats
        </h3>

        <StatGroup className="ui-stats-group">
          <StatGroup.Stat
            label="Maxed Combat"
            value={clanStats.maxedCombatCount}
            icon={<FaShieldAlt />}
          />
          <StatGroup.Stat
            label="Maxed Total"
            value={clanStats.maxedTotalCount}
            icon={<FaTrophy />}
          />
          <StatGroup.Stat
            label="200M Skills"
            value={clanStats.maxed200msCount}
            icon={<FaChartLine />}
          />
        </StatGroup>

        <StatGroup className="ui-stats-group">
          <StatGroup.Stat
            label="Total Members"
            value={memberCount}
            icon={<FaUsers />}
          />
          <StatGroup.Stat
            label="Average Level"
            value={clanStats.averageLevel}
            icon={<FaChartBar />}
          />
          <StatGroup.Stat
            label="Average XP"
            value={(clanStats.averageExperience / 1_000_000).toFixed(1) + "M"}
            icon={<FaChartLine />}
          />
        </StatGroup>
      </div>

      {/* Clan Information section */}
      <div className="ui-clan-info-section">
        <h3 className="ui-section-title">
          <FaLink className="ui-section-icon" /> Clan Information
        </h3>

        <div className="ui-info-grid">
          <div className="ui-info-item">
            <div className="ui-info-label">
              <FaCalendarDay /> Founded
            </div>
            <div className="ui-info-value">April 23, 2022</div>
          </div>

          <div className="ui-info-item">
            <div className="ui-info-label">
              <FaDiscord /> Community & Stats
            </div>
            <div className="ui-info-value">
              <a
                href="https://discord.gg/aXYHD6UdQJ"
                target="_blank"
                rel="noopener noreferrer"
                className="ui-resource-link"
              >
                Discord Server
              </a>
              <br />
              <a
                href="https://wiseoldman.net/groups/2928"
                target="_blank"
                rel="noopener noreferrer"
                className="ui-resource-link"
              >
                WiseOldMan Group
              </a>
            </div>
          </div>

          <div className="ui-info-item">
            <div className="ui-info-label">
              <FaGlobe /> Home World
            </div>
            <div className="ui-info-value">517</div>
          </div>
        </div>
      </div>

      {/* Clan Ranks */}
      <div className="ui-clan-ranks-section">
        <h3 className="ui-section-title">
          <FaShieldAlt className="ui-section-icon" /> Clan Ranks
        </h3>

        <ClanRanks />
      </div>
    </div>
  );
}
