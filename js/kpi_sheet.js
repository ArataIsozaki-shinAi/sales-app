// ============================================================
// 数値管理シート
// ============================================================

// 営業日報レコードから作成者名を取得
function getDailyReportAuthor(record) {
  const f = record.fields;
  // 作成者フィールド（Personフィールド）
  const creators = f["作成者"];
  if (Array.isArray(creators) && creators.length > 0) {
    return creators[0].name || creators[0].en_name || "";
  }
  // フォールバック: 作成者/作成日時テキストから抽出
  const combo = f["作成者/作成日時"];
  if (combo) {
    const vals = combo.value || [];
    for (const v of vals) {
      if (v.text) {
        const parts = v.text.split("：");
        if (parts.length > 0) return parts[0].trim();
      }
    }
  }
  return "";
}

// 営業日報の作成日時を取得
function getDailyReportDate(record) {
  const f = record.fields;
  const ts = f["作成日時"];
  if (typeof ts === "number") return new Date(ts);
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d) ? null : d;
  }
  return null;
}

// 営業日報レコードからチーム名を取得（スタッフマスタ経由）
function getDailyReportTeam(authorName) {
  if (!staffList || staffList.length === 0) return "未設定";
  const staff = staffList.find(s => s.name === authorName);
  return staff ? staff.team : "未設定";
}

// 数値フィールドの安全な取得
function getNumField(record, fieldName) {
  const val = record.fields[fieldName];
  if (typeof val === "number") return val;
  return 0;
}

// ============================================================
// メイン集計ロジック
// ============================================================

function buildKpiSheetData(period) {
  const now = getToday();
  let periodStart, periodEnd;

  if (period === "daily") {
    periodStart = startOfDay(now);
    periodEnd = now;
  } else if (period === "weekly") {
    periodStart = startOfWeek(now);
    periodEnd = now;
  } else {
    periodStart = startOfMonth(now);
    periodEnd = now;
  }

  // 平良チーム除外
  const EXCLUDED_TEAMS = ["平良チーム", "平良"];

  // --- 営業日報から集計 ---
  const reportMap = {}; // name -> { 架電数, 決済者接続数, アポ数, 内諾件数, 申込完了件数 }

  for (const r of dailyReportRecords) {
    const d = getDailyReportDate(r);
    if (!d || d < periodStart || d > periodEnd) continue;

    const name = getDailyReportAuthor(r);
    if (!name) continue;

    const team = getDailyReportTeam(name);
    if (EXCLUDED_TEAMS.some(t => team.includes(t))) continue;

    if (!reportMap[name]) {
      reportMap[name] = {
        架電数: 0,
        決済者接続数: 0,
        アポ数: 0,
        内諾数: 0,
        申込完了数: 0,
        team: team
      };
    }
    reportMap[name].架電数 += getNumField(r, "架電数");
    reportMap[name].決済者接続数 += getNumField(r, "決済者対応数") + getNumField(r, "決済者面談数");
    reportMap[name].アポ数 += getNumField(r, "アポ数");
    reportMap[name].内諾数 += getNumField(r, "内諾件数");
    reportMap[name].申込完了数 += getNumField(r, "申込完了件数");
  }

  // --- 商談リストから集計（見積もり/コンサル、商談、申込依頼済み、成約） ---
  const dealMap = {}; // name -> { 見積コンサル数, 商談数, 申込依頼済数, 成約数 }

  for (const r of allRecords) {
    const d = getRecordDate(r);
    if (!d || d < periodStart || d > periodEnd) continue;

    const name = getAssigneeName(r);
    if (!name) continue;

    const team = getTeamName(r);
    if (EXCLUDED_TEAMS.some(t => team.includes(t))) continue;

    const status = r.fields[F.STATUS] || "";

    if (!dealMap[name]) {
      dealMap[name] = {
        見積コンサル数: 0,
        商談数: 0,
        申込依頼済数: 0,
        成約数: 0,
        team: team
      };
    }

    // 商談リストに存在するレコード = 商談として集計
    dealMap[name].商談数 += 1;

    if (status === "申込依頼済み") dealMap[name].申込依頼済数 += 1;
    if (status === "成約") dealMap[name].成約数 += 1;
  }

  // --- マージ ---
  const allNames = new Set([...Object.keys(reportMap), ...Object.keys(dealMap)]);
  const rows = [];

  for (const name of allNames) {
    const rData = reportMap[name] || { 架電数: 0, 決済者接続数: 0, アポ数: 0, 内諾数: 0, 申込完了数: 0, team: "未設定" };
    const dData = dealMap[name] || { 見積コンサル数: 0, 商談数: 0, 申込依頼済数: 0, 成約数: 0, team: "未設定" };
    const team = rData.team !== "未設定" ? rData.team : dData.team;

    rows.push({
      name,
      team,
      架電数: rData.架電数,
      決済者接続数: rData.決済者接続数,
      アポ数: rData.アポ数,
      見積コンサル数: dData.見積コンサル数,
      商談数: dData.商談数,
      内諾数: rData.内諾数,
      申込依頼済数: dData.申込依頼済数,
      申込完了数: rData.申込完了数,
      成約数: dData.成約数
    });
  }

  // チーム順→名前順にソート
  rows.sort((a, b) => {
    if (a.team !== b.team) return a.team.localeCompare(b.team);
    // 申込依頼済数（売上ランキング指標）降順
    return b.申込依頼済数 - a.申込依頼済数;
  });

  return rows;
}

