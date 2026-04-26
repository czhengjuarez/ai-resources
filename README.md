# AI Resource Portal

A shared learning hub for AI and machine learning — browse a curated library, build a personalized course plan, and contribute resources for others.

**Live:** https://ai-course-builder.coscient.workers.dev

---

## What's in the portal

**Three parts:**

1. **Library** — 80+ curated resources (courses, videos, tools) organized by type and level. Semantic search powered by Cloudflare Vectorize + `bge-base-en-v1.5` embeddings. Community voting surfaces the most useful resources.
2. **AI Course Builder** — describe your background, goal, and available time (1 day to 3 months). The app generates a structured, day-by-day or week-by-week learning plan using only resources already in the library. Plans respect estimated time commitments per resource — a 1-day plan won't include a 100-hour course.
3. **Community Submissions** — submit a resource for review. Approved submissions appear in a Community Picks section.

**Self-improving over time:**
- Thumbs-down feedback on Course Builder plans is injected back into the AI prompt on subsequent requests — the model learns from specific notes.
- A Cloudflare Cron Trigger scans RSS feeds from Anthropic, fast.ai, Hugging Face, Google AI, and Papers With Code every Monday. Workers AI classifies each item; new candidates surface for admin review. Only free, publicly accessible resources are considered — sites with pay-per-crawl or `robots.txt` disallow rules are not scraped.

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Design system | `@ops-forward/keel` (local package) |
| Icons | lucide-react |
| Routing | react-router-dom v7 |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| AI | Cloudflare Workers AI (`llama-3.1-8b-instruct`, `bge-base-en-v1.5`) |
| Semantic search | Cloudflare Vectorize |
| Scheduled tasks | Cloudflare Cron Triggers |

---

## Project structure

```
ai-resources/
├── src/
│   ├── App.jsx                    # Main page — resource grid, filters, semantic search, voting
│   ├── main.jsx                   # Entry point, BrowserRouter + routes
│   ├── data/
│   │   └── resources.js           # Static resource definitions (fallback + AI/Vectorize seed)
│   ├── pages/
│   │   ├── CourseBuilderPage.jsx  # AI course builder with localStorage plan history
│   │   ├── SubmitPage.jsx         # Community resource submission form
│   │   └── AdminPage.jsx          # Admin review UI (submissions, feedback, RSS suggestions)
│   ├── components/
│   └── styles/
│       ├── app.css
│       └── tokens.css
├── worker.js                      # Cloudflare Worker — all API routes + cron handler + ASSETS
├── schema.sql                     # D1 table definitions (5 tables)
├── seed.sql                       # Resource seed data
├── wrangler.toml                  # Cloudflare deployment config
└── vite.config.js
```

---

## D1 Schema (5 tables)

| Table | Purpose |
|-------|---------|
| `resources` | Curated library resources |
| `community_submissions` | User-submitted resources pending review |
| `plan_feedback` | Thumbs up/down + notes on AI-generated plans |
| `resource_votes` | Per-resource votes with voter identity (localStorage ID) |
| `resource_suggestions` | RSS-sourced candidates awaiting admin review |

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/resources` | All curated resources grouped by section (includes `created_at`, `hours`) |
| `GET` | `/api/community` | Approved community submissions |
| `POST` | `/api/submit` | Submit a resource for review |
| `POST` | `/api/ai` | Generate a learning plan with Workers AI |
| `GET` | `/api/search?q=` | Semantic search via Vectorize (returns matching resource IDs) |
| `GET` | `/api/votes` | Vote counts for all resources |
| `POST` | `/api/vote` | Toggle vote on a resource (idempotent, voter ID from localStorage) |
| `POST` | `/api/feedback` | Submit thumbs up/down + optional note on a course plan |
| `GET` | `/admin-api/submissions` | List all community submissions (requires `ADMIN_KEY`) |
| `POST` | `/admin-api/approve` | Approve a community submission |
| `POST` | `/admin-api/reject` | Delete a community submission |
| `GET` | `/admin-api/feedback` | List plan feedback with stats |
| `GET` | `/admin-api/suggestions` | List pending RSS-sourced suggestions |
| `POST` | `/admin-api/approve-suggestion` | Approve a suggestion (moves to `resources` table) |
| `POST` | `/admin-api/reject-suggestion` | Dismiss a suggestion |
| `POST` | `/admin-api/run-rss` | Manually trigger RSS scan |
| `POST` | `/admin-api/seed-vectors` | Re-embed resources into Vectorize (chunked, supports `start`/`end` params) |

**Admin access:** protected by `ADMIN_KEY` Wrangler secret. Access admin UI at `/admin?key=YOUR_KEY`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers, D1, Workers AI, and Vectorize access
- `@ops-forward/keel` design system at `../../Keel/packages/keel`

### Local development

```bash
npm install

