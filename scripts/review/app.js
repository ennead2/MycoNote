// MycoNote Review Tool — Vanilla JS SPA

const state = {
  list: [],
  total: 0,
  currentIndex: 0,
  currentData: null,
  started: false, // ユーザーが「開始」を押した後のみタブ自動オープンを行う
};

const app = document.getElementById('app');

// ─── API helpers ──────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function loadList() {
  const data = await api('/api/list');
  state.list = data.species;
  state.total = data.total;
}

async function loadSpecies(idx) {
  if (idx < 0 || idx >= state.list.length) return;
  state.currentIndex = idx;
  const id = state.list[idx].id;
  state.currentData = await api(`/api/species/${encodeURIComponent(id)}`);
  render();
}

async function saveDecision(status, note) {
  const id = state.list[state.currentIndex].id;
  await api('/api/decision', {
    method: 'POST',
    body: JSON.stringify({ id, status, note }),
  });
  state.list[state.currentIndex].decision = status === 'clear' ? null : status;
}

// ─── Google image popups ──────────────────────────────────
// popup ウィンドウを named target で再利用する。
// 重要: window.open は必ずユーザー操作ハンドラ内で await の前に同期的に呼ぶこと。
//       await 後だと user activation が切れて Chrome は新規タブを作ってしまう。
const POPUP_FEATURES_JA = 'popup=1,width=720,height=900,left=0,top=0';
const POPUP_FEATURES_SCI = 'popup=1,width=720,height=900,left=740,top=0';
const WIN_NAME_JA = 'myconote-img-ja';
const WIN_NAME_SCI = 'myconote-img-sci';

/**
 * 指定した list エントリで Google 画像検索 popup 2 つを開く／既存を再利用する。
 * @param {{ja:string, scientific:string}} target - state.list の要素
 * @param {{firstOpen?:boolean}} opts - firstOpen=true なら features を付けて popup 化
 */
function openGoogleTabsFor(target, opts = {}) {
  const jaUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(target.ja + ' キノコ')}`;
  const sciUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(target.scientific)}`;
  // 初回: features 付きで popup ウィンドウを作成（別ウィンドウ化 + 位置指定）
  // 2回目以降: 既存 popup が生きていれば同じ名前で navigate、死んでいれば再作成
  const feats = opts.firstOpen ? POPUP_FEATURES_JA : '';
  const feats2 = opts.firstOpen ? POPUP_FEATURES_SCI : '';
  window.open(jaUrl, WIN_NAME_JA, feats);
  window.open(sciUrl, WIN_NAME_SCI, feats2);
}

// ─── Rendering ────────────────────────────────────────────
function renderStart() {
  const progressCount = state.list.filter(s => s.decision).length;
  const resumeText = progressCount > 0
    ? `${progressCount}/${state.total} 判定済み — ${state.total - progressCount} 件残り`
    : `${state.total} 件 すべて未レビュー`;
  app.innerHTML = `
    <div class="start-screen">
      <h2>MycoNote Review Tool</h2>
      <p>${resumeText}</p>
      <ul>
        <li>「開始」を押すと Google 画像検索タブ 2 つが自動で開きます（和名・学名）</li>
        <li>タブは好きな位置に配置してください。以降は同じタブの中身が自動更新されます</li>
        <li>判定はキーボード <kbd>1</kbd>〜<kbd>5</kbd>、<kbd>Enter</kbd> で次へ</li>
      </ul>
      <button class="btn-primary" id="start-btn">開始</button>
    </div>
  `;
  document.getElementById('start-btn').onclick = async (e) => {
    state.started = true;
    // 未判定の最初の index に飛ぶ
    const nextIdx = state.list.findIndex(s => !s.decision);
    const targetIdx = nextIdx >= 0 ? nextIdx : 0;
    // ★ await より前に同期的に popup を開く (user activation を保持)
    openGoogleTabsFor(state.list[targetIdx], { firstOpen: true });
    await loadSpecies(targetIdx);
  };
}

