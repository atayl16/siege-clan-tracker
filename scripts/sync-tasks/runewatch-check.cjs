const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Main function to check RuneWatch
async function checkRunewatch() {
  try {
    console.log("🔍 Starting RuneWatch check...");
    
    // Log environment variables status (without revealing values)
    console.log('Environment check:');
    console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✓' : 'Missing ❌'}`);
    console.log(`- DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL ? 'Set ✓' : 'Missing ❌'}`);
    
    // Get active clan members from database
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('wom_id, name, wom_name');
      
    if (membersError) throw membersError;
    console.log(`Found ${members.length} clan members to check`);
    
    // Scrape RuneWatch reported usernames
    const reportedUsernames = await fetchRunewatchUsernames();
    console.log(`Found ${reportedUsernames.size} reported usernames on RuneWatch`);
    
    // Check for matches
    const matchedMembers = [];
    const newlyReportedMembers = [];
    
    for (const member of members) {
      // Use both name and wom_name for checking
      const memberNames = [
        member.name?.toLowerCase().replace(/\s+/g, ''),
        member.wom_name?.toLowerCase().replace(/\s+/g, '')
      ].filter(Boolean);
      
      // Check if any variant of the name is reported
      const isReported = memberNames.some(name => 
        reportedUsernames.has(name) || 
        [...reportedUsernames].some(reported => 
          reported.replace(/\s+/g, '') === name
        )
      );
      
      if (isReported) {
        console.log(`Match found: ${member.name || member.wom_name}`);
        
        // Check if member was already reported
        const { data: existingMember } = await supabase
          .from('members')
          .select('runewatch_reported, runewatch_whitelisted')
          .eq('wom_id', member.wom_id)
          .single();
          
        const wasAlreadyReported = existingMember?.runewatch_reported;
        const isWhitelisted = existingMember?.runewatch_whitelisted;
        
        // Update the member in database
        if (!isWhitelisted) {
          const { error: updateError } = await supabase
            .from('members')
            .update({ runewatch_reported: true })
            .eq('wom_id', member.wom_id);
            
          if (updateError) console.error(`Error updating member ${member.name}:`, updateError);
          
          // Add to matched list for response
          matchedMembers.push(member.name || member.wom_name);
          
          // Add to newly reported list for Discord notification
          if (!wasAlreadyReported && !isWhitelisted) {
            newlyReportedMembers.push(member.name || member.wom_name);
          }
        }
      }
    }
    
    // Send Discord notification for newly reported members
    if (newlyReportedMembers.length > 0) {
      await sendDiscordNotification(newlyReportedMembers);
    }
    
    return {
      success: true,
      reportedCount: reportedUsernames.size,
      matchedMembers,
      newlyReportedMembers
    };
  } catch (error) {
    console.error("❌ Error in RuneWatch check:", error);
    throw error;
  }
}

async function fetchRunewatchUsernames() {
  // Check cache first (use temp dir which is available in both Netlify and GitHub)
  const cacheFile = path.join(require('os').tmpdir(), 'runewatch_cache.json');
  const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  try {
    // Check if cache file exists and is recent
    const stats = await fs.stat(cacheFile).catch(() => null);
    if (stats && (Date.now() - stats.mtime.getTime() < cacheExpiry)) {
      console.log(`Using cached RuneWatch data (${Math.round((Date.now() - stats.mtime.getTime()) / 3600000)} hours old)`);
      const data = await fs.readFile(cacheFile, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (error) {
    console.log("Cache check failed:", error.message);
  }
  
  // No valid cache, scrape the website
  console.log("Fetching fresh RuneWatch data...");
  const reportedUsers = new Set();
  
  try {
    const response = await axios.get('https://runewatch.com/cases/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    // Parse the HTML
    const $ = cheerio.load(response.data);
    
    // Find and extract usernames from table
    $('tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 3) {
        const username = $(cells[1]).text().trim();
        
        // Validate it looks like a RuneScape name
        if (username.match(/^[a-zA-Z0-9_ ]{1,12}$/)) {
          reportedUsers.add(username.toLowerCase());
          
          // Also add version without spaces
          if (username.includes(' ')) {
            reportedUsers.add(username.toLowerCase().replace(/\s+/g, ''));
          }
        }
      }
    });
    
    // If no usernames found in table, try text extraction as fallback
    if (reportedUsers.size === 0) {
      const bodyText = $('body').text();
      
      // Look for RuneWatch case pattern
      const casePattern = /#[a-f0-9]{6,7}\s+([a-zA-Z0-9_\s]{3,16})\s+\d{2}-\d{2}-\d{4}/gi;
      let match;
      while ((match = casePattern.exec(bodyText)) !== null) {
        const name = match[1].trim();
        reportedUsers.add(name.toLowerCase());
        
        // Also add version without spaces
        if (name.includes(' ')) {
          reportedUsers.add(name.toLowerCase().replace(/\s+/g, ''));
        }
      }
    }
    
    // Cache the results
    await fs.mkdir(path.dirname(cacheFile), { recursive: true }).catch(() => {});
    await fs.writeFile(cacheFile, JSON.stringify([...reportedUsers]));
    
    console.log(`Scraped ${reportedUsers.size} reported users from RuneWatch`);
    return reportedUsers;
    
  } catch (error) {
    console.error("Error scraping RuneWatch:", error);
    throw new Error(`Failed to fetch RuneWatch data: ${error.message}`);
  }
}

async function sendDiscordNotification(reportedMembers) {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.log("No Discord webhook URL configured");
    return;
  }
  
  try {
    const message = {
      content: "🚨 **RuneWatch Alert: Reported Players Found**",
      embeds: [{
        title: "Reported Players in Clan",
        description: "The following clan members have been found on RuneWatch:",
        color: 15158332, // Red color
        fields: [{
          name: "Players",
          value: reportedMembers.map(name => `• ${name}`).join('\n')
        }, {
          name: "Action Required",
          value: "Please review these players on the Admin Dashboard"
        }],
        footer: {
          text: `Generated on ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}`
        }
      }]
    };
    
    await axios.post(process.env.DISCORD_WEBHOOK_URL, message);
    console.log("Discord notification sent successfully!");
    
  } catch (error) {
    console.error("Error sending Discord notification:", error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting RuneWatch check as standalone script');
  checkRunewatch()
    .then(results => {
      console.log('✅ RuneWatch check completed successfully');
      console.log(`- Total reported accounts checked: ${results.reportedCount}`);
      console.log(`- Matched members in clan: ${results.matchedMembers.length}`);
      console.log(`- Newly reported members: ${results.newlyReportedMembers.length}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ RuneWatch check failed:', err);
      process.exit(1);
    });
}

// Export the function for potential reuse
module.exports = { checkRunewatch };
