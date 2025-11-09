import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

async function sendAnniversaries() {
  console.log('Running scheduled anniversary check...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get today's date in the format stored in your database
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log(`Checking for anniversaries on month-day: ${monthDay}`);
    
    // Query members with anniversaries today
    const { data: members, error } = await supabase
      .from('members')
      .select('wom_id, name, wom_name, join_date')
      .filter('join_date::text', 'ilike', `%-${monthDay}`);
    
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }
    
    if (!members || members.length === 0) {
      console.log('No anniversaries today.');
      return { success: true, message: 'No anniversaries today' };
    }
    
    // Calculate years for each member
    const anniversaries = members.map(member => {
      const joinDate = new Date(member.join_date);

      // Verify the anniversary date has actually occurred
      // Check if today's month and day match the join date's month and day
      const joinMonthDay = `${String(joinDate.getMonth() + 1).padStart(2, '0')}-${String(joinDate.getDate()).padStart(2, '0')}`;
      const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // The database query already filters by month-day, but we verify here for safety
      if (joinMonthDay !== todayMonthDay) {
        return null;
      }

      // Calculate years - safe now because we know it's the same month/day
      const years = today.getFullYear() - joinDate.getFullYear();

      // Only include if it's at least 1 year
      return years >= 1 ? {
        ...member,
        years
      } : null;
    }).filter(Boolean);
    
    if (anniversaries.length === 0) {
      console.log('No anniversaries of at least 1 year today.');
      return { success: true, message: 'No anniversaries of at least 1 year today' };
    }
    
    console.log(`Found ${anniversaries.length} anniversaries to send`);
    
    // Get Discord webhook URL
    const webhookUrl = process.env.DISCORD_ANNIVERSARY_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }
    
    // Group messages or send individual ones
    if (anniversaries.length > 1) {
      // Multiple anniversaries - group into one message
      await sendGroupAnniversaryMessage(webhookUrl, anniversaries);
    } else {
      // Single anniversary
      await sendSingleAnniversaryMessage(webhookUrl, anniversaries[0]);
    }
    
    console.log(`Successfully sent ${anniversaries.length} anniversary notifications`);
    return { success: true, count: anniversaries.length };
  } catch (error) {
    console.error('Error processing anniversaries:', error);
    throw error;
  }
}

async function sendSingleAnniversaryMessage(webhookUrl, member) {
  const message = {
    embeds: [{
      title: 'Clan Anniversary!',
      description: `Congratulations to **${member.name || member.wom_name}** on ${member.years} ${member.years === 1 ? 'year' : 'years'} in the clan today!`,
      color: 15844367, // Gold color
      thumbnail: {
        url: 'https://oldschool.runescape.wiki/images/Party_hat.png?12e2c'
      },
      author: {
        name: "Clan Celebration",
        icon_url: 'https://oldschool.runescape.wiki/images/Party_hat.png?12e2c'
      },
      footer: {
        text: `Celebrate with them in-game! • Member ID: ${member.wom_id}`
      }
    }]
  };
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  
  if (!response.ok) {
    throw new Error(`Discord API returned ${response.status}`);
  }
  
  return response;
}

async function sendGroupAnniversaryMessage(webhookUrl, members) {
  // Format the list of members
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
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  
  if (!response.ok) {
    throw new Error(`Discord API returned ${response.status}`);
  }
  
  return response;
}

// Execute if this file is run directly
if (require.main === module) {
  sendAnniversaries()
    .then(result => console.log('Result:', result))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { sendAnniversaries };
