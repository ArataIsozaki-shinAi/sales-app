// ============================================================
// LARK OAUTH
// ============================================================
// Lark Developer ConsoleでリダイレクトURIに以下を追加してください:
// https://salesdash.pages.dev/
const LARK_CLIENT_ID = "cli_a9383b9d2bb8de16";
const LARK_REDIRECT_URI = encodeURIComponent(window.location.origin + window.location.pathname);
const LARK_AUTH_URL = `https://open.larksuite.com/open-apis/authen/v1/index?redirect_uri=${LARK_REDIRECT_URI}&app_id=${LARK_CLIENT_ID}&response_type=code`;

let larkUserInfo = null;

function larkLogin() {
  window.location.href = LARK_AUTH_URL;
}

async function handleLarkCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return false;

  try {
    const res = await fetch(`${WORKER_URL}?action=auth&code=${encodeURIComponent(code)}`);
    const data = await res.json();
    console.log("Auth response:", JSON.stringify(data));
    if (data.access_token) {
      localStorage.setItem("lark_token", data.access_token);
      localStorage.setItem("lark_user", JSON.stringify(data.user || {}));
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    } else {
      console.error("Auth failed:", data);
      return false;
    }
  } catch(e) {
    console.error("Auth error:", e);
    return false;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem("lark_token");
}

async function initAuth() {
  const overlay = document.getElementById("loadingOverlay");
  const loginScreen = document.getElementById("larkLogin");

  // デモモード: 認証スキップ、モックデータで起動
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "true" || window.DEMO_MODE) {
    loadConfig();
    initDemoMode();
    return;
  }

  // コールバック処理（URLにcodeがある場合）
  const code = params.get("code");
  if (code) {
    overlay.classList.remove("hidden");
    overlay.classList.remove("hidden");
    loginScreen.classList.add("hidden");
    document.getElementById("loadingText").textContent = "Lark認証中...";
    const ok = await handleLarkCallback();
    if (!ok) {
      // 認証失敗
      overlay.classList.add("hidden");
      loginScreen.classList.remove("hidden");
      return;
    }
  }

  if (isLoggedIn()) {
    loginScreen.classList.add("hidden");
    loadConfig();
    loadData();
  } else {
    overlay.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }
}

// ============================================================
// ADMIN PASSWORD
// ============================================================
const ADMIN_PASSWORD = "admin1234"; // ← ここを変更してください


function openThemeSettings() {
  // 現在のテーマに応じてボタンのボーダーを更新
  const saved = localStorage.getItem(THEME_KEY);
  let currentTheme = "auto";
  if (saved) {
    try { currentTheme = JSON.parse(saved).name || "auto"; } catch {}
  }
  updateThemeButtons(currentTheme);
  document.getElementById("themeModal").classList.remove("hidden");
}

function openAdminSettings() {
  document.getElementById("adminPasswordInput").value = "";
  document.getElementById("adminPasswordError").style.display = "none";
  document.getElementById("adminPasswordModal").classList.remove("hidden");
  setTimeout(() => document.getElementById("adminPasswordInput").focus(), 100);
}

function checkAdminPassword() {
  const input = document.getElementById("adminPasswordInput").value;
  if (input === ADMIN_PASSWORD) {
    document.getElementById("adminPasswordModal").classList.add("hidden");
    const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    document.getElementById("workerUrlInput").value = cfg.workerUrl || WORKER_URL || "";
    document.getElementById("configModal").classList.remove("hidden");
  } else {
    document.getElementById("adminPasswordError").style.display = "block";
    document.getElementById("adminPasswordInput").value = "";
  }
}

