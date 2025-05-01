import React from "react";
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
