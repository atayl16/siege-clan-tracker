const fetch = require('node-fetch');
const { getCorsHeaders } = require('./_shared/cors');

exports.handler = async function(event, context) {
  // CORS headers for all responses with wildcard validation
  const corsHeaders = getCorsHeaders({
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });

  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Parse request body with error handling
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { type, memberId, memberName, years } = body;

    if (!type || !memberId || !memberName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    // Discord webhook URL from environment variable
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Discord webhook URL not configured' })
      };
    }

    // Create webhook message based on type
    let message = {};

    if (type === 'anniversary') {
      message = {
        embeds: [{
          title: '🎉 Clan Anniversary! 🎉',
          description: `Congratulations to **${memberName}** on ${years} ${years === 1 ? 'year' : 'years'} in the clan today!`,
          color: 15844367, // Gold color
          thumbnail: {
            url: 'https://oldschool.runescape.wiki/images/Party_hat.png?12e2c'
          },
          footer: {
            text: `Celebrate with them in-game! • Member ID: ${memberId}`
          }
        }]
      };
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid message type' })
      };
    }

    // For local development, just return success without actually sending
    if (process.env.NODE_ENV === 'development') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Development mode - message not actually sent',
          data: message
        })
      };
    }

    // Send to Discord
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Discord responded with status: ${response.status}`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: 'Sent to Discord' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};
