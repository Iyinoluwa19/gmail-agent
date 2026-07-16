const { getGmailClient } = require('./gmail-client');

function getHeader(headers, name) {
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '(none)';
}

async function main() {
  const gmail = getGmailClient();

  // 1. List the 10 most recent message IDs in the inbox
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 10,
    labelIds: ['INBOX'],
  });

  const messages = listRes.data.messages || [];

  if (messages.length === 0) {
    console.log('No messages found in inbox.');
    return;
  }

  console.log(`\nFound ${messages.length} messages. Fetching details...\n`);

  // 2. For each message ID, fetch metadata (subject, from, snippet)
  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    });

    const headers = detail.data.payload.headers;
    const subject = getHeader(headers, 'Subject');
    const from = getHeader(headers, 'From');
    const date = getHeader(headers, 'Date');
    const snippet = detail.data.snippet;

    console.log('---------------------------------------');
    console.log(`From:    ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`Date:    ${date}`);
    console.log(`Snippet: ${snippet}`);
  }
  console.log('---------------------------------------\n');
}

main().catch((err) => {
  console.error('Error fetching messages:', err.message);
  process.exit(1);
});
