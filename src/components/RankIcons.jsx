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

// Define admin rank titles
export const ADMIN_RANKS = ["Owner", "Deputy Owner", "General", "Captain", "PvM Organizer"];

// Helper component to display clan icons
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
      style={{ height: "20px", width: "auto", marginRight: "5px" }}
    />
  );
};

// Helper component for admin icons (using emojis)
export const AdminIcon = ({ title }) => {
  // Normalize the title to make matching more reliable
  // Replace ALL underscores with spaces using a global regex
  const normalizedTitle = title ? title.toLowerCase().replace(/_/g, ' ') : '';
  
  const emojiMap = {
    "owner": "👑", // Fixed crown emoji
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
    >
      {emojiMap[normalizedTitle]}
    </span>
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
      className="bi bi-gem" // Note: Added the base 'bi' class as well
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
