import React from "react";
// Existing skill imports
import AgilityIcon from "../assets/images/skilling/Agility_icon.png";
import AttackIcon from "../assets/images/skilling/Attack_icon.png";
import ConstructionIcon from "../assets/images/skilling/Construction_icon.png";
import CookingIcon from "../assets/images/skilling/Cooking_icon.png";
import CraftingIcon from "../assets/images/skilling/Crafting_icon.png";
import DefenceIcon from "../assets/images/skilling/Defence_icon.png";
import FarmingIcon from "../assets/images/skilling/Farming_icon.png";
import FiremakingIcon from "../assets/images/skilling/Firemaking_icon.png";
import FishingIcon from "../assets/images/skilling/Fishing_icon.png";
import FletchingIcon from "../assets/images/skilling/Fletching_icon.png";
import HerbloreIcon from "../assets/images/skilling/Herblore_icon.png";
import HitpointsIcon from "../assets/images/skilling/Hitpoints_icon.png";
import HunterIcon from "../assets/images/skilling/Hunter_icon.png";
import MagicIcon from "../assets/images/skilling/Magic_icon.png";
import MiningIcon from "../assets/images/skilling/Mining_icon.png";
import PrayerIcon from "../assets/images/skilling/Prayer_icon.png";
import RangedIcon from "../assets/images/skilling/Ranged_icon.png";
import RunecraftIcon from "../assets/images/skilling/Runecraft_icon.png";
import SlayerIcon from "../assets/images/skilling/Slayer_icon.png";
import SmithingIcon from "../assets/images/skilling/Smithing_icon.png";
import StrengthIcon from "../assets/images/skilling/Strength_icon.png";
import ThievingIcon from "../assets/images/skilling/Thieving_icon.png";
import WoodcuttingIcon from "../assets/images/skilling/Woodcutting_icon.png";

// New raid imports
import ChambersOfXericIcon from "../assets/images/raids/Chambers_of_Xeric_logo.png";
import TheatreOfBloodIcon from "../assets/images/raids/Theatre_of_Blood_logo.png";
import TombsOfAmascutIcon from "../assets/images/raids/Tombs_of_Amascut.png";

// New clue imports
import BeginnerClueIcon from "../assets/images/clues/Clue_scroll_(easy)_detail.png";
import EasyClueIcon from "../assets/images/clues/Clue_scroll_(easy)_detail.png";
import MediumClueIcon from "../assets/images/clues/Clue_scroll_(medium)_detail.png";
import HardClueIcon from "../assets/images/clues/Clue_scroll_(hard)_detail.png";
import EliteClueIcon from "../assets/images/clues/Clue_scroll_(elite)_detail.png";
import MasterClueIcon from "../assets/images/clues/Clue_scroll_(master)_detail.png";

// New activity imports
import LeaguesIcon from "../assets/images/other/Leagues.png";
import BountyHunterRedIcon from "../assets/images/other/Bounty-red.png";
import BountyHunterBlueIcon from "../assets/images/other/Bounty-blue.png";
import LastManStandingIcon from "../assets/images/other/Last_Man_Standing_logo.png";
import SoulWarsIcon from "../assets/images/other/Soul_Wars_logo.png";
import GuardiansOfTheRiftIcon from "../assets/images/other/Rewards_Guardian.png";
import CollectionsLoggedIcon from "../assets/images/other/Collection_log_detail.png";
import PvPArenaIcon from "../assets/images/other/PK-Skull.png";

