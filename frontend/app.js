/**
 * CodeTrad — app.js
 * Textarea native — fonctionne sans serveur (file://)
 */

// ─── DOM refs ─────────────────────────────────────────────────────
const selSource    = document.getElementById('lang-source');
const selTarget    = document.getElementById('lang-target');
const btnTranslate = document.getElementById('btn-translate');
const btnSwap      = document.getElementById('btn-swap');
const btnClear     = document.getElementById('btn-clear');
const btnCopySrc   = document.getElementById('btn-copy-source');
const btnCopyTgt   = document.getElementById('btn-copy-target');
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

// ─── Noms affichés ────────────────────────────────────────────────
const LANG_NAMES = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
  java: 'Java', csharp: 'C#', cpp: 'C++', go: 'Go',
  rust: 'Rust', php: 'PHP', ruby: 'Ruby'
};

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

// ─── Traduction — appel API backend ──────────────────────────────
// TODO Personne 1 : remplacer l'URL par l'endpoint réel
async function translateCode(sourceCode, sourceLang, targetLang) {
  const res = await fetch('http://localhost:8000/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: sourceCode, source_lang: sourceLang, target_lang: targetLang })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  const data = await res.json();
  // Le backend doit retourner { result: "..." }
  return data.result ?? data.code ?? data.translation ?? JSON.stringify(data);
}

// ─── Bouton Traduire ──────────────────────────────────────────────
async function handleTranslate() {
  const code = txSource.value.trim();
  if (!code) { showToast('⚠ Colle du code à traduire', 'error'); return; }

  const sourceLang = selSource.value;
  const targetLang = selTarget.value;
  if (sourceLang === targetLang) { showToast('⚠ Source et cible identiques', 'error'); return; }

  // UI loading
  btnTranslate.disabled = true;
  btnTranslate.classList.add('loading');
  btnTranslate.querySelector('.translate-label').textContent = 'Traduction…';
  setBadge('loading', 'En cours…');
  setStatus(`Traduction ${LANG_NAMES[sourceLang]} → ${LANG_NAMES[targetLang]}…`);

  try {
    const result = await translateCode(code, sourceLang, targetLang);

    txTarget.value = result;
    txTarget.style.display = 'block';
    placeholder.classList.add('hidden');
    updateTargetStats();

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
  showToast('Éditeurs effacés');
});

// ─── Changement langage ───────────────────────────────────────────
selSource.addEventListener('change', () => {
  labelSource.textContent = LANG_NAMES[selSource.value];
});
selTarget.addEventListener('change', () => {
  labelTarget.textContent = LANG_NAMES[selTarget.value];
});

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
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    txSource.value = ev.target.result;
    updateSourceStats();
    showToast(`✓ ${file.name} chargé`, 'success');
  };
  reader.readAsText(file);
  fileInput.value = '';
});

// ─── Download ─────────────────────────────────────────────────────
btnDownload.addEventListener('click', () => {
  const code = txTarget.value;
  if (!code) { showToast('⚠ Rien à télécharger', 'error'); return; }
  const ext = { javascript:'js', typescript:'ts', python:'py', java:'java',
                csharp:'cs', cpp:'cpp', go:'go', rust:'rs', php:'php', ruby:'rb' };
  const filename = `traduction.${ext[selTarget.value] || 'txt'}`;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })),
    download: filename
  });
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`✓ ${filename} téléchargé`, 'success');
});

// ─── Toast ────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ` ${type}` : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}