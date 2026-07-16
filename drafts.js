const { getHeader } = require('./email-parser');

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Extracts a clean "user@example.com" from a "Name <user@example.com>" header
function extractEmailAddress(fromHeader) {
  const match = fromHeader.match(/<(.+)>/);
  return match ? match[1] : fromHeader.trim();
}

async function createDraftReply(gmail, originalMessage, replyBody) {
  const headers = originalMessage.payload.headers;
  const originalFrom = getHeader(headers, 'From');
  const originalSubject = getHeader(headers, 'Subject');
  const messageIdHeader = getHeader(headers, 'Message-ID');

  const toAddress = extractEmailAddress(originalFrom);
  const subject = originalSubject.toLowerCase().startsWith('re:')
    ? originalSubject
    : `Re: ${originalSubject}`;

  const rawLines = [
    `To: ${toAddress}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${messageIdHeader}`,
    `References: ${messageIdHeader}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    replyBody,
  ];

  const raw = base64UrlEncode(rawLines.join('\r\n'));

  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw,
        threadId: originalMessage.threadId,
      },
    },
  });

  return draft.data;
}

module.exports = { createDraftReply };
