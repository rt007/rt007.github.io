# Romal's Portfolio Chatbot

A two-part system:
- **Backend** — Vercel serverless function (`api/chat.js`)
- **Frontend** — Drop-in widget (`chatbot.js` + `chatbot.css`)

---

## Part 1 — Deploy the Vercel Backend

### 1. Create a private GitHub repo for your knowledge base

1. Go to github.com → New repository → set to **Private**
2. Create a file, e.g. `knowledge-base.txt`, and fill it with your CV/portfolio info (use the provided template).
3. Get the **raw API URL** for that file:
   ```
   https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/knowledge-base.txt
   ```

### 2. Create a GitHub Personal Access Token

1. GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
2. Scope it to: **only** your private KB repo, **read-only** access to Contents
3. Copy the token — you'll set it as `GITHUB_PAT` in Vercel

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# From this folder:
npm install
vercel deploy --prod
```

Note the deployment URL, e.g. `https://your-project.vercel.app`

### 4. Set Environment Variables in Vercel

In the Vercel dashboard → Your Project → Settings → Environment Variables, add:

| Name             | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| `OPENAI_API_KEY` | Your OpenAI API key                                                    |
| `GITHUB_PAT`     | Your GitHub Personal Access Token (fine-grained, read KB repo)         |
| `GITHUB_KB_URL`  | `https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/knowledge-base.txt` |

Redeploy after setting env vars:
```bash
vercel deploy --prod
```

### 5. Test your API

```bash
curl -X POST https://your-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://rt007.github.io" \
  -d '{"messages":[{"role":"user","content":"What is your experience?"}]}'
```

---

## Part 2 — Add the Widget to Your GitHub Pages Site

### 1. Copy files to your repo

Copy `chatbot.js` and `chatbot.css` to the root of your `rt007.github.io` repo.

### 2. Update the API URL in chatbot.js

Open `chatbot.js` and replace line ~17:
```js
API_URL: "https://YOUR-PROJECT.vercel.app/api/chat",
```
with your actual Vercel URL:
```js
API_URL: "https://your-actual-project.vercel.app/api/chat",
```

### 3. Add to each HTML page

Add these two lines just before `</body>` on each of your 4 pages
(`index.html`, `research.html`, `books.html`, `myrooom.html`):

```html
<link rel="stylesheet" href="/chatbot.css">
<script src="/chatbot.js" defer></script>
```

That's it! The widget self-injects into the page.

---

## Updating Your Knowledge Base

Simply edit `knowledge-base.txt` in your private GitHub repo.
The backend caches the file for **24 hours**, so changes will be live within a day.
To force an immediate refresh, redeploy the Vercel function (free/instant).

---

## Architecture Overview

```
User browser (rt007.github.io)
    │  POST /api/chat  (Origin: https://rt007.github.io)
    ▼
Vercel serverless function (api/chat.js)
    │  CORS check → only rt007.github.io allowed
    │  Rate limit → 20 req/min per IP
    │  KB cache → fetches from GitHub every 24h
    ▼
GitHub private repo (knowledge-base.txt)  ← cached in memory
    │
    ▼
OpenAI GPT-4o mini → reply
    │
    ▼
User browser
```

## Security Notes

- **CORS + Origin check**: requests from any other origin get a `403 Forbidden`
- **Rate limiting**: 20 requests per minute per IP (in-memory; resets on cold start)
- **No secrets in frontend**: API key and PAT are only on Vercel server-side
- **Message validation**: roles checked, content capped at 2000 chars, history trimmed to 20 turns
- **System prompt isolation**: knowledge base content never directly accessible by users