// New boss imports
import AbyssalSireIcon from "../assets/images/bosses/Abyssal_Sire.png";
import AlchemicalHydraIcon from "../assets/images/bosses/Alchemical_Hydra.png";
import AmoxliatlIcon from "../assets/images/bosses/Amoxliatl.png";
import AraxxorIcon from "../assets/images/bosses/Araxxor.png";
import ArtioIcon from "../assets/images/bosses/Artio.png";
import BarrowsChestsIcon from "../assets/images/bosses/Barrows.png";
import BryophytaIcon from "../assets/images/bosses/Bryophyta.png";
import CallistoIcon from "../assets/images/bosses/Callisto.png";
import CalvarionIcon from "../assets/images/bosses/Calvarion.png";
import CerberusIcon from "../assets/images/bosses/Cerberus.png";
import ChaosElementalIcon from "../assets/images/bosses/Chaos_Elemental.png";
import ChaosFanaticIcon from "../assets/images/bosses/Chaos_Fanatic.png";
import CommanderZilyanaIcon from "../assets/images/bosses/Commander_Zilyana.png";
import CorporealBeastIcon from "../assets/images/bosses/Corporeal_Beast.png";
import CrazyArchaeologistIcon from "../assets/images/bosses/Crazy_Archaeologist.png";
import DagannothPrimeIcon from "../assets/images/bosses/Dagannoth_Prime.png";
import DagannothRexIcon from "../assets/images/bosses/Dagannoth_Rex.png";
import DagannothSupremeIcon from "../assets/images/bosses/Dagannoth_Supreme.png";
import DerangedArchaeologistIcon from "../assets/images/bosses/Deranged_Archaeologist.png";
import DukeSucellusIcon from "../assets/images/bosses/Duke_Sucellus.png";
import GeneralGraardorIcon from "../assets/images/bosses/General_Graardor.png";
import GiantMoleIcon from "../assets/images/bosses/Giant_Mole.png";
import GrotesqueGuardiansIcon from "../assets/images/bosses/Dawn.png";
import HesporiIcon from "../assets/images/bosses/Hespori.png";
import KalphiteQueenIcon from "../assets/images/bosses/Kalphite_Queen.png";
import KingBlackDragonIcon from "../assets/images/bosses/King_Black_Dragon.png";
import KrakenIcon from "../assets/images/bosses/Cave_kraken.png";
import KreeArraIcon from "../assets/images/bosses/Kree'arra.png";
import KrilTsutsarothIcon from "../assets/images/bosses/K'ril_Tsutsaroth.png";
import LunarChestsIcon from "../assets/images/bosses/Blue_Moon.png";
import MimicIcon from "../assets/images/bosses/The_Mimic.png";
import NexIcon from "../assets/images/bosses/Nex.png";
import NightmareIcon from "../assets/images/bosses/The_Nightmare.png";
import PhosanisNightmareIcon from "../assets/images/bosses/The_Nightmare.png";
import OborIcon from "../assets/images/bosses/Obor.png";
import PhantomMuspahIcon from "../assets/images/bosses/Phantom_Muspah.png";
import SarachnisIcon from "../assets/images/bosses/Sarachnis.png";
import ScorpiaIcon from "../assets/images/bosses/Scorpia.png";
import ScurriusIcon from "../assets/images/bosses/Scurrius.png";
import SkotizoIcon from "../assets/images/bosses/Skotizo.png";
import SolHereditIcon from "../assets/images/bosses/Sol_Heredit.png";
import SpindelIcon from "../assets/images/bosses/Spindel.png";
import TemporossIcon from "../assets/images/bosses/Tempoross.png";
import TheGauntletIcon from "../assets/images/bosses/Crystalline_Hunllef.png";
import TheCorruptedGauntletIcon from "../assets/images/bosses/Corrupted_Hunllef.png";
import TheHueycoatlIcon from "../assets/images/bosses/The_Hueycoatl.png";
import TheLeviathanIcon from "../assets/images/bosses/The_Leviathan.png";
import TheRoyalTitansIcon from "../assets/images/bosses/Eldric_the_Ice_King.png";
import TheWhispererIcon from "../assets/images/bosses/The_Whisperer.png";
import ThermonuclearSmokeDevilIcon from "../assets/images/bosses/Thermonuclear_Smoke_Devil.png";
import TzKalZukIcon from "../assets/images/bosses/TzKal-Zuk.png";
import TzTokJadIcon from "../assets/images/bosses/TzTok-Jad.png";
import VardorvisIcon from "../assets/images/bosses/Vardorvis.png";
import VenenatisIcon from "../assets/images/bosses/Venenatis.png";
import VetionIcon from "../assets/images/bosses/Vet'ion.png";
import VorkathIcon from "../assets/images/bosses/Vorkath.png";
import WintertodtIcon from "../assets/images/bosses/Howling_Snow_Storm.gif";
import ZalcanoIcon from "../assets/images/bosses/Zalcano.png";
import ZulrahIcon from "../assets/images/bosses/Zulrah.png";

import OsrsIcon from "../assets/images/other/Old_School_RuneScape_Mobile_icon.png";

