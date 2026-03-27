// ============================================================
// RENDER HELPERS
// ============================================================
function fmt(n) {
  if (n >= 100000000) return `¥${(n/100000000).toFixed(1)}億`;
  if (n >= 10000) return `¥${(n/10000).toFixed(1)}万`;
  return `¥${Math.round(n).toLocaleString()}`;
}
function fmtShort(n) {
  return `¥${Math.round(n).toLocaleString()}`;
}
function fmtFull(n) { return `¥${Math.round(n).toLocaleString()}`; }
function initial(name) { return name ? name[0] : "？"; }

const RANK_COLORS = ["rank1","rank2","rank3"];
const BADGE_COLORS = ["r1","r2","r3"];
const BAR_COLORS = ["var(--gold)","var(--accent)","var(--accent)","var(--accent)","var(--accent)","var(--accent)"];

function renderPodium(containerId, ranking, valueKey = "sales", suffix = "") {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (ranking.length === 0) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem;font-size:0.85rem">データなし</div>'; return; }

  const top3 = ranking.slice(0, 3);
  const orders = ["first","second","third"];
  let html = "";
  // Render in display order: 2nd, 1st, 3rd
  const displayOrder = top3.length === 1 ? [0] : top3.length === 2 ? [1,0] : [1,0,2];
  const classOrder = top3.length === 1 ? ["first"] : top3.length === 2 ? ["second","first"] : ["second","first","third"];

  for (let i = 0; i < displayOrder.length; i++) {
    const item = top3[displayOrder[i]];
    const rank = displayOrder[i];
    const cls = classOrder[i];
    const val = item[valueKey];
    const display = suffix ? `${val}${suffix}` : valueKey === "sales" ? fmtFull(val) : `${val}件`;
    const clickAttr = item.name ? `onclick="showRecordsByName('${item.name}')" style="cursor:pointer"` : '';
    const avatarUrl = avatarMap[item.name] || "";
    const avatarInner = avatarUrl
      ? `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.outerHTML='${initial(item.name)}'">`
      : initial(item.name);
    html += `<div class="podium-item ${cls}" ${clickAttr}>
      <div class="podium-avatar ${RANK_COLORS[rank]}">${avatarInner}<span class="rank-badge ${BADGE_COLORS[rank]}">${rank+1}</span></div>
      <div class="podium-name">${item.name}</div>
      <div class="podium-val" style="${rank===0?'color:var(--gold)':''}">${display}</div>
    </div>`;
  }
  el.innerHTML = html;
}

function renderRankRest(containerId, ranking, valueKey = "sales", suffix = "") {
  const el = document.getElementById(containerId);
  if (!el) return;
  const rest = ranking.slice(3);
  if (rest.length === 0) { el.innerHTML = ""; return; }
  el.innerHTML = rest.map((item, i) => {
    const val = item[valueKey];
    const display = suffix ? `${val}${suffix}` : valueKey === "sales" ? fmtFull(val) : `${val}件`;
    return `<div class="rank-row" onclick="showRecordsByName('${item.name}')" style="cursor:pointer" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--surface2)'">
      <div class="rank-num">${i+4}</div>
      <div class="rank-avatar-sm" style="overflow:hidden;padding:0">${avatarMap[item.name] ? `<img src="${avatarMap[item.name]}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.outerHTML='${initial(item.name)}'">` : initial(item.name)}</div>
      <div class="rank-name">${item.name}</div>
      <div class="rank-val">${display}</div>
    </div>`;
  }).join("");
}

// 同率順位を計算するヘルパー
function assignRanks(ranking, key = "sales") {
  const result = [];
  let currentRank = 1;
  for (let i = 0; i < ranking.length; i++) {
    if (i > 0 && ranking[i][key] === ranking[i-1][key]) {
      result.push({ ...ranking[i], _rank: result[i-1]._rank });
    } else {
      result.push({ ...ranking[i], _rank: currentRank });
    }
    currentRank = i + 2;
  }
  return result;
}

