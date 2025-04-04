// server/scripts/import-csv.js
const fs = require("fs");
const csv = require("csv-parser");
const sqlite3 = require("sqlite3").verbose();

// Define rank classifications
const SKILLER_RANKS = new Set([
  "opal",
  "sapphire",
  "emerald",
  "ruby",
  "diamond",
  "dragonstone",
  "onyx",
  "zenyte",
]);
const FIGHTER_RANKS = new Set([
  "mentor",
  "prefect",
  "leader",
  "supervisor",
  "superior",
  "executive",
  "senator",
  "monarch",
  "tzkal",
]);

const CSV_COLUMNS = ["name", "initial_xp", "current_xp", "siege_score", "rank"];

const db = new sqlite3.Database("./siege.db");

db.serialize(() => {
  db.run("DELETE FROM members");

  fs.createReadStream("./data/members.csv")
    .pipe(
      csv({
        mapValues: ({ header, value }) => {
          // Only keep specified columns
          return CSV_COLUMNS.includes(header) ? value : null;
        },
      })
    )
    .on("data", (row) => {
      // Clean row data
      const cleanRow = {
        name: row.name,
        initial_xp: parseInt(row.initial_xp),
        current_xp: parseInt(row.current_xp),
        siege_score: parseInt(row.siege_score),
        rank: row.rank.toLowerCase(),
      };
      const rank = row.rank.toLowerCase();
      let member_type = "skiller";

      if (FIGHTER_RANKS.has(rank)) {
        member_type = "fighter";
      } else if (!SKILLER_RANKS.has(rank)) {
        console.warn(
          `Unknown rank ${rank} for ${row.name}, defaulting to skiller`
        );
      }

      db.run(
        `INSERT INTO members (
          username, 
          initial_xp, 
          current_xp, 
          siege_score,
          member_type,
          ${member_type}_rank
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          row.name,
          parseInt(row.initial_xp),
          parseInt(row.current_xp),
          parseInt(row.siege_score),
          member_type,
          rank,
        ]
      );
    })
    .on("end", () => {
      console.log("CSV data imported with automatic member type detection");
      db.close();
    });
});