export const SkillIcon = ({ skill }) => {
  const skillIcons = {
    Agility: AgilityIcon,
    Attack: AttackIcon,
    Construction: ConstructionIcon,
    Cooking: CookingIcon,
    Crafting: CraftingIcon,
    Defence: DefenceIcon,
    Farming: FarmingIcon,
    Firemaking: FiremakingIcon,
    Fishing: FishingIcon,
    Fletching: FletchingIcon,
    Herblore: HerbloreIcon,
    Hitpoints: HitpointsIcon,
    Hunter: HunterIcon,
    Magic: MagicIcon,
    Mining: MiningIcon,
    Overall: OsrsIcon,
    Prayer: PrayerIcon,
    Ranged: RangedIcon,
    Runecraft: RunecraftIcon,
    Runecrafting: RunecraftIcon,
    Slayer: SlayerIcon,
    Smithing: SmithingIcon,
    Strength: StrengthIcon,
    Thieving: ThievingIcon,
    Woodcutting: WoodcuttingIcon
  };

  return skillIcons[skill] ? <img src={skillIcons[skill]} alt={`${skill} icon`} /> : null;
}

export const RaidIcon = ({ raid }) => {
  const raidIcons = {
    // Chambers of Xeric
    "Chambers of Xeric": ChambersOfXericIcon,
    "chambers_of_xeric": ChambersOfXericIcon,
    "cox": ChambersOfXericIcon,
    "chambers_of_xeric_challenge_mode": ChambersOfXericIcon, // Reuse Chambers of Xeric icon

    // Theatre of Blood
    "Theatre of Blood": TheatreOfBloodIcon,
    "theatre_of_blood": TheatreOfBloodIcon,
    "tob": TheatreOfBloodIcon,
    "theatre_of_blood_hard_mode": TheatreOfBloodIcon, // Reuse Theatre of Blood icon

    // Tombs of Amascut
    "Tombs of Amascut": TombsOfAmascutIcon,
    "tombs_of_amascut": TombsOfAmascutIcon,
    "toa": TombsOfAmascutIcon,
    "tombs_of_amascut_expert": TombsOfAmascutIcon, // Reuse Tombs of Amascut icon
  };

  return raidIcons[raid] ? <img src={raidIcons[raid]} alt={`${raid} icon`} /> : null;
};

export const ActivityIcon = ({ type }) => {
  const activityIcons = {
    // Clue Scrolls
    clue_scrolls_all: MasterClueIcon,
    clue_scrolls_beginner: BeginnerClueIcon,
    clue_scrolls_easy: EasyClueIcon,
    clue_scrolls_medium: MediumClueIcon,
    clue_scrolls_hard: HardClueIcon,
    clue_scrolls_elite: EliteClueIcon,
    clue_scrolls_master: MasterClueIcon,

    // Other Activities
    league_points: LeaguesIcon,
    bounty_hunter_hunter: BountyHunterBlueIcon,
    bounty_hunter_rogue: BountyHunterRedIcon,
    last_man_standing: LastManStandingIcon,
    pvp_arena: PvPArenaIcon,
    soul_wars_zeal: SoulWarsIcon,
    guardians_of_the_rift: GuardiansOfTheRiftIcon,
    colosseum_glory: SolHereditIcon,
    collections_logged: CollectionsLoggedIcon,
  };

  return activityIcons[type] ? (
    <img src={activityIcons[type]} alt={`${type.replace(/_/g, " ")} icon`} />
  ) : (
    <img src={OsrsIcon} alt="Default Old School RuneScape Icon" />
  );
};

