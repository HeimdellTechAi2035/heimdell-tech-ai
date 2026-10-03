let cached = null;
let cachedEntries = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

async function loadCatalogue() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  const base = process.env.URL || 'https://heimdell-tech-ai.co.uk';
  const res = await fetch(`${base}/knowledge/catalogue.json`);
  if (!res.ok) throw new Error(`catalogue fetch failed: ${res.status}`);
  cached = await res.json();
  cachedEntries = null;
  cachedAt = Date.now();
  return cached;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'what',
  'how', 'why', 'when', 'where', 'who', 'which', 'to', 'of', 'for', 'in',
  'on', 'and', 'or', 'i', 'you', 'we', 'my', 'your', 'our', 'it', 'this',
  'that', 'can', 'will', 'with', 'be', 'have', 'has', 'if', 'me', 'about',
  'tell', 'please'
]);

// Light stemming so "pay", "payment" and "payments" match, as do "price"/"prices" and "implement"/"implementation".
function stem(t) {
  const strip = (s, re) => { const r = s.replace(re, ''); return r.length >= 3 ? r : s; };
  if (t.length <= 3) return t;
  let s = t;
  if (/ies$/.test(s) && s.length > 4) s = s.replace(/ies$/, 'y');
  s = strip(s, /(ing|ed|ly)$/);
  s = strip(s, /ments?$/);
  s = strip(s, /ations?$/);
  s = strip(s, /es$/);
  if (!/ss$/.test(s)) s = strip(s, /s$/);
  s = strip(s, /e$/);
  return s;
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9£%\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem);
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

const join = (arr) => arr.filter(Boolean).join(', ');

