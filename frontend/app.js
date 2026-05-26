/**
 * CodeTrad — app.js
 * Traduction via le backend Flask (POST /api/translate)
 */

const BACKEND_URL = 'http://localhost:8000';

// ─── Noms affichés ────────────────────────────────────────────────
const LANG_NAMES = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
  java: 'Java', csharp: 'C#', cpp: 'C++', go: 'Go',
  rust: 'Rust', php: 'PHP', ruby: 'Ruby'
};

// ─── DOM refs ─────────────────────────────────────────────────────
const selSource    = document.getElementById('lang-source');
const selTarget    = document.getElementById('lang-target');
const btnTranslate = document.getElementById('btn-translate');
const btnSwap      = document.getElementById('btn-swap');
const btnClear     = document.getElementById('btn-clear');
const btnCopySrc   = document.getElementById('btn-copy-source');
const btnCopyTgt   = document.getElementById('btn-copy-target');
const btnSaveFile  = document.getElementById('btn-save-file');
const btnUpload    = document.getElementById('btn-upload');
const btnDownload  = document.getElementById('btn-download');
const fileInput    = document.getElementById('file-input');
const labelSource  = document.getElementById('label-source');
const labelTarget  = document.getElementById('label-target');
const placeholder  = document.getElementById('editor-placeholder');
const statusMsg    = document.getElementById('status-msg');
const statusBadge  = document.getElementById('translate-status');
const srcLines     = document.getElementById('source-lines');
const srcChars     = document.getElementById('source-chars');
const tgtLines     = document.getElementById('target-lines');
const tgtChars     = document.getElementById('target-chars');
const toast        = document.getElementById('toast');
const txSource     = document.getElementById('editor-source');
const txTarget     = document.getElementById('editor-target');
const detailsResizer = document.getElementById('details-resizer');

// ─── Stats ────────────────────────────────────────────────────────
function updateSourceStats() {
  const val = txSource.value;
  const lines = val ? val.split('\n').length : 0;
  srcLines.textContent = `${lines} ligne${lines !== 1 ? 's' : ''}`;
  srcChars.textContent = `${val.length} caractère${val.length !== 1 ? 's' : ''}`;
}

function updateTargetStats() {
  const val = txTarget.value;
  if (!val) { tgtLines.textContent = '—'; tgtChars.textContent = '—'; return; }
  const lines = val.split('\n').length;
  tgtLines.textContent = `${lines} ligne${lines !== 1 ? 's' : ''}`;
  tgtChars.textContent = `${val.length} caractère${val.length !== 1 ? 's' : ''}`;
}

txSource.addEventListener('input', updateSourceStats);
updateSourceStats();

// ─── Status & badge ───────────────────────────────────────────────
function setStatus(msg) { statusMsg.textContent = msg; }

function setBadge(state, text) {
  statusBadge.className = 'status-badge';
  if (state) { statusBadge.classList.add(state); statusBadge.textContent = text; }
}

