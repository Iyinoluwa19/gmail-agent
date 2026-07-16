function getHeader(headers, name) {
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '(none)';
}

// Gmail messages can be multipart (text/plain, text/html, attachments, nested
// multipart/alternative, etc). This walks the tree and grabs the first
// text/plain part it finds. Falls back to snippet if nothing usable.
function extractPlainText(payload) {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }

  return '';
}

function parseEmail(message) {
  const headers = message.payload.headers;
  const subject = getHeader(headers, 'Subject');
  const from = getHeader(headers, 'From');
  const date = getHeader(headers, 'Date');
  const to = getHeader(headers, 'To');

  let body = extractPlainText(message.payload);
  if (!body) body = message.snippet || '';

  // Truncate very long emails to keep classification calls cheap/fast
  const MAX_CHARS = 6000;
  if (body.length > MAX_CHARS) {
    body = body.slice(0, MAX_CHARS) + '\n...[truncated]';
  }

  return {
    id: message.id,
    threadId: message.threadId,
    subject,
    from,
    to,
    date,
    body,
    snippet: message.snippet,
  };
}

module.exports = { parseEmail, getHeader, extractPlainText };
