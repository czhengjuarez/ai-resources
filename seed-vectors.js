#!/usr/bin/env node
/**
 * seed-vectors.js
 * 
 * Embeds all resources from resources.js using Cloudflare Workers AI REST API
 * and upserts vectors into the Vectorize index.
 * 
 * Usage:
 *   CLOUDFLARE_API_TOKEN=<your-token> node seed-vectors.js
 * 
 * Or set in .env:
 *   CLOUDFLARE_API_TOKEN=...
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env if present
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim();
    }
  }
} catch (_) { /* no .env file, that's fine */ }

// ---- Config ----------------------------------------------------------------
const ACCOUNT_ID = 'd6ff2f0914adb1d9faae77870fadb7cc';
const INDEX_NAME = 'ai-resources-search';
const MODEL      = '@cf/baai/bge-base-en-v1.5';
const API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;

if (!API_TOKEN) {
  console.error('ERROR: CLOUDFLARE_API_TOKEN env var is required.');
  process.exit(1);
}

const AI_BASE  = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${encodeURIComponent(MODEL)}`;
const VEC_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${INDEX_NAME}`;

// ---- Load resources from static JS -----------------------------------------
// We need to import the ES module. Use dynamic import.
const { sections } = await import('./src/data/resources.js');

// Flatten all resources with stable IDs
const resources = [];
for (const section of sections) {
  for (let i = 0; i < section.resources.length; i++) {
    const r = section.resources[i];
    resources.push({
      id: `${section.id}_${i}`,
      section: section.id,
      ...r,
    });
  }
}

console.log(`Found ${resources.length} resources to embed.`);

// ---- Helper: embed text via Workers AI REST API ----------------------------
async function embed(text) {
  const res = await fetch(AI_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text] }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`AI embed failed: ${JSON.stringify(data.errors)}`);
  }
  return data.result.data[0]; // float32 array
}

// ---- Helper: upsert a batch of vectors into Vectorize ----------------------
async function upsertVectors(vectors) {
  // Vectorize v2 expects NDJSON body
  const ndjson = vectors
    .map(v => JSON.stringify(v))
    .join('\n');

  const res = await fetch(`${VEC_BASE}/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/x-ndjson',
    },
    body: ndjson,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Vectorize upsert failed: ${JSON.stringify(data.errors)}`);
  }
  return data.result;
}

// ---- Main ------------------------------------------------------------------
const BATCH_SIZE = 10;
const allVectors = [];

for (let i = 0; i < resources.length; i++) {
  const r = resources[i];
  const text = [
    r.title,
    r.source,
    r.description,
    r.type,
    r.level,
    ...(r.tags || []),
  ].filter(Boolean).join('. ');

  process.stdout.write(`[${i + 1}/${resources.length}] Embedding: ${r.title} ... `);
  
  try {
    const vector = await embed(text);
    allVectors.push({
      id: r.id,
      values: vector,
      metadata: {
        section: r.section,
        title: r.title,
        type: r.type,
        level: r.level,
      },
    });
    console.log('OK');
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
  }

  // Small delay to avoid rate limiting
  if ((i + 1) % BATCH_SIZE === 0) {
    await new Promise(r => setTimeout(r, 500));
  }
}

console.log(`\nUpserting ${allVectors.length} vectors into Vectorize...`);

// Upload in batches of 100 (Vectorize limit)
const UPSERT_BATCH = 100;
for (let i = 0; i < allVectors.length; i += UPSERT_BATCH) {
  const batch = allVectors.slice(i, i + UPSERT_BATCH);
  const result = await upsertVectors(batch);
  console.log(`Upserted batch (${i + 1}–${Math.min(i + UPSERT_BATCH, allVectors.length)}):`, result);
}

console.log('\nDone! Vectorize index is seeded.');
