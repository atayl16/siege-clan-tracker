/**
 * What the weekly SotW / BotW / RotW polls can offer.
 *
 * Keys are WiseOldMan metric names. Confirm a new one against WOM before adding
 * it (any player's latestSnapshot.data.bosses lists them all).
 *
 * An option can cover several metrics. The winner gets one WOM competition per
 * metric, which is how the clan has always run Dagannoth Kings, Nightmare with
 * Phosani's, the wilderness pairs, and every raid with its hard mode.
 */

/** Display name for every metric we can create a competition on. */
const METRIC_NAMES = {
  // Skills
  agility: 'Agility',
  construction: 'Construction',
  cooking: 'Cooking',
  crafting: 'Crafting',
  farming: 'Farming',
  firemaking: 'Firemaking',
  fishing: 'Fishing',
  fletching: 'Fletching',
  herblore: 'Herblore',
  hunter: 'Hunter',
  mining: 'Mining',
  prayer: 'Prayer',
  runecrafting: 'Runecrafting',
  sailing: 'Sailing',
  slayer: 'Slayer',
  smithing: 'Smithing',
  thieving: 'Thieving',
  woodcutting: 'Woodcutting',

  // Bosses
  abyssal_sire: 'Abyssal Sire',
  alchemical_hydra: 'Alchemical Hydra',
  amoxliatl: 'Amoxliatl',
  araxxor: 'Araxxor',
  artio: 'Artio',
  barrows_chests: 'Barrows',
  brutus: 'Brutus',
  bryophyta: 'Bryophyta',
  callisto: 'Callisto',
  calvarion: "Calvar'ion",
  cerberus: 'Cerberus',
  chaos_elemental: 'Chaos Elemental',
  chaos_fanatic: 'Chaos Fanatic',
  commander_zilyana: 'Commander Zilyana',
  corporeal_beast: 'Corporeal Beast',
  crazy_archaeologist: 'Crazy Archaeologist',
  dagannoth_prime: 'Dagannoth Prime',
  dagannoth_rex: 'Dagannoth Rex',
  dagannoth_supreme: 'Dagannoth Supreme',
  deranged_archaeologist: 'Deranged Archaeologist',
  doom_of_mokhaiotl: 'Doom of Mokhaiotl',
  duke_sucellus: 'Duke Sucellus',
  general_graardor: 'General Graardor',
  giant_mole: 'Giant Mole',
  grotesque_guardians: 'Grotesque Guardians',
  guardians_of_the_rift: 'Guardians of the Rift',
  hespori: 'Hespori',
  kalphite_queen: 'Kalphite Queen',
  king_black_dragon: 'King Black Dragon',
  kraken: 'Kraken',
  kreearra: "Kree'arra",
  kril_tsutsaroth: "K'ril Tsutsaroth",
  lunar_chests: 'Moons of Peril',
  mad_angel: 'Mad Angel',
  maggot_king: 'Maggot King',
  nex: 'Nex',
  nightmare: 'The Nightmare',
  obor: 'Obor',
  phantom_muspah: 'Phantom Muspah',
  phosanis_nightmare: "Phosani's Nightmare",
  sarachnis: 'Sarachnis',
  scorpia: 'Scorpia',
  scurrius: 'Scurrius',
  shellbane_gryphon: 'Shellbane Gryphon',
  skotizo: 'Skotizo',
  sol_heredit: 'Sol Heredit',
  spindel: 'Spindel',
  tempoross: 'Tempoross',
  the_corrupted_gauntlet: 'The Corrupted Gauntlet',
  the_gauntlet: 'The Gauntlet',
  the_hueycoatl: 'The Hueycoatl',
  the_leviathan: 'The Leviathan',
  the_royal_titans: 'The Royal Titans',
  the_whisperer: 'The Whisperer',
  thermonuclear_smoke_devil: 'Thermonuclear Smoke Devil',
  tzkal_zuk: 'TzKal-Zuk',
  tztok_jad: 'TzTok-Jad',
  vardorvis: 'Vardorvis',
  venenatis: 'Venenatis',
  vetion: "Vet'ion",
  vorkath: 'Vorkath',
  wintertodt: 'Wintertodt',
  yama: 'Yama',
  zalcano: 'Zalcano',
  zulrah: 'Zulrah',

  // Raids
  chambers_of_xeric: 'Chambers of Xeric',
  chambers_of_xeric_challenge_mode: 'Chambers of Xeric (CM)',
  theatre_of_blood: 'Theatre of Blood',
  theatre_of_blood_hard_mode: 'Theatre of Blood (HM)',
  tombs_of_amascut: 'Tombs of Amascut',
  tombs_of_amascut_expert: 'Tombs of Amascut (Expert)',
  the_fractured_archive: 'The Fractured Archive',
};

// Combat skills (Attack, Strength, Defence, Magic, Ranged, Hitpoints) are left
// out at the owner's request; the clan has never run them.
const SKILL_OPTIONS = [
  'agility', 'construction', 'cooking', 'crafting', 'farming', 'firemaking',
  'fishing', 'fletching', 'herblore', 'hunter', 'mining', 'prayer',
  'runecrafting', 'sailing', 'slayer', 'smithing', 'thieving', 'woodcutting',
].map((metric) => ({ name: METRIC_NAMES[metric], metrics: [metric] }));

const single = (metric, extra = {}) => ({ name: METRIC_NAMES[metric], metrics: [metric], ...extra });