export const BossIcon = ({ boss }) => {
  const bossIcons = {
    abyssal_sire: AbyssalSireIcon,
    alchemical_hydra: AlchemicalHydraIcon,
    amoxliatl: AmoxliatlIcon,
    araxxor: AraxxorIcon,
    artio: ArtioIcon,
    barrows_chests: BarrowsChestsIcon,
    bryophyta: BryophytaIcon,
    callisto: CallistoIcon,
    calvarion: CalvarionIcon,
    cerberus: CerberusIcon,
    chambers_of_xeric: ChambersOfXericIcon,
    chambers_of_xeric_challenge_mode: ChambersOfXericIcon,
    chaos_elemental: ChaosElementalIcon,
    chaos_fanatic: ChaosFanaticIcon,
    commander_zilyana: CommanderZilyanaIcon,
    corporeal_beast: CorporealBeastIcon,
    crazy_archaeologist: CrazyArchaeologistIcon,
    dagannoth_prime: DagannothPrimeIcon,
    dagannoth_rex: DagannothRexIcon,
    dagannoth_supreme: DagannothSupremeIcon,
    deranged_archaeologist: DerangedArchaeologistIcon,
    duke_sucellus: DukeSucellusIcon,
    general_graardor: GeneralGraardorIcon,
    giant_mole: GiantMoleIcon,
    grotesque_guardians: GrotesqueGuardiansIcon,
    hespori: HesporiIcon,
    kalphite_queen: KalphiteQueenIcon,
    king_black_dragon: KingBlackDragonIcon,
    kraken: KrakenIcon,
    kreearra: KreeArraIcon,
    kril_tsutsaroth: KrilTsutsarothIcon,
    lunar_chests: LunarChestsIcon,
    mimic: MimicIcon,
    nex: NexIcon,
    nightmare: NightmareIcon,
    phosanis_nightmare: PhosanisNightmareIcon,
    obor: OborIcon,
    phantom_muspah: PhantomMuspahIcon,
    sarachnis: SarachnisIcon,
    scorpia: ScorpiaIcon,
    scurrius: ScurriusIcon,
    skotizo: SkotizoIcon,
    sol_heredit: SolHereditIcon,
    spindel: SpindelIcon,
    tempoross: TemporossIcon,
    the_gauntlet: TheGauntletIcon,
    the_corrupted_gauntlet: TheCorruptedGauntletIcon,
    the_hueycoatl: TheHueycoatlIcon,
    the_leviathan: TheLeviathanIcon,
    the_royal_titans: TheRoyalTitansIcon,
    the_whisperer: TheWhispererIcon,
    theatre_of_blood: TheatreOfBloodIcon,
    theatre_of_blood_hard_mode: TheatreOfBloodIcon,
    thermonuclear_smoke_devil: ThermonuclearSmokeDevilIcon,
    tombs_of_amascut: TombsOfAmascutIcon,
    tombs_of_amascut_expert: TombsOfAmascutIcon,
    tzkal_zuk: TzKalZukIcon,
    tztok_jad: TzTokJadIcon,
    vardorvis: VardorvisIcon,
    venenatis: VenenatisIcon,
    vetion: VetionIcon,
    vorkath: VorkathIcon,
    wintertodt: WintertodtIcon,
    zalcano: ZalcanoIcon,
    zulrah: ZulrahIcon,
  };

  return bossIcons[boss] ? <img src={bossIcons[boss]} alt={`${boss} icon`} /> : null;
};

export const OldSchoolIcon = () => {
  return <img src={OsrsIcon} alt="Old School RuneScape Icon" />;
}

// Helper constants for preloading - list of most commonly viewed icons
const POPULAR_BOSSES = [
  "vorkath", "zulrah", "alchemical_hydra", "chambers_of_xeric", 
  "tombs_of_amascut", "theatre_of_blood", "nex", "phantom_muspah",
  "tztok_jad", "corporeal_beast"
];

const POPULAR_SKILLS = [
  "Attack", "Strength", "Defence", "Hitpoints", "Ranged", "Magic", "Prayer", "Slayer"
];

const POPULAR_ACTIVITIES = [
  "clue_scrolls_all", "league_points", "guardians_of_the_rift"
];

/**
 * Preloads common metric icons to improve performance
 * Can be called directly from BackgroundLoader
 * @param {Object} options Configuration options for preloading
 * @param {number} options.delayBetweenIcons Milliseconds between each icon load (default: 50)
 * @param {boolean} options.logLoading Whether to log loading progress (default: true)
 * @returns {Promise<void>} Promise that resolves when preloading completes
 */