// チーム合計行を計算
function calcTeamTotals(rows) {
  const teamMap = {};
  for (const r of rows) {
    if (!teamMap[r.team]) {
      teamMap[r.team] = {
        name: `【${r.team}】合計`,
        team: r.team,
        架電数: 0, 決済者接続数: 0, アポ数: 0, 見積コンサル数: 0,
        商談数: 0, 内諾数: 0, 申込依頼済数: 0, 申込完了数: 0, 成約数: 0,
        isTotal: true
      };
    }
    const t = teamMap[r.team];
    t.架電数 += r.架電数;
    t.決済者接続数 += r.決済者接続数;
    t.アポ数 += r.アポ数;
    t.見積コンサル数 += r.見積コンサル数;
    t.商談数 += r.商談数;
    t.内諾数 += r.内諾数;
    t.申込依頼済数 += r.申込依頼済数;
    t.申込完了数 += r.申込完了数;
    t.成約数 += r.成約数;
  }
  return teamMap;
}

// 全体合計
function calcGrandTotal(rows) {
  const total = {
    name: "全体合計",
    team: "",
    架電数: 0, 決済者接続数: 0, アポ数: 0, 見積コンサル数: 0,
    商談数: 0, 内諾数: 0, 申込依頼済数: 0, 申込完了数: 0, 成約数: 0,
    isGrandTotal: true
  };
  for (const r of rows) {
    total.架電数 += r.架電数;
    total.決済者接続数 += r.決済者接続数;
    total.アポ数 += r.アポ数;
    total.見積コンサル数 += r.見積コンサル数;
    total.商談数 += r.商談数;
    total.内諾数 += r.内諾数;
    total.申込依頼済数 += r.申込依頼済数;
    total.申込完了数 += r.申込完了数;
    total.成約数 += r.成約数;
  }
  return total;
}

// ============================================================
// レンダリング
// ============================================================

let currentKpiPeriod = "monthly";

