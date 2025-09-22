import React, { useState, useEffect, memo, useRef } from "react";
import {
  BossIcon,
  SkillIcon,
  ActivityIcon,
  RaidIcon,
  OldSchoolIcon,
} from "./OsrsIcons";

// Global icon cache shared across all instances
const iconCache = {};

// The main component, memoized to prevent unnecessary re-renders
const MetricIcon = memo(({ metric }) => {
  // Track if this specific instance has been rendered before
  const [isRendered, setIsRendered] = useState(false);
  const componentRef = useRef(null);

  // Lists of metric types
  const bossMetrics = [
    "abyssal_sire",
    "alchemical_hydra",
    "amoxliatl",
    "araxxor",
    "artio",
    "barrows_chests",
    "bryophyta",
    "callisto",
    "calvarion",
    "cerberus",
    "chambers_of_xeric",
    "chambers_of_xeric_challenge_mode",
    "chaos_elemental",
    "chaos_fanatic",
    "commander_zilyana",
    "corporeal_beast",
    "crazy_archaeologist",
    "dagannoth_prime",
    "dagannoth_rex",
    "dagannoth_supreme",
    "deranged_archaeologist",
    "doom_of_mokhaiotl",
    "duke_sucellus",
    "general_graardor",
    "giant_mole",
    "grotesque_guardians",
    "hespori",
    "kalphite_queen",
    "king_black_dragon",
    "kraken",
    "kreearra",
    "kril_tsutsaroth",
    "lunar_chests",
    "mimic",
    "nex",
    "nightmare",
    "phosanis_nightmare",
    "obor",
    "phantom_muspah",
    "sarachnis",
    "scorpia",
    "scurrius",
    "skotizo",
    "sol_heredit",
    "spindel",
    "tempoross",
    "the_gauntlet",
    "the_corrupted_gauntlet",
    "the_hueycoatl",
    "the_leviathan",
    "the_royal_titans",
    "the_whisperer",
    "theatre_of_blood",
    "theatre_of_blood_hard_mode",
    "thermonuclear_smoke_devil",
    "tombs_of_amascut",
    "tombs_of_amascut_expert",
    "tzkal_zuk",
    "tztok_jad",
    "vardorvis",
    "venenatis",
    "vetion",
    "vorkath",
    "wintertodt",
    "yama",
    "zalcano",
    "zulrah",
  ];

  const activityMetrics = [
    "league_points",
    "bounty_hunter_hunter",
    "bounty_hunter_rogue",
    "clue_scrolls_all",
    "clue_scrolls_beginner",
    "clue_scrolls_easy",
    "clue_scrolls_medium",
    "clue_scrolls_hard",
    "clue_scrolls_elite",
    "clue_scrolls_master",
    "last_man_standing",
    "pvp_arena",
    "soul_wars_zeal",
    "guardians_of_the_rift",
    "colosseum_glory",
    "collections_logged",
  ];

  const raidMetrics = [
    "chambers_of_xeric",
    "chambers_of_xeric_challenge_mode",
    "theatre_of_blood",
    "theatre_of_blood_hard_mode",
    "tombs_of_amascut",
    "tombs_of_amascut_expert",
    "cox",
    "tob",
    "toa",
  ];

  // Mark as rendered when component mounts
  useEffect(() => {
    // Use requestAnimationFrame to ensure we're not blocking the main thread
    const frame = requestAnimationFrame(() => {
      if (!isRendered) {
        setIsRendered(true);
      }
    });
    
    return () => cancelAnimationFrame(frame);
  }, [isRendered]);

  // Get the icon component from cache or determine which one to use
  const getIconComponent = () => {
    // If we already computed this icon type, return from cache
    if (iconCache[metric]) {
      return iconCache[metric];
    }

    // Determine icon type
    let iconComponent;
    
    if (bossMetrics.includes(metric)) {
      iconComponent = <BossIcon boss={metric} />;
    } else if (raidMetrics.includes(metric)) {
      iconComponent = <RaidIcon raid={metric} />;
    } else if (activityMetrics.includes(metric)) {
      iconComponent = <ActivityIcon type={metric} />;
    } else if (metric) {
      const skillName = metric.charAt(0).toUpperCase() + metric.slice(1);
      iconComponent = <SkillIcon skill={skillName} />;
    } else {
      iconComponent = <OldSchoolIcon />;
    }
    
    // Cache the result for future use
    iconCache[metric] = iconComponent;
    return iconComponent;
  };

  // Display a simple placeholder while calculating the first render
  if (!isRendered) {
    return (
      <div 
        ref={componentRef}
        className="metric-icon-placeholder" 
        style={{ 
          width: '24px', 
          height: '24px', 
          display: 'inline-block',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '4px'
        }}
      />
    );
  }

  // Get icon from cache or compute it
  return (
    <div className="metric-icon-wrapper">
      {getIconComponent()}
    </div>
  );
});

// Add display name for debugging
MetricIcon.displayName = 'MetricIcon';

export default MetricIcon;