# Frontend only (Vite dev server, no Worker)
npm run dev

# Full stack locally (Worker + D1 via Wrangler)
npm run cf:dev
```

### First-time deployment

**1. Create D1 database:**
```bash
npx wrangler d1 create ai-resources-db
```
Copy the returned `database_id` into `wrangler.toml`.

**2. Create Vectorize index:**
```bash
npx wrangler vectorize create ai-resources-search --dimensions=768 --metric=cosine
```

**3. Run schema migration:**
```bash
npx wrangler d1 execute ai-resources-db --remote --file=schema.sql
```

**4. Seed resources:**
```bash
npx wrangler d1 execute ai-resources-db --remote --file=seed.sql
```

**5. Set admin key secret:**
```bash
npx wrangler secret put ADMIN_KEY
```

**6. Build and deploy:**
```bash
npm run cf:deploy
```

**7. Seed Vectorize embeddings:**
After deploy, call the seed endpoint once:
```bash
curl -X POST https://your-worker.workers.dev/admin-api/seed-vectors \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

### Subsequent deploys

```bash
npm run cf:deploy
```

---

## Resource shape

Each resource in `src/data/resources.js` has this shape:

```js
{
  title: 'Resource Title',
  source: 'Publisher / Author',
  description: 'One-sentence description.',
  type: 'material' | 'video' | 'tool',
  level: 'Beginner' | 'Intermediate' | 'Advanced',
  tags: ['tag1', 'tag2'],
  meta: [],
  url: 'https://example.com',
  hours: 15  // estimated time commitment in hours; null for open-ended resources
}
```

After adding resources, update `seed.sql` and re-run the seed + Vectorize seeding steps.

---

## Admin UI

The admin panel at `/admin?key=YOUR_KEY` has three sections:

- **Submissions** — review and approve/reject community-submitted resources
- **Plan Feedback** — view stats (helpful vs. needs improvement) and read written notes
- **RSS Suggestions** — review AI-classified candidates from weekly RSS scans; approve to add to library or dismiss

---

## Forking this for another domain

The pattern generalizes:

1. Replace `src/data/resources.js` with your own resource list
2. Update `seed.sql` to match
3. Adjust the AI prompt in `worker.js` (`/api/ai` handler) to fit your domain
4. Update the RSS feeds array in `worker.js` to sources relevant to your topic
5. Deploy

No external API keys needed. Everything runs on Cloudflare's infrastructure.

---

## Source attribution

Resources were curated from:
- **Internal wiki** — Curt's AI Landscape Brief, Andres Mariscal's ML 101, Data Science Study Group list
- **Team recommendations** — via Google Chat and wiki pages  
- **Institutional sources** — MIT OpenCourseWare, Stanford Online, Anthropic Skilljar
- **Community research** — fast.ai, dair-ai ML YouTube Courses repo, and similar curated lists
- **Automated discovery** — weekly RSS scan from Anthropic, fast.ai, Hugging Face, Google AI, Papers With Code
