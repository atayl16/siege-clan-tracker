const fs = require("fs");
const csv = require("csv-parser");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Path to the CSV file
const csvFilePath = "./data/members.csv";

async function importCSV() {
  const rows = [];
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {
      console.log(`Read ${rows.length} rows from CSV file.`);
      try {
        const { data, error } = await supabase.from("members").insert(rows);
        if (error) throw error;
        console.log("Data imported successfully:", data);
      } catch (err) {
        console.error("Error importing data:", err);
      }
    });
}

importCSV();