export const preloadMetricIcons = ({ 
  delayBetweenIcons = 50, 
  logLoading = true 
} = {}) => {
  // Icon mapping for preloading
  const iconMappings = {
    // Boss icons - highest priority
    boss: {
      keys: POPULAR_BOSSES,
      mapping: {
        vorkath: VorkathIcon,
        zulrah: ZulrahIcon,
        alchemical_hydra: AlchemicalHydraIcon,
        chambers_of_xeric: ChambersOfXericIcon,
        tombs_of_amascut: TombsOfAmascutIcon,
        theatre_of_blood: TheatreOfBloodIcon,
        nex: NexIcon,
        phantom_muspah: PhantomMuspahIcon,
        tztok_jad: TzTokJadIcon,
        corporeal_beast: CorporealBeastIcon
      }
    },
    
    // Skill icons - medium priority
    skill: {
      keys: POPULAR_SKILLS,
      mapping: {
        Attack: AttackIcon,
        Strength: StrengthIcon,
        Defence: DefenceIcon,
        Hitpoints: HitpointsIcon,
        Ranged: RangedIcon,
        Magic: MagicIcon,
        Prayer: PrayerIcon,
        Slayer: SlayerIcon
      }
    },
    
    // Activity icons - lower priority
    activity: {
      keys: POPULAR_ACTIVITIES,
      mapping: {
        clue_scrolls_all: MasterClueIcon,
        league_points: LeaguesIcon,
        guardians_of_the_rift: GuardiansOfTheRiftIcon
      }
    }
  };

  if (logLoading) {
    console.log("Preloading metric icons...");
  }

  return new Promise((resolve) => {
    let totalIconsToLoad = 0;
    let loadedIcons = 0;
    
    // Count total icons to load
    Object.values(iconMappings).forEach(category => {
      totalIconsToLoad += category.keys.length;
    });
    
    const onIconLoaded = () => {
      loadedIcons++;
      if (loadedIcons === totalIconsToLoad) {
        if (logLoading) {
          console.log(`Preloaded all ${totalIconsToLoad} metric icons successfully`);
        }
        resolve();
      }
    };
    
    // Process each category in sequence (bosses first, then skills, then activities)
    const loadCategory = (categoryKey, startDelay = 0) => {
      const category = iconMappings[categoryKey];
      
      category.keys.forEach((key, index) => {
        const delay = startDelay + (index * delayBetweenIcons);
        
        setTimeout(() => {
          try {
            const iconPath = category.mapping[key];
            if (iconPath) {
              const img = new Image();
              img.onload = () => {
                if (logLoading) {
                  console.log(`Preloaded ${categoryKey} icon: ${key}`);
                }
                onIconLoaded();
              };
              img.onerror = () => {
                console.error(`Failed to preload ${categoryKey} icon: ${key}`);
                onIconLoaded();
              };
              img.src = iconPath;
            } else {
              console.warn(`No icon mapping found for ${categoryKey}: ${key}`);
              onIconLoaded();
            }
          } catch (err) {
            console.error(`Error preloading ${categoryKey} icon ${key}:`, err);
            onIconLoaded();
          }
        }, delay);
      });
      
      // Return the delay after this category finishes
      return startDelay + (category.keys.length * delayBetweenIcons) + 100;
    };
    
    // Start loading each category in sequence
    let nextDelay = 0;
    nextDelay = loadCategory('boss', nextDelay);
    nextDelay = loadCategory('skill', nextDelay);
    loadCategory('activity', nextDelay);
  });
};

// Additional direct exports of icon mappings to allow more flexibility in BackgroundLoader
export const bossIconMap = {
  vorkath: VorkathIcon,
  zulrah: ZulrahIcon,
  alchemical_hydra: AlchemicalHydraIcon,
  chambers_of_xeric: ChambersOfXericIcon,
  tombs_of_amascut: TombsOfAmascutIcon,
  theatre_of_blood: TheatreOfBloodIcon,
  nex: NexIcon,
  phantom_muspah: PhantomMuspahIcon,
  tztok_jad: TzTokJadIcon,
  corporeal_beast: CorporealBeastIcon
};

export const skillIconMap = {
  Attack: AttackIcon,
  Strength: StrengthIcon,
  Defence: DefenceIcon,
  Hitpoints: HitpointsIcon,
  Ranged: RangedIcon,
  Magic: MagicIcon,
  Prayer: PrayerIcon,
  Slayer: SlayerIcon
};

export const activityIconMap = {
  clue_scrolls_all: MasterClueIcon,
  league_points: LeaguesIcon,
  guardians_of_the_rift: GuardiansOfTheRiftIcon
};