// ─── Traduction via le backend Flask ─────────────────────────────
async function translateCode(sourceCode, sourceLang, targetLang) {
  const response = await fetch(`${BACKEND_URL}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: sourceCode,
      source_language: LANG_NAMES[sourceLang],
      target_language: LANG_NAMES[targetLang]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `Erreur HTTP ${response.status}`);
  }

  return data; // { translated_code, explanation, pitfalls }
}

// ─── Bouton Traduire ──────────────────────────────────────────────
async function handleTranslate() {
  const code = txSource.value.trim();
  if (!code) { showToast('⚠ Colle du code à traduire', 'error'); return; }

  const sourceLang = selSource.value;
  const targetLang = selTarget.value;
  if (sourceLang === targetLang) { showToast('⚠ Source et cible identiques', 'error'); return; }

  btnTranslate.disabled = true;
  btnTranslate.classList.add('loading');
  btnTranslate.querySelector('.translate-label').textContent = 'Traduction…';
  setBadge('loading', 'En cours…');
  setStatus(`Traduction ${LANG_NAMES[sourceLang]} → ${LANG_NAMES[targetLang]}…`);

  try {
    const result = await translateCode(code, sourceLang, targetLang);

    txTarget.value = result.translated_code;
    txTarget.style.display = 'block';
    placeholder.classList.add('hidden');
    updateTargetStats();
    showDetails(result.explanation, result.pitfalls);

    setBadge('done', 'Traduit ✓');
    setStatus(`Traduit — ${LANG_NAMES[sourceLang]} → ${LANG_NAMES[targetLang]}`);
    showToast('✓ Traduction réussie', 'success');
  } catch (err) {
    setBadge('error', 'Erreur');
    setStatus('Erreur : ' + err.message);
    showToast('✗ ' + err.message, 'error');
    console.error(err);
  } finally {
    btnTranslate.disabled = false;
    btnTranslate.classList.remove('loading');
    btnTranslate.querySelector('.translate-label').textContent = 'Traduire';
  }
}

btnTranslate.addEventListener('click', handleTranslate);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleTranslate(); }
});

// ─── Swap ─────────────────────────────────────────────────────────
btnSwap.addEventListener('click', () => {
  const sv = selSource.value, tv = selTarget.value;
  selSource.value = tv; selTarget.value = sv;
  labelSource.textContent = LANG_NAMES[tv];
  labelTarget.textContent = LANG_NAMES[sv];
  const sc = txSource.value, tc = txTarget.value;
  txSource.value = tc; txTarget.value = sc;
  updateSourceStats(); updateTargetStats();
  showToast('↔ Langages inversés');
});

// ─── Clear ────────────────────────────────────────────────────────
btnClear.addEventListener('click', () => {
  txSource.value = ''; txTarget.value = '';
  txTarget.style.display = 'none';
  placeholder.classList.remove('hidden');
  updateSourceStats(); updateTargetStats();
  setBadge(null, '');
  setStatus('Prêt — colle ton code et clique Traduire');
  document.getElementById('details-panel').classList.remove('visible');
  showToast('Éditeurs effacés');
});

// ─── Changement langage ───────────────────────────────────────────
selSource.addEventListener('change', () => { labelSource.textContent = LANG_NAMES[selSource.value]; });
selTarget.addEventListener('change', () => { labelTarget.textContent = LANG_NAMES[selTarget.value]; });

// ─── Copier ───────────────────────────────────────────────────────
function copyText(text, btn) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    showToast('✓ Copié dans le presse-papier', 'success');
    setTimeout(() => btn.classList.remove('copied'), 1800);
  });
}
btnCopySrc.addEventListener('click', () => copyText(txSource.value, btnCopySrc));
btnCopyTgt.addEventListener('click', () => copyText(txTarget.value, btnCopyTgt));

// ─── Upload ───────────────────────────────────────────────────────
btnUpload.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { txSource.value = ev.target.result; updateSourceStats(); showToast(`✓ ${file.name} chargé`, 'success'); };
  reader.readAsText(file);
  fileInput.value = '';
});

// ─── Download ─────────────────────────────────────────────────────
const CODE_EXTENSIONS = { javascript:'js', typescript:'ts', python:'py', java:'java', csharp:'cs', cpp:'cpp', go:'go', rust:'rs', php:'php', ruby:'rb' };

function getTranslatedFilename() {
  return `traduction.${CODE_EXTENSIONS[selTarget.value] || 'txt'}`;
}

function triggerDownload(code, filename) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })),
    download: filename
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

async function saveTranslatedCodeToFile(code) {
  const filename = getTranslatedFilename();

  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: 'Fichier de code',
        accept: { 'text/plain': [`.${filename.split('.').pop()}`] }
      }]
    });

    const writable = await handle.createWritable();
    await writable.write(code);
    await writable.close();
    showToast(`✓ ${filename} enregistré`, 'success');
    return;
  }

  triggerDownload(code, filename);
  showToast(`✓ ${filename} téléchargé`, 'success');
}

btnDownload.addEventListener('click', () => {
  const code = txTarget.value;
  if (!code) { showToast('⚠ Rien à télécharger', 'error'); return; }
  const filename = getTranslatedFilename();
  triggerDownload(code, filename);
  showToast(`✓ ${filename} téléchargé`, 'success');
});

btnSaveFile.addEventListener('click', async () => {
  const code = txTarget.value;
  if (!code) { showToast('⚠ Rien à enregistrer', 'error'); return; }

  try {
    await saveTranslatedCodeToFile(code);
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error(err);
    showToast('✗ Impossible d’enregistrer le fichier', 'error');
  }
});

// ─── Panneau d'analyse ────────────────────────────────────────────
const detailsPanel = document.getElementById('details-panel');
const detailsExplanation = document.getElementById('details-explanation');
const detailsPitfalls = document.getElementById('details-pitfalls');

const DETAILS_PANEL_MIN_HEIGHT = 120;
const DETAILS_PANEL_MAX_HEIGHT = 320;

function clampDetailsPanelHeight(height) {
  const viewportCap = Math.max(DETAILS_PANEL_MIN_HEIGHT, Math.floor(window.innerHeight * 0.45));
  return Math.max(DETAILS_PANEL_MIN_HEIGHT, Math.min(height, Math.min(DETAILS_PANEL_MAX_HEIGHT, viewportCap)));
}

function setDetailsPanelHeight(height) {
  detailsPanel.style.setProperty('--details-panel-height', `${clampDetailsPanelHeight(height)}px`);
}

setDetailsPanelHeight(160);

function normalizeDetailsText(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
}

function renderPitfalls(pitfalls) {
  detailsPitfalls.replaceChildren();

  const items = Array.isArray(pitfalls)
    ? pitfalls
    : typeof pitfalls === 'string'
      ? pitfalls.split(/\n+/)
      : [];

  const cleanItems = items
    .map(item => normalizeDetailsText(item).replace(/^[\-*•]\s*/, ''))
    .filter(Boolean);

  for (const item of cleanItems) {
    const li = document.createElement('li');
    li.textContent = item;
    detailsPitfalls.appendChild(li);
  }

  if (!cleanItems.length) {
    const li = document.createElement('li');
    li.textContent = 'Aucun piège signalé.';
    detailsPitfalls.appendChild(li);
  }
}

function showDetails(explanation, pitfalls) {
  const explanationText = normalizeDetailsText(explanation);

  detailsExplanation.textContent = explanationText || 'Aucune explication fournie.';
  renderPitfalls(pitfalls);

  detailsPanel.classList.add('visible');
}

let detailsResizeState = null;

function stopDetailsResize() {
  if (!detailsResizeState) return;
  detailsResizeState = null;
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
}

detailsResizer.addEventListener('pointerdown', event => {
  if (!detailsPanel.classList.contains('visible')) return;

  event.preventDefault();
  detailsResizeState = {
    startY: event.clientY,
    startHeight: detailsPanel.getBoundingClientRect().height
  };

  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'ns-resize';
  detailsResizer.setPointerCapture(event.pointerId);
});

detailsResizer.addEventListener('pointermove', event => {
  if (!detailsResizeState) return;

  const delta = detailsResizeState.startY - event.clientY;
  setDetailsPanelHeight(detailsResizeState.startHeight + delta);
});

detailsResizer.addEventListener('pointerup', stopDetailsResize);
detailsResizer.addEventListener('pointercancel', stopDetailsResize);
detailsResizer.addEventListener('lostpointercapture', stopDetailsResize);
window.addEventListener('pointerup', stopDetailsResize);

// ─── Toast ────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ` ${type}` : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}