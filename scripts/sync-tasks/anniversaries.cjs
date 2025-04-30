/**
 * Clan Anniversary Notifications
 * Sends Discord notifications for clan members celebrating anniversaries today
 */
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('🎂 Checking for clan anniversaries...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get today's date in month-day format (MM-DD)
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  console.log(`Checking for anniversaries on ${month}-${day}`);
  
  // Use the exact RPC function without any additional selects
  const { data: members, error } = await supabase.rpc("get_todays_anniversaries");
  
  if (error) {
    console.error('RPC error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to query anniversaries: ${error.message}`);
  }
  
  console.log(`Found ${members?.length || 0} potential anniversaries.`);
  
  if (!members || members.length === 0) {
    console.log('No anniversaries found for today.');
    return;
  }
  
  // Calculate years for each member
  const anniversaries = members.map(member => {
    const joinDate = new Date(member.join_date);
    const years = today.getFullYear() - joinDate.getFullYear();
    
    // Only include if it's at least 1 year
    if (years >= 1) {
      return {
        ...member,
        years
      };
    }
    return null;
  }).filter(Boolean); // Remove null entries (members who joined less than a year ago)
  
  if (anniversaries.length === 0) {
    console.log('No anniversaries that are at least 1 year old.');
    return;
  }
  
  console.log(`Found ${anniversaries.length} member(s) with anniversaries today:`);
  console.log(anniversaries.map(a => `${a.name || a.wom_name} - ${a.years} years`).join(', '));
  
  // Get the webhook URL - prefer anniversary-specific URL if available
  const webhookUrl = process.env.DISCORD_ANNIVERSARY_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    throw new Error('No Discord webhook URL configured');
  }
  
  // Send notification(s)
  if (anniversaries.length > 1) {
    // Multiple anniversaries - group into one message
    await sendGroupAnniversaryMessage(webhookUrl, anniversaries);
    console.log(`Sent group anniversary notification for ${anniversaries.length} members.`);
  } else {
    // Single anniversary
    await sendSingleAnniversaryMessage(webhookUrl, anniversaries[0]);
    console.log(`Sent anniversary notification for ${anniversaries[0].name || anniversaries[0].wom_name}.`);
  }
}

async function sendSingleAnniversaryMessage(webhookUrl, member) {
  const message = {
    embeds: [
      {
        title: "🎉 Clan Anniversary! 🎉",
        description: `Congratulations to **${
          member.name || member.wom_name
        }** on ${member.years} ${
          member.years === 1 ? "year" : "years"
        } in the clan today!`,
        color: 15844367, // Gold color
        thumbnail: {
          url: "https://oldschool.runescape.wiki/images/Party_hat.png?12e2c",
        },
      },
    ],
  };
  
  console.log('Sending single anniversary message to Discord...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API returned ${response.status}: ${errorText}`);
    }
    
    console.log('Discord message sent successfully!');
    return response;
  } catch (error) {
    console.error('Error sending to Discord:', error);
    throw error;
  }
}

async function sendGroupAnniversaryMessage(webhookUrl, members) {
  // Format the list of members with their years
  const membersList = members.map(m => 
    `• **${m.name || m.wom_name}** - ${m.years} ${m.years === 1 ? 'year' : 'years'}`
  ).join('\n');
  
  const message = {
    embeds: [{
      title: 'Clan Anniversaries Today!',
      description: `Congratulations to our clan members celebrating anniversaries today:\n\n${membersList}`,
      color: 15844367, // Gold color
      thumbnail: {
        url: 'https://oldschool.runescape.wiki/images/Party_hat.png?12e2c'
      },
      author: {
        name: "Clan Celebration",
        icon_url: 'https://oldschool.runescape.wiki/images/Party_hat.png?12e2c'
      },
      footer: {
        text: `Celebrate with them in-game!`
      }
    }]
  };
  
  console.log('Sending group anniversary message to Discord...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API returned ${response.status}: ${errorText}`);
    }
    
    console.log('Discord message sent successfully!');
    return response;
  } catch (error) {
    console.error('Error sending to Discord:', error);
    throw error;
  }
}

// Run the script
main()
  .then(() => {
    console.log('Anniversary check completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during anniversary check:', error);
    process.exit(1);
  });
