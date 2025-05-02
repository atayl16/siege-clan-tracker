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

// New boss imports
import AbyssalSireIcon from "../assets/images/bosses/Abyssal_Sire.png";
import AlchemicalHydraIcon from "../assets/images/bosses/Alchemical_Hydra.png";
import AmoxliatlIcon from "../assets/images/bosses/Amoxliatl.png";
import AraxxorIcon from "../assets/images/bosses/Araxxor.png";
import ArtioIcon from "../assets/images/bosses/Artio.png";
import BarrowsChestsIcon from "../assets/images/bosses/Barrows_Chests.jpg";
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
import KreeArraIcon from "../assets/images/bosses/Kree'Arra.png";
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
import TheGauntletIcon from "../assets/images/bosses/Corrupted_Hunllef.png";
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

import OsrsIcon from "../assets/images/Old_School_RuneScape_Mobile_icon.png";

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
    Prayer: PrayerIcon,
    Ranged: RangedIcon,
    Runecraft: RunecraftIcon,
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
    "Chambers of Xeric": ChambersOfXericIcon,
    "chambers_of_xeric": ChambersOfXericIcon,
    "cox": ChambersOfXericIcon,
    
    "Theatre of Blood": TheatreOfBloodIcon,
    "theatre_of_blood": TheatreOfBloodIcon,
    "tob": TheatreOfBloodIcon,
    
    "Tombs of Amascut": TombsOfAmascutIcon,
    "tombs_of_amascut": TombsOfAmascutIcon,
    "toa": TombsOfAmascutIcon
  };

  return raidIcons[raid] ? <img src={raidIcons[raid]} alt={`${raid} icon`} /> : null;
}

export const ClueIcon = ({ type }) => {
  const clueIcons = {
    "beginner": BeginnerClueIcon,
    "beginner_clue": BeginnerClueIcon,
    
    "easy": EasyClueIcon,
    "easy_clue": EasyClueIcon,

    "medium": MediumClueIcon,
    "medium_clue": MediumClueIcon,
    
    "hard": HardClueIcon,
    "hard_clue": HardClueIcon,
    
    "elite": EliteClueIcon,
    "elite_clue": EliteClueIcon,
    
    "master": MasterClueIcon,
    "master_clue": MasterClueIcon
  };

  return clueIcons[type] ? <img src={clueIcons[type]} alt={`${type} clue icon`} /> : null;
}

export const BossIcon = ({ boss }) => {
  const bossIcons = {
    "abyssal_sire": AbyssalSireIcon,
    "alchemical_hydra": AlchemicalHydraIcon,
    "amoxliatl": AmoxliatlIcon,
    "araxxor": AraxxorIcon,
    "artio": ArtioIcon,
    "barrows_chests": BarrowsChestsIcon,
    "bryophyta": BryophytaIcon,
    "callisto": CallistoIcon,
    "calvarion": CalvarionIcon,
    "cerberus": CerberusIcon,
    "chambers_of_xeric": ChambersOfXericIcon,
    "chambers_of_xeric_challenge_mode": ChambersOfXericChallengeModeIcon,
    "chaos_elemental": ChaosElementalIcon,
    "chaos_fanatic": ChaosFanaticIcon,
    "commander_zilyana": CommanderZilyanaIcon,
    "corporeal_beast": CorporealBeastIcon,
    "crazy_archaeologist": CrazyArchaeologistIcon,
    "dagannoth_prime": DagannothPrimeIcon,
    "dagannoth_rex": DagannothRexIcon,
    "dagannoth_supreme": DagannothSupremeIcon,
    "deranged_archaeologist": DerangedArchaeologistIcon,
    "duke_sucellus": DukeSucellusIcon,
    "general_graardor": GeneralGraardorIcon,
    "giant_mole": GiantMoleIcon,
    "grotesque_guardians": GrotesqueGuardiansIcon,
    "hespori": HesporiIcon,
    "kalphite_queen": KalphiteQueenIcon,
    "king_black_dragon": KingBlackDragonIcon,
    "kraken": KrakenIcon,
    "kreearra": KreeArraIcon,
    "kril_tsutsaroth": KrilTsutsarothIcon,
    "lunar_chests": LunarChestsIcon,
    "mimic": MimicIcon,
    "nex": NexIcon,
    "nightmare": NightmareIcon,
    "phosanis_nightmare": PhosanisNightmareIcon,
    "obor": OborIcon,
    "phantom_muspah": PhantomMuspahIcon,
    "sarachnis": SarachnisIcon,
    "scorpia": ScorpiaIcon,
    "scurrius": ScurriusIcon,
    "skotizo": SkotizoIcon,
    "sol_heredit": SolHereditIcon,
    "spindel": SpindelIcon,
    "tempoross": TemporossIcon,
    "the_gauntlet": TheGauntletIcon,
    "the_corrupted_gauntlet": TheCorruptedGauntletIcon,
    "the_hueycoatl": TheHueycoatlIcon,
    "the_leviathan": TheLeviathanIcon,
    "the_royal_titans": TheRoyalTitansIcon,
    "the_whisperer": TheWhispererIcon,
    "theatre_of_blood": TheatreOfBloodIcon,
    "theatre_of_blood_hard_mode": TheatreOfBloodHardModeIcon,
    "thermonuclear_smoke_devil": ThermonuclearSmokeDevilIcon,
    "tombs_of_amascut": TombsOfAmascutIcon,
    "tombs_of_amascut_expert": TombsOfAmascutExpertIcon,
    "tzkal_zuk": TzKalZukIcon,
    "tztok_jad": TzTokJadIcon,
    "vardorvis": VardorvisIcon,
    "venenatis": VenenatisIcon,
    "vetion": VetionIcon,
    "vorkath": VorkathIcon,
    "wintertodt": WintertodtIcon,
    "zalcano": ZalcanoIcon,
    "zulrah": ZulrahIcon,
  };

  return bossIcons[boss] ? <img src={bossIcons[boss]} alt={`${boss} icon`} /> : null;
};

export const OsrsIcon = () => {
  return <img src={OsrsIcon} alt="Old School RuneScape Icon" />;
}
