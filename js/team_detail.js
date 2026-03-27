// ============================================================
// TEAM DETAIL
// ============================================================
function showTeamDetail(teamName) {
  const now = getToday();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now);
  const dayStart = startOfDay(now);

  const teamRecords = allRecords.filter(r => getTeamName(r) === teamName && isValidStatus(r));
  const monthly = filterByPeriod(teamRecords, monthStart, now);
  const weekly  = filterByPeriod(teamRecords, weekStart, now);
  const daily   = filterByPeriod(teamRecords, dayStart, now);

  const newClients = countNewClients(monthly);
  currentTeamRecords = { month: monthly, week: weekly, day: daily };
  document.getElementById("team-detail-name").textContent = teamName;
  document.getElementById("team-detail-sub").textContent = `今月 ${monthly.length}件 · 新規${newClients}社`;
  document.getElementById("td-monthly-sales").textContent = fmtFull(monthly.reduce((s,r)=>s+getSales(r),0));
  document.getElementById("td-monthly-deals").textContent = `${monthly.length}件`;
  document.getElementById("td-weekly-sales").textContent = fmtFull(weekly.reduce((s,r)=>s+getSales(r),0));
  document.getElementById("td-daily-sales").textContent = fmtFull(daily.reduce((s,r)=>s+getSales(r),0));

  // メンバー別ランキングテーブル（売上ゼロも含む）
  const memberAgg = aggregateSales(monthly);
  const memberRanking = sortedRanking(memberAgg, "sales");
  if (typeof getVisibleStaff === "function") {
    const existingNames = new Set(memberRanking.map(r => r.name));
    for (const s of getVisibleStaff()) {
      if (s.team === teamName && !existingNames.has(s.name)) {
        memberRanking.push({ name: s.name, sales: 0, deals: 0, clients: 0, team: teamName });
      }
    }
  }
  renderFullRankTable("td-member-rank-table", memberRanking, 10, "showIndividual");

  showPage('team-detail');
}

