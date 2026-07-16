const fs = require('fs');
const { getGmailClient } = require('./gmail-client');
const { parseEmail } = require('./email-parser');
const { classifyEmail } = require('./classify');
const { applyLabel } = require('./labels');
const { createDraftReply } = require('./drafts');

const PROCESSED_FILE = 'processed.json';

function loadProcessedIds() {
  if (!fs.existsSync(PROCESSED_FILE)) return new Set();
  return new Set(JSON.parse(fs.readFileSync(PROCESSED_FILE)));
}

function saveProcessedIds(idSet) {
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify([...idSet], null, 2));
}

async function main() {
  const gmail = getGmailClient();
  const processed = loadProcessedIds();

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 20,
    labelIds: ['INBOX', 'UNREAD'],
  });

  const messages = listRes.data.messages || [];
  const newMessages = messages.filter((m) => !processed.has(m.id));

  if (newMessages.length === 0) {
    console.log('No new unread emails to process.');
    return;
  }

  console.log(`Processing ${newMessages.length} new email(s)...\n`);

  const results = [];

  for (const msg of newMessages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const email = parseEmail(full.data);
    const classification = await classifyEmail(email);

    await applyLabel(gmail, msg.id, classification.category);

    let draftCreated = false;
    if (classification.needs_reply && classification.draft_reply) {
      await createDraftReply(gmail, full.data, classification.draft_reply);
      draftCreated = true;
    }

    processed.add(msg.id);

    results.push({
      from: email.from,
      subject: email.subject,
      category: classification.category,
      summary: classification.summary,
      draftCreated,
    });

    console.log('---------------------------------------');
    console.log(`From:     ${email.from}`);
    console.log(`Subject:  ${email.subject}`);
    console.log(`Category: ${classification.category}`);
    console.log(`Summary:  ${classification.summary}`);
    if (draftCreated) console.log('Draft reply created in Gmail.');
  }

  console.log('---------------------------------------\n');
  console.log(`Done. Processed ${results.length} email(s).`);

  const urgentCount = results.filter((r) => r.category === 'urgent').length;
  const draftCount = results.filter((r) => r.draftCreated).length;
  console.log(`Urgent: ${urgentCount} | Drafts created: ${draftCount}`);

  saveProcessedIds(processed);
}

main().catch((err) => {
  console.error('Error processing inbox:', err.message);
  process.exit(1);
});
