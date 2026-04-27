# AI Resource Portal

A shared learning hub for AI and machine learning — browse a curated library, get a personalized course plan, and contribute resources for others.

**Live:** https://ai-course-builder.coscient.workers.dev

---

## What it does

**Three main parts:**

1. **Library** — 80+ curated resources (courses, videos, tools) organized into four sections (University, Industry, Videos, Tooling). Type and level filters, semantic search powered by Cloudflare Vectorize, and per-resource community voting.

2. **AI Course Builder** — describe your background, goal, and available time (1 day to 3 months). The app generates a structured, day-by-day or week-by-week learning plan using only resources already in the library. The planner is time-budget-aware: a 1-day plan won't include a 100-hour course, and long courses are either scheduled across multiple sessions or surfaced as "if you have more time" enhancements.

3. **Community Submissions** — submit a resource for admin review. Approved resources appear in a Community Picks section that integrates into the main filtered/searched view.

**Self-improving over time:**
- Thumbs-down feedback on Course Builder plans (with written notes) is injected back into the AI prompt on subsequent requests — the model incorporates specific improvement themes.
- A Cloudflare Cron Trigger scans RSS feeds from Anthropic, fast.ai, Hugging Face, Google AI, and Papers With Code every Monday. Workers AI classifies each item; new candidates surface in the admin review queue. Only free, publicly accessible resources are considered.

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
| AI inference | Cloudflare Workers AI (`llama-3.1-8b-instruct`, `bge-base-en-v1.5`) |
| Semantic search | Cloudflare Vectorize |
| Scheduled tasks | Cloudflare Cron Triggers |

No external API keys. No third-party AI subscriptions. Everything runs on Cloudflare's infrastructure.

---

## Project structure

```
ai-resources/
├── src/
│   ├── App.jsx                    # Main page — resource grid, filters, semantic search, voting
│   ├── main.jsx                   # Entry point, BrowserRouter + routes
│   ├── data/
│   │   └── resources.js           # Static resource definitions (source of truth + AI seed)
│   ├── pages/
│   │   ├── CourseBuilderPage.jsx  # AI course builder with accordion panel + plan history
│   │   ├── SubmitPage.jsx         # Community resource submission form
│   │   └── AdminPage.jsx          # Admin review UI (submissions, feedback, RSS suggestions)
│   ├── components/
│   │   └── PromptPanel.jsx        # Legacy (not used)
│   └── styles/
│       ├── app.css                # Component styles + split-pane layout + dark mode
│       └── tokens.css             # Design tokens from @ops-forward/keel + dark mode overrides
├── worker.js                      # Cloudflare Worker — all API routes + cron handler + ASSETS
├── schema.sql                     # D1 table definitions (5 tables)
├── seed.sql                       # Resource seed data (INSERT statements)
├── wrangler.toml                  # Cloudflare deployment config
└── vite.config.js
```

---

## Technical implementation

### Data flow

```
resources.js ──► seed.sql ──► D1 (resources table)
                    │
                    └──► Vectorize index (embeddings)

Browser ──► GET /api/resources ──► D1 query ──► merged with hours from static data
Browser ──► GET /api/search?q= ──► Vectorize query ──► matching resource IDs
Browser ──► POST /api/ai ──► Workers AI ──► planner ──► JSON plan
```

### The AI planner (worker.js `/api/ai`)

The planner does not just pass the request to the LLM and display results. It runs four phases:

**Phase 1: LLM generates candidate resource list**

The LLM (`llama-3.1-8b-instruct`) receives:
- Student background + goal + duration
- All 80+ resources as a compact index: `[ID] Title — type, level, Xh`
- Recent thumbs-down notes from `plan_feedback` as "Known improvement areas"
- Duration metadata mapping (e.g., `'1 week'` = 30 total hours, daily format)

The LLM outputs a JSON plan with `resourceIds` per period. Its output is parsed robustly: markdown code fences are stripped, trailing commas are repaired, and the outermost `{...}` is extracted by brace-depth walk.

**Phase 2: Resource triage**

Each resource the LLM selected is classified:
- **Fits in budget** → scheduled normally
- **No-skim (formal university course)** → deferred to "If you have more time" enhancements, not scheduled inside the plan
- **Skim-friendly** → allocated ~40% of original hours with a "Why less than full?" explanation

No-skim detection uses heuristics: courses from MIT, Stanford, Coursera, edX, fast.ai, DeepLearning.AI, etc. are treated as structured commitments that shouldn't be compressed.

**Phase 3: Schedule into periods**

Resources are scheduled into Day N (≤1 week) or Week N (≥2 weeks) buckets using a bin-packing heuristic: largest items are placed first, each resource is spread across multiple periods if its hours exceed the per-period budget, and overflow past the total budget is trimmed.

**Phase 4: Deep-track expansion**

