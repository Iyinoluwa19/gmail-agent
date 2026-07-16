# Gmail Agent — Step 1: OAuth2 Setup

Goal of this step: get a script running that can authenticate with your Gmail
and print your last 10 emails. Everything after this (classification,
drafting, WhatsApp bot) builds on top of this working.

## 1. Create a Google Cloud project + OAuth credentials

1. Go to https://console.cloud.google.com/
2. Top left → click the project dropdown → **New Project**. Name it
   something like `gmail-agent`. Create it.
3. With that project selected, go to **APIs & Services → Library**.
   Search "Gmail API" → click it → **Enable**.
4. Go to **APIs & Services → OAuth consent screen**.
   - User Type: **External** (unless you have a Google Workspace org)
   - Fill in app name (e.g. "Gmail Agent"), your email for support/dev contact
   - On the "Scopes" step you can skip adding scopes here — we set them in code
   - On "Test users" — add your own Gmail address. This matters: while the
     app is unpublished, only test users you list can authorize it.
   - Save through to the end.
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: anything
   - Under **Authorized redirect URIs**, add:
     `http://localhost:3000/oauth2callback`
   - Click Create. Copy the **Client ID** and **Client Secret** shown.

## 2. Configure this project

```bash
cd gmail-agent
cp .env.example .env
```

Open `.env` and paste in your Client ID and Client Secret:

```
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

## 3. Run the auth flow (one-time)

```bash
node get-auth-url.js
```

This prints a URL. Open it in your browser, sign in with the Gmail account
you added as a test user, and approve access. Google will warn "Google
hasn't verified this app" — click **Advanced → Go to gmail-agent (unsafe)**.
This is expected since the app isn't published; it's still safe because
it's your own app and only you (as test user) can use it.

After approving, your browser will try to load
`http://localhost:3000/oauth2callback?code=XXXXX` and show a "site can't be
reached" error — **that's fine**, we don't have a server running there.
Just copy the `code` value from the URL bar.

Then run:

```bash
node exchange-code.js "PASTE_THE_CODE_HERE"
```

This saves a `token.json` file with your access + refresh tokens.
**Keep `token.json` private** — add it to `.gitignore`, don't commit it.

## 4. Test it

```bash
node test-fetch.js
```

You should see your last 10 inbox emails (from, subject, date, snippet)
printed to the terminal.

## Troubleshooting

- **"redirect_uri_mismatch"** — the redirect URI in `.env` must exactly
  match what you added in the Google Cloud Console credentials screen.
- **"access_denied"** — make sure your Gmail address is added as a test
  user on the OAuth consent screen.
- **invalid_grant on exchange-code.js** — auth codes expire fast (minutes)
  and are single-use. Re-run `get-auth-url.js` and get a fresh code if it's
  been a while.

## Next steps (once this works)

1. ✅ Feed each email into Claude for classification (urgent / needs-reply /
   newsletter / spam / FYI) + a one-line summary
2. ✅ Auto-apply Gmail labels based on classification
3. ✅ Generate draft replies for anything flagged "needs-reply", saved as
   Gmail drafts (never auto-sent)
4. Wire up the WhatsApp bot layer so you control it all via chat commands

---

# Step 2: Classification, labeling, and draft replies

This step adds the actual "agent" behavior: reading unread emails,
classifying them with Claude, applying Gmail labels, and drafting replies
for anything that needs one.

## What it does

Running `node process-inbox.js`:

1. Fetches your unread inbox emails (up to 20 at a time)
2. Skips any it's already processed before (tracked in `processed.json`)
3. Sends each one to Claude for classification into one of:
   `urgent`, `needs_reply`, `newsletter`, `spam`, `fyi`
4. Creates matching Gmail labels automatically on first run
   (`Agent/Urgent`, `Agent/Needs Reply`, etc.) and applies them
5. For anything classified `needs_reply`, creates a **draft** reply in
   Gmail — properly threaded (In-Reply-To / References headers) — but
   never sends it automatically. You review and hit send yourself.
6. Prints a summary to the terminal

## Setup

Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Install the new dependency (already in package.json if you re-download,
otherwise):

```bash
npm install @anthropic-ai/sdk
```

## Run it

```bash
node process-inbox.js
```

Check your Gmail — you should see new labels under "Agent/..." applied to
your unread emails, and draft replies waiting in your Drafts folder for
anything that needed a response.

## Files added in this step

- `classify.js` — sends email content to Claude, gets back category +
  summary + draft reply as structured JSON
- `labels.js` — creates/finds the `Agent/*` Gmail labels and applies them
- `drafts.js` — builds a properly-threaded MIME reply and saves it as a
  Gmail draft
- `email-parser.js` — extracts plain-text body from Gmail's nested MIME
  payload structure
- `process-inbox.js` — the orchestrator that ties it all together

## Notes

- Draft replies are never auto-sent — this is intentional. You stay in
  control of what actually goes out.
- `processed.json` tracks which email IDs have already been handled so
  re-running the script doesn't reclassify the same emails. Delete it if
  you want to reprocess everything.
- Run this manually for now (`node process-inbox.js`). In step 4 we'll
  wire up a polling loop + the WhatsApp bot so it runs automatically and
  you can control it via chat.

## Next step

Wire up the WhatsApp bot (`whatsapp-web.js`, same as your moderation bot)
so you get pinged with summaries and can approve/edit/send drafts by
replying in chat — instead of running this script by hand.