function renderReview() {
  const { mushroom: m, wikipedia, issues, decision } = state.currentData;
  const cur = state.list[state.currentIndex];
  const reviewed = state.list.filter(s => s.decision).length;
  const pct = state.total ? (reviewed / state.total * 100) : 0;

  const statStats = {};
  for (const s of state.list) {
    if (s.decision) statStats[s.decision] = (statStats[s.decision] || 0) + 1;
  }
  const statHtml = Object.entries(statStats)
    .map(([k, v]) => `<span class="pill pill-${k}">${k} ${v}</span>`).join('');

  // 画像: local + images_remote (最大9)
  const localImg = m.image_local
    ? `<div class="img-card local"><span class="label">LOCAL</span><img src="${m.image_local}" loading="lazy" alt=""></div>`
    : `<div class="img-card empty">local なし</div>`;
  const remotes = (m.images_remote || []).slice(0, 9);
  const remoteImgs = remotes.map((u, i) => `
    <div class="img-card">
      <span class="label">REM ${i}</span>
      <img src="${u}" loading="lazy" alt="" onerror="this.parentElement.classList.add('empty');this.remove()">
    </div>
  `).join('');
  // 9 枚未満なら空枠を埋める
  const emptyCount = Math.max(0, 9 - remotes.length);
  const emptyImgs = Array(emptyCount).fill(0).map((_, i) => `
    <div class="img-card empty">REM ${remotes.length + i} なし</div>
  `).join('');

  // 説明: Wikipedia ja / en / kinoco
  const wj = wikipedia?.wikipedia_ja;
  const we = wikipedia?.wikipedia_en;
  const wk = wikipedia?.kinoco_zukan;
  const refPanel = (wj || we || wk) ? `
    ${wj ? `<div class="content">
      <strong>Wikipedia (ja):</strong> ${escapeHtml(wj.extract)}
      <div class="meta"><a href="${wj.url}" target="_blank" rel="noopener">${wj.url} ↗</a></div>
    </div>` : ''}
    ${we ? `<div class="content">
      <strong>Wikipedia (en):</strong> ${escapeHtml(we.extract)}
      <div class="meta"><a href="${we.url}" target="_blank" rel="noopener">${we.url} ↗</a></div>
    </div>` : ''}
    ${wk ? `<div class="content">
      <strong>kinoco-zukan:</strong> ${escapeHtml(wk.text).slice(0, 1200)}
      <div class="meta"><a href="${wk.url}" target="_blank" rel="noopener">${wk.url} ↗</a></div>
    </div>` : ''}
  ` : '<div class="empty">参照ソースなし</div>';

  const issuesHtml = issues.length > 0
    ? `<ul class="issues">${issues.map(i => `<li class="${i.level}">${escapeHtml(i.msg)}</li>`).join('')}</ul>`
    : '';

  app.innerHTML = `
    <div class="top-bar">
      <h1>MycoNote Review</h1>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="progress-text">${reviewed} / ${state.total}</span>
    </div>

    <div class="jump-bar">
      <label style="color:var(--text-dim);font-size:12px;">ジャンプ:</label>
      <select id="jump-select">
        ${state.list.map((s, i) => {
          const prio = s.priority === 1 ? '🔴要確認' : s.priority === 2 ? '🖼️画像なし' : '    ';
          return `
          <option value="${i}" ${i === state.currentIndex ? 'selected' : ''}>
            ${(i + 1).toString().padStart(3)} / ${state.total}  ${prio}  ${s.decision ? '[' + s.decision + '] ' : ''} ${s.ja}
          </option>
        `;
        }).join('')}
      </select>
      <div class="stat">${statHtml}</div>
    </div>

    <main>
      <div class="species-head">
        <span class="ja">${escapeHtml(m.names.ja)}</span>
        <span class="sci">${escapeHtml(m.names.scientific)}</span>
        ${m.names.scientific_synonyms?.length ? `<span class="sci" style="opacity:0.6;font-size:13px">syn. ${m.names.scientific_synonyms.map(escapeHtml).join(', ')}</span>` : ''}
        <span class="tox tox-${m.toxicity}">${m.toxicity}</span>
        ${cur.priority === 1 ? '<span class="prio-badge prio-1">要確認</span>' : ''}
        ${cur.priority === 2 ? '<span class="prio-badge prio-2">ヒーロー画像なし</span>' : ''}
        <span class="id">${m.id}</span>
        <span class="id">${state.currentIndex + 1} / ${state.total}</span>
      </div>

      ${issuesHtml ? `<div class="section"><h3>検証フラグ</h3>${issuesHtml}</div>` : ''}

      <div class="section">
        <h3>アプリの画像 (local + images_remote ×9)</h3>
        <div class="images">
          ${localImg}
          ${remoteImgs}
          ${emptyImgs}
        </div>
        <div class="tabs-hint">
          📷 Google 画像検索タブ 2 つが別ウィンドウで自動更新されています（和名 / 学名）
        </div>
      </div>

      <div class="section">
        <h3>説明比較</h3>
        <div class="desc-grid">
          <div class="desc-card">
            <h4>アプリ現在</h4>
            <div class="content">${escapeHtml(m.description || '(description なし)')}</div>
            ${m.features ? `<div class="feature-text"><strong>特徴:</strong> ${escapeHtml(m.features)}</div>` : ''}
            ${m.cooking_preservation ? `<div class="feature-text"><strong>調理:</strong> ${escapeHtml(m.cooking_preservation)}</div>` : ''}
            ${m.poisoning_first_aid ? `<div class="feature-text"><strong>中毒:</strong> ${escapeHtml(m.poisoning_first_aid)}</div>` : ''}
            ${m.caution ? `<div class="feature-text" style="color:var(--high)"><strong>注意:</strong> ${escapeHtml(m.caution)}</div>` : ''}
          </div>
          <div class="desc-card ${wj || we || wk ? '' : 'empty'}">
            <h4>参照ソース</h4>
            ${refPanel}
          </div>
        </div>
      </div>
    </main>

    <div class="decision-bar">
      <span class="current-decision">${decision ? '現在: ' + decision.status + (decision.note ? ' / ' + decision.note : '') : '未判定'}</span>
      ${decisionBtns(decision?.status)}
      <input class="note-input" id="note-input" placeholder="メモ (N でフォーカス)" value="${escapeHtml(decision?.note || '')}">
      <div class="nav-btns">
        <button class="nav-btn" id="prev-btn" ${state.currentIndex === 0 ? 'disabled' : ''}>← 前</button>
        <button class="nav-btn primary" id="next-btn">次 →</button>
      </div>
    </div>
  `;

  document.getElementById('jump-select').onchange = (e) => {
    const idx = Number(e.target.value);
    if (state.started) openGoogleTabsFor(state.list[idx]);
    loadSpecies(idx);
  };
  document.getElementById('prev-btn').onclick = () => navigate(-1);
  document.getElementById('next-btn').onclick = () => navigate(1);
  document.querySelectorAll('.d-btn').forEach(btn => {
    btn.onclick = () => applyDecision(btn.dataset.status);
  });
}

