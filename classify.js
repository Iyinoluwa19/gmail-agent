require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES = ['urgent', 'needs_reply', 'newsletter', 'spam', 'fyi'];

const SYSTEM_PROMPT = `You are an email triage assistant. Given an email, classify it and decide if it needs a reply.

Respond with ONLY a JSON object, no markdown fences, no preamble, in this exact shape:
{
  "category": one of "urgent" | "needs_reply" | "newsletter" | "spam" | "fyi",
  "summary": "one sentence summary of what this email is about",
  "needs_reply": true or false,
  "draft_reply": "a short, appropriate draft reply in the sender's tone, or null if needs_reply is false"
}

Guidelines:
- "urgent": time-sensitive, needs action soon (deadlines, client issues, something broken)
- "needs_reply": a normal email expecting a response, not time-critical
- "newsletter": bulk/marketing/subscription content
- "spam": unsolicited, suspicious, or irrelevant junk
- "fyi": informational, no response needed (receipts, notifications, CCs)
- Keep draft_reply brief and professional, matching how a busy person would actually reply
- If unsure between urgent and needs_reply, prefer needs_reply unless there's a clear deadline or crisis`;

async function classifyEmail(email) {
  const userMessage = `From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}

${email.body}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  // Strip stray markdown fences just in case
  const cleaned = text.replace(/^```json\s*|```$/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!CATEGORIES.includes(parsed.category)) {
      parsed.category = 'fyi';
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse classification response:', cleaned);
    return {
      category: 'fyi',
      summary: email.snippet,
      needs_reply: false,
      draft_reply: null,
    };
  }
}

module.exports = { classifyEmail, CATEGORIES };