// entryLevel: no meaningful quest or Slayer requirement. The poll always offers
// some of these so newer members have something they can compete in. The list
// was approved by the owner on 2026-11-09; skilling bosses count.
const BOSS_OPTIONS = [
  single('abyssal_sire'),
  single('alchemical_hydra'),
  single('amoxliatl'),
  single('araxxor'),
  single('barrows_chests', { entryLevel: true }),
  single('brutus'),
  single('bryophyta', { entryLevel: true }),
  { name: 'Callisto & Artio', metrics: ['callisto', 'artio'] },
  single('cerberus'),
  single('chaos_elemental'),
  single('chaos_fanatic'),
  single('commander_zilyana'),
  single('corporeal_beast'),
  single('crazy_archaeologist'),
  { name: 'Dagannoth Kings', metrics: ['dagannoth_prime', 'dagannoth_rex', 'dagannoth_supreme'] },
  single('deranged_archaeologist'),
  single('doom_of_mokhaiotl'),
  single('duke_sucellus'),
  single('general_graardor'),
  single('giant_mole', { entryLevel: true }),
  single('grotesque_guardians'),
  // An activity in WOM rather than a boss, but it ran as BotW in June 2026.
  single('guardians_of_the_rift'),
  single('hespori'),
  single('kalphite_queen'),
  single('king_black_dragon', { entryLevel: true }),
  single('kraken'),
  single('kreearra'),
  single('kril_tsutsaroth'),
  single('lunar_chests'),
  single('mad_angel'),
  single('maggot_king'),
  single('nex'),
  { name: "Nightmare & Phosani's", metrics: ['nightmare', 'phosanis_nightmare'] },
  single('obor', { entryLevel: true }),
  single('phantom_muspah'),
  single('sarachnis', { entryLevel: true }),
  single('scorpia'),
  single('scurrius', { entryLevel: true }),
  single('shellbane_gryphon'),
  single('skotizo'),
  single('sol_heredit'),
  single('tempoross', { entryLevel: true }),
  single('the_corrupted_gauntlet'),
  single('the_gauntlet'),
  single('the_hueycoatl'),
  single('the_leviathan'),
  single('the_royal_titans', { entryLevel: true }),
  single('the_whisperer'),
  single('thermonuclear_smoke_devil'),
  single('tzkal_zuk'),
  single('tztok_jad'),
  single('vardorvis'),
  { name: "Vet'ion & Calvar'ion", metrics: ['vetion', 'calvarion'] },
  { name: 'Venenatis & Spindel', metrics: ['venenatis', 'spindel'] },
  single('vorkath'),
  single('wintertodt', { entryLevel: true }),
  single('yama'),
  single('zalcano'),
  single('zulrah'),
];

const RAID_OPTIONS = [
  { name: 'Chambers of Xeric', metrics: ['chambers_of_xeric', 'chambers_of_xeric_challenge_mode'] },
  { name: 'Theatre of Blood', metrics: ['theatre_of_blood', 'theatre_of_blood_hard_mode'] },
  { name: 'Tombs of Amascut', metrics: ['tombs_of_amascut', 'tombs_of_amascut_expert'] },
  { name: 'The Fractured Archive', metrics: ['the_fractured_archive'] },
];

/**
 * WOM boss metrics deliberately never offered. Listed so the new-boss warning
 * does not flag them. Mimic only comes from master clue caskets, so a week-long
 * competition on it barely moves.
 */
const EXCLUDED_BOSS_METRICS = ['mimic'];

/**
 * Per-poll rules.
 *   optionCount     - how many options the poll shows
 *   recentWeeks     - skip anything whose last competition ended this many
 *                     weeks before the poll opened, or is still running
 *   entryLevelSlots - BotW only: how many options must be entry-level
 */
const CATEGORIES = {
  sotw: {
    key: 'sotw',
    label: 'Skill of the Week',
    question: 'What should our next skill of the week be?',
    titlePrefix: 'Siege SotW',
    pool: SKILL_OPTIONS,
    optionCount: 5,
    recentWeeks: 8,
  },
  botw: {
    key: 'botw',
    label: 'Boss of the Week',
    question: 'What should our next boss of the week be?',
    titlePrefix: 'Siege BotW',
    pool: BOSS_OPTIONS,
    optionCount: 5,
    recentWeeks: 12,
    entryLevelSlots: 2,
  },
  rotw: {
    key: 'rotw',
    label: 'Raid of the Week',
    question: 'What should our next raid of the week be?',
    titlePrefix: 'Siege RotW',
    pool: RAID_OPTIONS,
    // Every raid that is not running this week. Only four exist.
    optionCount: RAID_OPTIONS.length,
    recentWeeks: 0,
  },
};

const CATEGORY_ORDER = ['sotw', 'botw', 'rotw'];

/** The WOM competitions to create if `option` wins, minus group credentials. */
function competitionPayloads(category, option, startsAt, endsAt) {
  const { titlePrefix } = CATEGORIES[category];
  return option.metrics.map((metric) => ({
    title: `${titlePrefix} - ${METRIC_NAMES[metric]}`,
    metric,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  }));
}

/** WOM boss metrics that no poll offers and nobody has excluded on purpose. */
function uncoveredBossMetrics(womBossMetrics) {
  const covered = new Set([
    ...BOSS_OPTIONS.flatMap((o) => o.metrics),
    ...RAID_OPTIONS.flatMap((o) => o.metrics),
    ...EXCLUDED_BOSS_METRICS,
  ]);
  return [...womBossMetrics].filter((m) => !covered.has(m)).sort();
}

module.exports = {
  METRIC_NAMES,
  SKILL_OPTIONS,
  BOSS_OPTIONS,
  RAID_OPTIONS,
  EXCLUDED_BOSS_METRICS,
  CATEGORIES,
  CATEGORY_ORDER,
  competitionPayloads,
  uncoveredBossMetrics,
};