function renderFullRankTable(containerId, ranking, initialShow = 10, clickFn = "showRecordsByName") {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (ranking.length === 0) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem;font-size:0.85rem">データなし</div>'; return; }

  const ranked = assignRanks(ranking, "sales");

  function buildRows(items) {
    return items.map((item) => {
      const rank = item._rank;
      const rankClass = rank <= 3 ? ` rtbl-rank-${rank}` : '';
      const zeroClass = item.sales === 0 ? ' rtbl-zero' : '';
      return `<div class="rtbl-row" onclick="${clickFn}('${item.name}')" style="cursor:pointer">
        <div class="rtbl-rank"><span class="rtbl-rank-num${rankClass}">${rank}</span></div>
        <div class="rtbl-user"><span class="rtbl-name">${item.name}</span></div>
        <span class="rtbl-sales-val${zeroClass}">${fmtFull(item.sales)}</span>
        <div class="rtbl-stat">${item.clients || 0}<span class="rtbl-stat-unit">社</span></div>
        <div class="rtbl-stat">${item.deals || 0}<span class="rtbl-stat-unit">件</span></div>
      </div>`;
    }).join("");
  }

  const showItems = ranked.slice(0, initialShow);
  const moreItems = ranked.slice(initialShow);
  const toggleId = containerId + "-toggle";
  const moreId = containerId + "-more";

  let html = `<div class="rtbl-header">
    <div class="rtbl-rank">No.</div>
    <div class="rtbl-user">名前</div>
    <div class="rtbl-sales-val" style="color:var(--muted);font-weight:600;font-size:0.68rem">売上</div>
    <div class="rtbl-stat">社数</div>
    <div class="rtbl-stat">件数</div>
  </div>`;
  html += buildRows(showItems);

  if (moreItems.length > 0) {
    html += `<div id="${moreId}" style="display:none">${buildRows(moreItems)}</div>`;
    html += `<button class="rtbl-toggle" id="${toggleId}" onclick="event.stopPropagation();var m=document.getElementById('${moreId}');var b=this;if(m.style.display==='none'){m.style.display='block';b.textContent='折りたたむ'}else{m.style.display='none';b.textContent='残り ${moreItems.length}名を表示'}">残り ${moreItems.length}名を表示</button>`;
  }

  el.innerHTML = html;
}

// 社数のみのランキングテーブル
function renderClientsRankTable(containerId, ranking, initialShow = 10, clickFn = "showRecordsByName") {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (ranking.length === 0) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem;font-size:0.85rem">データなし</div>'; return; }

  const ranked = assignRanks(ranking, "clients");

  function buildRows(items) {
    return items.map((item) => {
      const rank = item._rank;
      const rankClass = rank <= 3 ? ` rtbl-rank-${rank}` : '';
      const zeroClass = (item.clients || 0) === 0 ? ' rtbl-zero' : '';
      return `<div class="rtbl-row" onclick="${clickFn}('${item.name}')" style="cursor:pointer">
        <div class="rtbl-rank"><span class="rtbl-rank-num${rankClass}">${rank}</span></div>
        <div class="rtbl-user"><span class="rtbl-name">${item.name}</span></div>
        <span class="rtbl-sales-val${zeroClass}">${item.clients || 0}<span class="rtbl-stat-unit">社</span></span>
      </div>`;
    }).join("");
  }

  const showItems = ranked.slice(0, initialShow);
  const moreItems = ranked.slice(initialShow);
  const toggleId = containerId + "-toggle";
  const moreId = containerId + "-more";

  let html = `<div class="rtbl-header">
    <div class="rtbl-rank">No.</div>
    <div class="rtbl-user">名前</div>
    <div class="rtbl-sales-val" style="color:var(--muted);font-weight:600;font-size:0.68rem">社数</div>
  </div>`;
  html += buildRows(showItems);

  if (moreItems.length > 0) {
    html += `<div id="${moreId}" style="display:none">${buildRows(moreItems)}</div>`;
    html += `<button class="rtbl-toggle" id="${toggleId}" onclick="event.stopPropagation();var m=document.getElementById('${moreId}');var b=this;if(m.style.display==='none'){m.style.display='block';b.textContent='折りたたむ'}else{m.style.display='none';b.textContent='残り ${moreItems.length}名を表示'}">残り ${moreItems.length}名を表示</button>`;
  }

  el.innerHTML = html;
}

// 件数のみのランキングテーブル
function renderDealsRankTable(containerId, ranking, initialShow = 10, clickFn = "showRecordsByName") {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (ranking.length === 0) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem;font-size:0.85rem">データなし</div>'; return; }

  const ranked = assignRanks(ranking, "deals");

  function buildRows(items) {
    return items.map((item) => {
      const rank = item._rank;
      const rankClass = rank <= 3 ? ` rtbl-rank-${rank}` : '';
      const zeroClass = (item.deals || 0) === 0 ? ' rtbl-zero' : '';
      return `<div class="rtbl-row" onclick="${clickFn}('${item.name}')" style="cursor:pointer">
        <div class="rtbl-rank"><span class="rtbl-rank-num${rankClass}">${rank}</span></div>
        <div class="rtbl-user"><span class="rtbl-name">${item.name}</span></div>
        <span class="rtbl-sales-val${zeroClass}">${item.deals || 0}<span class="rtbl-stat-unit">件</span></span>
      </div>`;
    }).join("");
  }

  const showItems = ranked.slice(0, initialShow);
  const moreItems = ranked.slice(initialShow);
  const toggleId = containerId + "-toggle";
  const moreId = containerId + "-more";

  let html = `<div class="rtbl-header">
    <div class="rtbl-rank">No.</div>
    <div class="rtbl-user">名前</div>
    <div class="rtbl-sales-val" style="color:var(--muted);font-weight:600;font-size:0.68rem">件数</div>
  </div>`;
  html += buildRows(showItems);

  if (moreItems.length > 0) {
    html += `<div id="${moreId}" style="display:none">${buildRows(moreItems)}</div>`;
    html += `<button class="rtbl-toggle" id="${toggleId}" onclick="event.stopPropagation();var m=document.getElementById('${moreId}');var b=this;if(m.style.display==='none'){m.style.display='block';b.textContent='折りたたむ'}else{m.style.display='none';b.textContent='残り ${moreItems.length}名を表示'}">残り ${moreItems.length}名を表示</button>`;
  }

  el.innerHTML = html;
}

