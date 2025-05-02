import React from "react";
import { BossIcon, SkillIcon, ActivityIcon, RaidIcon, OldSchoolIcon } from "./OsrsIcons";

const MetricIcon = ({ metric }) => {
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

  if (bossMetrics.includes(metric)) {
    return <BossIcon boss={metric} />;
  }

  if (raidMetrics.includes(metric)) {
    return <RaidIcon raid={metric} />;
  }

  if (activityMetrics.includes(metric)) {
    return <ActivityIcon type={metric} />;
  }

  if (metric) {
    const skillName = metric.charAt(0).toUpperCase() + metric.slice(1);
    return <SkillIcon skill={skillName} />;
  }

  // Default to the OsrsIcon if no match is found
  return <OldSchoolIcon />;
};

export default MetricIcon;
