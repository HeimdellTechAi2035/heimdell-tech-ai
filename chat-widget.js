/* Ask Heimdell: FAQ chat widget for heimdell-tech-ai.co.uk
 * - Answers come from the published knowledge catalogue (/knowledge/catalogue.json) through the self-hosted A2A assistant.
 *   There is no generative AI: answers are pre-written, curated text.
 * - "Topics" lets visitors browse every FAQ. If the assistant is unreachable, the widget searches the catalogue itself.
 * - No cookies, no localStorage, no analytics. Messages are sent only to the assistant endpoint.
 * Optional script-tag attributes: data-assistant, data-catalogue, data-site, data-contact, data-privacy
 */
(function () {
  'use strict';
  if (window.__heimdellChat) return;
  window.__heimdellChat = true;

  var script = document.currentScript;
  var cfg = function (k, d) { return (script && script.dataset && script.dataset[k]) || d; };
  var ASSISTANT = cfg('assistant', 'https://agent.heimdell-tech-ai.co.uk/a2a/v1');
  var CATALOGUE = cfg('catalogue', '/knowledge/catalogue.json');
  var SITE = cfg('site', 'https://heimdell-tech-ai.co.uk').replace(/\/$/, '');
  var CONTACT = cfg('contact', '/contact.html');
  var PRIVACY = cfg('privacy', '/privacy-policy.html#chat');
  var MAXLEN = 300;
  var SUGGESTIONS = ['How much does it cost?', 'What is the A2A protocol?', 'Is there a free website scan?', 'Do you still offer TPV?', 'Where are you based?'];

  var seq = 0, busy = false, lastSend = 0;
  var ctx = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'ctx-' + Math.random().toString(36).slice(2);
  var catalogue = null, catalogueLoading = null, entries = [];

  /* ---------- host + shadow root ---------- */
  var host = document.createElement('div');
  host.id = 'heimdell-chat';
  host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:99990;';
  var root = host.attachShadow({ mode: 'open' });

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.launch{display:flex;align-items:center;gap:8px;border:0;cursor:pointer;color:#fff;font-size:15px;font-weight:600;padding:14px 18px;border-radius:999px;',
    'background:linear-gradient(135deg,#2D1B69,#4A2D8F);box-shadow:0 6px 20px rgba(45,27,105,.35)}',
    '.launch:hover{background:linear-gradient(135deg,#4A2D8F,#6B42C2)}',
    '.launch svg{width:22px;height:22px;flex:none}',
    'button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #8B5CF6;outline-offset:2px}',
    '.panel{position:absolute;right:0;bottom:64px;width:390px;max-width:calc(100vw - 24px);height:min(620px,calc(100vh - 150px));display:flex;flex-direction:column;',
    'background:#fff;color:#14171f;border:1px solid #D4C2F0;border-radius:16px;box-shadow:0 12px 40px rgba(20,10,60,.28);overflow:hidden}',
    '.panel[hidden],.browse[hidden],.log[hidden]{display:none}',
    'header{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(135deg,#2D1B69,#4A2D8F);color:#fff}',
    '.hd{flex:1;min-width:0;display:flex;flex-direction:column}.hd strong{font-size:16px}.hd span{font-size:12px;opacity:.85}',
    '.ic{border:1px solid rgba(255,255,255,.45);background:transparent;color:#fff;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer}',
    '.ic:hover{background:rgba(255,255,255,.15)}',
    '.body{flex:1;min-height:0;display:flex;flex-direction:column}',
    '.log,.browse{flex:1;overflow-y:auto;padding:14px;background:#faf8ff}',
    '.m{max-width:88%;margin:0 0 10px;padding:10px 12px;border-radius:14px;font-size:14.5px;line-height:1.5;word-wrap:break-word;overflow-wrap:anywhere}',
    '.m a{color:#4A2D8F;text-decoration:underline}',
    '.bot{background:#EFE7FC;border-bottom-left-radius:4px}.user{margin-left:auto;background:#2D1B69;color:#fff;border-bottom-right-radius:4px}',
    '.note{font-size:12.5px;color:#5b6270;margin:-4px 0 10px 2px}',
    '.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}',
    '.chip{border:1px solid #C9B6EE;background:#fff;color:#2D1B69;border-radius:999px;padding:7px 12px;font-size:13.5px;cursor:pointer;text-align:left}',
    '.chip:hover{background:#EFE7FC}',
    '.src{display:inline-block;margin-top:6px;font-size:12.5px}',
    '.typing{display:inline-flex;gap:4px;padding:4px 2px}.typing i{width:7px;height:7px;border-radius:50%;background:#7a6aa8;animation:b 1s infinite ease-in-out}',
    '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}',
    '@media (prefers-reduced-motion:reduce){.typing i{animation:none;opacity:.7}}',
    '.send{display:flex;gap:8px;padding:10px;border-top:1px solid #E1D6F5;background:#fff}',
    '.send input{flex:1;min-width:0;border:1px solid #C9B6EE;border-radius:10px;padding:10px 12px;font-size:15px;color:#14171f;background:#fff}',
    '.send button{border:0;border-radius:10px;padding:0 16px;background:#2D1B69;color:#fff;font-weight:600;font-size:14px;cursor:pointer}',
    '.send button:disabled{opacity:.55;cursor:wait}',
    'footer{padding:8px 12px 10px;font-size:11.5px;line-height:1.45;color:#5b6270;background:#fff;border-top:1px solid #F0E9FB}footer a{color:#4A2D8F}',
    '.bsearch{width:100%;border:1px solid #C9B6EE;border-radius:10px;padding:10px 12px;font-size:15px;margin-bottom:10px}',
    '.topic{margin:0 0 8px;border:1px solid #E1D6F5;border-radius:10px;background:#fff}',
    '.topic>button{width:100%;display:flex;justify-content:space-between;gap:8px;border:0;background:transparent;padding:11px 12px;font-size:14.5px;font-weight:600;color:#2D1B69;cursor:pointer;text-align:left}',
    '.topic ul{list-style:none;margin:0;padding:0 8px 8px}.topic li button{width:100%;text-align:left;border:0;background:transparent;padding:8px 6px;font-size:14px;color:#14171f;cursor:pointer;border-radius:6px}',
    '.topic li button:hover{background:#EFE7FC}.empty{font-size:14px;color:#5b6270;padding:8px 2px}',
    '@media (max-width:480px){.panel{position:fixed;right:0;left:0;top:0;bottom:var(--bar,0);width:auto;max-width:none;height:auto;border-radius:0;border:0}',
    '.lbl{display:none}.launch{padding:14px}}'
  ].join('');

  root.innerHTML =
    '<style>' + CSS + '</style>' +
    '<button class="launch" type="button" aria-expanded="false" aria-controls="panel" aria-label="Open chat: Ask Heimdell">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 1 1 21 12z"/></svg>' +
      '<span class="lbl">Ask us</span></button>' +
    '<section class="panel" id="panel" role="dialog" aria-label="Ask Heimdell chat" hidden>' +
      '<header><div class="hd"><strong>Ask Heimdell</strong><span>Answers from our published knowledge base</span></div>' +
        '<button class="ic" type="button" data-act="topics" aria-label="Browse all topics">Topics</button>' +
        '<button class="ic" type="button" data-act="close" aria-label="Close chat">Close</button></header>' +
      '<div class="body"><div class="log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
        '<div class="browse" hidden></div></div>' +
      '<form class="send" autocomplete="off"><input type="text" maxlength="' + MAXLEN + '" aria-label="Your question" placeholder="Ask about services, prices or AI agents"><button type="submit">Send</button></form>' +
      '<footer>Automated assistant giving pre-written answers. It is not legal or compliance advice, so please don\'t enter personal information. ' +
        '<a href="' + PRIVACY + '">Privacy</a> &middot; <a href="' + CONTACT + '">Contact a person</a></footer>' +
    '</section>';

  var $ = function (s) { return root.querySelector(s); };
  var launch = $('.launch'), panel = $('.panel'), log = $('.log'), browse = $('.browse'), form = $('.send'), input = $('.send input'), sendBtn = $('.send button');

  /* ---------- helpers ---------- */
  var URLRE = /(https?:\/\/[^\s<>"']+|(?:www\.)?heimdell-tech-ai\.co\.uk(?:\/[^\s<>"']*)?|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  function linkify(text) {
    var frag = document.createDocumentFragment();
    String(text).split('\n').forEach(function (line, i) {
      if (i) frag.appendChild(document.createElement('br'));
      var last = 0, m; URLRE.lastIndex = 0;
      while ((m = URLRE.exec(line))) {
        var raw = m[0], trail = '', t = raw.match(/[.,;:!?)|]+$/);
        if (t) { trail = t[0]; raw = raw.slice(0, -trail.length); }
        frag.appendChild(document.createTextNode(line.slice(last, m.index)));
        var a = document.createElement('a');
        if (raw.indexOf('@') > -1 && !/^https?:/.test(raw)) a.href = 'mailto:' + raw;
        else { a.href = /^https?:/.test(raw) ? raw : 'https://' + raw.replace(/^www\./, ''); if (a.hostname && a.hostname.indexOf('heimdell-tech-ai.co.uk') === -1) a.target = '_blank'; }
        a.rel = 'noopener'; a.textContent = raw; frag.appendChild(a);
        if (trail) frag.appendChild(document.createTextNode(trail));
        last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(line.slice(last)));
    });
    return frag;
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function addUser(text) { log.appendChild(el('div', 'm user', text)); scroll(); }
  function addBot(textOrNode, source) {
    var d = el('div', 'm bot');
    if (typeof textOrNode === 'string') d.appendChild(linkify(textOrNode)); else d.appendChild(textOrNode);
    if (source && String(source).indexOf(SITE) === 0 && source.replace(/\/$/, '') !== SITE) {
      var a = el('a', 'src', 'Read more on this page'); a.href = source; d.appendChild(document.createElement('br')); d.appendChild(a);
    }
    log.appendChild(d); scroll(); return d;
  }
  function addChips(items, onPick) {
    if (!items.length) return;
    var w = el('div', 'chips');
    items.forEach(function (it) { var b = el('button', 'chip', it.label); b.type = 'button'; b.addEventListener('click', function () { onPick(it); }); w.appendChild(b); });
    log.appendChild(w); scroll();
  }
  function typing(on) {
    var t = log.querySelector('.typingrow');
    if (on && !t) { t = el('div', 'm bot typingrow'); t.innerHTML = '<span class="typing" aria-label="Typing"><i></i><i></i><i></i></span>'; log.appendChild(t); scroll(); }
    if (!on && t) t.remove();
  }

  /* ---------- answering ---------- */
  function showMatch(m) { addUser(m.question); addBot(m.answer, m.source); }
  function showResult(d) {
    var ms = (d && d.matches) || [];
    if (!ms.length || d.confidence === 'none') {
      addBot('I couldn\'t find an answer to that in our knowledge base. You can browse every topic, or contact a person.');
      addChips([{ label: 'Browse topics', act: 'topics' }, { label: 'Contact a person', act: 'contact' }], function (it) { if (it.act === 'topics') openBrowse(); else location.href = CONTACT; });
      return;
    }
    var best = ms[0];
    addBot(best.answer, best.source);
    if (d.confidence === 'low') log.appendChild(el('div', 'note', 'I\'m not fully sure that answers your question.'));
    var related = ms.slice(1).filter(function (m) { return m.question && m.question !== best.question; });
    if (related.length) {
      log.appendChild(el('div', 'note', 'Related questions:'));
      addChips(related.map(function (m) { return { label: m.question, m: m }; }), function (it) { showMatch(it.m); });
    }
  }
  function callAssistant(text) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    return fetch(ASSISTANT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({ jsonrpc: '2.0', id: ++seq, method: 'SendMessage', params: { message: { role: 'ROLE_USER', contextId: ctx, parts: [{ text: text }] } } })
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (j) {
      if (j.error) throw new Error(j.error.message || 'error');
      var parts = (j.result && j.result.message && j.result.message.parts) || [];
      var d = (parts.filter(function (p) { return p.data; })[0] || {}).data;
      if (!d) throw new Error('no data');
      return d;
    });
  }

  /* ---------- local search over the catalogue (fallback + browse) ---------- */
  var STOP = {}; 'a an the is are was were do does did what how why when where who which to of for in on and or i you we my your our it this that can will with be have has if me about tell please'.split(' ').forEach(function (w) { STOP[w] = 1; });
  function strip(s, re) { var r = s.replace(re, ''); return r.length >= 3 ? r : s; }
  function stem(t) {
    if (t.length <= 3) return t; var s = t;
    if (/ies$/.test(s) && s.length > 4) s = s.replace(/ies$/, 'y');
    s = strip(s, /(ing|ed|ly)$/); s = strip(s, /ments?$/); s = strip(s, /ations?$/); s = strip(s, /es$/);
    if (!/ss$/.test(s)) s = strip(s, /s$/);
    return strip(s, /e$/);
  }
  function tok(text) { return String(text).toLowerCase().replace(/[^a-z0-9£%\s]/g, ' ').split(/\s+/).filter(function (t) { return t && !STOP[t]; }).map(stem); }
  function localSearch(q, limit) {
    var qt = tok(q); if (!qt.length || !entries.length) return [];
    var wantsPrice = /\b(cost|costs|price|prices|pricing|priced|how much|charge|charges|fee|fees|quote|quotes|afford|expensive|cheap|budget)\b/i.test(q);
    var wantsCompare = /\b(vs|versus|difference|differences|different|compare|compared|comparison|between|better)\b/i.test(q);
    var set = {}; qt.forEach(function (t) { set[t] = 1; });
    var bump = function (txt, w) { var s = 0; tok(txt).forEach(function (t) { if (set[t]) s += w; }); return s; };
    return entries.map(function (e) {
      var s = bump(e.question, 3) + bump(e.answer, 1) + (e.aliases || []).reduce(function (a, x) { return a + bump(x, 3); }, 0) + (e.tags || []).reduce(function (a, x) { return a + bump(x, 2); }, 0);
      // price and comparison answers only lead when the question is about price / comparing (mirrors the assistant)
      if (!wantsPrice && (e.tags || []).indexOf('pricing') > -1) s = s * 0.5;
      if (!wantsCompare && (e.tags || []).indexOf('comparison') > -1) s = s * 0.5;
      return { e: e, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, limit)
      .map(function (x) { return { id: x.e.id, question: x.e.question, answer: x.e.answer, source: x.e.source, score: x.s }; });
  }
  // Company, service, product and policy answers built from the other catalogue sections (mirrors the assistant, so offline mode knows as much).
  function extraEntries(c) {
    var out = [], org = c.organisation || {}, site = (org.website || SITE + '/'), j = function (a) { return a.filter(Boolean).join(', '); };
    var add = function (id, q, a, al, src) { out.push({ id: id, question: q, answer: a, aliases: al || [], tags: [], source: src || site }); };
    (c.services || []).forEach(function (s) {
      add('service-' + s.id, 'What is ' + s.name + '?', s.name + ': ' + s.summary + (s.pricingModel ? ' Pricing: ' + s.pricingModel : '') + (s.url ? ' More: ' + s.url : ''), [s.name], s.url);
    });
    if (org.email) add('org-contact', 'How do I contact Heimdell Tech Ai?', 'You can reach Heimdell Tech Ai by email at ' + org.email + ' or through the contact page: ' + site + 'contact.html.' + (org.openingHours ? ' Opening hours: ' + org.openingHours + '.' : ''),
      ['contact details', 'email address', 'how can I get in touch', 'phone number', 'telephone number', 'can I call you', 'speak to someone', 'contact'], site + 'contact.html');
    var a = org.address || {};
    if (a.streetAddress) add('org-address', 'Where is Heimdell Tech Ai based?', (org.tradingName || 'Heimdell Tech Ai') + ' is based at ' + j([a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode]) + ', United Kingdom, and works with businesses across the whole UK.',
      ['address', 'office address', 'where are you', 'location', 'postcode', 'registered office'], site + 'contact.html');
    if (org.openingHours) add('org-hours', 'What are your opening hours?', 'Heimdell Tech Ai\'s opening hours are ' + org.openingHours + '.', ['when are you open', 'opening times', 'business hours', 'office hours'], site + 'contact.html');
    if (org.companiesHouse) add('org-registration', 'What is Heimdell Tech Ai\'s company number?', (org.legalName || 'Heimdell Tech Ai Ltd') + ' is registered in England and Wales, Companies House number ' + org.companiesHouse + (org.icoRegistration ? ', ICO registration ' + org.icoRegistration : '') + '.',
      ['companies house', 'company registration', 'ICO registration', 'is Heimdell registered', 'DUNS number', 'SIC code'], site + 'about.html');
    if (org.founder) add('org-founder', 'Who founded Heimdell Tech Ai?', (org.legalName || 'Heimdell Tech Ai Ltd') + ' was founded' + (org.foundingDate ? ' on ' + org.foundingDate : '') + ' by ' + org.founder + '.',
      ['who runs Heimdell', 'who is the founder', 'who owns Heimdell', 'who is the director'], site + 'about.html');
    if ((c.expertise || []).length) add('org-expertise', 'What does Heimdell Tech Ai specialise in?', 'Heimdell Tech Ai\'s areas of expertise include: ' + j(c.expertise) + '.', ['expertise', 'what are you good at', 'specialisms'], site + 'about.html');
    var p = c.products || {}, prods = [p.flagship].concat(p.other || []).filter(Boolean);
    if (prods.length) add('org-products', 'What products does Heimdell Tech Ai have?', prods.map(function (x, i) { return (i === 0 ? 'Main product' : 'Also') + ': ' + x.name + (x.description ? ' (' + x.description + ')' : '') + (x.url ? ' ' + x.url : ''); }).join(' '), ['products', 'what do you sell', 'what do you build'], site);
    if ((c.policies || []).length) add('org-policies', 'Where can I read the privacy policy or terms of service?', c.policies.map(function (x) { return x.title + ': ' + x.url; }).join(' | '), ['privacy policy', 'terms of service', 'terms and conditions'], c.policies[0].url);
    if (c.reviewsAndTestimonials && c.reviewsAndTestimonials.note) add('org-reviews', 'Do you have customer reviews or testimonials?', c.reviewsAndTestimonials.note, ['testimonials', 'reviews', 'customer feedback'], site + 'case-studies.html');
    return out;
  }
  function loadCatalogue() {
    if (catalogue) return Promise.resolve(catalogue);
    if (!catalogueLoading) catalogueLoading = fetch(CATALOGUE).then(function (r) { if (!r.ok) throw new Error('catalogue ' + r.status); return r.json(); }).then(function (c) {
      catalogue = c; entries = (c.faqs || []).concat(extraEntries(c)); return c;
    }).catch(function (e) { catalogueLoading = null; throw e; });
    return catalogueLoading;
  }
  function topicOf(src) {
    var s = String(src || '').toLowerCase();
    if (/pricing/.test(s)) return 'Pricing';
    if (/ai-agent|a2a|ap2|ucp|mcp|knowledge-catalog|website-upgrades|agent-readiness/.test(s)) return 'AI agents and websites';
    if (/third-party-verification|tpv|system-capabilities|high-volume|post-sale/.test(s)) return 'TPV and verification';
    if (/clawback|regulatory-risk|ico-gdpr|compliance-protocol|provider-audit|telecom-vendors/.test(s)) return 'Telecom compliance';
    if (/systems-architecture/.test(s)) return 'Systems and software';
    return 'About Heimdell';
  }
  var TOPIC_ORDER = ['AI agents and websites', 'Pricing', 'TPV and verification', 'Telecom compliance', 'Systems and software', 'About Heimdell'];

  /* ---------- browse view ---------- */
  function openBrowse() {
    log.hidden = true; browse.hidden = false; browse.textContent = '';
    browse.appendChild(el('div', 'empty', 'Loading topics...'));
    loadCatalogue().then(renderBrowse).catch(function () {
      browse.textContent = ''; browse.appendChild(el('div', 'empty', 'Sorry, the topic list could not be loaded. Please try asking a question instead.'));
      var b = el('button', 'chip', 'Back to chat'); b.type = 'button'; b.addEventListener('click', closeBrowse); browse.appendChild(b);
    });
  }
  function closeBrowse() { browse.hidden = true; log.hidden = false; input.focus(); }
  function renderBrowse() {
    browse.textContent = '';
    var back = el('button', 'chip', 'Back to chat'); back.type = 'button'; back.addEventListener('click', closeBrowse); back.style.marginBottom = '10px'; browse.appendChild(back);
    var s = el('input', 'bsearch'); s.type = 'search'; s.placeholder = 'Search all ' + entries.length + ' questions'; s.setAttribute('aria-label', 'Search questions'); browse.appendChild(s);
    var list = el('div'); browse.appendChild(list);
    var groups = {}; entries.forEach(function (e) { (groups[topicOf(e.source)] = groups[topicOf(e.source)] || []).push(e); });
    function pick(e) { closeBrowse(); showMatch(e); }
    function draw(filter) {
      list.textContent = '';
      if (filter && filter.trim()) {
        var res = localSearch(filter, 15);
        if (!res.length) { list.appendChild(el('div', 'empty', 'No matching questions. Try different words.')); return; }
        var ul = el('ul'); ul.style.cssText = 'list-style:none;margin:0;padding:0';
        res.forEach(function (e) { var li = el('li'); var b = el('button', 'chip', e.question); b.type = 'button'; b.style.cssText = 'display:block;width:100%;margin-bottom:6px;border-radius:10px'; b.addEventListener('click', function () { pick(e); }); li.appendChild(b); ul.appendChild(li); });
        list.appendChild(ul); return;
      }
      TOPIC_ORDER.forEach(function (name) {
        var items = groups[name]; if (!items || !items.length) return;
        var box = el('div', 'topic'), head = el('button'); head.type = 'button'; head.setAttribute('aria-expanded', 'false');
        head.appendChild(el('span', null, name)); head.appendChild(el('span', null, items.length + ' +'));
        var ul = el('ul'); ul.hidden = true;
        items.forEach(function (e) { var li = el('li'), b = el('button', null, e.question); b.type = 'button'; b.addEventListener('click', function () { pick(e); }); li.appendChild(b); ul.appendChild(li); });
        head.addEventListener('click', function () { var open = ul.hidden; ul.hidden = !open; head.setAttribute('aria-expanded', String(open)); head.lastChild.textContent = items.length + (open ? ' -' : ' +'); });
        box.appendChild(head); box.appendChild(ul); list.appendChild(box);
      });
    }
    s.addEventListener('input', function () { draw(s.value); });
    draw(''); s.focus();
  }

  /* ---------- conversation ---------- */
  function ask(text) {
    text = String(text || '').trim().slice(0, MAXLEN);
    if (!text || busy || Date.now() - lastSend < 700) return;
    busy = true; lastSend = Date.now(); sendBtn.disabled = true; input.value = '';
    if (!browse.hidden) closeBrowse();
    addUser(text); typing(true);
    callAssistant(text).then(function (d) { typing(false); showResult(d); }).catch(function () {
      // assistant unreachable: answer from the catalogue directly so the visitor still gets help
      return loadCatalogue().then(function () {
        typing(false); var ms = localSearch(text, 3);
        showResult({ matches: ms, confidence: !ms.length ? 'none' : ms[0].score >= 6 ? 'high' : ms[0].score >= 3 ? 'medium' : 'low' });
      }).catch(function () {
        typing(false);
        addBot('Sorry, I can\'t reach the assistant right now. Please contact us at ' + CONTACT + ' and we\'ll help.');
      });
    }).then(function () { busy = false; sendBtn.disabled = false; input.focus(); });
  }

  var greeted = false;
  function greet() {
    if (greeted) return; greeted = true;
    addBot('Hi, I\'m Heimdell\'s assistant. I can answer questions about our services, prices, AI agent standards (A2A, AP2, UCP, MCP, Knowledge Catalog) and telecom compliance. What would you like to know?');
    addChips(SUGGESTIONS.map(function (t) { return { label: t }; }), function (it) { ask(it.label); });
    loadCatalogue().catch(function () {});   // warm the local copy so the fallback and Topics are instant
  }
  function open() {
    panel.hidden = false; launch.setAttribute('aria-expanded', 'true'); launch.setAttribute('aria-label', 'Close chat'); greet(); setTimeout(function () { input.focus(); }, 30);
  }
  function close() {
    panel.hidden = true; launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('aria-label', 'Open chat: Ask Heimdell'); launch.focus();
  }
  launch.addEventListener('click', function () { if (panel.hidden) open(); else close(); });
  root.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null; if (!t) return;
    if (t.dataset.act === 'close') close();
    if (t.dataset.act === 'topics') { if (browse.hidden) openBrowse(); else closeBrowse(); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); close(); } });

  /* ---------- keep clear of the cookie banner ---------- */
  var barObs = null;
  function adjust() {
    var bar = document.getElementById('heimdell-cookie-bar'), h = 0;
    if (bar) {
      // (offsetParent is always null for fixed elements, so measure what is actually on screen instead)
      var cs = getComputedStyle(bar), r = bar.getBoundingClientRect();
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0) h = Math.max(0, Math.ceil(window.innerHeight - r.top));
      if (h > r.height) h = Math.ceil(r.height);
      if (!barObs && window.MutationObserver) { barObs = new MutationObserver(adjust); barObs.observe(bar, { attributes: true }); bar.addEventListener('transitionend', adjust); }
    }
    host.style.bottom = (h ? h + 16 : 20) + 'px';
    host.style.setProperty('--bar', h + 'px');
  }
  function mount() {
    document.body.appendChild(host); adjust();
    if (window.MutationObserver) new MutationObserver(adjust).observe(document.body, { childList: true });
    window.addEventListener('resize', adjust);
    var n = 0, iv = setInterval(function () { adjust(); if (++n > 100) clearInterval(iv); }, 200);   // follows the banner as it slides in
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
