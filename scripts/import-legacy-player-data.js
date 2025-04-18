const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to convert comma-separated number to integer
function parseNumber(numStr) {
  if (!numStr || numStr === '') return null;
  return parseInt(numStr.replace(/,/g, ''), 10);
}

// Parse the join date string into ISO format
function parseJoinDate(dateStr) {
  if (!dateStr || dateStr === '') return null;
  
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  // Extract parts from "Apr 23, 2022" format
  const parts = dateStr.split(' ');
  if (parts.length !== 3) return null;
  
  const month = months[parts[0]];
  const day = parseInt(parts[1].replace(',', ''));
  const year = parseInt(parts[2]);
  
  if (isNaN(day) || isNaN(year) || month === undefined) return null;
  
  const date = new Date(year, month, day);
  return date.toISOString();
}

// Legacy player data from the complete table
const legacyPlayers = [
  { name: "Dan xo", clan_rank: "👑", ehb: 269, starting_xp: "207,137,606", starting_level: 2156, gained_level: 121, next_level: "", join_date: "Apr 23, 2022", siege_score: 0 },
  { name: "Roinrin", clan_rank: "🔑", ehb: 157, starting_xp: "39,455,343", starting_level: 1709, gained_level: 568, next_level: "", join_date: "Aug 04, 2022", siege_score: 0 },
  { name: "Roinren", clan_rank: "🔑", ehb: 0, starting_xp: "559,855", starting_level: 602, gained_level: 571, next_level: "", join_date: "Jan 22, 2025", siege_score: 0 },
  { name: "Im Mr Bean", clan_rank: "🌟", ehb: 976, starting_xp: "292,943,366", starting_level: 2171, gained_level: 89, next_level: "", join_date: "Apr 24, 2022", siege_score: 0 },
  { name: "Also Shez", clan_rank: "🌟", ehb: 38, starting_xp: "53,997,571", starting_level: 1516, gained_level: 236, next_level: "", join_date: "Jul 30, 2023", siege_score: 0 },
  { name: "Also Miles", clan_rank: "🌟", ehb: 1, starting_xp: "33,623,908", starting_level: 771, gained_level: 346, next_level: "", join_date: "Dec 18, 2022", siege_score: 0 },
  { name: "Miles", clan_rank: "🌟", ehb: 1511, starting_xp: "376,990,076", starting_level: 2277, gained_level: 0, next_level: "", join_date: "Nov 14, 2022", siege_score: 0 },
  { name: "S hez", clan_rank: "🌟", ehb: 0, starting_xp: "42,000,436", starting_level: 1200, gained_level: 551, next_level: "", join_date: "Sep 11, 2022", siege_score: 0 },
  { name: "RoBo TriPz", clan_rank: "🛠", ehb: 402, starting_xp: "31,038,455", starting_level: 1696, gained_level: 418, next_level: "", join_date: "Mar 29, 2023", siege_score: 0 },
  { name: "Dawn Summers", clan_rank: "", ehb: 14, starting_xp: "1,662,810,203", starting_level: 2277, gained_level: 0, next_level: "Infinity", join_date: "Jul 27, 2023", siege_score: 0 },
  { name: "BigWilly xo", clan_rank: "", ehb: 287, starting_xp: "31,272,379", starting_level: 1552, gained_level: 719, next_level: "162,997,657", join_date: "Jun 03, 2022", siege_score: 0 },
  { name: "ElJako98", clan_rank: "Fighter Icon", ehb: 900, starting_xp: "76,852,178", starting_level: 1830, gained_level: 332, next_level: "199", join_date: "May 17, 2022", siege_score: 0 },
  { name: "MrBigSimp", clan_rank: "Fighter Icon", ehb: 680, starting_xp: "50,793,058", starting_level: 1779, gained_level: 427, next_level: "19", join_date: "Sep 11, 2022", siege_score: 0 },
  { name: "DDQiaxo", clan_rank: "", ehb: 375, starting_xp: "17,239,684", starting_level: 1135, gained_level: 1067, next_level: "214,069,643", join_date: "Jul 22, 2023", siege_score: 0 },
  { name: "Minx", clan_rank: "", ehb: 87, starting_xp: "335,790,541", starting_level: 2277, gained_level: 0, next_level: "235,493,367", join_date: "May 31, 2022", siege_score: 0 },
  { name: "il mrpko il", clan_rank: "", ehb: 81, starting_xp: "64,650,631", starting_level: 1684, gained_level: 570, next_level: "250,527,782", join_date: "Feb 24, 2023", siege_score: 0 },
  { name: "ArtyTheBoog", clan_rank: "", ehb: 82, starting_xp: "99,945,718", starting_level: 1788, gained_level: 452, next_level: "273,255,706", join_date: "Jul 21, 2023", siege_score: 0 },
  { name: "Hezz", clan_rank: "Fighter Icon", ehb: 1013, starting_xp: "297,834,169", starting_level: 2125, gained_level: 136, next_level: "86", join_date: "May 21, 2022", siege_score: 0 },
  { name: "K aura", clan_rank: "", ehb: 114, starting_xp: "71,423,915", starting_level: 1879, gained_level: 356, next_level: "283,043,721", join_date: "Jun 17, 2022", siege_score: 0 },
  { name: "Pirate Patch", clan_rank: "", ehb: 0, starting_xp: "26,259,197", starting_level: 1599, gained_level: 608, next_level: "288,996,648", join_date: "Oct 30, 2022", siege_score: 0 },
  { name: "mpxd", clan_rank: "", ehb: 533, starting_xp: "262,040,107", starting_level: 2208, gained_level: 69, next_level: "297,772,627", join_date: "Feb 06, 2023", siege_score: 0 },
  { name: "fk uim god", clan_rank: "", ehb: 39, starting_xp: "27,943,118", starting_level: 1636, gained_level: 498, next_level: "299,970,846", join_date: "Oct 02, 2023", siege_score: 0 },
  { name: "Longus Dikus", clan_rank: "Fighter Icon", ehb: 696, starting_xp: "199,895,237", starting_level: 2013, gained_level: 110, next_level: "3", join_date: "Jun 12, 2024", siege_score: 0 },
  { name: "FinPunisher", clan_rank: "", ehb: 339, starting_xp: "336,650,022", starting_level: 2277, gained_level: 0, next_level: "310,378,059", join_date: "Oct 24, 2024", siege_score: 0 },
  { name: "Waited G", clan_rank: "", ehb: 130, starting_xp: "181,425,950", starting_level: 2108, gained_level: 169, next_level: "310,609,504", join_date: "Jan 07, 2023", siege_score: 0 },
  { name: "nieverip", clan_rank: "", ehb: 470, starting_xp: "31,570,285", starting_level: 1627, gained_level: 398, next_level: "314,006,776", join_date: "Aug 03, 2023", siege_score: 0 },
  { name: "fattymcdon", clan_rank: "", ehb: 70, starting_xp: "49,494,703", starting_level: 1806, gained_level: 291, next_level: "335,930,490", join_date: "Jan 22, 2023", siege_score: 0 },
  { name: "Karuu", clan_rank: "Fighter Icon", ehb: 1069, starting_xp: "482,785,234", starting_level: 2176, gained_level: 41, next_level: "30", join_date: "Nov 22, 2023", siege_score: 0 },
  { name: "lnventar", clan_rank: "Fighter Icon", ehb: 120, starting_xp: "1,106,091", starting_level: 608, gained_level: 1451, next_level: "179", join_date: "Apr 26, 2024", siege_score: 0 },
  { name: "Im Duse", clan_rank: "Fighter Icon", ehb: 404, starting_xp: "3,391,529", starting_level: 1091, gained_level: 888, next_level: "95", join_date: "Jul 16, 2024", siege_score: 0 },
  { name: "Discodoris", clan_rank: "Fighter Icon", ehb: 2064, starting_xp: "759,522,702", starting_level: 2277, gained_level: 0, next_level: "Infinity", join_date: "Apr 06, 2024", siege_score: 0 },
  { name: "87V", clan_rank: "", ehb: 228, starting_xp: "141,683,245", starting_level: 1987, gained_level: 213, next_level: "1,261,203", join_date: "Jan 31, 2023", siege_score: 0 },
  { name: "Saidin Rage", clan_rank: "", ehb: 0, starting_xp: "235,040,490", starting_level: 2175, gained_level: 102, next_level: "3,762,923", join_date: "Jul 27, 2023", siege_score: 0 },
  { name: "lunchboxc", clan_rank: "", ehb: 227, starting_xp: "114,238,564", starting_level: 1910, gained_level: 198, next_level: "15,675,576", join_date: "Feb 25, 2023", siege_score: 0 },
  { name: "Versatonic", clan_rank: "Fighter Icon", ehb: 521, starting_xp: "137,272,723", starting_level: 1963, gained_level: 127, next_level: "178", join_date: "Dec 14, 2022", siege_score: 0 },
  { name: "InReelLyfee", clan_rank: "", ehb: 211, starting_xp: "211,810,987", starting_level: 2042, gained_level: 190, next_level: "16,364,910", join_date: "Apr 03, 2024", siege_score: 0 },
  { name: "Wizard D an", clan_rank: "", ehb: 371, starting_xp: "187,377,708", starting_level: 2047, gained_level: 121, next_level: "16,875,271", join_date: "Jul 25, 2023", siege_score: 0 },
  { name: "HotTomalee", clan_rank: "Fighter Icon", ehb: 399, starting_xp: "236,843,036", starting_level: 2152, gained_level: 115, next_level: "100", join_date: "Jan 22, 2024", siege_score: 0 },
  { name: "irontomale", clan_rank: "Fighter Icon", ehb: 218, starting_xp: "44,926,595", starting_level: 1621, gained_level: 420, next_level: "81", join_date: "Apr 10, 2024", siege_score: 0 },
  { name: "rnoaf", clan_rank: "Fighter Icon", ehb: 993, starting_xp: "303,311,466", starting_level: 2129, gained_level: 53, next_level: "106", join_date: "Jun 14, 2023", siege_score: 0 },
  { name: "chimmy", clan_rank: "", ehb: 46, starting_xp: "209,462,306", starting_level: 2136, gained_level: 141, next_level: "38,628,648", join_date: "Jun 19, 2022", siege_score: 0 },
  { name: "choppinrocks", clan_rank: "", ehb: 152, starting_xp: "244,923,654", starting_level: 2201, gained_level: 76, next_level: "39,155,078", join_date: "Aug 24, 2023", siege_score: 0 },
  { name: "CursedClover", clan_rank: "", ehb: 160, starting_xp: "247,172,294", starting_level: 2183, gained_level: 76, next_level: "45,528,139", join_date: "Jun 01, 2023", siege_score: 0 },
  { name: "Matt xo", clan_rank: "", ehb: 371, starting_xp: "124,937,120", starting_level: 1920, gained_level: 161, next_level: "46,444,176", join_date: "Apr 23, 2022", siege_score: 0 },
  { name: "timothy88888", clan_rank: "", ehb: 171, starting_xp: "5,930,861", starting_level: 822, gained_level: 1177, next_level: "50,739,347", join_date: "Aug 03, 2023", siege_score: 0 },
  { name: "parthanax RS", clan_rank: "", ehb: 99, starting_xp: "202,603,484", starting_level: 2145, gained_level: 93, next_level: "54,544,851", join_date: "Apr 06, 2024", siege_score: 0 },
  { name: "Zz Teare", clan_rank: "Fighter Icon", ehb: 409, starting_xp: "81,873,612", starting_level: 1680, gained_level: 256, next_level: "90", join_date: "Aug 20, 2023", siege_score: 0 },
  { name: "God 126", clan_rank: "", ehb: 65, starting_xp: "357,006,635", starting_level: 2263, gained_level: 14, next_level: "57,492,388", join_date: "Aug 05, 2023", siege_score: 0 },
  { name: "Atomicnight", clan_rank: "", ehb: 186, starting_xp: "61,421,307", starting_level: 1848, gained_level: 225, next_level: "58,657,387", join_date: "Jan 22, 2023", siege_score: 0 },
  { name: "Sapoz", clan_rank: "", ehb: 88, starting_xp: "2,336,418", starting_level: 650, gained_level: 1232, next_level: "59,757,158", join_date: "Apr 01, 2023", siege_score: 0 },
  { name: "Fatafeat", clan_rank: "", ehb: 80, starting_xp: "130,703,182", starting_level: 1918, gained_level: 214, next_level: "1,289,173", join_date: "Apr 30, 2022", siege_score: 0 },
  { name: "Sapos", clan_rank: "", ehb: 379, starting_xp: "137,355,313", starting_level: 1855, gained_level: 130, next_level: "3,263,326", join_date: "Dec 17, 2022", siege_score: 0 },
  { name: "H8MetalDrags", clan_rank: "", ehb: 59, starting_xp: "89,266,793", starting_level: 1940, gained_level: 170, next_level: "3,268,709", join_date: "May 24, 2023", siege_score: 0 },
  { name: "IlZion", clan_rank: "", ehb: 223, starting_xp: "250,750,659", starting_level: 2205, gained_level: 57, next_level: "8,633,246", join_date: "Mar 18, 2024", siege_score: 0 },
  { name: "ha kest", clan_rank: "", ehb: 54, starting_xp: "162,901,954", starting_level: 2041, gained_level: 116, next_level: "13,536,629", join_date: "Aug 26, 2023", siege_score: 0 },
  { name: "NysaRS", clan_rank: "", ehb: 109, starting_xp: "33,533,992", starting_level: 1718, gained_level: 262, next_level: "13,997,441", join_date: "Apr 23, 2024", siege_score: 0 },
  { name: "wuggy james", clan_rank: "", ehb: 51, starting_xp: "88,395,380", starting_level: 1728, gained_level: 213, next_level: "16,607,820", join_date: "Aug 23, 2022", siege_score: 0 },
  { name: "zuv arik", clan_rank: "", ehb: 334, starting_xp: "180,551,238", starting_level: 2021, gained_level: 104, next_level: "18,576,228", join_date: "Oct 04, 2022", siege_score: 0 },
  { name: "wifibananas", clan_rank: "", ehb: 170, starting_xp: "153,236,861", starting_level: 2036, gained_level: 101, next_level: "19,071,836", join_date: "May 21, 2022", siege_score: 0 },
  { name: "Dream Weaves", clan_rank: "", ehb: 22, starting_xp: "14,280,351", starting_level: 1500, gained_level: 410, next_level: "20,177,234", join_date: "Dec 13, 2022", siege_score: 0 },
  { name: "Summ", clan_rank: "", ehb: 114, starting_xp: "260,891,184", starting_level: 2227, gained_level: 50, next_level: "20,752,019", join_date: "Jan 21, 2024", siege_score: 0 },
  { name: "akmuo7", clan_rank: "", ehb: 51, starting_xp: "78,663,388", starting_level: 1905, gained_level: 168, next_level: "24,935,152", join_date: "Feb 22, 2023", siege_score: 0 },
  { name: "morrten", clan_rank: "", ehb: 9, starting_xp: "56,881,091", starting_level: 1549, gained_level: 344, next_level: "27,182,983", join_date: "Aug 26, 2023", siege_score: 0 },
  { name: "AmazonPrimal", clan_rank: "", ehb: 354, starting_xp: "177,145,684", starting_level: 2072, gained_level: 33, next_level: "28,748,167", join_date: "Feb 01, 2025", siege_score: 0 },
  { name: "TheLastAesir", clan_rank: "", ehb: 55, starting_xp: "162,338,953", starting_level: 2105, gained_level: 79, next_level: "29,955,211", join_date: "Jan 21, 2025", siege_score: 0 },
  { name: "aimmoohh", clan_rank: "", ehb: 50, starting_xp: "32,546,885", starting_level: 1549, gained_level: 394, next_level: "32,902,211", join_date: "Mar 13, 2023", siege_score: 0 },
  { name: "SRC 14", clan_rank: "", ehb: 4, starting_xp: "494,889", starting_level: 600, gained_level: 882, next_level: "32,932,395", join_date: "Aug 22, 2024", siege_score: 0 },
  { name: "THR0B", clan_rank: "Fighter Icon", ehb: 138, starting_xp: "141,476,557", starting_level: 2037, gained_level: 93, next_level: "161", join_date: "Jan 03, 2025", siege_score: 0 },
  { name: "wocoosv2", clan_rank: "", ehb: 24, starting_xp: "25,515,384", starting_level: 1503, gained_level: 393, next_level: "38,533,967", join_date: "Nov 05, 2022", siege_score: 0 },
  { name: "The Redneck", clan_rank: "", ehb: 34, starting_xp: "235,645,869", starting_level: 2191, gained_level: 48, next_level: "39,258,087", join_date: "May 07, 2022", siege_score: 0 },
  { name: "md32", clan_rank: "", ehb: 100, starting_xp: "97,750,747", starting_level: 1951, gained_level: 94, next_level: "39,485,417", join_date: "May 14, 2022", siege_score: 0 },
  { name: "Irn Matt", clan_rank: "", ehb: 38, starting_xp: "193,757", starting_level: 177, gained_level: 1620, next_level: "40,012,552", join_date: "Mar 25, 2023", siege_score: 0 },
  { name: "Sloth Bone", clan_rank: "", ehb: 67, starting_xp: "55,140,835", starting_level: 1784, gained_level: 118, next_level: "46,821,152", join_date: "Feb 26, 2023", siege_score: 0 },
  { name: "Val3nt1na", clan_rank: "", ehb: 132, starting_xp: "216,716,230", starting_level: 2119, gained_level: 50, next_level: "47,342,943", join_date: "Mar 25, 2024", siege_score: 0 },
  { name: "Lynx Bone", clan_rank: "", ehb: 33, starting_xp: "27,313,402", starting_level: 1629, gained_level: 235, next_level: "47,978,633", join_date: "Feb 26, 2023", siege_score: 0 },
  { name: "resnesv2", clan_rank: "", ehb: 48, starting_xp: "57,369,111", starting_level: 1797, gained_level: 156, next_level: "48,342,853", join_date: "Jun 19, 2023", siege_score: 0 },
  { name: "rjmarley", clan_rank: "", ehb: 31, starting_xp: "14,834,054", starting_level: 1516, gained_level: 320, next_level: "48,975,781", join_date: "Dec 09, 2023", siege_score: 0 },
  { name: "Yungsingteng", clan_rank: "", ehb: 194, starting_xp: "397,775,039", starting_level: 2277, gained_level: 0, next_level: "49,244,968", join_date: "Sep 17, 2022", siege_score: 0 },
  { name: "keop", clan_rank: "Fighter Icon", ehb: 672, starting_xp: "241,793,611", starting_level: 2104, gained_level: 17, next_level: "27", join_date: "Feb 01, 2025", siege_score: 0 },
  { name: "Kbart", clan_rank: "", ehb: 30, starting_xp: "85,138,520", starting_level: 1896, gained_level: 122, next_level: "49,346,827", join_date: "Apr 01, 2023", siege_score: 0 },
  { name: "Jaex II", clan_rank: "", ehb: 100, starting_xp: "30,674,193", starting_level: 1547, gained_level: 249, next_level: "49,466,075", join_date: "Oct 04, 2022", siege_score: 0 },
  { name: "cooter fest", clan_rank: "", ehb: 60, starting_xp: "172,492,748", starting_level: 2107, gained_level: 57, next_level: "49,652,029", join_date: "Dec 02, 2024", siege_score: 0 },
  { name: "GarrefGaming", clan_rank: "", ehb: 22, starting_xp: "52,868,770", starting_level: 1713, gained_level: 101, next_level: "977,283", join_date: "Jul 09, 2023", siege_score: 0 },
  { name: "painless cat", clan_rank: "", ehb: 9, starting_xp: "69,590,141", starting_level: 1871, gained_level: 98, next_level: "7,252,880", join_date: "Jul 15, 2022", siege_score: 0 },
  { name: "gim ddq", clan_rank: "", ehb: 0, starting_xp: "19,388,033", starting_level: 750, gained_level: 683, next_level: "12,163,871", join_date: "Nov 15, 2024", siege_score: 0 },
  { name: "Regler", clan_rank: "Fighter Icon", ehb: 229, starting_xp: "135,762,773", starting_level: 1749, gained_level: 227, next_level: "70", join_date: "Mar 09, 2024", siege_score: 0 },
  { name: "weird bug", clan_rank: "", ehb: 8, starting_xp: "19,174,413", starting_level: 659, gained_level: 1075, next_level: "14,891,652", join_date: "Jul 29, 2023", siege_score: 0 },
  { name: "Saundogg", clan_rank: "", ehb: 21, starting_xp: "29,982,018", starting_level: 1656, gained_level: 168, next_level: "15,450,283", join_date: "May 14, 2023", siege_score: 0 },
  { name: "litty chill", clan_rank: "", ehb: 93, starting_xp: "275,541,465", starting_level: 2198, gained_level: 31, next_level: "16,030,889", join_date: "Mar 09, 2023", siege_score: 0 },
  { name: "God of GIM", clan_rank: "", ehb: 0, starting_xp: "5,489,219", starting_level: 1201, gained_level: 327, next_level: "16,093,856", join_date: "Sep 30, 2024", siege_score: 0 },
  { name: "cL I of Tea", clan_rank: "", ehb: 607, starting_xp: "546,955,246", starting_level: 2277, gained_level: 0, next_level: "16,307,484", join_date: "Jan 19, 2025", siege_score: 0 },
  { name: "Lone Stridor", clan_rank: "", ehb: 152, starting_xp: "241,685,951", starting_level: 2188, gained_level: 14, next_level: "16,504,667", join_date: "Sep 22, 2023", siege_score: 0 },
  { name: "Sandels 3", clan_rank: "", ehb: 2, starting_xp: "100,000,000", starting_level: 1882, gained_level: 104, next_level: "17,008,659", join_date: "Apr 15, 2025", siege_score: 0 },
  { name: "Its Regler", clan_rank: "", ehb: 0, starting_xp: "", starting_level: null, gained_level: 1211, next_level: "17,738,885", join_date: "Apr 02, 2025", siege_score: 0 },
  { name: "AAA420", clan_rank: "", ehb: 8, starting_xp: "24,020,645", starting_level: 1535, gained_level: 188, next_level: "18,674,616", join_date: "Apr 17, 2024", siege_score: 0 },
  { name: "RenBoe", clan_rank: "Fighter Icon", ehb: 448, starting_xp: "244,000,000", starting_level: 2143, gained_level: 0, next_level: "51", join_date: "Apr 17, 2025", siege_score: 0 },
  { name: "kushMpizza", clan_rank: "", ehb: 1287, starting_xp: "272,394,962", starting_level: 1972, gained_level: 2, next_level: "20,195,746", join_date: "Nov 28, 2024", siege_score: 0 },
  { name: "Stakkar", clan_rank: "", ehb: 58, starting_xp: "163,224,986", starting_level: 2049, gained_level: 40, next_level: "20,876,539", join_date: "Jul 16, 2023", siege_score: 0 },
  { name: "flacid Terry", clan_rank: "", ehb: 151, starting_xp: "145,159,149", starting_level: 1931, gained_level: 17, next_level: "21,384,869", join_date: "Apr 05, 2024", siege_score: 0 },
  { name: "Avirace", clan_rank: "", ehb: 18, starting_xp: "85,197,578", starting_level: 1884, gained_level: 54, next_level: "23,151,586", join_date: "Feb 24, 2025", siege_score: 0 },
  { name: "Bakbor", clan_rank: "", ehb: 37, starting_xp: "62,702,676", starting_level: 1770, gained_level: 39, next_level: "2,314,187", join_date: "Apr 02, 2024", siege_score: 0 },
  { name: "Darklyyyy", clan_rank: "", ehb: 17, starting_xp: "73,927,362", starting_level: 1858, gained_level: 44, next_level: "2,794,130", join_date: "Apr 13, 2023", siege_score: 0 },
  { name: "Mr Garvey", clan_rank: "", ehb: 0, starting_xp: "1,531,887", starting_level: 754, gained_level: 641, next_level: "4,456,636", join_date: "Sep 03, 2023", siege_score: 0 },
  { name: "Empty Brass", clan_rank: "", ehb: 60, starting_xp: "154,557,768", starting_level: 2037, gained_level: 26, next_level: "4,746,589", join_date: "Feb 08, 2025", siege_score: 0 },
  { name: "I am so so", clan_rank: "", ehb: 52, starting_xp: "87,649,373", starting_level: 1855, gained_level: 14, next_level: "6,333,397", join_date: "Feb 04, 2025", siege_score: 0 },
  { name: "01", clan_rank: "", ehb: 143, starting_xp: "376,919,004", starting_level: 2274, gained_level: 3, next_level: "87,452", join_date: "Jan 18, 2025", siege_score: 0 },
  { name: "Helmscape", clan_rank: "", ehb: 0, starting_xp: "3,846,269", starting_level: 936, gained_level: 266, next_level: "1,578,981", join_date: "Apr 14, 2023", siege_score: 0 },
  { name: "Qte", clan_rank: "", ehb: 14, starting_xp: "43,820,673", starting_level: 1715, gained_level: 42, next_level: "1,666,103", join_date: "Sep 24, 2023", siege_score: 0 },
  { name: "Lone Xandor", clan_rank: "", ehb: 1, starting_xp: "2,530,864", starting_level: 719, gained_level: 641, next_level: "1,833,832", join_date: "Jun 21, 2024", siege_score: 0 },
  { name: "Sir Zeraph", clan_rank: "", ehb: 0, starting_xp: "4,478,411", starting_level: 768, gained_level: 473, next_level: "1,995,810", join_date: "Dec 31, 2023", siege_score: 0 },
  { name: "Will Hades", clan_rank: "", ehb: 246, starting_xp: "256,505,272", starting_level: 2048, gained_level: 0, next_level: "2,568,361", join_date: "Jan 21, 2025", siege_score: 0 },
  { name: "Konichi", clan_rank: "", ehb: 0, starting_xp: "30,257,415", starting_level: 1709, gained_level: 38, next_level: "2,807,549", join_date: "Mar 18, 2025", siege_score: 0 },
  { name: "Ironteare", clan_rank: "", ehb: 10, starting_xp: "18,768,763", starting_level: 1486, gained_level: 71, next_level: "2,879,137", join_date: "Aug 13, 2023", siege_score: 0 },
  { name: "galavar", clan_rank: "", ehb: 0, starting_xp: "61,069,780", starting_level: 1217, gained_level: 51, next_level: "2,955,822", join_date: "Apr 09, 2025", siege_score: 0 },
  { name: "PVM Onlin", clan_rank: "", ehb: 0, starting_xp: "1,419,539", starting_level: 602, gained_level: 498, next_level: "3,098,964", join_date: "Aug 16, 2023", siege_score: 0 },
  { name: "baby zerker2", clan_rank: "", ehb: 17, starting_xp: "66,179,622", starting_level: 1810, gained_level: 9, next_level: "3,216,086", join_date: "Jun 10, 2024", siege_score: 0 },
  { name: "iCHlLL", clan_rank: "", ehb: 412, starting_xp: "367,249,266", starting_level: 2200, gained_level: 4, next_level: "3,415,010", join_date: "Jun 18, 2024", siege_score: 0 },
  { name: "poopnutdrip", clan_rank: "", ehb: 18, starting_xp: "79,750,507", starting_level: 1712, gained_level: 17, next_level: "3,677,244", join_date: "Apr 09, 2025", siege_score: 0 },
  { name: "Sektor93", clan_rank: "", ehb: 173, starting_xp: "111,912,820", starting_level: 1834, gained_level: 3, next_level: "4,558,594", join_date: "Apr 11, 2025", siege_score: 0 },
  { name: "Tis Me Jay", clan_rank: "", ehb: 69, starting_xp: "83,835,686", starting_level: 1793, gained_level: 4, next_level: "296,143", join_date: "Mar 27, 2025", siege_score: 0 },
  { name: "Odd Bug", clan_rank: "", ehb: 5, starting_xp: "57,998,396", starting_level: 1747, gained_level: 10, next_level: "1,152,847", join_date: "Nov 17, 2024", siege_score: 0 },
  { name: "TehBaby", clan_rank: "", ehb: 29, starting_xp: "49,786,220", starting_level: 1793, gained_level: 4, next_level: "1,257,907", join_date: "Apr 14, 2025", siege_score: 0 },
  { name: "TM 36", clan_rank: "", ehb: 194, starting_xp: "320,040,470", starting_level: 2075, gained_level: 0, next_level: "1,624,483", join_date: "Apr 14, 2025", siege_score: 0 },
  { name: "beetlejuse", clan_rank: "", ehb: 0, starting_xp: "24,144,478", starting_level: 1579, gained_level: 14, next_level: "2,171,385", join_date: "Nov 02, 2024", siege_score: 0 },
  { name: "CuteBober", clan_rank: "", ehb: 0, starting_xp: "813,215", starting_level: 600, gained_level: 115, next_level: "2,394,366", join_date: "Feb 19, 2025", siege_score: 0 },
  { name: "Coxynormiss", clan_rank: "", ehb: 0, starting_xp: "97,013,305", starting_level: 1746, gained_level: 0, next_level: "2,953,061", join_date: "Jul 16, 2024", siege_score: 0 },
  { name: "Saint Ukiora", clan_rank: "", ehb: 16, starting_xp: "132,252,988", starting_level: 1892, gained_level: 1, next_level: "2,960,723", join_date: "Oct 14, 2024", siege_score: 0 },
  { name: "sefe", clan_rank: "", ehb: 65, starting_xp: "96,350,941", starting_level: 1773, gained_level: 0, next_level: "2,999,999", join_date: "Oct 27, 2024", siege_score: 0 },
  { name: "Nebutye", clan_rank: "", ehb: 139, starting_xp: "213,363,349", starting_level: 2061, gained_level: 0, next_level: "2,999,999", join_date: "Apr 09, 2025", siege_score: 0 }
];