If the goal is advanced (transformers, LLMs, research papers) and the total scheduled hours are below 75% of budget, additional resources are ranked by level, hours, and keyword relevance to fill the plan.

**Result shape:**

```json
{
  "plan": [{
    "period": "Day 1",
    "focus": "Foundations",
    "notes": "Plan ~6h today...",
    "resources": [{
      "title": "fast.ai · Practical Deep Learning",
      "hours": 6,
      "sessionHours": 6,
      "originalHours": 18,
      "partial": true,
      "scheduleSpanLabel": "Day 1-3",
      "reductionReason": "Suggested ~6h of the full ~18h: skim sections most relevant to..."
    }]
  }],
  "enhancements": [{ "title": "...", "reason": "Full course exceeds timeframe..." }],
  "summary": "Personalized plan. ~30h across 5 day(s)..."
}
```

### Semantic search

Each resource is embedded at seed time using `@cf/baai/bge-base-en-v1.5` (768-dim, cosine similarity). Vector IDs follow the format `${sectionId}_${resourceIndex}` (e.g., `university_0`, `industry_14`).

On the frontend, typing in the search box triggers instant token-based AND matching (no network call). Clicking the Sparkles button or pressing Enter commits the query to Vectorize via `GET /api/search?q=`. The `searchResultIds` state switches the filter logic from token-based to vector ID membership check.

### Votes

Each browser gets a stable `voter_id` in localStorage. `POST /api/vote` uses a composite primary key `(resource_id, voter_id)` to prevent duplicates, and toggles the vote on repeat calls. The UI updates optimistically before the server confirms.

### Dark mode

`useDarkMode()` hook reads `localStorage('theme')` and falls back to `prefers-color-scheme`. It sets `document.documentElement.dataset.theme = 'dark' | 'light'`, which activates the `[data-theme='dark']` token overrides in `tokens.css`.

### RSS discovery (cron)

Runs every Monday at 09:00 UTC (`crons = ["0 9 * * 1"]`). For each of the 5 RSS feeds:
1. Fetch and parse XML (supports both RSS `<item>` and Atom `<entry>`)
2. Skip items already in `resource_suggestions` or `resources` by URL
3. Ask `llama-3.1-8b-instruct`: "Is this an AI/ML learning resource?" (`max_tokens: 5`, expects "yes"/"no")
4. On "yes": insert into `resource_suggestions` with `status='pending_review'`

Admin reviews in the admin panel and can approve (moves to `resources` table) or dismiss.

---

## D1 Schema

```sql
-- Main curated library
resources (id, section, title, source, description, type, level, tags, meta, url, is_team_pick, created_at)

-- Community-submitted resources (pending admin review)
community_submissions (id, title, url, source, description, type, level, tags, submitted_at, approved)

-- Course Builder feedback (powers feedback injection into AI prompt)
plan_feedback (id, thumbs, note, plan_background, plan_goal, plan_duration, submitted_at)

-- Per-resource votes (composite PK prevents duplicates)
resource_votes (resource_id, voter_id, voted_at)

-- RSS-sourced resource candidates (pending admin review)
resource_suggestions (id, title, url, source, description, feed_source, discovered_at, status)
```

---

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/resources` | — | All curated resources grouped by section (includes `created_at`, `hours`) |
| `GET` | `/api/community` | — | Approved community submissions |
| `POST` | `/api/submit` | — | Submit a resource for review |
| `POST` | `/api/ai` | — | Generate a time-budget-aware learning plan |
| `GET` | `/api/search?q=` | — | Semantic search via Vectorize; returns matching vector IDs |
| `GET` | `/api/votes` | — | Vote counts keyed by resource ID |
| `POST` | `/api/vote` | — | Toggle vote (idempotent; voter ID from localStorage) |
| `POST` | `/api/feedback` | — | Submit thumbs up/down + optional note on a course plan |
| `GET` | `/admin-api/submissions` | `ADMIN_KEY` | List all community submissions |
| `POST` | `/admin-api/approve` | `ADMIN_KEY` | Approve a community submission |
| `POST` | `/admin-api/reject` | `ADMIN_KEY` | Delete a community submission |
| `GET` | `/admin-api/feedback` | `ADMIN_KEY` | List plan feedback with up/down stats |
| `GET` | `/admin-api/suggestions` | `ADMIN_KEY` | List pending RSS-sourced suggestions |
| `POST` | `/admin-api/approve-suggestion` | `ADMIN_KEY` | Move suggestion to `resources` table |
| `POST` | `/admin-api/reject-suggestion` | `ADMIN_KEY` | Mark suggestion as rejected |
| `POST` | `/admin-api/run-rss` | `ADMIN_KEY` | Manually trigger RSS scan |
| `POST` | `/admin-api/seed-vectors` | `ADMIN_KEY` | Chunk-embed resources into Vectorize (body: `{start, end}`) |

**Admin auth:** pass `?key=YOUR_KEY` query param or `Authorization: Bearer YOUR_KEY` header.

---

## Getting started

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers, D1, Workers AI, and Vectorize enabled
- `@ops-forward/keel` design system at `../../Keel/packages/keel` (relative to this repo)

### Local development

```bash
npm install

