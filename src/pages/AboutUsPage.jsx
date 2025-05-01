import React, { useMemo } from "react";
import { useMembers } from "../hooks/useMembers";
import { 
  FaCalendarDay, 
  FaDiscord, 
  FaChartLine, 
  FaChartBar, 
  FaMedal,
  FaTimes,
  FaShieldAlt,
  FaTrophy,
  FaLink
} from "react-icons/fa";

// Import UI components
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatGroup from "../components/ui/StatGroup";

import "./AboutUsPage.css";

// Helper function to identify ironman accounts (reused from MemberTable)
const isIronman = (member) => {
  if (!member) return false;
  
  // Check ironman_type field
  if (member.ironman_type) return true;
  
  // Check build field
  if (member.build && member.build.toLowerCase() !== 'regular') return true;
  
  // Check WOM account type
  if (member.wom_account_type && 
      (member.wom_account_type.toLowerCase().includes('ironman') || 
       member.wom_account_type.toLowerCase().includes('im') ||
       member.wom_account_type.toLowerCase().includes('hardcore') ||
       member.wom_account_type.toLowerCase().includes('ultimate') ||
       member.wom_account_type.toLowerCase().includes('group'))) {
    return true;
  }
  
  // Check WOM player data
  if (member.wom_player?.type && 
      (member.wom_player.type.toLowerCase().includes('ironman') ||
       member.wom_player.type.toLowerCase().includes('im') ||
       member.wom_player.type.toLowerCase().includes('hardcore') ||
       member.wom_player.type.toLowerCase().includes('ultimate') ||
       member.wom_player.type.toLowerCase().includes('group'))) {
    return true;
  }
  
  return false;
};

export default function AboutUsPage() {
  const { members, loading: membersLoading, error: membersError, refreshMembers } = useMembers();

  // Calculate member statistics
  const clanStats = useMemo(() => {
    if (!members || members.length === 0) {
      return {
        totalMembers: 0,
        totalXp: 0,
        avgLevel: 0,
        ironmanCount: 0,
        maxLevelCount: 0
      };
    }

    // Filter out hidden members
    const visibleMembers = members.filter(m => !m.hidden);
    
    // Calculate total XP
    const totalXp = visibleMembers.reduce(
      (sum, m) => sum + (parseInt(m.current_xp) || 0),
      0
    );
    
    // Calculate average level
    const avgLevel = Math.floor(
      visibleMembers.reduce(
        (sum, m) => sum + (parseInt(m.current_lvl) || 0),
        0
      ) / Math.max(1, visibleMembers.length)
    );
    
    // Count ironman accounts
    const ironmanCount = visibleMembers.filter(isIronman).length;
    
    // Count maxed members (level 2277)
    const maxLevelCount = visibleMembers.filter(
      m => parseInt(m.current_lvl) === 2277
    ).length;
    
    return {
      totalMembers: visibleMembers.length,
      totalXp,
      avgLevel,
      ironmanCount,
      maxLevelCount
    };
  }, [members]);

  // Format XP for display
  const formattedXp = useMemo(() => {
    const xpInMillions = Math.floor(clanStats.totalXp / 1000000);
    return xpInMillions >= 1000
      ? `${(xpInMillions / 1000).toFixed(1)}B`
      : `${xpInMillions}M`;
  }, [clanStats.totalXp]);

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
        <h2>Siege Clan</h2>
      </div>

      {/* Clan Overview Section */}
      <div className="ui-section-container">
        <h3 className="ui-section-title">
          <FaChartBar className="ui-section-icon" /> Clan Stats
        </h3>
        
        {/* Enhanced StatGroup with more stats */}
        <div className="ui-expanded-stats">
          <StatGroup className="ui-stats-group">
            <StatGroup.Stat 
              label="Members" 
              value={clanStats.totalMembers} 
              icon={<FaShieldAlt />} 
            />
            <StatGroup.Stat
              label="Total XP"
              value={formattedXp}
              icon={<FaChartLine />}
            />
            <StatGroup.Stat
              label="Avg. Level"
              value={clanStats.avgLevel}
              icon={<FaChartBar />}
            />
          </StatGroup>
          
          <StatGroup className="ui-stats-group">
            <StatGroup.Stat
              label="Ironman Accounts"
              value={clanStats.ironmanCount}
              icon={<FaShieldAlt />}
            />
            <StatGroup.Stat
              label="Maxed Members"
              value={clanStats.maxLevelCount}
              icon={<FaTrophy />}
              tooltip="Members with 2277 total level"
            />
          </StatGroup>
        </div>

        {/* Clan Information section - Now using a different layout */}
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
                <FaDiscord /> Community
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
              </div>
            </div>
            
            <div className="ui-info-item">
              <div className="ui-info-label">
                <FaChartLine /> Stats
              </div>
              <div className="ui-info-value">
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
          </div>
        </div>
      </div>
    </div>
  );
}
