// MycoNote Phase 13-D Review UI — vanilla JS ES Module

const API = {
  async listArticles() {
    const res = await fetch('/api/articles');
    if (!res.ok) throw new Error('failed to list');
    return res.json();
  },
  async getArticle(slug) {
    const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`failed to get ${slug}`);
    return res.json();
  },
  async saveDecision(payload) {
    const res = await fetch('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('failed to save decision');
    return res.json();
  },
  async clearDecision(slug) {
    const res = await fetch(`/api/decisions/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('failed to clear decision');
    return res.json();
  },
};

const Store = {
  articles: [],
  currentIndex: 0,
  currentData: null,
  warningsOnly: false,

  get visibleArticles() {
    return this.warningsOnly ? this.articles.filter(a => a.warningsCount > 0) : this.articles;
  },
  get currentSlug() {
    return this.visibleArticles[this.currentIndex]?.slug;
  },
  async loadList() {
    const { articles } = await API.listArticles();
    this.articles = articles;
    const firstUndecided = this.visibleArticles.findIndex(a => !a.decision);
    this.currentIndex = firstUndecided >= 0 ? firstUndecided : 0;
  },
  async loadCurrent() {
    if (!this.currentSlug) { this.currentData = null; return; }
    this.currentData = await API.getArticle(this.currentSlug);
  },
  async setDecision(decision, sections = [], note = '') {
    if (!this.currentSlug) return;
    if (decision === 'clear') {
      await API.clearDecision(this.currentSlug);
      const entry = this.articles.find(a => a.slug === this.currentSlug);
      if (entry) entry.decision = null;
      if (this.currentData) this.currentData.decision = null;
    } else {
      await API.saveDecision({ slug: this.currentSlug, decision, sections, note });
      const entry = this.articles.find(a => a.slug === this.currentSlug);
      if (entry) entry.decision = decision;
      if (this.currentData) this.currentData.decision = { decision, sections, note, reviewed_at: new Date().toISOString() };
    }
  },
  next() { if (this.currentIndex < this.visibleArticles.length - 1) this.currentIndex++; },
  prev() { if (this.currentIndex > 0) this.currentIndex--; },
};

const ARTICLE_SECTIONS = [
  { key: 'description', label: '概要', type: 'text' },
  { key: 'features', label: '形態的特徴', type: 'text' },
  { key: 'habitat_ecology', label: '発生・生態', type: 'computed' },
  { key: 'similar_species', label: '類似種・見分け方', type: 'similar' },
  { key: 'cooking_preservation', label: '食用利用・食文化', type: 'text' },
  { key: 'poisoning_first_aid', label: '中毒症状・対処', type: 'text' },
  { key: 'caution', label: '注意事項', type: 'text' },
];

function makeBadge(text, cls = '') {
  const el = document.createElement('span');
  el.className = `badge ${cls}`.trim();
  el.textContent = text;
  return el;
}

function warningContainsSection(warningsText, sectionKey) {
  return warningsText.toLowerCase().includes(sectionKey.toLowerCase());
}

function renderHeader() {
  const total = Store.visibleArticles.length;
  const decided = Store.visibleArticles.filter(a => a.decision).length;
  document.getElementById('progress-text').textContent = `${decided} / ${total}`;
  const pct = total > 0 ? (decided / total) * 100 : 0;
  document.getElementById('progress-bar-fill').style.width = `${pct}%`;
}

function renderSpeciesHeader() {
  const d = Store.currentData;
  if (!d) return;
  const a = d.article;
  document.getElementById('species-name-ja').textContent = (a.names?.aliases?.[0]) || d.slug;
  const scientific = d.slug.replace(/_/g, ' ');
  document.getElementById('species-name-sci').textContent = scientific;
  document.getElementById('google-search').href = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(scientific)}`;
  const badges = document.getElementById('species-badges');
  badges.innerHTML = '';
  if (a.safety) badges.appendChild(makeBadge(a.safety));
  if (Array.isArray(a.season) && a.season.length > 0) {
    const months = a.season.map(s => `${s.start_month}-${s.end_month}`).join(' / ');
    badges.appendChild(makeBadge(`season ${months}`));
  }
  if (d.warnings.length > 0) {
    badges.appendChild(makeBadge(`⚠ w:${d.warnings.length}`, 'warning'));
  }
  const hero = document.getElementById('hero-image');
  const heroUrl = a.hero_image?.url || '';
  hero.src = heroUrl;
  hero.style.visibility = heroUrl ? 'visible' : 'hidden';
}

function renderArticlePanel() {
  const panel = document.getElementById('article-panel');
  panel.innerHTML = '';
  const d = Store.currentData;
  if (!d) { panel.textContent = '(no article)'; return; }
  const a = d.article;
  const warningsText = (d.warnings || []).join(' / ');

  for (const s of ARTICLE_SECTIONS) {
    const h = document.createElement('h3');
    h.textContent = s.label;
    panel.appendChild(h);

    const content = document.createElement('div');
    if (s.type === 'text') {
      const v = a[s.key];
      if (!v) { content.textContent = '(情報なし)'; content.style.color = '#b8ac9e'; }
      else {
        const p = document.createElement('p');
        p.textContent = v;
        if (warningsText && warningContainsSection(warningsText, s.key)) p.classList.add('warning');
        content.appendChild(p);
      }
    } else if (s.type === 'similar') {
      const list = a.similar_species || [];
      if (list.length === 0) { content.textContent = '(情報なし)'; content.style.color = '#b8ac9e'; }
      else {
        const ul = document.createElement('ul');
        for (const sp of list) {
          const li = document.createElement('li');
          li.textContent = `${sp.ja || sp.scientific || '?'}${sp.note ? ' — ' + sp.note : ''}`;
          ul.appendChild(li);
        }
        content.appendChild(ul);
      }
    } else if (s.type === 'computed') {
      const parts = [];
      if (Array.isArray(a.habitat) && a.habitat.length) parts.push(`habitat: ${a.habitat.join(', ')}`);
      if (Array.isArray(a.regions) && a.regions.length) parts.push(`regions: ${a.regions.join(', ')}`);
      if (Array.isArray(a.tree_association) && a.tree_association.length) parts.push(`trees: ${a.tree_association.join(', ')}`);
      content.textContent = parts.length ? parts.join(' / ') : '(情報なし)';
      if (parts.length === 0) content.style.color = '#b8ac9e';
    }
    panel.appendChild(content);
  }

  const h = document.createElement('h3');
  h.textContent = '出典';
  panel.appendChild(h);
  if (Array.isArray(a.sources) && a.sources.length) {
    const ol = document.createElement('ol');
    a.sources.forEach((src, i) => {
      const li = document.createElement('li');
      li.innerHTML = `[${i + 1}] <a href="${src.url}" target="_blank" rel="noopener">${src.name}</a> (${src.license})`;
      ol.appendChild(li);
    });
    panel.appendChild(ol);
  } else {
    panel.appendChild(document.createTextNode('(出典なし)'));
  }
}

function renderSourcesPanel() {
  const panel = document.getElementById('sources-panel');
  panel.innerHTML = '';
  const d = Store.currentData;
  if (!d || !d.combined) {
    panel.textContent = '(combined JSON なし — fetch_tier0_sources.mjs を実行すると表示されます)';
    panel.style.color = '#b8ac9e';
    return;
  }
  panel.style.color = '';
  const sources = d.combined.sources || {};
  const order = [
    ['wikipediaJa', 'Wikipedia ja'],
    ['wikipediaEn', 'Wikipedia en'],
    ['daikinrin', '大菌輪'],
    ['mhlw', '厚労省（自然毒）'],
    ['rinya', '林野庁'],
    ['traitCircus', 'Trait Circus'],
  ];
  for (const [key, label] of order) {
    const src = sources[key];
    if (!src) continue;
    const block = document.createElement('div');
    block.className = 'source-block';
    const h = document.createElement('h3');
    h.textContent = label;
    block.appendChild(h);
    const extract = document.createElement('div');
    extract.className = 'extract';
    extract.textContent = src.extract || JSON.stringify(src).slice(0, 500);
    block.appendChild(extract);
    panel.appendChild(block);
  }
  if (!panel.hasChildNodes()) {
    panel.textContent = '(どのソースも情報なし)';
  }
}

function renderDecisionState() {
  document.querySelectorAll('#decision-row button[data-decision]').forEach((btn) => {
    btn.classList.toggle('active', Store.currentData?.decision?.decision === btn.dataset.decision);
  });
  const noteEl = document.getElementById('note');
  noteEl.value = Store.currentData?.decision?.note || '';
  const sectionsRow = document.getElementById('sections-row');
  const show = Store.currentData?.decision?.decision === 'concern';
  sectionsRow.hidden = !show;
  if (show) {
    const selected = new Set(Store.currentData.decision.sections || []);
    sectionsRow.querySelectorAll('input[data-section]').forEach((cb) => {
      cb.checked = selected.has(cb.dataset.section);
    });
  }
  const stats = document.getElementById('stats');
  const counts = { approve: 0, concern: 0, reject: 0 };
  for (const a of Store.articles) { if (a.decision) counts[a.decision]++; }
  stats.textContent = `approved:${counts.approve} / concern:${counts.concern} / reject:${counts.reject}`;
}

function renderAll() {
  renderHeader();
  renderSpeciesHeader();
  renderArticlePanel();
  renderSourcesPanel();
  renderDecisionState();
}

function collectSelectedSections() {
  return [...document.querySelectorAll('#sections-row input[data-section]:checked')].map(cb => cb.dataset.section);
}

function focusFirstSection() {
  const first = document.querySelector('#sections-row input[data-section]');
  if (first) first.focus();
}

async function decide(decision) {
  if (decision === 'clear') {
    await Store.setDecision('clear');
  } else {
    const sections = collectSelectedSections();
    const note = document.getElementById('note').value;
    await Store.setDecision(decision, sections, note);
  }
  renderAll();
}

async function saveCurrentConcern() {
  if (Store.currentData?.decision?.decision !== 'concern') return;
  const sections = collectSelectedSections();
  const note = document.getElementById('note').value;
  await Store.setDecision('concern', sections, note);
  renderHeader();
}

async function goNext() {
  Store.next();
  await Store.loadCurrent();
  document.getElementById('article-panel').scrollTop = 0;
  document.getElementById('sources-panel').scrollTop = 0;
  renderAll();
}

async function goPrev() {
  Store.prev();
  await Store.loadCurrent();
  document.getElementById('article-panel').scrollTop = 0;
  document.getElementById('sources-panel').scrollTop = 0;
  renderAll();
}

function bindEvents() {
  document.addEventListener('keydown', async (ev) => {
    const inNote = document.activeElement?.id === 'note';
    if (inNote && ev.key !== 'Enter' && ev.key !== 'Escape') return;

    if (ev.key === '1') { await decide('approve'); goNext(); }
    else if (ev.key === '2') { await decide('concern'); focusFirstSection(); }
    else if (ev.key === '3') { await decide('reject'); goNext(); }
    else if (ev.key === '0') { await decide('clear'); }
    else if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); document.getElementById('note').focus(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); if (inNote) document.activeElement.blur(); goNext(); }
    else if (ev.key === 'ArrowRight') { goNext(); }
    else if (ev.key === 'ArrowLeft') { goPrev(); }
    else if (ev.key === 'g' || ev.key === 'G') {
      const a = document.getElementById('google-search');
      if (a?.href) window.open(a.href, '_blank', 'noopener');
    }
  });

  document.querySelectorAll('#decision-row button[data-decision]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const d = btn.dataset.decision;
      await decide(d);
      if (d === 'approve' || d === 'reject') goNext();
      else if (d === 'concern') focusFirstSection();
    });
  });

  let sectionSaveTimer = null;
  document.querySelectorAll('#sections-row input[data-section]').forEach((cb) => {
    cb.addEventListener('change', () => {
      clearTimeout(sectionSaveTimer);
      sectionSaveTimer = setTimeout(saveCurrentConcern, 300);
    });
  });

  let noteSaveTimer = null;
  document.getElementById('note').addEventListener('input', () => {
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(saveCurrentConcern, 300);
  });

  document.getElementById('prev').addEventListener('click', goPrev);
  document.getElementById('next').addEventListener('click', goNext);

  document.getElementById('warnings-only').addEventListener('change', async (ev) => {
    Store.warningsOnly = ev.target.checked;
    Store.currentIndex = 0;
    await Store.loadCurrent();
    renderAll();
  });
}

async function init() {
  await Store.loadList();
  await Store.loadCurrent();
  renderAll();
  bindEvents();
}

init().catch((e) => {
  console.error(e);
  document.body.innerHTML = `<pre>Error: ${e.message}</pre>`;
});

window.Store = Store;
