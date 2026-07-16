require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');

const code = process.argv[2];

if (!code) {
  console.error('Usage: node exchange-code.js "PASTE_CODE_HERE"');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function main() {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync('token.json', JSON.stringify(tokens, null, 2));
    console.log('\nSuccess. Tokens saved to token.json');
    console.log('Keep this file secret — it grants access to your Gmail.\n');
  } catch (err) {
    console.error('Failed to exchange code:', err.message);
    process.exit(1);
  }
}

main();
