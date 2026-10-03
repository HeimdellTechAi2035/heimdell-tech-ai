let cached = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

async function loadCatalogue() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  const base = process.env.URL || 'https://heimdell-tech-ai.co.uk';
  const res = await fetch(`${base}/knowledge/catalogue.json`);
  if (!res.ok) throw new Error(`catalogue fetch failed: ${res.status}`);
  cached = await res.json();
  cachedAt = Date.now();
  return cached;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'what',
  'how', 'why', 'when', 'where', 'who', 'which', 'to', 'of', 'for', 'in',
  'on', 'and', 'or', 'i', 'you', 'we', 'my', 'your', 'our', 'it', 'this',
  'that', 'can', 'will', 'with', 'be', 'have', 'has', 'if', 'me'
]);

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9£%\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function score(queryTokens, fields) {
  // fields: { question: str, aliases: str[], answer: str, tags: str[] }
  let s = 0;
  const qSet = new Set(queryTokens);
  const bump = (text, weight) => {
    const tokens = tokenize(text);
    for (const t of tokens) if (qSet.has(t)) s += weight;
  };
  bump(fields.question || '', 3);
  for (const a of fields.aliases || []) bump(a, 3);
  bump(fields.answer || '', 1);
  for (const t of fields.tags || []) bump(t, 2);
  return s;
}

export async function searchFaqs(query, limit = 3) {
  const catalogue = await loadCatalogue();
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { matches: [], catalogueVersion: catalogue.version };

  const scored = (catalogue.faqs || []).map((faq) => ({
    faq,
    s: score(qTokens, {
      question: faq.question,
      aliases: faq.aliases || [],
      answer: faq.answer,
      tags: faq.tags || []
    })
  }));

  scored.sort((a, b) => b.s - a.s);
  const matches = scored
    .filter((x) => x.s > 0)
    .slice(0, limit)
    .map((x) => ({
      id: x.faq.id,
      question: x.faq.question,
      answer: x.faq.answer,
      score: x.s,
      source: x.faq.source
    }));

  return { matches, catalogueVersion: catalogue.version };
}

export async function getOrganisation() {
  const catalogue = await loadCatalogue();
  return catalogue.organisation;
}

export async function getServices() {
  const catalogue = await loadCatalogue();
  return catalogue.services;
}
