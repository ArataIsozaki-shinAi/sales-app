// ============================================================
// CONFIG
// ============================================================
const CONFIG_KEY = "salesdash_config";
// ===== 設定（変更する場合はここだけ編集） =====
let WORKER_URL = "https://throbbing-lab-83b8.arata-isozaki.workers.dev";
const APP_TOKEN    = "ES9VbU0ntaer13sncOEjafhgpHe";
const TABLE_ID     = "tbl1L0SBGe851UXo";
const STAFF_TABLE   = "tblTJ1Ghubk653TQ"; // スタッフマスタ
const CLIENT_TABLE  = "tblwRQH2baG52xzL"; // クライアントマスタ
const DAILY_REPORT_TABLE = "tblkt1urTQMb3dTQ"; // 営業日報一覧
const GOALS_TABLE = "tbl68XMo1IzU7AEf"; // 個人目標
// =============================================

// フィールド名（Baseの実際の列名）
const F = {
  STATUS:   "ステータス",
  SALES:    "商材売上",
  MONTH:    "申込完了月",
  ASSIGNEE: "クローザー/担当者",
  TEAM:     "チーム名",
};

// 集計対象ステータス
const VALID_STATUSES = ["申込依頼済み", "申込完了", "成約"];

// ============================================================
// DATE HELPERS
// ============================================================
function getToday() { return new Date(); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d) {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Mon start
  const mon = new Date(d); mon.setDate(d.getDate() + diff); mon.setHours(0,0,0,0);
  return mon;
}
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

function parseDate(val) {
  if (!val) return null;
  // Lark returns ms timestamp or date string
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d) ? null : d;
  }
  return null;
}
