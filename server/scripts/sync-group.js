const fetch = require("node-fetch");
const db = require("../db");

const WOM_GROUP_ID = process.env.WOM_GROUP_ID;

async function syncGroup() {
  const response = await fetch(
    `https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}`
  );
  const { members } = await response.json();

  members.forEach((member) => {
    db.run(
      `
      INSERT OR REPLACE INTO members (wom_id, username) 
      VALUES (?, ?)
      ON CONFLICT(wom_id) DO UPDATE SET
      username = excluded.username
    `,
      [member.id, member.username]
    );
  });

  console.log(`Synced ${members.length} members`);
}

syncGroup();
