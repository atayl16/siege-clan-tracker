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
  FaUsers,
  FaComments
} from "react-icons/fa";
import WiseOldManIcon from "../assets/images/other/Wise_Old_Man_chathead.png"; // Import the custom icon


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
      <div className="quick-stats-loading-container">
        <div className="quick-stats-loading-spinner"></div>
        <div className="quick-stats-loading-text">Loading clan stats...</div>
      </div>
    );
  }

  if (statsError || groupError) {
    return (
      <div className="quick-stats-error-container">
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
    <div className="quick-stats-page-container">
      <div className="quick-stats-content-header">
        <h2>Clan Quick Stats</h2>
      </div>

      <div className="quick-stats-section-container">
        <h3 className="quick-stats-section-title">
          <FaChartBar className="quick-stats-section-icon" /> Clan Stats
        </h3>

        <StatGroup className="quick-stats-stats-group">
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

        <StatGroup className="quick-stats-stats-group">
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
      <div className="quick-stats-clan-info-section">
        <h3 className="quick-stats-section-title">
          <FaLink className="quick-stats-section-icon" /> Clan Information
        </h3>

        <div className="quick-stats-info-grid">
          <div className="quick-stats-info-item">
            <div className="quick-stats-info-label">
              <FaCalendarDay /> Founded
            </div>
            <div className="quick-stats-info-value">April 23, 2022</div>
          </div>

          <div className="quick-stats-info-item">
            <div className="quick-stats-info-label">
              <FaComments /> Community
            </div>
            <div className="quick-stats-info-value quick-stats-info-links">
              <a
                href="https://discord.gg/aXYHD6UdQJ"
                target="_blank"
                rel="noopener noreferrer"
                className="quick-stats-resource-link"
              >
                <FaDiscord className="quick-stats-custom-icon" /> Discord Server
              </a>
              <a
                href="https://wiseoldman.net/groups/2928"
                target="_blank"
                rel="noopener noreferrer"
                className="quick-stats-resource-link"
              >
                <img
                  src={WiseOldManIcon}
                  alt="Wise Old Man"
                  className="quick-stats-custom-icon"
                />
                WiseOldMan Group
              </a>
            </div>
          </div>

          <div className="quick-stats-info-item">
            <div className="quick-stats-info-label">
              <FaGlobe /> Home World
            </div>
            <div className="quick-stats-info-value">517</div>
          </div>
        </div>
      </div>

      {/* Clan Ranks */}
      <div className="quick-stats-clan-ranks-section">
        <h3 className="quick-stats-section-title">
          <FaShieldAlt className="quick-stats-section-icon" /> Clan Ranks
        </h3>

        <ClanRanks />
      </div>
    </div>
  );
}
