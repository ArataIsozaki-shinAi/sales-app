// ============================================================
// AVATAR HELPERS
// ============================================================
let avatarMap = {}; // name -> avatarUrl

function buildAvatarMap() {
  avatarMap = {};
  for (const s of staffList) {
    if (s.name && s.avatarUrl) avatarMap[s.name] = s.avatarUrl;
  }
}

function avatarHtml(name, size = 40, cls = "") {
  const url = avatarMap[name];
  if (url) {
    return `<img src="${url}" alt="${name}"
      style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
    ><span class="ind-avatar ${cls}" style="display:none;width:${size}px;height:${size}px;font-size:${Math.round(size*0.4)}px">${initial(name)}</span>`;
  }
  return `<span class="ind-avatar ${cls}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.4)}px">${initial(name)}</span>`;
}

// クライアントマスタ取得（record_id→クライアント名のMap）
async function fetchClientMaster() {
  const map = {}; // record_id -> クライアント名
  let pageToken = "";
  do {
    let url = `${WORKER_URL}?app_token=${APP_TOKEN}&table_id=${CLIENT_TABLE}&page_size=500`;
    if (pageToken) url += `&page_token=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (data.code !== 0) break;
    for (const item of (data.data?.items || [])) {
      const nameVal = item.fields["クライアント名"];
      const name = nameVal?.value?.[0]?.text || "";
      if (name) map[item.record_id] = name;
    }
    pageToken = data.data?.page_token || "";
  } while (pageToken);
  console.log("clientMap loaded:", Object.keys(map).length);
  return map;
}

// グローバルクライアントMap
let clientMap = {};



function getField(record, fieldName) {
  return record.fields?.[fieldName] ?? null;
}

// クライアント名取得（link_record_idsからclientMapで解決）
function getClientName(record) {
  const val = getField(record, "クライアント名");
  if (!val) return null;
  // リンク形式: {link_record_ids: ["recXXX"]}
  if (val.link_record_ids) {
    const id = val.link_record_ids[0];
    return clientMap[id] || null;
  }
  return null;
}

// 新規社数カウント（属性=新規 かつ 有効ステータス かつ クライアント名ユニーク）
function countNewClients(records) {
  const clients = new Set();
  for (const r of records) {
    if (!isValidStatus(r)) continue;
    const attr = getField(r, "属性");
    if (attr !== "新規") continue;
    const name = getClientName(r);
    if (name) clients.add(name);
  }
  return clients.size;
}

function getAssigneeName(record) {
  const val = getField(record, F.ASSIGNEE);
  if (!val) return "不明";
  // Person field: [{name: "強田 知志", ...}]
  if (Array.isArray(val) && val.length > 0) return val[0].name || val[0].en_name || "不明";
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.name || val.en_name || "不明";
  return String(val);
}

function getTeamName(record) {
  const val = getField(record, F.TEAM);
  if (!val) return "未設定";
  // Select field: {"type":3,"value":["平良チーム"]}
  if (typeof val === "object" && val.value) {
    if (Array.isArray(val.value)) return val.value[0] || "未設定";
  }
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0] || "未設定";
  return String(val);
}

function getSales(record) {
  const val = getField(record, F.SALES);
  if (val === null || val === undefined) return 0;
  // Direct number: 67000
  if (typeof val === "number") return val;
  // Formula field: {"type":2,"value":[67000]}
  if (typeof val === "object" && val.value) {
    if (Array.isArray(val.value)) return parseFloat(val.value[0]) || 0;
    return parseFloat(val.value) || 0;
  }
  return parseFloat(val) || 0;
}

function getRecordDate(record) {
  const val = getField(record, F.MONTH);
  if (!val) return null;
  // Date field: {"type":5,"value":[1766210671000]}
  if (typeof val === "object" && val.value) {
    if (Array.isArray(val.value)) return new Date(val.value[0]);
    return new Date(val.value);
  }
  return parseDate(val);
}

function isValidStatus(record) {
  const s = getField(record, F.STATUS);
  if (!s) return false;
  const str = typeof s === "string" ? s : (s.text || s.name || JSON.stringify(s));
  return VALID_STATUSES.some(v => str.includes(v));
}

function filterByPeriod(records, from, to) {
  return records.filter(r => {
    const d = getRecordDate(r);
    if (!d) return false;
    return d >= from && d <= to;
  });
}