function decisionBtns(active) {
  const btns = [
    { k: '1', status: 'ok', label: 'OK' },
    { k: '2', status: 'replace_image', label: '画像差替' },
    { k: '3', status: 'concern', label: '要修正' },
    { k: '4', status: 'delete', label: '削除' },
    { k: '5', status: 'hold', label: '保留' },
  ];
  return btns.map(b => `
    <button class="d-btn ${active === b.status ? 'active' : ''}" data-status="${b.status}">
      <span class="k">${b.k}</span>${b.label}
    </button>
  `).join('');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Actions ──────────────────────────────────────────────
async function applyDecision(status) {
  const note = document.getElementById('note-input')?.value || '';
  await saveDecision(status, note);
  state.currentData.decision = { status, note, at: new Date().toISOString() };
  render();
}

async function navigate(delta) {
  const nextIdx = state.currentIndex + delta;
  if (nextIdx < 0 || nextIdx >= state.list.length) return;
  // ★ await より前に同期的に popup を navigate (user activation を保持)
  if (state.started) {
    openGoogleTabsFor(state.list[nextIdx]);
  }
  // メモだけ保存したい場合
  const cur = state.currentData;
  if (cur?.decision) {
    const note = document.getElementById('note-input')?.value || '';
    if (note !== (cur.decision.note || '')) {
      await saveDecision(cur.decision.status, note);
    }
  }
  await loadSpecies(nextIdx);
}

// ─── Keyboard ────────────────────────────────────────────
document.addEventListener('keydown', async (e) => {
  if (!state.started) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  const key = e.key;
  if (key >= '1' && key <= '5') {
    const map = { '1': 'ok', '2': 'replace_image', '3': 'concern', '4': 'delete', '5': 'hold' };
    await applyDecision(map[key]);
  } else if (key === 'Enter') {
    await navigate(1);
  } else if (key === 'ArrowLeft') {
    await navigate(-1);
  } else if (key === 'ArrowRight') {
    await navigate(1);
  } else if (key === 'n' || key === 'N') {
    document.getElementById('note-input')?.focus();
    e.preventDefault();
  } else if (key === '0') {
    // 判定クリア
    await saveDecision('clear', '');
    state.currentData.decision = null;
    render();
  }
});

function render() {
  if (!state.started || !state.currentData) {
    renderStart();
  } else {
    renderReview();
  }
}

// ─── Boot ─────────────────────────────────────────────────
(async () => {
  try {
    await loadList();
    renderStart();
  } catch (e) {
    app.innerHTML = `<div class="start-screen"><h2>エラー</h2><p>${escapeHtml(e.message)}</p></div>`;
  }
})();
