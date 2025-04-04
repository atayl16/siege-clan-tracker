const fetch = require("node-fetch");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Initialize database connection
const db = new sqlite3.Database(path.resolve(__dirname, "../siege.db"));

const WOM_GROUP_ID = process.env.WOM_GROUP_ID;

async function syncGroup() {
  try {
    const response = await fetch(
      `https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}`
    );
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    
    const { members } = await response.json();

    members.forEach((member) => {
      db.run(
        `
        INSERT OR IGNORE INTO members (wom_id, username, wom_name) 
        VALUES (?, ?, ?)
        ON CONFLICT(wom_id) DO UPDATE SET
        username = excluded.username,
        wom_name = excluded.wom_name
      `,
        [member.id, member.username, member.displayName]
      );
    });

    console.log(`Synced ${members.length} members`);
  } catch (error) {
    console.error("Error syncing group:", error);
  } finally {
    db.close();
  }
}

syncGroup();
