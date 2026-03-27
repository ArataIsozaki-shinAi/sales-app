// ============================================================
// GOALS — 個人目標 vs 実績の表示
// ============================================================

/**
 * 目標レコードから情報を抽出
 * @param {object} record - Lark record
 * @returns {{ name: string, yearMonth: string, goal: number }}
 */
function parseGoalRecord(record) {
  const f = record.fields || {};
  const staffArr = Array.isArray(f["スタッフ"]) ? f["スタッフ"] : [];
  const person = staffArr[0] || {};
  const name = person.name || person.en_name || "";

  // 年月フィールド: {type:1, value:[{text:"2025年12月"}]}
  let yearMonth = "";
  const ymField = f["年月"];
  if (ymField && ymField.value && Array.isArray(ymField.value)) {
    yearMonth = ymField.value[0]?.text || "";
  } else if (typeof ymField === "string") {
    yearMonth = ymField;
  }

  const goal = typeof f["目標値"] === "number" ? f["目標値"] : 0;

  return { name, yearMonth, goal };
}

/**
 * 現在の年月文字列を返す（例: "2025年12月"）
 */
function getCurrentYearMonth() {
  const now = getToday();
  const m = now.getMonth() + 1;
  return `${now.getFullYear()}年${String(m).padStart(2, '0')}月`;
}

/**
 * 今月の営業日数を計算（月～金）
 */
function getBusinessDaysInMonth() {
  const now = getToday();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
}

/**
 * 今月の経過営業日数を計算
 */