// チームの社数ランキングテーブル
function renderTeamClientsRankTable(containerId, teamMap, clickFn = "showTeamDetail") {
  const el = document.getElementById(containerId);
  if (!el) return;
  const teams = Object.entries(teamMap)
    .filter(([team]) => team !== "未設定")
    .map(([team, d]) => ({ name: team, clients: d.clients || 0, _rank: 0 }))
    .sort((a, b) => b.clients - a.clients);
  const ranked = assignRanks(teams, "clients");
  if (ranked.length === 0) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem;font-size:0.85rem">データなし</div>'; return; }

  el.innerHTML = `<div class="rtbl-header">
    <div class="rtbl-rank">No.</div>
    <div class="rtbl-user">チーム</div>
    <div class="rtbl-sales-val" style="color:var(--muted);font-weight:600;font-size:0.68rem">社数</div>
  </div>` + ranked.map(t => {
    const rankClass = t._rank <= 3 ? ` rtbl-rank-${t._rank}` : '';
    return `<div class="rtbl-row" onclick="${clickFn}('${t.name}')" style="cursor:pointer">
      <div class="rtbl-rank"><span class="rtbl-rank-num${rankClass}">${t._rank}</span></div>
      <div class="rtbl-user"><span class="rtbl-name">${t.name}</span></div>
      <span class="rtbl-sales-val">${t.clients}<span class="rtbl-stat-unit">社</span></span>
    </div>`;
  }).join("");
}

// チームの件数ランキングテーブル
function renderTeamDealsRankTable(containerId, teamMap, clickFn = "showTeamDetail") {
  const el = document.getElementById(containerId);
  if (!el) return;
  const teams = Object.entries(teamMap)
    .filter(([team]) => team !== "未設定")
    .map(([team, d]) => ({ name: team, deals: d.deals || 0, _rank: 0 }))
    .sort((a, b) => b.deals - a.deals);
  const ranked = assignRanks(teams, "deals");
  if (ranked.length === 0) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem;font-size:0.85rem">データなし</div>'; return; }

  el.innerHTML = `<div class="rtbl-header">
    <div class="rtbl-rank">No.</div>
    <div class="rtbl-user">チーム</div>
    <div class="rtbl-sales-val" style="color:var(--muted);font-weight:600;font-size:0.68rem">件数</div>
  </div>` + ranked.map(t => {
    const rankClass = t._rank <= 3 ? ` rtbl-rank-${t._rank}` : '';
    return `<div class="rtbl-row" onclick="${clickFn}('${t.name}')" style="cursor:pointer">
      <div class="rtbl-rank"><span class="rtbl-rank-num${rankClass}">${t._rank}</span></div>
      <div class="rtbl-user"><span class="rtbl-name">${t.name}</span></div>
      <span class="rtbl-sales-val">${t.deals}<span class="rtbl-stat-unit">件</span></span>
    </div>`;
  }).join("");
}

function renderTeamRankTable(containerId, teamMap, clickFn = "showTeamDetail") {
  const el = document.getElementById(containerId);
  if (!el) return;
  const teams = Object.entries(teamMap)
    .filter(([team]) => team !== "未設定")
    .map(([team, d]) => ({ name: team, sales: d.sales, deals: d.deals, clients: d.clients || 0, members: d.members }))
    .sort((a, b) => b.sales - a.sales);
  if (teams.length === 0) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem;font-size:0.85rem">データなし</div>'; return; }

  const ranked = assignRanks(teams, "sales");

  const html = `<div class="rtbl-header">
    <div class="rtbl-rank">No.</div>
    <div class="rtbl-user">チーム</div>
    <div class="rtbl-sales-val" style="color:var(--muted);font-weight:600;font-size:0.68rem">売上</div>
    <div class="rtbl-stat">社数</div>
    <div class="rtbl-stat">件数</div>
  </div>` + ranked.map(t => {
    const rankClass = t._rank <= 3 ? ` rtbl-rank-${t._rank}` : '';
    return `<div class="rtbl-row" onclick="${clickFn}('${t.name}')" style="cursor:pointer">
      <div class="rtbl-rank"><span class="rtbl-rank-num${rankClass}">${t._rank}</span></div>
      <div class="rtbl-user"><span class="rtbl-name">${t.name}</span></div>
      <span class="rtbl-sales-val">${fmtFull(t.sales)}</span>
      <div class="rtbl-stat">${t.clients}<span class="rtbl-stat-unit">社</span></div>
      <div class="rtbl-stat">${t.deals}<span class="rtbl-stat-unit">件</span></div>
    </div>`;
  }).join("");
  el.innerHTML = html;
}

