const API_URL = "http://localhost:8000/api";

const LANGUAGES = [
  "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#",
  "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "Scala", "R",
  "Bash", "SQL"
];

// Map display names to Monaco language IDs
const MONACO_LANG_MAP = {
  "Python": "python",
  "JavaScript": "javascript",
  "TypeScript": "typescript",
  "Java": "java",
  "C": "c",
  "C++": "cpp",
  "C#": "csharp",
  "Go": "go",
  "Rust": "rust",
  "PHP": "php",
  "Ruby": "ruby",
  "Swift": "swift",
  "Kotlin": "kotlin",
  "Scala": "scala",
  "R": "r",
  "Bash": "shell",
  "SQL": "sql",
};

const SAMPLE_CODE = {
  Python: `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nfor i in range(10):\n    print(fibonacci(i))`,
  JavaScript: `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nfor (let i = 0; i < 10; i++) {\n  console.log(fibonacci(i));\n}`,
};

let sourceEditor, targetEditor;

// Populate selects
function populateSelects() {
  const sourceSel = document.getElementById("source-lang");
  const targetSel = document.getElementById("target-lang");

  LANGUAGES.forEach((lang, i) => {
    const opt1 = new Option(lang, lang);
    const opt2 = new Option(lang, lang);
    sourceSel.appendChild(opt1);
    targetSel.appendChild(opt2);
  });

  sourceSel.value = "Python";
  targetSel.value = "JavaScript";
}

// Init Monaco editors
function initEditors() {
  require.config({
    paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" }
  });

  require(["vs/editor/editor.main"], function () {
    const commonOptions = {
      theme: "vs-dark",
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      automaticLayout: true,
      lineNumbers: "on",
      renderLineHighlight: "none",
    };

    sourceEditor = monaco.editor.create(document.getElementById("source-editor"), {
      ...commonOptions,
      language: "python",
      value: SAMPLE_CODE["Python"],
    });

    targetEditor = monaco.editor.create(document.getElementById("target-editor"), {
      ...commonOptions,
      language: "javascript",
      value: "",
      readOnly: true,
    });

    // Update editor language on select change
    document.getElementById("source-lang").addEventListener("change", (e) => {
      const lang = MONACO_LANG_MAP[e.target.value] || "plaintext";
      monaco.editor.setModelLanguage(sourceEditor.getModel(), lang);
      if (SAMPLE_CODE[e.target.value]) {
        sourceEditor.setValue(SAMPLE_CODE[e.target.value]);
      }
    });

    document.getElementById("target-lang").addEventListener("change", (e) => {
      const lang = MONACO_LANG_MAP[e.target.value] || "plaintext";
      monaco.editor.setModelLanguage(targetEditor.getModel(), lang);
    });
  });
}

// Swap languages
document.getElementById("swap-btn").addEventListener("click", () => {
  const sourceSel = document.getElementById("source-lang");
  const targetSel = document.getElementById("target-lang");
  const temp = sourceSel.value;

  const translatedCode = targetEditor ? targetEditor.getValue() : "";
  const sourceCode = sourceEditor ? sourceEditor.getValue() : "";

  sourceSel.value = targetSel.value;
  targetSel.value = temp;

  if (sourceEditor && targetEditor) {
    const newSourceLang = MONACO_LANG_MAP[sourceSel.value] || "plaintext";
    const newTargetLang = MONACO_LANG_MAP[targetSel.value] || "plaintext";
    monaco.editor.setModelLanguage(sourceEditor.getModel(), newSourceLang);
    monaco.editor.setModelLanguage(targetEditor.getModel(), newTargetLang);
    sourceEditor.setValue(translatedCode);
    targetEditor.setValue(sourceCode);
  }
});

// Copy buttons
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const code = btn.dataset.target === "source"
      ? sourceEditor?.getValue()
      : targetEditor?.getValue();

    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = "Copié !";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copier";
        btn.classList.remove("copied");
      }, 1500);
    });
  });
});

// Error banner
function showError(msg) {
  const banner = document.getElementById("error-banner");
  document.getElementById("error-text").textContent = msg;
  banner.classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-banner").classList.add("hidden");
}

document.getElementById("close-error").addEventListener("click", hideError);

// Translate
document.getElementById("translate-btn").addEventListener("click", async () => {
  hideError();

  const sourceCode = sourceEditor?.getValue() || "";
  const sourceLang = document.getElementById("source-lang").value;
  const targetLang = document.getElementById("target-lang").value;

  if (!sourceCode.trim()) {
    showError("Veuillez entrer du code source à traduire.");
    return;
  }

  if (sourceLang === targetLang) {
    showError("Les langages source et cible doivent être différents.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        source_language: sourceLang,
        target_language: targetLang,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erreur serveur");
    }

    const data = await response.json();

    // Set translated code
    targetEditor.setValue(data.translated_code);
    const targetLang2 = MONACO_LANG_MAP[targetLang] || "plaintext";
    monaco.editor.setModelLanguage(targetEditor.getModel(), targetLang2);

    // Show explanation
    document.getElementById("explanation-text").textContent = data.explanation;

    const pitfallsList = document.getElementById("pitfalls-list");
    pitfallsList.innerHTML = "";
    (data.pitfalls || []).forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      pitfallsList.appendChild(li);
    });

    document.getElementById("explanation-panel").classList.remove("hidden");

  } catch (err) {
    showError(err.message || "Impossible de contacter le serveur.");
  } finally {
    setLoading(false);
  }
});

function setLoading(loading) {
  const btn = document.getElementById("translate-btn");
  const text = document.getElementById("btn-text");
  const spinner = document.getElementById("btn-spinner");

  btn.disabled = loading;
  text.textContent = loading ? "Traduction..." : "Traduire";
  spinner.classList.toggle("hidden", !loading);
}

// Init
populateSelects();
initEditors();