function getElapsedBusinessDays() {
  const now = getToday();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  let count = 0;
  for (let d = 1; d <= today; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
}

/**
 * 今月の営業週数を計算（営業日数 / 5、切り上げ）
 */
function getBusinessWeeksInMonth() {
  return Math.ceil(getBusinessDaysInMonth() / 5);
}

/**
 * 個人の今月目標を取得
 * @param {string} memberName
 * @returns {number} 月間目標値（0 = 未設定）
 */
function getMonthlyGoal(memberName) {
  const currentYM = getCurrentYearMonth();
  for (const rec of goalRecords) {
    const parsed = parseGoalRecord(rec);
    if (parsed.name === memberName && parsed.yearMonth === currentYM) {
      return parsed.goal;
    }
  }
  return 0;
}

/**
 * チーム全体の今月目標を取得
 * @param {string} teamName
 * @returns {number}
 */
function getTeamMonthlyGoal(teamName) {
  const teamMembers = staffList.filter(s => s.team === teamName).map(s => s.name);
  let total = 0;
  for (const name of teamMembers) {
    total += getMonthlyGoal(name);
  }
  return total;
}

/**
 * 目標から週間・日間目標を計算
 * @param {number} monthlyGoal
 * @returns {{ monthly: number, weekly: number, daily: number }}
 */
function calcGoalBreakdown(monthlyGoal) {
  const weeks = getBusinessWeeksInMonth();
  const days = getBusinessDaysInMonth();
  return {
    monthly: monthlyGoal,
    weekly: weeks > 0 ? Math.round(monthlyGoal / weeks) : 0,
    daily: days > 0 ? Math.round(monthlyGoal / days) : 0,
  };
}

/**
 * 進捗率を計算
 * @param {number} actual
 * @param {number} goal
 * @returns {number} パーセンテージ（0-999）
 */
function calcProgress(actual, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.round((actual / goal) * 100);
}

/**
 * 進捗バーのHTMLを生成
 * @param {number} percent
 * @returns {string}
 */
function progressBarHtml(percent) {
  const clamped = Math.min(percent, 100);
  const color = percent >= 100 ? "var(--accent3)" : percent >= 70 ? "var(--accent)" : percent >= 40 ? "#f59e0b" : "#ef4444";
  return `
    <div style="width:100%;background:var(--surface2);border-radius:6px;height:8px;margin-top:4px;overflow:hidden">
      <div style="width:${clamped}%;background:${color};height:100%;border-radius:6px;transition:width 0.5s ease"></div>
    </div>
  `;
}

/**
 * 目標セクション（個人ページ用）を生成
 * @param {string} memberName
 * @param {number} actualMonthlySales - 今月の実績売上
 * @param {number} actualWeeklySales - 今週の実績売上
 * @param {number} actualDailySales - 今日の実績売上
 * @returns {string} HTML
 */
function renderGoalSection(memberName, actualMonthlySales, actualWeeklySales, actualDailySales) {
  const monthlyGoal = getMonthlyGoal(memberName);
  if (!monthlyGoal) {
    return `<div style="color:var(--muted);font-size:0.82rem;padding:0.5rem 0">目標未設定</div>`;
  }

  const breakdown = calcGoalBreakdown(monthlyGoal);
  const monthPct = calcProgress(actualMonthlySales, breakdown.monthly);
  const weekPct = calcProgress(actualWeeklySales, breakdown.weekly);
  const dayPct = calcProgress(actualDailySales, breakdown.daily);

  // 着地予想：(実績 / 経過営業日) * 全営業日
  const elapsed = getElapsedBusinessDays();
  const totalBizDays = getBusinessDaysInMonth();
  const projection = elapsed > 0 ? Math.round((actualMonthlySales / elapsed) * totalBizDays) : 0;
  const projPct = calcProgress(projection, breakdown.monthly);

  return `
    <div class="section-label" style="margin-top:0.5rem">${icon("target")} 目標 vs 実績</div>
    <div class="card" style="margin-bottom:0.75rem">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">
        <!-- 月間 -->
        <div>
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:0.15rem">月間目標</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${fmtFull(breakdown.monthly)}</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">実績: ${fmtFull(actualMonthlySales)}</div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:2px">
            <span style="font-size:0.85rem;font-weight:700;color:${monthPct >= 100 ? 'var(--accent3)' : 'var(--accent)'}">${monthPct}%</span>
          </div>
          ${progressBarHtml(monthPct)}
        </div>
        <!-- 週間 -->
        <div>
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:0.15rem">週間目標</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${fmtFull(breakdown.weekly)}</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">実績: ${fmtFull(actualWeeklySales)}</div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:2px">
            <span style="font-size:0.85rem;font-weight:700;color:${weekPct >= 100 ? 'var(--accent3)' : 'var(--accent)'}">${weekPct}%</span>
          </div>
          ${progressBarHtml(weekPct)}
        </div>
        <!-- 日間 -->
        <div>
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:0.15rem">日間目標</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${fmtFull(breakdown.daily)}</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">実績: ${fmtFull(actualDailySales)}</div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:2px">
            <span style="font-size:0.85rem;font-weight:700;color:${dayPct >= 100 ? 'var(--accent3)' : 'var(--accent)'}">${dayPct}%</span>
          </div>
          ${progressBarHtml(dayPct)}
        </div>
      </div>
      <!-- 着地予想 -->
      <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:0.68rem;color:var(--muted)">${icon("trendUp","sm")} 着地予想（${elapsed}/${totalBizDays}営業日経過）</div>
          <div style="font-size:1rem;font-weight:800;color:${projPct >= 100 ? 'var(--accent3)' : projPct >= 70 ? 'var(--accent)' : '#ef4444'}">${fmtFull(projection)} <span style="font-size:0.75rem">(${projPct}%)</span></div>
        </div>
        ${progressBarHtml(projPct)}
      </div>
    </div>
  `;
}

/**
 * チーム目標セクションを生成
 * @param {string} teamName
 * @param {number} actualMonthlySales
 * @param {number} actualWeeklySales
 * @param {number} actualDailySales
 * @returns {string} HTML
 */
function renderTeamGoalSection(teamName, actualMonthlySales, actualWeeklySales, actualDailySales) {
  const monthlyGoal = getTeamMonthlyGoal(teamName);
  if (!monthlyGoal) {
    return `<div style="color:var(--muted);font-size:0.82rem;padding:0.5rem 0">チーム目標未設定（メンバー個人目標が未登録）</div>`;
  }

  const breakdown = calcGoalBreakdown(monthlyGoal);
  const monthPct = calcProgress(actualMonthlySales, breakdown.monthly);
  const weekPct = calcProgress(actualWeeklySales, breakdown.weekly);
  const dayPct = calcProgress(actualDailySales, breakdown.daily);

  const elapsed = getElapsedBusinessDays();
  const totalBizDays = getBusinessDaysInMonth();
  const projection = elapsed > 0 ? Math.round((actualMonthlySales / elapsed) * totalBizDays) : 0;
  const projPct = calcProgress(projection, breakdown.monthly);

  // メンバー別目標一覧
  const teamMembers = staffList.filter(s => s.team === teamName);
  const currentYM = getCurrentYearMonth();
  const monthStart = startOfMonth(getToday());
  const now = getToday();

  const memberGoalRows = teamMembers.map(s => {
    const goal = getMonthlyGoal(s.name);
    const myRecords = allRecords.filter(r => getAssigneeName(r) === s.name && isValidStatus(r));
    const actual = filterByPeriod(myRecords, monthStart, now).reduce((sum, r) => sum + getSales(r), 0);
    const pct = calcProgress(actual, goal);
    return { name: s.name, goal, actual, pct };
  }).filter(m => m.goal > 0).sort((a, b) => b.pct - a.pct);

  const memberListHtml = memberGoalRows.length > 0 ? memberGoalRows.map(m => `
    <div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border)" onclick="showIndividual('${m.name}')" class="member-row" style="cursor:pointer">
      <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface2);font-size:0.7rem">
        ${avatarMap[m.name] ? `<img src="${avatarMap[m.name]}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.outerHTML='${initial(m.name)}'">` : initial(m.name)}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:0.72rem;color:var(--muted)">${fmtFull(m.actual)} / ${fmtFull(m.goal)}</div>
        <div style="font-size:0.8rem;font-weight:700;color:${m.pct >= 100 ? 'var(--accent3)' : m.pct >= 70 ? 'var(--accent)' : '#ef4444'}">${m.pct}%</div>
      </div>
    </div>
  `).join("") : '<div style="font-size:0.78rem;color:var(--muted)">メンバー個人目標なし</div>';

  return `
    <div class="section-label" style="margin-top:0.5rem">${icon("target")} チーム目標 vs 実績</div>
    <div class="card" style="margin-bottom:0.75rem">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">
        <div>
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:0.15rem">月間目標</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${fmtFull(breakdown.monthly)}</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">実績: ${fmtFull(actualMonthlySales)}</div>
          <div style="font-size:0.85rem;font-weight:700;margin-top:2px;color:${monthPct >= 100 ? 'var(--accent3)' : 'var(--accent)'}">${monthPct}%</div>
          ${progressBarHtml(monthPct)}
        </div>
        <div>
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:0.15rem">週間目標</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${fmtFull(breakdown.weekly)}</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">実績: ${fmtFull(actualWeeklySales)}</div>
          <div style="font-size:0.85rem;font-weight:700;margin-top:2px;color:${weekPct >= 100 ? 'var(--accent3)' : 'var(--accent)'}">${weekPct}%</div>
          ${progressBarHtml(weekPct)}
        </div>
        <div>
          <div style="font-size:0.68rem;color:var(--muted);margin-bottom:0.15rem">日間目標</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${fmtFull(breakdown.daily)}</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:2px">実績: ${fmtFull(actualDailySales)}</div>
          <div style="font-size:0.85rem;font-weight:700;margin-top:2px;color:${dayPct >= 100 ? 'var(--accent3)' : 'var(--accent)'}">${dayPct}%</div>
          ${progressBarHtml(dayPct)}
        </div>
      </div>
      <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:0.68rem;color:var(--muted)">${icon("trendUp","sm")} 着地予想（${elapsed}/${totalBizDays}営業日経過）</div>
          <div style="font-size:1rem;font-weight:800;color:${projPct >= 100 ? 'var(--accent3)' : projPct >= 70 ? 'var(--accent)' : '#ef4444'}">${fmtFull(projection)} <span style="font-size:0.75rem">(${projPct}%)</span></div>
        </div>
        ${progressBarHtml(projPct)}
      </div>
    </div>
    <div class="card" style="margin-bottom:0.75rem">
      <div style="font-size:0.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.5rem">メンバー別 目標進捗</div>
      ${memberListHtml}
    </div>
  `;
}