function renderBarChart(containerId, ranking, valueKey = "sales", maxItems = 8, suffix = "") {
  const el = document.getElementById(containerId);
  if (!el) return;
  const items = ranking.slice(0, maxItems);
  if (items.length === 0) { el.innerHTML = '<div style="color:var(--muted);font-size:0.82rem">データなし</div>'; return; }
  // 目標値がある場合は目標ベース、なければ最大値ベース
  const useGoal = valueKey === "sales" && items.some(i => getMonthlyGoal(i.name) > 0);
  const maxVal = useGoal ? null : Math.max(...items.map(i => i[valueKey]), 1);
  el.innerHTML = items.map((item, idx) => {
    const val = item[valueKey];
    const goal = useGoal ? getMonthlyGoal(item.name) : 0;
    const pct = goal > 0 ? Math.min(Math.max((val / goal) * 100, 2), 150) : Math.max((val / maxVal) * 100, 2);
    const achievement = goal > 0 ? Math.round((val / goal) * 100) : 0;
    const display = suffix ? `${val}${suffix}` : valueKey === "sales" ? fmtFull(val) : `${val}件`;
    const color = goal > 0
      ? (achievement >= 100 ? "var(--accent3, #22c55e)" : achievement >= 70 ? "var(--accent)" : "#f59e0b")
      : (idx === 0 ? "var(--gold)" : "var(--accent)");
    const isPersonBar = item.hasOwnProperty('team') || item.hasOwnProperty('deals');
    const clickHandler = isPersonBar ? `onclick="showRecordsByName('${item.name}')" style="cursor:pointer"` : '';
    const goalLabel = goal > 0 ? `<span style="font-size:0.65rem;color:var(--muted);margin-left:0.3rem">${achievement}%</span>` : '';
    return `<div class="bar-row" ${clickHandler}>
      <div class="bar-label">${item.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"><span class="bar-fill-val">${display}${goalLabel}</span></div></div>
    </div>`;
  }).join("");
}


// 個人用日別バーチャート（目標ベース）
function renderIndDailyBar(containerId, dailyMap, allMonthlyRecords, memberName) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const items = Object.entries(dailyMap).sort((a,b) => a[0].localeCompare(b[0], undefined, {numeric:true}));
  if (items.length === 0) { el.innerHTML = '<div style="color:var(--muted);font-size:0.82rem">データなし</div>'; return; }
  const monthGoal = memberName ? getMonthlyGoal(memberName) : 0;
  const bizDays = getBusinessDaysInMonth();
  const dailyGoal = monthGoal > 0 && bizDays > 0 ? monthGoal / bizDays : 0;
  const maxVal = dailyGoal > 0 ? dailyGoal : Math.max(...items.map(i => i[1]), 1);
  el.innerHTML = items.map(([dateKey, sales]) => {
    const pct = dailyGoal > 0
      ? Math.min(Math.max((sales / dailyGoal) * 100, 2), 200)
      : Math.max((sales / maxVal) * 100, 2);
    const achievement = dailyGoal > 0 ? Math.round((sales / dailyGoal) * 100) : 0;
    const color = dailyGoal > 0
      ? (achievement >= 100 ? "var(--accent3, #22c55e)" : achievement >= 70 ? "var(--accent)" : "#f59e0b")
      : "var(--accent)";
    const goalLabel = dailyGoal > 0 ? `<span style="font-size:0.65rem;color:var(--muted);margin-left:0.3rem">${achievement}%</span>` : '';
    return `<div class="bar-row" onclick="showRecordsByDateKey('${dateKey}', 'day')" style="cursor:pointer">
      <div class="bar-label">${dateKey}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"><span class="bar-fill-val">${fmtFull(sales)}${goalLabel}</span></div></div>
    </div>`;
  }).join("") + (dailyGoal > 0 ? `<div style="font-size:0.68rem;color:var(--muted);margin-top:0.4rem;text-align:right">日間目標: ${fmtFull(dailyGoal)}</div>` : '');
}

// 個人用週別バーチャート（目標ベース）
function renderIndWeeklyBar(containerId, weekMap, allMonthlyRecords, memberName) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const items = Object.entries(weekMap).sort();
  if (items.length === 0) { el.innerHTML = '<div style="color:var(--muted);font-size:0.82rem">データなし</div>'; return; }
  const monthGoal = memberName ? getMonthlyGoal(memberName) : 0;
  const bizDays = getBusinessDaysInMonth();
  const weeklyGoal = monthGoal > 0 && bizDays > 0 ? (monthGoal / bizDays) * 5 : 0;
  const maxVal = weeklyGoal > 0 ? weeklyGoal : Math.max(...items.map(i => i[1]), 1);
  el.innerHTML = items.map(([weekKey, sales]) => {
    const pct = weeklyGoal > 0
      ? Math.min(Math.max((sales / weeklyGoal) * 100, 2), 200)
      : Math.max((sales / maxVal) * 100, 2);
    const achievement = weeklyGoal > 0 ? Math.round((sales / weeklyGoal) * 100) : 0;
    const color = weeklyGoal > 0
      ? (achievement >= 100 ? "var(--accent3, #22c55e)" : achievement >= 70 ? "var(--accent)" : "#f59e0b")
      : "var(--accent)";
    const goalLabel = weeklyGoal > 0 ? `<span style="font-size:0.65rem;color:var(--muted);margin-left:0.3rem">${achievement}%</span>` : '';
    return `<div class="bar-row" onclick="showRecordsByDateKey('${weekKey}', 'week')" style="cursor:pointer">
      <div class="bar-label">${weekKey}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"><span class="bar-fill-val">${fmtFull(sales)}${goalLabel}</span></div></div>
    </div>`;
  }).join("") + (weeklyGoal > 0 ? `<div style="font-size:0.68rem;color:var(--muted);margin-top:0.4rem;text-align:right">週間目標: ${fmtFull(weeklyGoal)}</div>` : '');
}

