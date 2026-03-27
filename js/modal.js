// ============================================================
// DEALS LIST MODAL
// ============================================================
let currentIndRecords = { monthly: [], lastMonth: [] };

// 汎用モーダル開く関数（records配列 or 事前定義typeを受け付ける）
function openDealModal(typeOrRecords, title) {
  let records, modalTitle;

  if (Array.isArray(typeOrRecords)) {
    records = typeOrRecords;
    modalTitle = title || '案件一覧';
  } else {
    const type = typeOrRecords;
    const titleMap = {
      'monthly': '今月の案件一覧',
      'monthly-new': '今月の新規案件',
      'lastMonth': '先月の案件一覧',
    };
    records = type === 'monthly' ? currentIndRecords.monthly
            : type === 'monthly-new' ? currentIndRecords.monthly.filter(r => getField(r, "属性") === "新規")
            : currentIndRecords.lastMonth;
    modalTitle = titleMap[type] || '案件一覧';
  }

  const totalSales = records.reduce((s,r) => s + getSales(r), 0);
  document.getElementById("deal-modal-title").textContent = modalTitle;
  document.getElementById("deal-modal-sub").textContent = `${records.length}件 · ${fmtFull(totalSales)}`;

  const sorted = [...records].sort((a,b) => {
    const da = getRecordDate(a), db = getRecordDate(b);
    return (db?.getTime()||0) - (da?.getTime()||0);
  });

  document.getElementById("deal-modal-list").innerHTML = sorted.length > 0
    ? sorted.map(r => {
        const d = getRecordDate(r);
        const dateStr = d ? `${d.getMonth()+1}/${d.getDate()}` : "--";
        const client = getClientName(r) || "--";
        const material = getField(r, "獲得商材") || "--";
        const sales = getSales(r);
        const status = getField(r, F.STATUS) || "--";
        const statusColor = getStatusColor(status);
        return `
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.5rem;border-bottom:1px solid var(--border)">
            <div style="font-size:0.75rem;color:var(--muted);width:36px;flex-shrink:0">${dateStr}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${client}</div>
              <div style="font-size:0.72rem;color:var(--muted);margin-top:0.1rem">${material}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-family:'DM Mono',monospace;font-size:0.85rem">${fmtFull(sales)}</div>
              <div style="font-size:0.68rem;color:${statusColor};margin-top:0.1rem">${status}</div>
            </div>
          </div>
        `;
      }).join("")
    : '<div style="color:var(--muted);padding:1rem;text-align:center">データなし</div>';

  document.getElementById("dealsModal").classList.remove("hidden");
}

function closeDealModal() {
  document.getElementById("dealsModal").classList.add("hidden");
}