// Parse numeric values for all players
const parsedPlayers = legacyPlayers.map(player => ({
  ...player,
  starting_xp: parseNumber(player.first_xp),
  starting_level: player.first_lvl,
  siege_score: player.siege_score || 0, // Default to 0 if not provided
  join_date: parseJoinDate(player.join_date)
}));

async function importLegacyData() {
  console.log(`Starting import of ${parsedPlayers.length} legacy players...`);
  
  let updated = 0;
  let notFound = 0;
  let created = 0;
  let errors = 0;
  const notFoundList = [];
  
  for (const player of parsedPlayers) {
    try {
      console.log(`Processing ${player.name}...`);
      
      // First try to find the player by exact name match
      let { data: memberData, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .ilike('name', player.name)
        .limit(1);
      
      // If not found by name, try to find by similar name (case insensitive, partial match)
      if ((!memberData || memberData.length === 0) && player.name.includes(' ')) {
        // Try with first part of name
        const firstName = player.name.split(' ')[0];
        console.log(`  Trying partial match with ${firstName}...`);
        
        ({ data: memberData, error: fetchError } = await supabase
          .from('members')
          .select('*')
          .ilike('name', `%${firstName}%`)
          .limit(1));
      }
      
      if (fetchError) {
        console.error(`  Error fetching ${player.name}:`, fetchError);
        errors++;
        continue;
      }
      
      if (!memberData || memberData.length === 0) {
        console.warn(`  Player not found: ${player.name}`);
        notFoundList.push(player.name);
        notFound++;
        
        // Ask if we should try to create this player via WOM API
        console.log(`  Would need WOM data to add this player. Skipping for now.`);
        continue;
      }
      
      // Found the player, now update with legacy information
      const member = memberData[0];
      
      const updateData = {};
      
      // Only update starting_xp if it's null or 0 in the database
      if (player.starting_xp && (!member.starting_xp || member.starting_xp === 0)) {
        updateData.starting_xp = player.starting_xp;
      }
      
      // Only update starting_level if it's null or 0 in the database
      if (player.starting_level && (!member.starting_level || member.starting_level === 0)) {
        updateData.starting_level = player.starting_level;
      }
      
      // Only set join_date if it's valid and not already set or if the legacy date is earlier
      if (player.join_date && (!member.join_date || new Date(player.join_date) < new Date(member.join_date))) {
        updateData.join_date = player.join_date;
      }
      
      // Only update siege_score if it's in the data and the member doesn't have a score yet
      if (typeof player.siege_score === 'number' && (!member.siege_score && member.siege_score !== 0)) {
        updateData.siege_score = player.siege_score;
      }
      
      // Only perform update if we have data to update
      if (Object.keys(updateData).length > 0) {
        console.log(`  Updating ${member.name} with:`, updateData);
        
        const { error: updateError } = await supabase
          .from("members")
          .update(updateData)
          .eq("wom_id", member.wom_id);
        
        if (updateError) {
          console.error(`  Error updating ${member.name}:`, updateError);
          errors++;
        } else {
          console.log(`  ✓ Successfully updated ${member.name}`);
          updated++;
        }
      } else {
        console.log(`  ℹ️ No updates needed for ${member.name}`);
      }
      
    } catch (err) {
      console.error(`Error processing ${player.name}:`, err);
      errors++;
    }
  }
  
  console.log("\nImport Summary:");
  console.log(`- Players processed: ${parsedPlayers.length}`);
  console.log(`- Players updated: ${updated}`);
  console.log(`- Players not found: ${notFound}`);
  console.log(`- Players created: ${created}`);
  console.log(`- Errors: ${errors}`);
  
  if (notFoundList.length > 0) {
    console.log("\nPlayers not found in database:");
    notFoundList.forEach(name => console.log(`- ${name}`));
    
    console.log("\nTo add these players, consider updating their WOM usernames in the script");
    console.log("or manually adding them to your database.");
  }
}

// Run the import
importLegacyData()
  .then(() => {
    console.log('Import completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
