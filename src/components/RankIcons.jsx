import React from "react";
// Clan icon imports
import mentorIcon from "../assets/images/Clan_icon_-_Mentor.png";
import prefectIcon from "../assets/images/Clan_icon_-_Prefect.png";
import leaderIcon from "../assets/images/Clan_icon_-_Leader.png";
import supervisorIcon from "../assets/images/Clan_icon_-_Supervisor.png";
import superiorIcon from "../assets/images/Clan_icon_-_Superior.png";
import executiveIcon from "../assets/images/Clan_icon_-_Executive.png";
import senatorIcon from "../assets/images/Clan_icon_-_Senator.png";
import monarchIcon from "../assets/images/Clan_icon_-_Monarch.png";
import tzkalIcon from "../assets/images/Clan_icon_-_TzKal.png";
import standardIcon from "../assets/images/ironman/Ironman_chat_badge.png";
import hardcoreIcon from "../assets/images/ironman/Hardcore_ironman_chat_badge.png"; // Fixed typo
import ultimateIcon from "../assets/images/ironman/Ultimate_ironman_chat_badge.png";
import groupIcon from "../assets/images/ironman/Group_ironman_chat_badge.png";
import hardcoreGroupIcon from "../assets/images/ironman/Hardcore_group_ironman_chat_badge.png";
import unrankedGroupIcon from "../assets/images/ironman/Unranked_group_ironman_chat_badge.png";// Define admin rank titles
export const ADMIN_RANKS = ["Owner", "Deputy Owner", "General", "Captain", "PvM Organizer"];

// Helper component for clan icons
export const ClanIcon = ({ name }) => {
  const iconMap = {
    Mentor: mentorIcon,
    Prefect: prefectIcon,
    Leader: leaderIcon,
    Supervisor: supervisorIcon,
    Superior: superiorIcon,
    Executive: executiveIcon,
    Senator: senatorIcon,
    Monarch: monarchIcon,
    TzKal: tzkalIcon,
  };

  if (!name || !iconMap[name]) return null;

  return (
    <img 
      src={iconMap[name]} 
      alt={`${name} icon`} 
      title={name} // Add title attribute for tooltip
      style={{ height: "20px", width: "auto", marginRight: "5px" }}
    />
  );
};

// Helper component for gem icons
export const GemIcon = ({ gemType, color }) => {
  // Update colors for better visibility - make Opal darker
  const colorMap = {
    Opal: "#FFE4B5",       // Darker moccasin color
    Sapphire: "#0000FF",   // Pure blue
    Emerald: "#00FF00",    // Pure lime
    Ruby: "#FF0000",       // Pure red
    Diamond: "#FFFFFF",    // White
    Dragonstone: "#FF00FF", // Pure magenta
    Onyx: "#808080",       // Gray
    Zenyte: "#FFA500"      // Pure orange
  };

  // Convert gemType to proper case to ensure matching
  let normalizedGemType = gemType;
  if (gemType && typeof gemType === 'string') {
    normalizedGemType = gemType.charAt(0).toUpperCase() + gemType.slice(1).toLowerCase();
  }

  return (
    <i 
      className="bi bi-gem" 
      title={normalizedGemType} // Add title attribute for tooltip
      style={{ 
        fontSize: "1.2rem", 
        color: colorMap[normalizedGemType] || color || "white", 
        marginRight: "8px",
        verticalAlign: "middle"
      }}
      aria-label={`${normalizedGemType} gem`}
    ></i>
  );
};

// Also add tooltips to AdminIcon
export const AdminIcon = ({ title }) => {
  // Normalize the title to make matching more reliable
  const normalizedTitle = title ? title.toLowerCase().replace(/_/g, ' ') : '';
  
  const emojiMap = {
    "owner": "👑",
    "deputy owner": "🔑",
    "general": "🌟",
    "captain": "🛠",
    "pvm organizer": "🐉",
  };

  if (!title || !emojiMap[normalizedTitle]) return null;

  return (
    <span 
      style={{ 
        fontSize: "1.2rem", 
        marginRight: "5px",
        verticalAlign: "middle"
      }}
      role="img" 
      aria-label={`${title} icon`}
      title={title}
    >
      {emojiMap[normalizedTitle]}
    </span>
  );
};

// Ironman Icon Component
export const IronmanIcon = ({ type, ...props }) => {
  if (!type) return null;

  const normalizedType = type.toLowerCase().replace(/\s+/g, "_");

  // Use imported images
  const iconMap = {
    standard: standardIcon,
    hardcore: hardcoreIcon,
    ultimate: ultimateIcon,
    group: groupIcon,
    hardcore_group: hardcoreGroupIcon,
    unranked_group: unrankedGroupIcon,
  };

  const iconSrc = iconMap[normalizedType];
  if (!iconSrc) return null;

  const titleMap = {
    standard: "Ironman",
    hardcore: "Hardcore Ironman",
    ultimate: "Ultimate Ironman",
    group: "Group Ironman",
    hardcore_group: "Hardcore Group Ironman",
    unranked_group: "Unranked Group Ironman",
  };

  const title = titleMap[normalizedType] || type;

  return (
    <img
      src={iconSrc}
      alt={title}
      title={title}
      className="ui-ironman-icon"
      width={16}
      height={16}
      {...props}
    />
  );
};