// Turns every section of the catalogue (not just the FAQs) into answerable entries, so the assistant knows all of it.
function buildEntries(c) {
  const entries = [];
  for (const f of c.faqs || []) {
    entries.push({ id: f.id, kind: 'faq', weight: 1, question: f.question, answer: f.answer, tags: f.tags || [], aliases: f.aliases || [], source: f.source });
  }
  const org = c.organisation || {};
  const site = org.website || 'https://heimdell-tech-ai.co.uk/';
  const add = (id, kind, question, answer, aliases, tags, source) =>
    entries.push({ id, kind, weight: kind === 'service' ? 0.6 : 0.9, question, answer, aliases: aliases || [], tags: tags || [kind], source: source || site });

  for (const s of c.services || []) {
    add(`service-${s.id}`, 'service', `What is ${s.name}?`,
      `${s.name}: ${s.summary}${s.pricingModel ? ` Pricing: ${s.pricingModel}` : ''}${s.url ? ` More: ${s.url}` : ''}`,
      [s.name], ['service', s.id], s.url);
  }
  if (org.email) {
    add('org-contact', 'organisation', 'How do I contact Heimdell Tech Ai?',
      `You can reach Heimdell Tech Ai by email at ${org.email} or through the contact page: ${site}contact.html.${org.openingHours ? ` Opening hours: ${org.openingHours}.` : ''}`,
      ['contact details', 'email address', 'how can I get in touch', 'phone number', 'telephone number', 'can I call you', 'speak to someone', 'contact'],
      ['contact', 'email'], `${site}contact.html`);
  }
  const a = org.address || {};
  if (a.streetAddress) {
    add('org-address', 'organisation', 'Where is Heimdell Tech Ai based?',
      `${org.tradingName || org.legalName || 'Heimdell Tech Ai'} is based at ${join([a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode])}, United Kingdom, and works with businesses across the whole UK.`,
      ['address', 'office address', 'where are you', 'location', 'where are you located', 'postcode', 'registered office'], ['address', 'location'], `${site}contact.html`);
  }
  if (org.openingHours) {
    add('org-hours', 'organisation', 'What are your opening hours?', `Heimdell Tech Ai's opening hours are ${org.openingHours}.`,
      ['when are you open', 'opening times', 'business hours', 'office hours', 'what time do you open'], ['hours', 'opening'], `${site}contact.html`);
  }
  if (org.companiesHouse) {
    add('org-registration', 'organisation', "What is Heimdell Tech Ai's company number?",
      `${org.legalName || 'Heimdell Tech Ai Ltd'} is registered in England and Wales, Companies House number ${org.companiesHouse}${org.icoRegistration ? `, ICO registration ${org.icoRegistration}` : ''}${org.duns ? `, D-U-N-S ${org.duns}` : ''}.` +
      `${(org.sicDescriptions || []).length ? ` Business activities: ${join(org.sicDescriptions)}.` : ''}`,
      ['companies house', 'company registration', 'ICO registration', 'is Heimdell registered', 'registered company', 'DUNS number', 'SIC code', 'legal name'], ['company', 'registration'], `${site}about.html`);
  }
  if (org.founder) {
    add('org-founder', 'organisation', 'Who founded Heimdell Tech Ai?',
      `${org.legalName || 'Heimdell Tech Ai Ltd'} was founded${org.foundingDate ? ` on ${org.foundingDate}` : ''} by ${org.founder}.`,
      ['who runs Heimdell', 'who is the founder', 'who owns Heimdell', 'who is the director', 'about the founder', 'Andrew James-Smith'], ['founder', 'about'], `${site}about.html`);
  }
  if ((c.expertise || []).length) {
    add('org-expertise', 'organisation', 'What does Heimdell Tech Ai specialise in?', `Heimdell Tech Ai's areas of expertise include: ${join(c.expertise)}.`,
      ['expertise', 'what are you good at', 'specialisms', 'areas of expertise', 'skills'], ['expertise'], `${site}about.html`);
  }
  const p = c.products || {};
  const prods = [p.flagship, ...(p.other || [])].filter(Boolean);
  if (prods.length) {
    add('org-products', 'organisation', 'What products does Heimdell Tech Ai have?',
      prods.map((x, i) => `${i === 0 ? 'Main product' : 'Also'}: ${x.name}${x.description ? ` (${x.description})` : ''}${x.url ? ` ${x.url}` : ''}`).join(' '),
      ['products', 'what do you sell', 'what do you build', 'your software', 'flagship product', 'apps'], ['products'], site);
  }
  if ((c.policies || []).length) {
    add('org-policies', 'policy', 'Where can I read the privacy policy or terms of service?', c.policies.map((x) => `${x.title}: ${x.url}`).join(' | '),
      ['privacy policy', 'terms of service', 'terms and conditions', 'legal', 'data protection policy', 'GDPR policy'], ['policy', 'privacy', 'terms'], (c.policies[0] || {}).url);
  }
  const rev = c.reviewsAndTestimonials;
  if (rev && rev.note) {
    add('org-reviews', 'organisation', 'Do you have customer reviews or testimonials?', rev.note,
      ['testimonials', 'reviews', 'customer feedback', 'case studies', 'references', 'what do customers say'], ['reviews', 'testimonials'], `${site}case-studies.html`);
  }
  return entries;
}

async function getEntries() {
  const c = await loadCatalogue();
  if (!cachedEntries) cachedEntries = buildEntries(c);
  return { catalogue: c, entries: cachedEntries };
}

export async function searchKnowledge(query, limit = 3) {
  const { catalogue, entries } = await getEntries();
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { matches: [], catalogueVersion: catalogue.version };

  const scored = entries.map((e) => ({ e, s: score(qTokens, e) * e.weight }));
  scored.sort((a, b) => b.s - a.s);
  const matches = scored
    .filter((x) => x.s > 0)
    .slice(0, limit)
    .map((x) => ({
      id: x.e.id,
      kind: x.e.kind,
      question: x.e.question,
      answer: x.e.answer,
      score: Math.round(x.s * 10) / 10,
      source: x.e.source
    }));

  return { matches, catalogueVersion: catalogue.version };
}

// Kept so anything that still imports the old name keeps working.
export const searchFaqs = searchKnowledge;

export async function getOrganisation() {
  const catalogue = await loadCatalogue();
  return catalogue.organisation;
}

export async function getServices() {
  const catalogue = await loadCatalogue();
  return catalogue.services;
}