// ============================================================
// RENDER PAGES
// ============================================================
function renderAll() {
  const now = getToday();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now);
  const dayStart = startOfDay(now);

  const monthly = filterByPeriod(allRecords, monthStart, now);
  const weekly  = filterByPeriod(allRecords, weekStart, now);
  const daily   = filterByPeriod(allRecords, dayStart, now);

  const aggMonthly = aggregateSales(monthly);
  const aggWeekly  = aggregateSales(weekly);
  const aggDaily   = aggregateSales(daily);

  let rankMonthlySales = sortedRanking(aggMonthly, "sales");
  const rankWeeklySales  = sortedRanking(aggWeekly,  "sales");
  const rankDailySales   = sortedRanking(aggDaily,   "sales");
  const rankMonthlyDeals = sortedRanking(aggMonthly, "deals");
  const rankWeeklyDeals  = sortedRanking(aggWeekly,  "deals");
  const rankDailyDeals   = sortedRanking(aggDaily,   "deals");

  // 売上ゼロのメンバーも含める
  if (typeof getVisibleStaff === "function") {
    const existingNames = new Set(rankMonthlySales.map(r => r.name));
    const visibleStaff = getVisibleStaff();
    for (const s of visibleStaff) {
      if (!existingNames.has(s.name)) {
        rankMonthlySales.push({ name: s.name, sales: 0, deals: 0, clients: 0, team: s.team || "未設定" });
      }
    }
  }

  // ---- OVERVIEW KPIs ----
  const totalMonthlySales = rankMonthlySales.reduce((s,i)=>s+i.sales,0);
  const totalMonthlyDeals = rankMonthlyDeals.reduce((s,i)=>s+i.deals,0);
  const totalMonthlyClients = countNewClients(monthly);

  document.getElementById("kpi-monthly-sales").textContent = fmtFull(totalMonthlySales);
  document.getElementById("kpi-monthly-deals").textContent = `${totalMonthlyDeals}件`;
  document.getElementById("kpi-monthly-clients").textContent = `${totalMonthlyClients}社`;

  // ---- OVERVIEW: Team map (used by multiple sections) ----
  const teamMap = {};
  for (const item of rankMonthlySales) {
    if (!teamMap[item.team]) teamMap[item.team] = { sales: 0, deals: 0, clients: 0, members: [] };
    teamMap[item.team].sales += item.sales;
    teamMap[item.team].deals += item.deals;
    teamMap[item.team].clients += item.clients || 0;
    teamMap[item.team].members.push(item.name);
  }
  // ---- CLIENT RANK（新規社数）計算 ----
  function calcClientRanking(recs) {
    const map = {};
    for (const r of recs.filter(r => isValidStatus(r) && getField(r,"属性")==="新規")) {
      const name = getAssigneeName(r);
      const client = getClientName(r);
      if (!client) continue;
      if (!map[name]) map[name] = { clients: new Set(), team: getTeamName(r) };
      map[name].clients.add(client);
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, clients: v.clients.size, team: v.team, deals: v.clients.size }))
      .sort((a,b) => b.clients - a.clients);
  }
  const rankMonthlyClients = calcClientRanking(monthly);
  const rankWeeklyClients  = calcClientRanking(weekly);
  const rankDailyClients   = calcClientRanking(daily);

  // 売上ゼロのメンバーも週間/当日に含める
  function fillZeroMembers(ranking, key) {
    if (typeof getVisibleStaff !== "function") return ranking;
    const existingNames = new Set(ranking.map(r => r.name));
    const visibleStaff = getVisibleStaff();
    const filled = [...ranking];
    for (const s of visibleStaff) {
      if (!existingNames.has(s.name)) {
        filled.push({ name: s.name, sales: 0, deals: 0, clients: 0, team: s.team || "未設定" });
      }
    }
    return filled;
  }
  const rankWeeklySalesFull = fillZeroMembers(rankWeeklySales, "sales");
  const rankDailySalesFull  = fillZeroMembers(rankDailySales, "sales");

  // ---- OVERVIEW: 売上タブ ----
  // 個人部門（当月）
  renderFullRankTable("overview-individual-ranking", rankMonthlySales, 10, "showIndividual");
  // 週間ランキング
  renderFullRankTable("overview-weekly-ranking", rankWeeklySalesFull, 10, "showIndividual");
  // 当月ランキング（=今日）
  renderFullRankTable("overview-daily-ranking", rankDailySalesFull, 10, "showIndividual");
  // チーム部門（月間）
  renderTeamRankTable("overview-team-sales", teamMap);

  // ---- チーム週間・当日ランキング用のteamMap ----
  const teamMapWeekly = {};
  for (const item of rankWeeklySalesFull) {
    if (!teamMapWeekly[item.team]) teamMapWeekly[item.team] = { sales: 0, deals: 0, clients: 0, members: [] };
    teamMapWeekly[item.team].sales += item.sales;
    teamMapWeekly[item.team].deals += item.deals;
    teamMapWeekly[item.team].clients += item.clients || 0;
    teamMapWeekly[item.team].members.push(item.name);
  }
  const teamMapDaily = {};
  for (const item of rankDailySalesFull) {
    if (!teamMapDaily[item.team]) teamMapDaily[item.team] = { sales: 0, deals: 0, clients: 0, members: [] };
    teamMapDaily[item.team].sales += item.sales;
    teamMapDaily[item.team].deals += item.deals;
    teamMapDaily[item.team].clients += item.clients || 0;
    teamMapDaily[item.team].members.push(item.name);
  }

  // チーム売上 週間・当日
  renderTeamRankTable("team-weekly-ranking-sales", teamMapWeekly);
  renderTeamRankTable("team-daily-ranking-sales", teamMapDaily);

  // ---- OVERVIEW: 社数タブ ----
  // 社数用のランキングを全メンバー含めて計算
  const rankMonthlyClientsFull = fillZeroMembers(rankMonthlySales.map(r => ({...r})).sort((a,b) => (b.clients||0) - (a.clients||0)), "clients");
  const rankWeeklyClientsFull  = fillZeroMembers(sortedRanking(aggWeekly, "clients"), "clients");
  const rankDailyClientsFull   = fillZeroMembers(sortedRanking(aggDaily, "clients"), "clients");

  renderClientsRankTable("overview-individual-ranking-clients", rankMonthlyClientsFull, 10, "showIndividual");
  renderClientsRankTable("overview-weekly-ranking-clients", rankWeeklyClientsFull, 10, "showIndividual");
  renderClientsRankTable("overview-daily-ranking-clients", rankDailyClientsFull, 10, "showIndividual");

  // チーム社数（月間・週間・当日）
  renderTeamClientsRankTable("overview-team-clients", teamMap);
  renderTeamClientsRankTable("team-weekly-ranking-clients", teamMapWeekly);
  renderTeamClientsRankTable("team-daily-ranking-clients", teamMapDaily);

  // ---- OVERVIEW: 件数タブ ----
  const rankMonthlyDealsFull = fillZeroMembers(rankMonthlyDeals, "deals");
  const rankWeeklyDealsFull  = fillZeroMembers(rankWeeklyDeals, "deals");
  const rankDailyDealsFull   = fillZeroMembers(rankDailyDeals, "deals");

  renderDealsRankTable("overview-individual-ranking-deals", rankMonthlyDealsFull, 10, "showIndividual");
  renderDealsRankTable("overview-weekly-ranking-deals", rankWeeklyDealsFull, 10, "showIndividual");
  renderDealsRankTable("overview-daily-ranking-deals", rankDailyDealsFull, 10, "showIndividual");

  // チーム件数（月間・週間・当日）
  renderTeamDealsRankTable("overview-team-deals", teamMap);
  renderTeamDealsRankTable("team-weekly-ranking-deals", teamMapWeekly);
  renderTeamDealsRankTable("team-daily-ranking-deals", teamMapDaily);

  // ---- TEAMS ----
  const teamDetailGrid = document.getElementById("team-detail-grid");

  // チームごとの社数を計算（monthly/weekly/dailyはrenderAll内で定義済み）
  const teamMonthlyRecords = monthly;
  const teamWeeklyRecords  = weekly;
  const teamDailyRecords   = daily;

  teamDetailGrid.innerHTML = Object.entries(teamMap)
    .filter(([team]) => team !== "未設定")
    .map(([team, d]) => {
      const tMonthly = teamMonthlyRecords.filter(r => getTeamName(r) === team);
      const tWeekly  = teamWeeklyRecords.filter(r => getTeamName(r) === team);
      const tDaily   = teamDailyRecords.filter(r => getTeamName(r) === team);
      const newClients = countNewClients(tMonthly);

      const members = rankMonthlySales.filter(r => r.team === team);
      const hasTeamGoals = members.some(m => getMonthlyGoal(m.name) > 0);
      const maxSales = hasTeamGoals ? null : (members[0]?.sales || 1);
      const memberBars = members.map(m => {
        const goal = getMonthlyGoal(m.name);
        const pct = goal > 0
          ? Math.min(Math.max((m.sales / goal) * 100, 4), 150)
          : Math.max(4, (m.sales / maxSales) * 100);
        const achievement = goal > 0 ? Math.round((m.sales / goal) * 100) : 0;
        const color = goal > 0
          ? (achievement >= 100 ? "var(--accent3, #22c55e)" : achievement >= 70 ? "var(--accent)" : "#f59e0b")
          : "var(--accent)";
        const goalLabel = goal > 0 ? `<span style="font-size:0.6rem;color:var(--muted);margin-left:0.2rem">${achievement}%</span>` : '';
        return `<div class="bar-row" style="margin-bottom:0.4rem">
          <div class="bar-label" style="width:72px;font-size:0.72rem">${m.name}</div>
          <div class="bar-track" style="height:18px">
            <div class="bar-fill" style="width:${pct}%;background:${color}">
              <span class="bar-fill-val">${fmtShort(m.sales)}${goalLabel}</span>
            </div>
          </div>
          <div style="font-size:0.68rem;color:var(--muted);margin-left:0.4rem;white-space:nowrap">${m.deals}件</div>
        </div>`;
      }).join("");

      return `<div class="card" onclick="showTeamDetail('${team}')" style="cursor:pointer;transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
          <div style="font-weight:700;font-size:1rem">${team}</div>
          <div style="font-size:0.75rem;color:var(--accent)">詳細 →</div>
        </div>
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;font-size:1.6rem;font-weight:500;margin-bottom:0.4rem">${fmtFull(d.sales)}</div>
        <div style="display:flex;gap:1rem;margin-bottom:1rem">
          <div style="font-size:0.78rem;color:var(--muted)">${d.deals}件</div>
          <div style="font-size:0.78rem;color:var(--accent3)">${newClients}社（新規）</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1rem">
          <div style="background:var(--surface2);border-radius:6px;padding:0.5rem">
            <div style="font-size:0.62rem;color:var(--muted);margin-bottom:0.2rem">今週</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;font-size:0.9rem">${fmtShort(tWeekly.reduce((s,r)=>s+getSales(r),0))}</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:0.5rem">
            <div style="font-size:0.62rem;color:var(--muted);margin-bottom:0.2rem">今日</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;font-size:0.9rem">${fmtShort(tDaily.reduce((s,r)=>s+getSales(r),0))}</div>
          </div>
        </div>
        <hr class="divider">
        <div style="margin-top:0.75rem">${memberBars}</div>
      </div>`;
    }).join("") || '<div style="color:var(--muted)">データなし</div>';

  // ---- MEMBERS（スタッフマスタベース） ----
  const memberList = document.getElementById("member-list");

  // 売上データをname→集計のMapに
  const salesByName = {};
  for (const item of rankMonthlySales) {
    salesByName[item.name] = { sales: item.sales, deals: item.deals, team: item.team };
  }

  // スタッフマスタが取得できていればそちらをベースに、なければ売上データから生成
  const memberBase = staffList.length > 0
    ? staffList.map(s => ({
        name: s.name,
        team: s.team,
        company: s.company,
        dept: s.dept,
        sales: salesByName[s.name]?.sales || 0,
        deals: salesByName[s.name]?.deals || 0,
      }))
    : rankMonthlySales.map(item => ({ ...item, company: "", dept: "" }));

  // チームでグループ化して表示
  const teamGroups = {};
  for (const m of memberBase) {
    const t = m.team || "未設定";
    if (!teamGroups[t]) teamGroups[t] = [];
    teamGroups[t].push(m);
  }

  memberList.innerHTML = Object.entries(teamGroups).map(([teamName, members]) => {
    const rows = members.sort((a,b) => b.sales - a.sales).map(m => `
      <div class="member-row" onclick="showIndividual('${m.name}')">
        <div class="rank-avatar-sm" style="width:40px;height:40px;font-size:1rem;flex-shrink:0;overflow:hidden;padding:0">${avatarMap[m.name] ? `<img src="${avatarMap[m.name]}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.outerHTML='${initial(m.name)}'">` : initial(m.name)}</div>
        <div class="member-info">
          <div class="member-name">${m.name}</div>
          <div class="member-team">${m.company ? m.company + ' · ' : ''}${m.dept || ''}</div>
        </div>
        <div class="member-kpis">
          <div><div class="member-kpi-val">${fmtFull(m.sales)}</div><div class="member-kpi-label">今月売上</div></div>
          <div><div class="member-kpi-val">${m.deals}件</div><div class="member-kpi-label">件数</div></div>
        </div>
      </div>
    `).join("");
    return `
      <div class="section-label">${teamName}</div>
      ${rows}
    `;
  }).join("") || '<div style="color:var(--muted)">データなし</div>';

  // update timestamp
  const now2 = new Date();
  document.getElementById("lastUpdated").textContent = `更新: ${now2.getHours()}:${String(now2.getMinutes()).padStart(2,'0')}`;
}

