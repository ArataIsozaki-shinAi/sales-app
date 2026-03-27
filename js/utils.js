// ============================================================
// DATA
// ============================================================
let allRecords = [];

async function fetchAllRecords() {
  const records = [];
  let pageToken = "";
  let page = 1;
  do {
    const loadingText = document.getElementById("loadingText");
    if (loadingText) loadingText.textContent = `データ取得中... ${records.length}件`;
    let url = `${WORKER_URL}?app_token=${APP_TOKEN}&table_id=${TABLE_ID}&page_size=500`;
    if (pageToken) url += `&page_token=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 0) throw new Error(`Lark API: ${json.msg || JSON.stringify(json)}`);
    const items = json.data?.items || [];
    records.push(...items);
    pageToken = json.data?.page_token || "";
    page++;
  } while (pageToken);
  return records;
}

// スタッフマスタ取得（全件ページネーション対応）
async function fetchStaffMaster() {
  const items = [];
  let pageToken = "";
  do {
    let url = `${WORKER_URL}?app_token=${APP_TOKEN}&table_id=${STAFF_TABLE}&page_size=500`;
    if (pageToken) url += `&page_token=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (data.code !== 0) break;
    items.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
  } while (pageToken);

  return items.map(item => {
    const f = item.fields;
    const nameArr = Array.isArray(f["氏名"]) ? f["氏名"] : [];
    const person = nameArr[0] || {};
    const name = person.name || person.en_name || "";
    const openId = person.id || "";
    // LarkのPersonフィールドにavatar_urlが含まれていれば使う
    const avatarUrl = person.avatar_url || person.avatarUrl || person.avatar || "";
    return {
      name,
      openId,
      avatarUrl,
      team: f["チーム名"] || "未設定",
      company: f["社名"] || "",
      dept: f["部署"] || "",
    };
  }).filter(s => s.name);
}

// グローバルスタッフリスト
let staffList = [];

// 表示対象の部署（第一営業部・パートナーのみ）
const VISIBLE_DEPTS = ["第一営業部", "パートナー"];
function isVisibleStaff(s) { return !s.dept || VISIBLE_DEPTS.includes(s.dept); }
function getVisibleStaff() { return staffList.filter(isVisibleStaff); }

// 個人目標データ
let goalsData = [];
let goalMap = {};   // { "名前" => { "2026年03月" => 2000000, ... } }

async function fetchGoals() {
  const items = [];
  let pageToken = "";
  do {
    let url = `${WORKER_URL}?app_token=${APP_TOKEN}&table_id=${GOALS_TABLE}&page_size=500`;
    if (pageToken) url += `&page_token=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (data.code !== 0) break;
    items.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
  } while (pageToken);

  const map = {};
  for (const item of items) {
    const f = item.fields;
    const staffArr = Array.isArray(f["スタッフ"]) ? f["スタッフ"] : [];
    const name = staffArr[0]?.name || "";
    if (!name) continue;
    const goal = f["目標値"];
    if (!goal && goal !== 0) continue;
    let yearMonth = "";
    const ym = f["年月"];
    if (ym && typeof ym === "object" && Array.isArray(ym.value)) {
      yearMonth = ym.value[0]?.text || "";
    } else if (typeof ym === "string") {
      yearMonth = ym;
    }
    if (!yearMonth) continue;
    if (!map[name]) map[name] = {};
    map[name][yearMonth] = goal;
  }
  goalMap = map;
  return items;
}

// 個人の月間目標を取得（ゼロ埋め対応）
function getMonthlyGoal(name) {
  const now = getToday();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const key = `${y}年${m}月`;
  return goalMap[name]?.[key] || 0;
}

// チームの月間目標合計
function getTeamMonthlyGoal(teamName) {
  const members = staffList.filter(s => s.team === teamName);
  return members.reduce((sum, s) => sum + getMonthlyGoal(s.name), 0);
}

// 今月の営業日数（土日除く）
function getBusinessDaysInMonth() {
  const now = getToday();
  const y = now.getFullYear(), m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(y, m, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// 営業日報データ
let dailyReportRecords = [];

async function fetchDailyReports() {
  const items = [];
  let pageToken = "";
  do {
    let url = `${WORKER_URL}?app_token=${APP_TOKEN}&table_id=${DAILY_REPORT_TABLE}&page_size=500`;
    if (pageToken) url += `&page_token=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (data.code !== 0) break;
    items.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
  } while (pageToken);
  return items;
}
