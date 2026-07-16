require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');

function getGmailClient() {
  if (!fs.existsSync('token.json')) {
    throw new Error(
      'token.json not found. Run get-auth-url.js then exchange-code.js first.'
    );
  }

  const tokens = JSON.parse(fs.readFileSync('token.json'));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  // Persist refreshed tokens automatically so we don't have to redo OAuth
  oauth2Client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    fs.writeFileSync('token.json', JSON.stringify(merged, null, 2));
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

module.exports = { getGmailClient };
