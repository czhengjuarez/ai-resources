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

export default {
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
            meta: JSON.parse(row.meta || '[]')
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
            url: r.url
          }))
        );

        // Use compact format — just ID, title, type, level — to stay within context limits
        const resourceIndex = allResources
          .map((r, i) => `${i + 1}. [${r.id}] ${r.title} — ${r.type}, ${r.level}`)
          .join('\n');

        const prompt = `You are an AI learning advisor. Create a learning plan.

Student background: ${background}
Goal: ${goal}
Duration: ${duration}

RULES:
- Only use resource IDs from the list below (format: section::Title)
- Return ONLY a JSON object, no other text

Available resources:
${resourceIndex}

Required JSON format:
{"plan":[{"period":"Day 1","focus":"theme","resourceIds":["section::Title"],"notes":"tip"}],"summary":"overview"}`;

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
        const enrichedPlan = plan.plan.map((period) => ({
          ...period,
          resources: (period.resourceIds || [])
            .map((id) => resourceMap[id])
            .filter(Boolean)
        }));

        return json({ plan: enrichedPlan, summary: plan.summary });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // ── Static assets (SPA fallback) ─────────────────────────────────────────
    return env.ASSETS.fetch(request);
  }
};
