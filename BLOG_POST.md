# We Built an AI Learning Portal — and We Want Your Help to Make It Better

At OpsForward, we talk about AI constantly. In meetings, in Slack, in passing. People recommend courses, share videos, post tool links. But that knowledge has always lived in scattered wiki pages, chat threads, and individual bookmarks — hard to find, easy to lose.

So we built something about it.

---

## What We Built

**The AI Resource Portal** is a shared, team-curated learning hub for AI and machine learning.

It lives at **https://ai-course-builder.coscient.workers.dev** and it's for everyone — whether you're brand new to AI or already building agents.

It has three parts:

### 1. A Curated Library

53 hand-picked resources — courses, videos, books, and tools — organized by type and level. Beginners can find Google's ML Crash Course or fast.ai. Engineers can find Karpathy's Zero to Hero playlist or the Goodfellow Deep Learning textbook. Practitioners can browse LangChain Academy, CrewAI, and Weights & Biases.

Everything was sourced from real team recommendations — Andres's ML 101 wiki page, Curt's AI Landscape Brief, the Data Science Study Group's curated list, and research into what the broader community finds genuinely useful.

You can filter by type (courses / videos / tools), filter by level (Beginner / Intermediate / Advanced), and search semantically — powered by Cloudflare's vector search, so "agentic workflows" finds things even if those exact words don't appear in the title.

### 2. An AI Course Builder

This is the part we're most excited about.

Describe where you are (your background), where you want to get to (your goal), and how much time you have (1 day to 1 month). The Course Builder generates a structured, day-by-day learning plan — and every resource it includes is a real link from the library. No hallucinated courses. No broken links. Just a concrete schedule built from vetted material.

It's designed for realistic learning: a 1-week plan for "I'm a PM who needs to understand how LLMs work" looks completely different from "I'm a backend engineer who wants to build agents." Try it and see.

Plans are saved locally so you can come back to them, adjust your goal, and rebuild.

### 3. Community Submissions

Found a resource you think belongs in the library? Submit it. We review submissions and approved ones appear in a **Community Picks** section on the main page.

---

## How You Can Help

This portal gets better the more people use it and contribute to it. Here's how:

### Submit a resource

If there's a course, video, tool, or article that genuinely helped you — or that you think the team should know about — **add it**. Hit the Submit button, fill in the details, and we'll review it. Good submissions get added to the curated library.

We're especially looking for:
- Resources that worked well for *non-engineers* (PMs, designers, ops folks)
- Tools you use in your actual day-to-day AI workflow
- Videos or courses you've personally completed and would recommend to a colleague

### Build a learning plan and give feedback

Use the Course Builder with a real goal you have right now. Then rate the result. If a plan is unhelpful — wrong level, bad sequence, missing something obvious — tell us in the feedback field.

Here's the interesting part: **your feedback actually feeds back into the AI**. The system reads recent thumbs-down notes when generating new plans and uses them to avoid the same mistakes. The more specific your note, the better the next plan gets. This is a live feedback loop, not a suggestion box.

### Share it with someone new to AI

The best use of this portal might be handing it to someone who's just starting. Instead of sending them a list of links, help them fill in the Course Builder: 15 minutes together, a goal they actually care about, and a plan that fits their week. That's the onboarding experience we were trying to build.

---

## What's Under the Hood (for the curious)

The portal is built entirely on Cloudflare's stack — Workers, D1, Workers AI, and Vectorize — with a React frontend. No external API keys, no third-party LLM subscriptions. The AI runs on Cloudflare's infrastructure using `llama-3.1-8b-instruct`, and the semantic search runs on `bge-base-en-v1.5` embeddings stored in a Vectorize index.

The whole thing is open inside the OpsForward repo if you want to fork it, extend it, or build something similar for a different resource domain. The pattern — curated data in D1, AI-generated plans from that same data, vector search on top — generalizes well.

---

## The Bigger Idea

AI learning right now is almost too abundant. There are hundreds of courses, thousands of tutorials, infinite YouTube rabbit holes. The problem isn't access — it's signal. What's worth your time? Where do you start given *your* background and *your* goal?

That's what this portal is trying to solve: not a comprehensive index, but a curated, structured, actionable starting point. Small, manageable learning — built around what you actually need.

Use it. Break it. Tell us what's missing.

**https://ai-course-builder.coscient.workers.dev**

---

*Built by the OpsForward team. Resources sourced from team recommendations, internal wiki pages, and community research. All suggestions and feedback welcome.*
