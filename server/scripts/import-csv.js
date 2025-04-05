const fs = require("fs");
const csv = require("csv-parser");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

// Update to the correct CSV path
const csvFilePath = path.join(__dirname, "../data/members.csv");
console.log(`Looking for CSV file at: ${csvFilePath}`);

// Check if file exists
if (!fs.existsSync(csvFilePath)) {
  console.error(`File not found: ${csvFilePath}`);
  console.log("Please ensure your CSV file is at: server/data/members.csv");
  process.exit(1);
}

const results = [];

// Helper function to safely parse integers/bigints
function safeParseInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

async function importToSupabase() {
  console.log("Reading CSV file...");
  
  // Read the CSV file
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (data) => {
      // Skip records with missing name or wom_id
      if (!data.name || !data.wom_id) {
        console.warn("Skipping record with missing required fields:", data);
        return;
      }
      
      // Map data to match our table schema exactly
      const member = {
        name: data.name,
        lvl: safeParseInt(data.lvl),
        xp: safeParseInt(data.xp),
        title: data.title || null,
        rank: data.rank || null,
        current_lvl: safeParseInt(data.current_lvl),
        current_xp: safeParseInt(data.current_xp),
        first_xp: safeParseInt(data.first_xp) || null, // Handle blank values explicitly
        first_lvl: safeParseInt(data.first_lvl) || null, // Handle blank values explicitly
        gained_xp: safeParseInt(data.gained_xp),
        wom_id: safeParseInt(data.wom_id),
        wom_name: data.wom_name || null,
        siege_score: safeParseInt(data.siege_score),
        combat: safeParseInt(data.combat),
        build: data.build || null,
        ehb: safeParseInt(data.ehb),
        womrole: data.womrole || null
      };
      
      // Skip records without wom_id after parsing
      if (member.wom_id === null) {
        console.warn(`Skipping record with invalid wom_id: ${data.name}`);
        return;
      }
      
      results.push(member);
    })
    .on("end", async () => {
      console.log(`Read ${results.length} valid members from CSV.`);
      
      if (results.length === 0) {
        console.log("No valid members found in CSV file.");
        return;
      }
      
      // Deduplicate by wom_id
      const uniqueMembers = {};
      results.forEach(member => {
        uniqueMembers[member.wom_id] = member;
      });
      
      const dedupedResults = Object.values(uniqueMembers);
      console.log(`Deduplicated to ${dedupedResults.length} unique members.`);
      
      // Insert data in smaller batches
      const BATCH_SIZE = 25; // Smaller batches for better reliability
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < dedupedResults.length; i += BATCH_SIZE) {
        const batch = dedupedResults.slice(i, i + BATCH_SIZE);
        console.log(`Upserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(dedupedResults.length/BATCH_SIZE)}...`);
        
        try {
          const { data, error } = await supabase
            .from('members')
            .upsert(batch, { 
              onConflict: 'wom_id',
              ignoreDuplicates: false
            });
            
          if (error) {
            console.error("Error upserting batch:", error);
            errorCount++;
            
            // Try inserting one by one to isolate problematic records
            console.log("Attempting individual inserts for this batch...");
            for (const record of batch) {
              try {
                const { error: singleError } = await supabase
                  .from('members')
                  .upsert([record], { onConflict: 'wom_id' });
                  
                if (singleError) {
                  console.error(`Error with record ${record.name} (${record.wom_id}):`, singleError);
                } else {
                  successCount++;
                  console.log(`Successfully inserted: ${record.name}`);
                }
              } catch (singleErr) {
                console.error(`Exception with record ${record.name}:`, singleErr);
              }
            }
          } else {
            console.log(`Successfully upserted ${batch.length} members.`);
            successCount += batch.length;
          }
        } catch (err) {
          console.error("Exception during batch upsert:", err);
          errorCount++;
        }
      }
      
      console.log(`Import completed! Successfully imported ${successCount} members. Failed batches: ${errorCount}`);
    });
}

importToSupabase();
