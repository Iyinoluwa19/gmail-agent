const LABEL_NAMES = {
  urgent: 'Agent/Urgent',
  needs_reply: 'Agent/Needs Reply',
  newsletter: 'Agent/Newsletter',
  spam: 'Agent/Spam',
  fyi: 'Agent/FYI',
};

// Cache label name -> id for the lifetime of the process
let labelCache = null;

async function ensureLabels(gmail) {
  if (labelCache) return labelCache;

  const existing = await gmail.users.labels.list({ userId: 'me' });
  const existingByName = {};
  for (const label of existing.data.labels) {
    existingByName[label.name] = label.id;
  }

  labelCache = {};

  for (const [key, name] of Object.entries(LABEL_NAMES)) {
    if (existingByName[name]) {
      labelCache[key] = existingByName[name];
      continue;
    }

    const created = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });
    labelCache[key] = created.data.id;
  }

  return labelCache;
}

async function applyLabel(gmail, messageId, category) {
  const labels = await ensureLabels(gmail);
  const labelId = labels[category];
  if (!labelId) return;

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
    },
  });
}

module.exports = { ensureLabels, applyLabel, LABEL_NAMES };