function showIndividual(name) {
  const now = getToday();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now);
  const dayStart = startOfDay(now);

  const myRecords = allRecords.filter(r => getAssigneeName(r) === name && isValidStatus(r));
  const monthly = filterByPeriod(myRecords, monthStart, now);
  const weekly  = filterByPeriod(myRecords, weekStart, now);
  const daily   = filterByPeriod(myRecords, dayStart, now);

  const monthlySales = monthly.reduce((s,r) => s + getSales(r), 0);
  const weeklySales  = weekly.reduce((s,r) => s + getSales(r), 0);
  const dailySales   = daily.reduce((s,r) => s + getSales(r), 0);
  const team = myRecords.length > 0 ? getTeamName(myRecords[0]) : "--";

  const newClients = countNewClients(monthly);

  // 先月の期間
  const lastMonthEnd = new Date(monthStart.getTime() - 1);
  const lastMonthStart = startOfMonth(lastMonthEnd);
  const lastMonthRec = filterByPeriod(myRecords, lastMonthStart, lastMonthEnd);
  const lmSales = lastMonthRec.reduce((s,r) => s + getSales(r), 0);
  const lmClients = countNewClients(lastMonthRec);

  const indAvatarEl = document.getElementById("ind-avatar");
  const indAvatarUrl = avatarMap[name] || "";
  if (indAvatarUrl) {
    indAvatarEl.innerHTML = `<img src="${indAvatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.textContent='${initial(name)}'">`;
  } else {
    indAvatarEl.textContent = initial(name);
  }
  document.getElementById("ind-name").textContent = name;
  document.getElementById("ind-team").textContent = team;
  document.getElementById("ind-monthly-sales").textContent = fmtFull(monthlySales);
  document.getElementById("ind-monthly-deals").textContent = `${monthly.length}件`;
  document.getElementById("ind-new-clients").textContent = `${newClients}社`;
  document.getElementById("ind-lm-sales").textContent = fmtFull(lmSales);
  document.getElementById("ind-lm-deals").textContent = `${lastMonthRec.length}件`;
  document.getElementById("ind-lm-clients").textContent = `${lmClients}社`;

  // 案件リスト用に保存
  currentIndRecords = { monthly, lastMonth: lastMonthRec };

  // 週別内訳を生成してアコーディオンに入れる
  const weekBreakdown = {};
  for (const r of monthly) {
    const d = getRecordDate(r);
    if (!d) continue;
    const wn = Math.ceil(d.getDate() / 7);
    const key = `第${wn}週`;
    if (!weekBreakdown[key]) weekBreakdown[key] = { sales: 0, deals: 0, clients: new Set() };
    weekBreakdown[key].sales += getSales(r);
    weekBreakdown[key].deals += 1;
    const cl = getClientName(r);
    if (cl && getField(r,"属性") === "新規") weekBreakdown[key].clients.add(cl);
  }
  const wbEl = document.getElementById("ind-weeklyacc");
  if (wbEl) {
    const weeks = Object.entries(weekBreakdown).sort();
    if (weeks.length === 0) {
      wbEl.innerHTML = '<div style="color:var(--muted);font-size:0.82rem">データなし</div>';
    } else {
      wbEl.innerHTML = weeks.map(([wk, d]) => `
        <div style="margin-bottom:0.6rem">
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:0.2rem">${wk}</div>
          <div class="kpi-value" style="font-size:1.5rem">${fmtFull(d.sales)}</div>
          <div class="grid-2" style="margin-top:0.25rem">
            <div><span style="font-size:0.68rem;color:var(--muted)">新規社数</span><div class="kpi-value" style="font-size:1.1rem;color:var(--accent3)">${d.clients.size}社</div></div>
            <div><span style="font-size:0.68rem;color:var(--muted)">件数</span><div class="kpi-value" style="font-size:1.1rem">${d.deals}件</div></div>
          </div>
          ${weeks.indexOf(weeks.find(w=>w[0]===wk)) < weeks.length-1 ? '<hr style="border:none;border-top:1px solid var(--border);margin-top:0.6rem">' : ''}
        </div>
      `).join('');
    }
  }

  // アコーディオンを閉じた状態にリセット
  const acc = document.getElementById("ind-lastmonth");
  const arrow = document.getElementById("ind-lastmonth-arrow");
  if (acc) { acc.style.display = "none"; arrow.style.transform = ""; }
  const wacc = document.getElementById("ind-weeklyacc");
  const warrow = document.getElementById("ind-weeklyacc-arrow");
  if (wacc) { wacc.style.display = "none"; if(warrow) warrow.style.transform = ""; }

  // Daily bar (今月の日別)
  const dailyMap = {};
  for (const r of monthly) {
    const d = getRecordDate(r);
    if (!d) continue;
    const key = `${d.getMonth()+1}/${d.getDate()}`;
    if (!dailyMap[key]) dailyMap[key] = 0;
    dailyMap[key] += getSales(r);
  }
  const dailyItems = Object.entries(dailyMap).sort((a,b) => a[0].localeCompare(b[0], undefined, {numeric:true}))
    .map(([date, sales]) => ({ name: date, sales }));
  renderIndDailyBar("ind-daily-bar", dailyMap, monthly, name);

  // Weekly bar
  const weekMap = {};
  for (const r of monthly) {
    const d = getRecordDate(r);
    if (!d) continue;
    const weekNum = Math.ceil(d.getDate() / 7);
    const key = `第${weekNum}週`;
    if (!weekMap[key]) weekMap[key] = 0;
    weekMap[key] += getSales(r);
  }
  renderIndWeeklyBar("ind-weekly-bar", weekMap, monthly, name);

  showPage("individual");
}



