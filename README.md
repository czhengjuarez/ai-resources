# AI Resource Portal

A shared learning hub where the OpsForward team can discover, browse, and contribute AI and machine learning resources — courses, videos, tools, and reference material — all in one place.

The portal is built around three ideas:
- **Curated library** — 53 hand-picked resources organized by type and level, sourced from team recommendations, internal wiki pages, and external research
- **AI Course Builder** — describe your background and goal, and the app generates a structured day-by-day learning plan using only resources already in the library
- **Community submissions** — team members can submit new resources for review and inclusion

**Live:** https://ai-course-builder.coscient.workers.dev

---

## Creating a similar app

This portal is a self-contained template you can fork for any resource library. The pattern is:

1. Define your resources in `src/data/resources.js` (title, source, description, type, level, tags, url)
2. Run the seed script to load them into a Cloudflare D1 database
3. The Worker serves the resources via API; React reads from the API with a static fallback
4. Workers AI reads the same resource list to generate personalized plans — no external model keys needed

Deploy to any Cloudflare account in under 10 minutes (see [First-time deployment](#first-time-deployment) below).

---

## Features

### Resource Library
- 53 curated resources across 4 sections: University, Industry, Videos, and Tooling
- Filter by type (material / video / tool) and level (Beginner / Intermediate / Advanced)
- Full-text search across titles, descriptions, sources, and tags
- Resources are seeded into a D1 database and served via API

### AI Course Builder (`/course-builder`)
- Input your background, learning goal, and available time
- Generates a structured day-by-day learning plan using Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
- Plans are built exclusively from resources in the library — no hallucinated links
- Built plans are saved locally (up to 10) via localStorage for quick access

### Community Submissions (`/submit`)
- Submit a resource to be reviewed for inclusion in the library
- Submissions are stored in D1 and displayed in a Community Picks section once approved

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
| AI | Cloudflare Workers AI |

---

## Project Structure

```
ai-resources/
├── src/
│   ├── App.jsx              # Main page — resource grid, filters, search
│   ├── main.jsx             # Entry point, BrowserRouter + routes
│   ├── data/
│   │   └── resources.js     # Static resource definitions (fallback + AI seed)
│   ├── pages/
│   │   ├── CourseBuilderPage.jsx
│   │   └── SubmitPage.jsx
│   └── styles/
│       ├── app.css
│       └── tokens.css
├── worker.js                # Cloudflare Worker — API routes + asset serving
├── schema.sql               # D1 table definitions
├── seed.sql                 # Initial 53-resource seed data
├── wrangler.toml            # Cloudflare deployment config
└── vite.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers and D1 access
- `@ops-forward/keel` design system available at `../../Keel/packages/keel`

### Local development

```bash
npm install

# Run frontend only (no Worker, no D1)
npm run dev

# Run full stack locally with Worker + D1
npm run cf:dev
```

### First-time deployment

**1. Create the D1 database:**
```bash
npx wrangler d1 create ai-resources-db
```
Copy the returned `database_id` into `wrangler.toml`.

**2. Run schema migration:**
```bash
npx wrangler d1 execute ai-resources-db --remote --file=schema.sql
```

**3. Seed resources:**
```bash
npx wrangler d1 execute ai-resources-db --remote --file=seed.sql
```

**4. Build and deploy:**
```bash
npm run cf:deploy
```

### Subsequent deploys

```bash
npm run cf:deploy
```

---

## API Routes

All routes are handled by `worker.js`. Static assets are served via `ASSETS` binding.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/resources` | All curated resources grouped by section |
| `GET` | `/api/community` | Approved community submissions |
| `POST` | `/api/submit` | Submit a new resource for review |
| `POST` | `/api/ai` | Generate a learning plan with Workers AI |

---

## Adding Resources

Edit `src/data/resources.js` and `seed.sql` together. Each resource has this shape:

```js
{
  title: 'Resource Title',
  source: 'Publisher / Author',
  description: 'One-sentence description.',
  type: 'material' | 'video' | 'tool',
  level: 'Beginner' | 'Intermediate' | 'Advanced',
  tags: ['tag1', 'tag2'],
  meta: [],
  url: 'https://example.com'
}
```

After editing, re-run the seed or insert directly via `wrangler d1 execute`.

---

## Approving Community Submissions

Currently managed directly in D1. To approve a submission:

```bash
npx wrangler d1 execute ai-resources-db --remote \
  --command="UPDATE community_submissions SET approved = 1 WHERE id = <id>;"
```

An admin UI is a planned future addition.

---

## Resources — Source Attribution

Resources were curated from:
- **Internal wiki** — Curt's AI Landscape Brief, Andres Mariscal's ML 101, Data Science Study Group list
- **Team recommendations** — via Google Chat and wiki pages
- **External research** — fast.ai, dair-ai ML YouTube Courses repo, and similar community-curated lists
