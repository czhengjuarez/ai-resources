import { sections } from './src/data/resources.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

function corsOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// RSS feeds to scan for new AI learning resources
const RSS_FEEDS = [
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss.xml' },
  { name: 'fast.ai Blog', url: 'https://www.fast.ai/index.xml' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'Papers With Code', url: 'https://paperswithcode.com/rss.xml' },
];

// Parse RSS/Atom feed XML and return array of { title, url, description }
function parseFeedItems(xml) {
  const items = [];
  // Support both RSS <item> and Atom <entry>
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]?.trim() || '';
    // URL: try <link href="..."> (Atom) then <link>(RSS)</link>
    const hrefLink = (block.match(/<link[^>]+href=["']([^"']+)["']/) || [])[1] || '';
    const innerLink = (block.match(/<link[^>]*>([^<]+)<\/link>/) || [])[1]?.trim() || '';
    const itemUrl = hrefLink || innerLink;
    const desc = (block.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/) || [])[1]?.trim() || '';
    if (title && itemUrl) {
      items.push({ title, url: itemUrl, description: desc.slice(0, 300) });
    }
  }
  return items;
}

export default {
  // ── Cron scheduled handler ───────────────────────────────────────────────
  async scheduled(event, env, ctx) {
    // Fetch RSS feeds and classify items as potential learning resources
    for (const feed of RSS_FEEDS) {
      try {
        const res = await fetch(feed.url, { headers: { 'User-Agent': 'ai-resources-bot/1.0' } });
        if (!res.ok) continue;
        const xml = await res.text();
        const items = parseFeedItems(xml);

        for (const item of items.slice(0, 10)) {
          // Skip if URL already exists in suggestions or resources
          const existing = await env.DB.prepare(
            'SELECT 1 FROM resource_suggestions WHERE url = ? LIMIT 1'
          ).bind(item.url).first();
          if (existing) continue;

          const existingResource = await env.DB.prepare(
            'SELECT 1 FROM resources WHERE url = ? LIMIT 1'
          ).bind(item.url).first();
          if (existingResource) continue;

          // Ask AI to classify: is this a learnable AI resource?
          const classifyResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
              { role: 'system', content: 'You are a classifier. Respond with only "yes" or "no".' },
              { role: 'user', content: `Is this an AI/ML learning resource (course, tutorial, guide, tool, or dataset) that someone could use to learn AI? Title: "${item.title}". Description: "${item.description}". Answer only yes or no.` }
            ],
            max_tokens: 5
          });
          const answer = (classifyResponse?.response || '').toLowerCase().trim();
          if (!answer.startsWith('yes')) continue;

          // Insert into suggestions
          await env.DB.prepare(
            `INSERT OR IGNORE INTO resource_suggestions (title, url, source, description, feed_source)
             VALUES (?, ?, ?, ?, ?)`
          ).bind(item.title, item.url, feed.name, item.description, feed.name).run();
        }
      } catch (_) {
        // Non-fatal: skip failed feeds
      }
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS pre-flight
    if (request.method === 'OPTIONS') return corsOptions();

    // ── API routes ───────────────────────────────────────────────────────────

    // GET /api/resources — all curated resources from D1
    if (pathname === '/api/resources' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT * FROM resources ORDER BY section, id'
        ).all();

        // Group by section
        const sectionMap = {};
        for (const row of results) {
          if (!sectionMap[row.section]) {
            sectionMap[row.section] = { id: row.section, resources: [] };
          }
          sectionMap[row.section].resources.push({
            ...row,
            tags: JSON.parse(row.tags || '[]'),
            meta: JSON.parse(row.meta || '[]'),
            created_at: row.created_at || null
          });
        }

        const sections = Object.values(sectionMap);
        return json({ sections });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /api/community — approved community submissions
    if (pathname === '/api/community' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT * FROM community_submissions WHERE approved = 1 ORDER BY submitted_at DESC LIMIT 50'
        ).all();

        const resources = results.map((row) => ({
          ...row,
          tags: JSON.parse(row.tags || '[]')
        }));

        return json({ resources });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /api/submit — submit a new community resource
    if (pathname === '/api/submit' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { title, url: resourceUrl, source, description, type, level, tags } = body;

        if (!title || !resourceUrl || !type || !level) {
          return json({ error: 'title, url, type, and level are required' }, 400);
        }

        if (!['material', 'video', 'tool'].includes(type)) {
          return json({ error: 'type must be material, video, or tool' }, 400);
        }

        if (!['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
          return json({ error: 'level must be Beginner, Intermediate, or Advanced' }, 400);
        }

        const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

        const result = await env.DB.prepare(
          `INSERT INTO community_submissions (title, url, source, description, type, level, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(title, resourceUrl, source || '', description || '', type, level, tagsJson)
          .run();

        return json({ success: true, id: result.meta.last_row_id }, 201);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /api/ai — AI course builder
    if (pathname === '/api/ai' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { background, goal, duration } = body;

        if (!background || !goal || !duration) {
          return json({ error: 'background, goal, and duration are required' }, 400);
        }

        // Flatten all resources into a compact list for the prompt
        const allResources = sections.flatMap((section) =>
          section.resources.map((r) => ({
            id: `${section.id}::${r.title}`,
            title: r.title,
            source: r.source,
            type: r.type,
            level: r.level,
            tags: r.tags,
            url: r.url,
            hours: r.hours ?? null,
          }))
        );

        // Use compact format — ID, title, type, level, hours — to help model reason about duration fit
        const resourceIndex = allResources
          .map((r, i) => {
            const hrs = r.hours != null ? `${r.hours}h` : 'open-ended';
            return `${i + 1}. [${r.id}] ${r.title} — ${r.type}, ${r.level}, ${hrs}`;
          })
          .join('\n');

        // Fetch recent thumbs-down feedback notes to inject as improvement hints
        let feedbackSection = '';
        try {
          const { results: feedbackRows } = await env.DB.prepare(
            `SELECT note FROM plan_feedback
             WHERE thumbs = -1 AND note IS NOT NULL AND note != ''
             ORDER BY submitted_at DESC LIMIT 20`
          ).all();
          if (feedbackRows.length > 0) {
            const themes = feedbackRows.map((r, i) => `${i + 1}. ${r.note.trim()}`).join('\n');
            feedbackSection = `\nKnown improvement areas (from previous learner feedback — use these to improve your plan):\n${themes}\n`;
          }
        } catch (_) {
          // Non-fatal: proceed without feedback if DB query fails
        }

        // Duration metadata: per-period budget, format (daily vs weekly), pacing.
        const DURATION_META = {
          '1 day':    { days: 1,  weeks: null, totalHours: 6,   format: 'daily',  perDayHours: 6, perWeekHours: null, periods: 1  },
          '3 days':   { days: 3,  weeks: null, totalHours: 18,  format: 'daily',  perDayHours: 6, perWeekHours: null, periods: 3  },
          '1 week':   { days: 5,  weeks: 1,    totalHours: 30,  format: 'daily',  perDayHours: 6, perWeekHours: 30,   periods: 5  },
          '2 weeks':  { days: 10, weeks: 2,    totalHours: 50,  format: 'weekly', perDayHours: 5, perWeekHours: 25,   periods: 2  },
          '1 month':  { days: 20, weeks: 4,    totalHours: 100, format: 'weekly', perDayHours: 5, perWeekHours: 25,   periods: 4  },
          '3 months': { days: 60, weeks: 12,   totalHours: 270, format: 'weekly', perDayHours: 4, perWeekHours: 22,   periods: 12 }
        };
        const durationMeta = DURATION_META[duration] || DURATION_META['1 week'];
        const totalAvailableHours = durationMeta.totalHours;

        const prompt = `You are an AI learning advisor. Create a learning plan.

Student background: ${background}
Goal: ${goal}
Duration: ${duration} (~${totalAvailableHours} hours total)
${feedbackSection}
RULES:
- Only use resource IDs from the list below (format: section::Title)
- Each resource has an estimated time commitment shown as Xh (e.g. 20h = 20 hours). "open-ended" means no fixed commitment.
- Do NOT suggest a resource if its hours alone exceed the total available time (${totalAvailableHours}h), unless it is open-ended or a reference material.
- For short durations (1 day, 3 days), prefer resources under 15h. Mention realistic time commitments in the notes field.
- If the best resource for the goal is longer than available time, suggest it as a "beyond this plan" recommendation in the notes field rather than including it as a primary resource.
- Return ONLY a JSON object, no other text

Available resources (format: ID, type, level, estimated hours):
${resourceIndex}

Required JSON format (use period labels like ${durationMeta.format === 'weekly' ? '"Week 1", "Week 2"' : '"Day 1", "Day 2"'}):
{"plan":[{"period":"${durationMeta.format === 'weekly' ? 'Week 1' : 'Day 1'}","focus":"theme","resourceIds":["section::Title"],"notes":"tip"}],"summary":"overview"}`;

        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: 'You are a JSON API. Output only valid JSON, no explanation, no markdown.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1024
        });

        // Workers AI chat returns { response: string } for this model
        // Check multiple possible field names defensively
        let rawText = response?.response || response?.result?.response || response?.choices?.[0]?.message?.content || '';

        // If still empty, return debug info
        if (!rawText) {
          return json({
            error: 'AI returned an empty response. Please try again.',
            debug: JSON.stringify(Object.keys(response || {})).slice(0, 200)
          }, 500);
        }

        // Strip markdown code fences (```json ... ``` or ``` ... ```)
        rawText = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');

        // Helper: repair common LLM JSON mistakes
        function repairJson(str) {
          // Remove trailing commas before ] or }
          return str.replace(/,\s*([}\]])/g, '$1');
        }

        // Try to extract the outermost JSON object
        function extractJson(text) {
          // Find first { and last } for the outermost object
          const start = text.indexOf('{');
          if (start === -1) return null;
          // Walk to find matching closing brace
          let depth = 0;
          for (let i = start; i < text.length; i++) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') {
              depth--;
              if (depth === 0) return text.slice(start, i + 1);
            }
          }
          return null;
        }

        const extracted = extractJson(rawText);
        if (!extracted) {
          return json({ error: 'AI returned no JSON. Please try again.', raw: rawText.slice(0, 500) }, 500);
        }

        let plan;
        try {
          plan = JSON.parse(extracted);
        } catch {
          // Try after repair
          try {
            plan = JSON.parse(repairJson(extracted));
          } catch (parseErr) {
            return json({ error: 'AI returned malformed JSON. Please try again.', detail: parseErr.message }, 500);
          }
        }

        // Resolve resource IDs back to full resource objects
        const resourceMap = Object.fromEntries(allResources.map((r) => [r.id, r]));
        const rawPlan = Array.isArray(plan.plan) ? plan.plan : [];

        // Build focus lookup from model output to preserve intent where possible
        const focusById = {};
        for (const period of rawPlan) {
          for (const id of period.resourceIds || []) {
            if (!focusById[id] && period.focus) {
              focusById[id] = period.focus;
            }
          }
        }

        // Flatten unique resources in model order
        const orderedIds = [];
        for (const period of rawPlan) {
          for (const id of period.resourceIds || []) {
            if (resourceMap[id] && !orderedIds.includes(id)) {
              orderedIds.push(id);
            }
          }
        }

        let selectedResources = orderedIds.map((id) => resourceMap[id]);

        const goalText = `${goal} ${background}`.toLowerCase();
        const wantsDeepTrack =
          duration === '1 month'
          || /advanced|deep|first principles|research|transformer|llm training|paper/.test(goalText);
        const needsFoundations = /beginner|no coding|new to|from scratch/.test(goalText);

        const levelScore = { Beginner: 0, Intermediate: 1, Advanced: 2 };
        const estimateHours = (resource) => {
          if (resource.hours == null) {
            return resource.type === 'tool' ? 2 : 6;
          }
          return Math.max(1, Number(resource.hours));
        };

        if (wantsDeepTrack && !needsFoundations) {
          const focused = selectedResources.filter(
            (resource) => resource.level !== 'Beginner' && resource.type !== 'tool'
          );
          if (focused.length > 0) {
            selectedResources = focused;
          }
        }

        if (wantsDeepTrack) {
          selectedResources = selectedResources
            .slice()
            .sort((a, b) => {
              const aLevel = levelScore[a.level] ?? 0;
              const bLevel = levelScore[b.level] ?? 0;
              if (aLevel !== bLevel) return bLevel - aLevel;

              const aHours = a.hours == null ? 0 : Number(a.hours);
              const bHours = b.hours == null ? 0 : Number(b.hours);
              if (aHours !== bHours) return bHours - aHours;

              const aTypePenalty = a.type === 'tool' ? 1 : 0;
              const bTypePenalty = b.type === 'tool' ? 1 : 0;
              return aTypePenalty - bTypePenalty;
            });

          const selectedIds = new Set(selectedResources.map((resource) => resource.id));
          let selectedEstimatedHours = selectedResources.reduce(
            (sum, resource) => sum + estimateHours(resource),
            0
          );

          if (selectedEstimatedHours < totalAvailableHours * 0.75) {
            const deepKeywords = [
              'transformer',
              'llm',
              'deep learning',
              'neural',
              'nlp',
              'research',
              'paper',
              'pytorch',
              'rl',
              'architecture'
            ];

            const expansionPool = allResources
              .filter((resource) => !selectedIds.has(resource.id))
              .filter((resource) => {
                if (!needsFoundations && resource.level === 'Beginner') return false;
                if (resource.type === 'tool') return false;
                return true;
              })
              .map((resource) => {
                const text = `${resource.title} ${resource.source} ${(resource.tags || []).join(' ')}`.toLowerCase();
                let score = (levelScore[resource.level] ?? 0) * 40;
                score += resource.type === 'material' ? 16 : 10;
                score += Math.min(80, estimateHours(resource)) / 2;
                for (const keyword of deepKeywords) {
                  if (text.includes(keyword)) score += 12;
                }
                if (text.includes('transformer') || text.includes('llm')) score += 20;
                return { resource, score };
              })
              .sort((a, b) => b.score - a.score)
              .map((entry) => entry.resource);

            for (const resource of expansionPool) {
              if (selectedEstimatedHours >= totalAvailableHours * 0.95) break;
              selectedResources.push(resource);
              selectedEstimatedHours += estimateHours(resource);
            }
          }
        }

        // ── Selection-first, granularity-aware planner ─────────────────────
        const isWeekly = durationMeta.format === 'weekly';
        const numPeriods = durationMeta.periods;
        const perPeriodHours = isWeekly ? durationMeta.perWeekHours : durationMeta.perDayHours;
        const levelRank = { Beginner: 1, Intermediate: 2, Advanced: 3 };

        // Classify a resource as "no-skim" (formal course) vs skimmable.
        const NO_SKIM_HINTS = [
          'specialization', 'university', 'mit', 'stanford', 'coursera',
          'edx', 'mooc', 'nanodegree', 'certification', 'fast.ai course',
          'deeplearning.ai'
        ];
        function classifyResource(r) {
          const text = ` ${r.title || ''} ${r.source || ''} ${(r.tags || []).join(' ')} `.toLowerCase();
          const isFormalCourse = NO_SKIM_HINTS.some((k) => text.includes(k));
          const longMaterial = (Number(r.hours) || 0) >= 25 && r.type === 'material';
          return { noSkim: isFormalCourse || longMaterial };
        }

        const goalSnippet = (goal || '').trim().slice(0, 90);

        // Phase 1: triage. Fits-as-is, skim, or defer to enhancements.
        const fitsBudget = [];
        const enhancements = [];
        for (const r of selectedResources) {
          const hrs = r.hours == null ? null : Math.max(1, Number(r.hours));
          const { noSkim } = classifyResource(r);

          if (hrs == null) {
            fitsBudget.push({
              resource: r,
              allocatedHours: r.type === 'tool' ? 2 : 4,
              originalHours: null,
              noSkim,
              reductionReason: null
            });
            continue;
          }

          if (hrs <= totalAvailableHours) {
            // Fits in full within total timeframe budget.
            fitsBudget.push({
              resource: r,
              allocatedHours: hrs,
              originalHours: hrs,
              noSkim,
              reductionReason: null
            });
          } else if (noSkim) {
            // College-style course — don't skim, suggest as an enhancement.
            enhancements.push({
              resource: r,
              originalHours: hrs,
              reason: `Full course (~${hrs}h) exceeds your ${duration} window. This is a structured course best taken on its own cadence rather than skimmed — consider it once you have more time.`
            });
          } else {
            // Skim-friendly material: allocate ~40% of original, capped, with explanation.
            const skim = Math.max(2, Math.min(Math.round(hrs * 0.4), 10));
            fitsBudget.push({
              resource: r,
              allocatedHours: skim,
              originalHours: hrs,
              noSkim: false,
              reductionReason: `Suggested ~${skim}h of the full ~${hrs}h: skim sections most relevant to "${goalSnippet}"; skip optional/advanced detours you can revisit later.`
            });
          }
        }

        // Phase 2: enforce overall budget (trim tail if AI suggested too much).
        let budgetUsed = 0;
        const within = [];
        const overflowTitles = [];
        for (const item of fitsBudget) {
          if (budgetUsed + item.allocatedHours <= totalAvailableHours) {
            within.push(item);
            budgetUsed += item.allocatedHours;
          } else {
            overflowTitles.push(item.resource.title);
          }
        }

        // Phase 3: schedule into periods (Day N for ≤1 week, Week N for ≥2 weeks).
        const buckets = Array.from({ length: numPeriods }, (_, i) => ({
          period: isWeekly ? `Week ${i + 1}` : `Day ${i + 1}`,
          focus: '',
          resources: [],
          resourceIds: [],
          plannedHours: 0
        }));

        const periodPrefix = isWeekly ? 'Week' : 'Day';
        const periodSpanLabel = (startIdx, endIdx) =>
          startIdx === endIdx
            ? `${periodPrefix} ${startIdx + 1}`
            : `${periodPrefix} ${startIdx + 1}-${endIdx + 1}`;

        // Place largest items first so big multi-period courses anchor the schedule.
        const sorted = within.slice().sort((a, b) => b.allocatedHours - a.allocatedHours);
        for (const item of sorted) {
          const rawSpan = Math.max(1, Math.ceil(item.allocatedHours / perPeriodHours));
          const span = Math.min(rawSpan, buckets.length);
          const maxStart = Math.max(0, buckets.length - span);

          let bestStart = 0;
          let bestScore = Infinity;
          for (let i = 0; i <= maxStart; i++) {
            let score = 0;
            for (let j = 0; j < span; j++) {
              const chunk = item.allocatedHours / span;
              const projected = buckets[i + j].plannedHours + chunk;
              const overPenalty = projected > perPeriodHours ? (projected - perPeriodHours) * 100 : 0;
              score += overPenalty + projected;
            }
            if (score < bestScore) {
              bestScore = score;
              bestStart = i;
            }
          }

          const chunk = item.allocatedHours / span;
          const startIdx = bestStart;
          const endIdx = bestStart + span - 1;
          const spanLabel = periodSpanLabel(startIdx, endIdx);

          for (let j = 0; j < span; j++) {
            const b = buckets[startIdx + j];
            b.resources.push({
              ...item.resource,
              hours: Math.round(chunk * 10) / 10,
              sessionHours: Math.round(chunk * 10) / 10,
              originalHours: item.originalHours,
              partial: item.originalHours != null && item.allocatedHours < item.originalHours,
              noSkim: item.noSkim,
              reductionReason: item.reductionReason,
              scheduleSpanStart: startIdx + 1,
              scheduleSpanEnd: endIdx + 1,
              scheduleSpanLabel: spanLabel
            });
            b.resourceIds.push(item.resource.id);
            b.plannedHours += chunk;
            if (!b.focus) {
              b.focus = focusById[item.resource.id] || 'Focused learning';
            }
          }
        }

        // Phase 4: render plan with consolidation periods for empty buckets.
        const normalizedPlan = buckets.map((b) => {
          if (b.resources.length === 0) {
            return {
              period: b.period,
              focus: 'Consolidation and practice',
              notes: isWeekly
                ? `Lighter ${b.period.toLowerCase()}: review prior weeks, revisit hard concepts, and apply your learning to a small project.`
                : 'Light day (~3-4h): review notes, revisit hard concepts, and practice.',
              resourceIds: [],
              resources: []
            };
          }

          const periodLevel = b.resources.reduce((acc, r) => {
            const rank = levelRank[r.level] || 1;
            return rank > acc.rank ? { rank, label: r.level } : acc;
          }, { rank: 1, label: 'Beginner' }).label;

          const planned = Math.round(b.plannedHours);
          const note = isWeekly
            ? `Plan ~${planned}h this week (target ~${perPeriodHours}h/week, 4-6h on study days). Difficulty: ${periodLevel}.`
            : `Plan ~${planned}h today (target 4-6h). Difficulty: ${periodLevel}.`;

          return {
            period: b.period,
            focus: b.focus,
            notes: note,
            resourceIds: b.resourceIds,
            resources: b.resources
          };
        });

        const summaryBase = typeof plan.summary === 'string' && plan.summary.trim()
          ? plan.summary.trim()
          : 'Personalized plan generated from portal resources.';

        const totalUsed = Math.round(budgetUsed);
        const paceNote = isWeekly
          ? `Built for a sustainable pace: ~${totalUsed}h across ${numPeriods} week(s), targeting ~${perPeriodHours}h/week.`
          : `Built for a sustainable pace: ~${totalUsed}h across ${numPeriods} day(s), targeting ~${perPeriodHours}h/day.`;
        const enhancementNote = enhancements.length > 0
          ? ` ${enhancements.length} fuller course(s) suggested under "If you have more time".`
          : '';
        const overflowNote = overflowTitles.length > 0
          ? ` Trimmed to fit timeframe: ${[...new Set(overflowTitles)].slice(0, 3).join(', ')}${overflowTitles.length > 3 ? '…' : ''}.`
          : '';

        return json({
          plan: normalizedPlan,
          format: durationMeta.format,
          enhancements: enhancements.map((e) => ({
            id: e.resource.id,
            title: e.resource.title,
            url: e.resource.url,
            source: e.resource.source,
            type: e.resource.type,
            level: e.resource.level,
            hours: e.originalHours,
            tags: e.resource.tags || [],
            reason: e.reason
          })),
          summary: `${summaryBase} ${paceNote}${enhancementNote}${overflowNote}`
        });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /api/votes — vote counts for all resources
    if (pathname === '/api/votes' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT resource_id, COUNT(*) as count FROM resource_votes GROUP BY resource_id'
        ).all();
        const votes = {};
        for (const row of results) {
          votes[row.resource_id] = row.count;
        }
        return json({ votes });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /api/vote — toggle vote on a resource (one vote per voter_id)
    // Body: { resource_id: string, voter_id: string }
    if (pathname === '/api/vote' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { resource_id, voter_id } = body;
        if (!resource_id || !voter_id) {
          return json({ error: 'resource_id and voter_id are required' }, 400);
        }

        // Check if vote already exists
        const existing = await env.DB.prepare(
          'SELECT 1 FROM resource_votes WHERE resource_id = ? AND voter_id = ?'
        ).bind(resource_id, voter_id).first();

        if (existing) {
          // Toggle off — remove the vote
          await env.DB.prepare(
            'DELETE FROM resource_votes WHERE resource_id = ? AND voter_id = ?'
          ).bind(resource_id, voter_id).run();
          // Return new count
          const row = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM resource_votes WHERE resource_id = ?'
          ).bind(resource_id).first();
          return json({ voted: false, count: row?.count ?? 0 });
        } else {
          // Add vote
          await env.DB.prepare(
            'INSERT INTO resource_votes (resource_id, voter_id) VALUES (?, ?)'
          ).bind(resource_id, voter_id).run();
          const row = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM resource_votes WHERE resource_id = ?'
          ).bind(resource_id).first();
          return json({ voted: true, count: row?.count ?? 0 });
        }
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /api/feedback — submit thumbs up/down feedback for a generated plan
    if (pathname === '/api/feedback' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { thumbs, note, plan_background, plan_goal, plan_duration } = body;

        if (thumbs !== 1 && thumbs !== -1) {
          return json({ error: 'thumbs must be 1 (up) or -1 (down)' }, 400);
        }

        await env.DB.prepare(
          `INSERT INTO plan_feedback (thumbs, note, plan_background, plan_goal, plan_duration)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(thumbs, note || null, plan_background || null, plan_goal || null, plan_duration || null)
          .run();

        return json({ success: true }, 201);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── Admin helper (used by multiple routes below) ─────────────────────────
    function isAdmin() {
      const keyParam = url.searchParams.get('key');
      const authHeader = request.headers.get('Authorization');
      const expectedKey = env.ADMIN_KEY || 'change-me-before-deploy';
      if (keyParam && keyParam === expectedKey) return true;
      if (authHeader && authHeader === `Bearer ${expectedKey}`) return true;
      return false;
    }

    // POST /admin-api/seed-vectors — embed resources (chunked) and upsert into Vectorize
    // Body: { start: 0, end: 10 } — index range of flattened resource list (exclusive end)
    // Call multiple times to cover all resources. Omit body to get total count.
    if (pathname === '/admin-api/seed-vectors' && request.method === 'POST') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        // Flatten all resources with stable indices
        const allResources = [];
        for (const section of sections) {
          for (let i = 0; i < section.resources.length; i++) {
            allResources.push({ sectionId: section.id, index: i, resource: section.resources[i] });
          }
        }

        // Parse body for chunk range
        let bodyText = '';
        try { bodyText = await request.text(); } catch (_) {}
        let start = 0, end = allResources.length;
        if (bodyText.trim()) {
          try {
            const body = JSON.parse(bodyText);
            if (typeof body.start === 'number') start = body.start;
            if (typeof body.end === 'number') end = body.end;
          } catch (_) {}
        }

        const chunk = allResources.slice(start, end);
        if (chunk.length === 0) {
          return json({ success: true, total: allResources.length, embedded: 0, message: 'No resources in range' });
        }

        const vectors = [];
        for (const { sectionId, index, resource: r } of chunk) {
          const text = [r.title, r.source, r.description, r.type, r.level, ...(r.tags || [])]
            .filter(Boolean).join('. ');

          const embedResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
          const vector = embedResponse?.data?.[0] || embedResponse?.result?.data?.[0];
          if (!vector) throw new Error(`Failed to embed: ${r.title}`);

          vectors.push({
            id: `${sectionId}_${index}`,
            values: vector,
            metadata: { section: sectionId, title: r.title, type: r.type, level: r.level },
          });
        }

        const upsertResult = await env.VECTORIZE.upsert(vectors);
        return json({ success: true, total: allResources.length, embedded: vectors.length, range: [start, end], upsertResult });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /api/search?q= — semantic search via Vectorize
    if (pathname === '/api/search' && request.method === 'GET') {
      const q = url.searchParams.get('q') || '';
      if (!q.trim()) {
        return json({ ids: null }); // empty query = show all
      }
      try {
        // Embed the query
        const embedResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [q]
        });
        const queryVector = embedResponse?.data?.[0] || embedResponse?.result?.data?.[0];
        if (!queryVector) {
          return json({ error: 'Failed to embed query' }, 500);
        }

        // Query Vectorize for top 30 matches
        const results = await env.VECTORIZE.query(queryVector, {
          topK: 30,
          returnMetadata: true
        });

        const ids = (results.matches || []).map(m => m.id);
        return json({ ids });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── Admin API (protected by ADMIN_KEY) ──────────────────────────────────

    // GET /admin-api/submissions?key=SECRET — list all pending submissions
    if (pathname === '/admin-api/submissions' && request.method === 'GET') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        const { results } = await env.DB.prepare(
          'SELECT * FROM community_submissions ORDER BY approved ASC, submitted_at DESC'
        ).all();
        const submissions = results.map((row) => ({
          ...row,
          tags: JSON.parse(row.tags || '[]')
        }));
        return json({ submissions });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /admin-api/approve — approve a submission
    if (pathname === '/admin-api/approve' && request.method === 'POST') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        const { id } = await request.json();
        if (!id) return json({ error: 'id is required' }, 400);
        await env.DB.prepare(
          'UPDATE community_submissions SET approved = 1 WHERE id = ?'
        ).bind(id).run();
        return json({ success: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /admin-api/feedback?key=SECRET — list all plan feedback
    if (pathname === '/admin-api/feedback' && request.method === 'GET') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        const { results } = await env.DB.prepare(
          'SELECT * FROM plan_feedback ORDER BY submitted_at DESC LIMIT 200'
        ).all();
        // Also compute totals
        const upCount = results.filter(r => r.thumbs === 1).length;
        const downCount = results.filter(r => r.thumbs === -1).length;
        return json({ feedback: results, upCount, downCount, total: results.length });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /admin-api/reject — reject (delete) a submission
    if (pathname === '/admin-api/reject' && request.method === 'POST') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        const { id } = await request.json();
        if (!id) return json({ error: 'id is required' }, 400);
        await env.DB.prepare(
          'DELETE FROM community_submissions WHERE id = ?'
        ).bind(id).run();
        return json({ success: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /admin-api/suggestions?key=SECRET — list RSS-discovered resource suggestions
    if (pathname === '/admin-api/suggestions' && request.method === 'GET') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        const { results } = await env.DB.prepare(
          `SELECT * FROM resource_suggestions WHERE status = 'pending_review'
           ORDER BY discovered_at DESC LIMIT 100`
        ).all();
        return json({ suggestions: results });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /admin-api/approve-suggestion — approve a suggestion (moves to resources table)
    // Body: { id, section, type, level, tags }
    if (pathname === '/admin-api/approve-suggestion' && request.method === 'POST') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        const body = await request.json();
        const { id, section, type, level, tags } = body;
        if (!id || !section || !type || !level) {
          return json({ error: 'id, section, type, and level are required' }, 400);
        }

        // Fetch the suggestion
        const suggestion = await env.DB.prepare(
          'SELECT * FROM resource_suggestions WHERE id = ?'
        ).bind(id).first();
        if (!suggestion) return json({ error: 'Suggestion not found' }, 404);

        // Insert into resources table
        const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
        const insertResult = await env.DB.prepare(
          `INSERT INTO resources (section, title, source, description, type, level, tags, url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          section, suggestion.title, suggestion.source || '',
          suggestion.description || '', type, level, tagsJson, suggestion.url
        ).run();

        // Mark suggestion as approved
        await env.DB.prepare(
          `UPDATE resource_suggestions SET status = 'approved' WHERE id = ?`
        ).bind(id).run();

        return json({ success: true, new_resource_id: insertResult.meta.last_row_id });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /admin-api/reject-suggestion — reject a suggestion
    if (pathname === '/admin-api/reject-suggestion' && request.method === 'POST') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        const { id } = await request.json();
        if (!id) return json({ error: 'id is required' }, 400);
        await env.DB.prepare(
          `UPDATE resource_suggestions SET status = 'rejected' WHERE id = ?`
        ).bind(id).run();
        return json({ success: true });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // POST /admin-api/run-rss — manually trigger RSS scan (admin only)
    if (pathname === '/admin-api/run-rss' && request.method === 'POST') {
      if (!isAdmin()) return json({ error: 'Unauthorized' }, 401);
      try {
        // Reuse scheduled logic
        let added = 0;
        for (const feed of RSS_FEEDS) {
          try {
            const res = await fetch(feed.url, { headers: { 'User-Agent': 'ai-resources-bot/1.0' } });
            if (!res.ok) continue;
            const xml = await res.text();
            const items = parseFeedItems(xml);

            for (const item of items.slice(0, 10)) {
              const existing = await env.DB.prepare(
                'SELECT 1 FROM resource_suggestions WHERE url = ? LIMIT 1'
              ).bind(item.url).first();
              if (existing) continue;

              const existingResource = await env.DB.prepare(
                'SELECT 1 FROM resources WHERE url = ? LIMIT 1'
              ).bind(item.url).first();
              if (existingResource) continue;

              const classifyResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                messages: [
                  { role: 'system', content: 'You are a classifier. Respond with only "yes" or "no".' },
                  { role: 'user', content: `Is this an AI/ML learning resource (course, tutorial, guide, tool, or dataset)? Title: "${item.title}". Description: "${item.description}". Answer only yes or no.` }
                ],
                max_tokens: 5
              });
              const answer = (classifyResponse?.response || '').toLowerCase().trim();
              if (!answer.startsWith('yes')) continue;

              await env.DB.prepare(
                `INSERT OR IGNORE INTO resource_suggestions (title, url, source, description, feed_source)
                 VALUES (?, ?, ?, ?, ?)`
              ).bind(item.title, item.url, feed.name, item.description, feed.name).run();
              added++;
            }
          } catch (_) {}
        }
        return json({ success: true, added });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── Static assets (SPA fallback) ─────────────────────────────────────────
    return env.ASSETS.fetch(request);
  }
};
