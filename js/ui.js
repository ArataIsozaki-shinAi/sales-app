// ============================================================
// ランキングLark送信
// ============================================================

function updateRankingSendButton() {
  const area = document.getElementById("ranking-send-area");
  if (!area || !larkUserInfo?.name) return;
  const staff = staffList.find(s => s.name === larkUserInfo.name);
  const canSend = larkUserInfo.name === "囲湊嵜新汰" ||
    (staff && ["役員", "バックオフィス"].includes(staff.dept));
  area.style.display = canSend ? "flex" : "none";
}

function openRankingSendModal() {
  document.getElementById("rankingSendModal").classList.remove("hidden");
}
function closeRankingSendModal() {
  document.getElementById("rankingSendModal").classList.add("hidden");
}

async function sendRankingToLark() {
  const sectionIds = ["month", "week", "day", "monthTeam", "weekTeam", "dayTeam"];
  const sections = sectionIds.filter(id => document.getElementById("sec-" + id).checked);
  if (sections.length === 0) { alert("送信するセクションを1つ以上選択してください"); return; }

  const btn = document.getElementById("btn-ranking-send-confirm");
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "送信中...";
  try {
    const res = await fetch(WORKER_URL + "/api/test-ranking?sections=" + sections.join(","));
    const data = await res.json();
    if (data.ok) {
      btn.innerHTML = icon("check","sm") + " 送信完了";
      setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; closeRankingSendModal(); }, 1500);
    } else {
      btn.innerHTML = icon("x","sm") + " 送信失敗";
      setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; }, 2000);
    }
  } catch (e) {
    btn.innerHTML = icon("x","sm") + " エラー";
    setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2000);
  }
}

// ============================================================
// RANK TAB SWITCH
// ============================================================

function switchRankTab(tab) {
  ['sales','deals','clients'].forEach(t => {
    const panel = document.getElementById(`rank-panel-${t}`);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    const el = document.getElementById(`rtab-${t}`);
    if (el) el.classList.toggle('active', t === tab);
  });
}

// 個人ランキングページのタブ切替
function switchOverviewTab(tab) {
  ['sales','clients','deals'].forEach(t => {
    const panel = document.getElementById(`ov-panel-${t}`);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    const el = document.getElementById(`ovtab-${t}`);
    if (el) el.classList.toggle('active', t === tab);
  });
}

// チームランキングページのタブ切替
function switchTeamTab(tab) {
  ['sales','clients','deals'].forEach(t => {
    const panel = document.getElementById(`team-panel-${t}`);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    const el = document.getElementById(`teamtab-${t}`);
    if (el) el.classList.toggle('active', t === tab);
  });
}

// 全体タブの期間フィルター
function switchOverallPeriod(period) {
  document.querySelectorAll('.kpi-period-tab-overall').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-period') === period);
  });
  // KPIシートの期間も同期
  switchKpiPeriod(period);
}

// ============================================================
// DEAL MODAL HELPERS
// ============================================================

// 全体ページ用：期間でフィルタして開く
function showRecordsByPeriod(period) {
  const now = getToday();
  let from, title;
  if (period === 'month') { from = startOfMonth(now); title = '今月の案件一覧'; }
  else if (period === 'week') { from = startOfWeek(now); title = '今週の案件一覧'; }
  else { from = startOfDay(now); title = '今日の案件一覧'; }
  const recs = filterByPeriod(allRecords.filter(r => isValidStatus(r)), from, now);
  openDealModal(recs, title);
}

// 名前（担当者）でフィルタして開く
function showRecordsByName(name) {
  const now = getToday();
  const monthStart = startOfMonth(now);
  const recs = filterByPeriod(allRecords.filter(r => isValidStatus(r) && getAssigneeName(r) === name), monthStart, now);
  openDealModal(recs, `${name}の今月案件`);
}

// 個人ページ：日付キーでフィルタ
function showRecordsByDateKey(key, type) {
  const recs = currentIndRecords.monthly.filter(r => {
    const d = getRecordDate(r);
    if (!d) return false;
    if (type === 'day') {
      return `${d.getMonth()+1}/${d.getDate()}` === key;
    } else {
      const weekNum = Math.ceil(d.getDate() / 7);
      return `第${weekNum}週` === key;
    }
  });
  openDealModal(recs, `${key}の案件`);
}

// チーム詳細：期間でフィルタ
let currentTeamRecords = { month: [], week: [], day: [] };
function showTeamRecords(period) {
  const recs = currentTeamRecords[period];
  const titleMap = { month: '今月', week: '今週', day: '今日' };
  openDealModal(recs, `${titleMap[period]}のチーム案件`);
}

// ============================================================
// ACCORDION
// ============================================================
function toggleAccordion(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id + "-arrow");
  if (!el) return;
  const isOpen = el.style.display !== "none";
  el.style.display = isOpen ? "none" : "block";
  if (arrow) arrow.style.transform = isOpen ? "" : "rotate(180deg)";
}

