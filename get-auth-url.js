require('dotenv').config();
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes we need:
// gmail.readonly  -> read emails
// gmail.modify    -> apply labels, create drafts (does NOT allow permanent delete)
// gmail.compose   -> create/send drafts
const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline', // needed to get a refresh_token back
  prompt: 'consent',      // forces refresh_token even on repeat runs
  scope: scopes,
});

console.log('\nOpen this URL in your browser, sign in, and approve access:\n');
console.log(url);
console.log('\nAfter approving, Google will redirect you to a URL like:');
console.log('http://localhost:3000/oauth2callback?code=XXXXX\n');
console.log('Copy the value of the "code" param and run:');
console.log('  node exchange-code.js "PASTE_CODE_HERE"\n');