# Frontend only (Vite dev server — no Worker, falls back to static data)
npm run dev

# Full stack locally (Worker + local D1 via Wrangler)
npm run cf:dev
```

### First-time deployment

**1. Create D1 database:**
```bash
npx wrangler d1 create ai-resources-db
# Copy the returned database_id into wrangler.toml
```

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

**5. Set admin key:**
```bash
npx wrangler secret put ADMIN_KEY
# Enter a random secret string when prompted
```

**6. Build and deploy:**
```bash
npm run cf:deploy
```

**7. Seed Vectorize embeddings** (run once after deploy):
```bash
# Embed all resources (chunked — send multiple requests if you have many resources)
curl -X POST https://your-worker.workers.dev/admin-api/seed-vectors \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"start": 0, "end": 50}'

curl -X POST https://your-worker.workers.dev/admin-api/seed-vectors \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"start": 50, "end": 100}'
```

### Subsequent deploys

```bash
npm run cf:deploy
```

---

## Resource format

Each resource in `src/data/resources.js`:

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
  hours: 15   // estimated time in hours; null for open-ended resources (tools, channels)
}
```

After adding resources:
1. Add corresponding `INSERT` rows to `seed.sql`
2. Run: `npx wrangler d1 execute ai-resources-db --remote --file=seed.sql` (only new rows)
3. Re-seed Vectorize for the new indices: `POST /admin-api/seed-vectors` with the new range
4. Deploy: `npm run cf:deploy`

---

## Admin UI

Access: `/admin?key=YOUR_ADMIN_KEY`

Three sections:
- **Submissions** — approve or reject community-submitted resources
- **Plan Feedback** — view thumbs-up/down stats and read written improvement notes
- **RSS Suggestions** — review AI-classified candidates from weekly RSS scans; approve to add to library with section/type/level metadata, or dismiss

---

## Contributing

### Adding or improving resources

1. Edit `src/data/resources.js` — add your resource to the appropriate section
2. Add the `hours` field (your best estimate in whole hours; `null` for tools or open-ended channels)
3. Update `seed.sql` with a matching `INSERT` statement
4. Submit a PR — the reviewer will run the seed and Vectorize steps after merging

### Improving the AI planner prompt

The planner prompt lives in `worker.js`, in the `/api/ai` handler (lines ~244–262). Key tuning points:
- `DURATION_META` — adjust total hours, period counts, and per-day/week budgets per timeframe
- `NO_SKIM_HINTS` — add course sources that should never be compressed
- The expansion pool scoring (lines ~420–432) — tune keyword scores for deep-track expansion
- The system message and user prompt structure

### Improving search

Vectorize re-seeding is non-destructive (upsert). After changing resource descriptions or tags:
```bash
curl -X POST https://your-worker.workers.dev/admin-api/seed-vectors \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

### Adding new RSS feeds

Edit the `RSS_FEEDS` array at the top of `worker.js`. Each entry needs `{ name: string, url: string }`. The feed must return standard RSS 2.0 or Atom 1.0 XML.

### Running locally with a real D1

```bash
# Bind to the remote D1 during local wrangler dev
npx wrangler dev --remote
```

---

## Forking for a different domain

The pattern is domain-agnostic. To adapt it:

1. **Replace `src/data/resources.js`** with your own curated list using the same resource shape
2. **Update `seed.sql`** to match your resources
3. **Update `wrangler.toml`** — change `name`, `database_name`, and `database_id`
4. **Edit the AI prompt** in `worker.js` (`/api/ai` handler) — change the framing to match your domain (e.g., "design resources" instead of "AI learning resources")
5. **Update RSS feeds** in `worker.js` to sources relevant to your topic
6. **Re-seed Vectorize** after deploy
7. Optionally update the hero copy in `src/App.jsx` and page titles

The feedback loop, voting, admin review, and RSS discovery all work unchanged. No code changes are needed in `CourseBuilderPage.jsx`, `AdminPage.jsx`, or the CSS unless you want visual changes.

---

## Source attribution

Resources were curated from:
- **Internal wiki** — Curt's AI Landscape Brief, Andres Mariscal's ML 101, Data Science Study Group list
- **Team recommendations** — via Google Chat and wiki pages
- **Institutional sources** — MIT OpenCourseWare, Stanford Online, Anthropic Skilljar
- **Community research** — fast.ai, dair-ai ML YouTube Courses repo, and similar curated lists
- **Automated discovery** — weekly RSS scan from Anthropic, fast.ai, Hugging Face, Google AI, Papers With Code
