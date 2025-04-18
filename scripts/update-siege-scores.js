const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Player siege scores from the provided ranking
const siegeScores = [
  { name: "FinPunisher", score: 19 },
  { name: "keop", score: 17 },
  { name: "irontomale", score: 15 },
  { name: "RenBoe", score: 15 },
  { name: "Im Duse", score: 14 },
  { name: "Miles", score: 14 },
  { name: "TheLastAesir", score: 12 },
  { name: "Dawn Summers", score: 10 },
  { name: "Karuu", score: 6 },
  { name: "cooter fest", score: 5 },
  { name: "K aura", score: 5 },
  { name: "ElJako98", score: 4 },
  { name: "God of GIM", score: 4 },
  { name: "Dan xo", score: 4 },
  { name: "Discodoris", score: 4 },
  { name: "Im Mr Bean", score: 4 },
  { name: "Avirace", score: 4 },
  { name: "Sapos", score: 4 },
  { name: "kushMpizza", score: 4 },
  { name: "MrBigSimp", score: 4 },
  { name: "lnventar", score: 4 },
  { name: "morrten", score: 4 },
  { name: "BigWilly xo", score: 2 },
  { name: "aimmoohh", score: 2 },
  { name: "Summ", score: 2 },
  { name: "Irn Matt", score: 2 },
  { name: "Atomicnight", score: 2 },
  { name: "rnoaf", score: 2 },
  { name: "Hezz", score: 2 },
  { name: "nieverip", score: 2 },
  { name: "Pirate Patch", score: 2 },
  { name: "SRC 14", score: 2 },
  { name: "Longus Dikus", score: 2 },
  { name: "CursedClover", score: 2 },
  { name: "choppinrocks", score: 2 },
  { name: "Versatonic", score: 2 },
  { name: "AAA420", score: 2 },
  { name: "fk uim god", score: 2 },
  { name: "cL I of Tea", score: 2 },
  { name: "87V", score: 2 },
  { name: "HotTomalee", score: 2 },
  { name: "AmazonPrimal", score: 2 },
  { name: "ArtyTheBoog", score: 2 },
  { name: "Regler", score: 2 },
  { name: "THR0B", score: 2 },
  { name: "Empty Brass", score: 2 },
  { name: "Saidin Rage", score: 2 },
  { name: "NysaRS", score: 2 },
  { name: "CuteBober", score: 2 },
  { name: "RoBo TriPz", score: 2 },
  { name: "resnesv2", score: 2 },
  { name: "Roinren", score: 2 },
  { name: "Val3nt1na", score: 2 },
  { name: "Wizard D an", score: 2 },
  { name: "Its Regler", score: 2 },
  { name: "ha kest", score: 2 },
  { name: "Zz Teare", score: 2 }
];

async function updateSiegeScores() {
  console.log('Starting siege score update process...');
  
  // Step 1: Reset all siege scores to 0
  console.log('Resetting all siege scores to 0...');
  const { error: resetError, count: resetCount } = await supabase
    .from('members')
    .update({ siege_score: 0 })
    .neq('siege_score', 0); // Only update records that don't already have 0
  
  if (resetError) {
    console.error('Error resetting siege scores:', resetError);
    return;
  }
  
  console.log(`Reset ${resetCount || 'all existing'} siege scores to 0`);
  
  // Step 2: Update scores from our list
  console.log(`Updating siege scores for ${siegeScores.length} players...`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const notFoundList = [];
  
  for (const player of siegeScores) {
    try {
      console.log(`Processing ${player.name}...`);
      
      // Try to find the player by exact name match
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
        continue;
      }
      
      // Found the player, now update the siege score
      const member = memberData[0];
      
      console.log(`  Updating ${member.name} with siege score: ${player.score}`);
      
      const { error: updateError } = await supabase
        .from("members")
        .update({ siege_score: player.score })
        .eq("wom_id", member.wom_id);
      
      if (updateError) {
        console.error(`  Error updating ${member.name}:`, updateError);
        errors++;
      } else {
        console.log(`  ✓ Successfully updated ${member.name}'s siege score to ${player.score}`);
        updated++;
      }
      
    } catch (err) {
      console.error(`Error processing ${player.name}:`, err);
      errors++;
    }
  }
  
  console.log("\nUpdate Summary:");
  console.log(`- Players processed: ${siegeScores.length}`);
  console.log(`- Players updated: ${updated}`);
  console.log(`- Players not found: ${notFound}`);
  console.log(`- Errors: ${errors}`);
  
  if (notFoundList.length > 0) {
    console.log("\nPlayers not found in database:");
    notFoundList.forEach(name => console.log(`- ${name}`));
  }
}

// Run the update
updateSiegeScores()
  .then(() => {
    console.log('Siege score update completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Update failed:', err);
    process.exit(1);
  });