function renderKpiSheet() {
  const rows = buildKpiSheetData(currentKpiPeriod);
  const teamTotals = calcTeamTotals(rows);
  const grandTotal = calcGrandTotal(rows);
  const container = document.getElementById("kpi-sheet-body");
  if (!container) return;

  // 期間ラベル
  const periodLabels = { daily: "本日", weekly: "今週", monthly: "今月" };
  const periodLabel = document.getElementById("kpi-period-label");
  if (periodLabel) periodLabel.textContent = periodLabels[currentKpiPeriod] || "";

  // タブ状態
  document.querySelectorAll(".kpi-period-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.period === currentKpiPeriod);
  });

  // テーブル構築
  let html = "";
  let currentTeam = null;

  for (const row of rows) {
    // チームが変わったら小計行を先に出す（前チーム分）
    if (currentTeam !== null && currentTeam !== row.team) {
      const tt = teamTotals[currentTeam];
      if (tt) html += renderKpiRow(tt, "kpi-row-total");
      html += `<tr class="kpi-row-spacer"><td colspan="11"></td></tr>`;
    }

    // チームヘッダー
    if (currentTeam !== row.team) {
      currentTeam = row.team;
      html += `<tr class="kpi-team-header"><td colspan="11">${row.team}</td></tr>`;
    }

    html += renderKpiRow(row, "kpi-row-data");
  }

  // 最後のチーム合計
  if (currentTeam && teamTotals[currentTeam]) {
    html += renderKpiRow(teamTotals[currentTeam], "kpi-row-total");
  }

  // 全体合計
  html += `<tr class="kpi-row-spacer"><td colspan="11"></td></tr>`;
  html += renderKpiRow(grandTotal, "kpi-row-grand");

  container.innerHTML = html;

  // KPIサマリーカード更新
  updateKpiSummaryCards(grandTotal, rows);
}

function renderKpiRow(row, cls) {
  const nameDisplay = row.isTotal || row.isGrandTotal
    ? `<strong>${row.name}</strong>`
    : `<span class="kpi-name-cell">${avatarHtml ? avatarHtml(row.name, 24, "kpi-avatar") : initial(row.name)} ${row.name}</span>`;

  return `<tr class="${cls}">
    <td class="kpi-cell-name">${nameDisplay}</td>
    <td class="kpi-cell-num">${row.架電数 || "-"}</td>
    <td class="kpi-cell-num">${row.決済者接続数 || "-"}</td>
    <td class="kpi-cell-num">${row.アポ数 || "-"}</td>
    <td class="kpi-cell-num">${row.見積コンサル数 || "-"}</td>
    <td class="kpi-cell-num">${row.商談数 || "-"}</td>
    <td class="kpi-cell-num">${row.内諾数 || "-"}</td>
    <td class="kpi-cell-num kpi-cell-highlight">${row.申込依頼済数 || "-"}</td>
    <td class="kpi-cell-num">${row.申込完了数 || "-"}</td>
    <td class="kpi-cell-num kpi-cell-accent">${row.成約数 || "-"}</td>
    <td class="kpi-cell-num kpi-cell-rate">${calcConvRate(row)}</td>
  </tr>`;
}

// 転換率（架電数 → 成約）
function calcConvRate(row) {
  if (!row.架電数 || row.架電数 === 0) return "-";
  const rate = ((row.申込依頼済数 || 0) / row.架電数 * 100);
  return rate.toFixed(1) + "%";
}

// サマリーカード更新
function updateKpiSummaryCards(total, rows) {
  const el = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  el("kpi-sum-calls", total.架電数.toLocaleString());
  el("kpi-sum-decision", total.決済者接続数.toLocaleString());
  el("kpi-sum-appo", total.アポ数.toLocaleString());
  el("kpi-sum-deals", total.商談数.toLocaleString());
  el("kpi-sum-naitaku", total.内諾数.toLocaleString());
  el("kpi-sum-applied", total.申込依頼済数.toLocaleString());
  el("kpi-sum-completed", total.申込完了数.toLocaleString());
  el("kpi-sum-closed", total.成約数.toLocaleString());

  // 転換率
  const convRate = total.架電数 > 0 ? ((total.申込依頼済数 / total.架電数) * 100).toFixed(1) + "%" : "-";
  el("kpi-sum-conv", convRate);

  // アクティブ人数
  el("kpi-sum-active", rows.length + "名");
}

function switchKpiPeriod(period) {
  currentKpiPeriod = period;
  renderKpiSheet();
}
