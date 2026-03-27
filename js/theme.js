// ============================================================
// THEME
// ============================================================
const THEME_KEY = "salesdash_theme";

const THEMES = {
  dark:  { bg:"#0f1117", surface:"#1a1d27", accent:"#4f6ef7", text:"#e8eaf6", muted:"#7b82a0" },
  light: { bg:"#f0f4ff", surface:"#ffffff", accent:"#4f6ef7", text:"#1a1d27", muted:"#666b85" },
};

// システム設定のダーク/ライトを取得
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// 実際にCSS変数を適用する（保存はしない）
function applyThemeColors(resolved) {
  const theme = THEMES[resolved];
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty("--bg",      theme.bg);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface2",resolved === "light" ? "#e8eef8" : "#22263a");
  root.style.setProperty("--border",  resolved === "light" ? "#d0d8f0" : "#2e3347");
  root.style.setProperty("--accent",  theme.accent);
  root.style.setProperty("--text",    theme.text);
  root.style.setProperty("--muted",   theme.muted);
  // ポディウムアバター背景をテーマに合わせて調整
  root.style.setProperty("--rank1-bg", resolved === "light" ? "#fff8e0" : "#2a2410");
  root.style.setProperty("--rank2-bg", resolved === "light" ? "#f0f0f4" : "#1e2128");
  root.style.setProperty("--rank3-bg", resolved === "light" ? "#fdf0e8" : "#211a12");
}

// テーマボタンのアクティブ状態を更新
function updateThemeButtons(name) {
  const btnDark  = document.getElementById("theme-btn-dark");
  const btnLight = document.getElementById("theme-btn-light");
  const btnAuto  = document.getElementById("theme-btn-auto");
  if (btnDark)  btnDark.style.borderColor  = name === "dark"  ? "var(--accent)" : "transparent";
  if (btnLight) btnLight.style.borderColor = name === "light" ? "var(--accent)" : "transparent";
  if (btnAuto)  btnAuto.style.borderColor  = name === "auto"  ? "var(--accent)" : "transparent";
}

function applyAndSaveTheme(name) {
  const resolved = name === "auto" ? getSystemTheme() : name;
  applyThemeColors(resolved);
  localStorage.setItem(THEME_KEY, JSON.stringify({name}));
  updateThemeButtons(name);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  let themeName = "auto"; // デフォルトはシステム設定に従う
  if (saved) {
    try {
      const data = JSON.parse(saved);
      themeName = data.name || "auto";
    } catch {}
  }
  applyAndSaveTheme(themeName);

  // システム設定変更を監視（autoモード時にリアルタイム反映）
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const current = localStorage.getItem(THEME_KEY);
    if (current) {
      try {
        const data = JSON.parse(current);
        if (data.name === "auto") applyThemeColors(getSystemTheme());
      } catch {}
    }
  });
}

function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      const cfg = JSON.parse(saved);
      WORKER_URL = cfg.workerUrl || "";
      document.getElementById("workerUrlInput").value = WORKER_URL;
    }
  } catch(e) {}
}


