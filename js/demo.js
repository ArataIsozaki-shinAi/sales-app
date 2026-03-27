// ============================================================
// DEMO MODE — モックデータで認証不要で全画面を動作させる
// ============================================================

function generateDemoData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // ===== チーム・メンバー定義 =====
  const teams = [
    { team: "Aチーム", members: ["山田 太郎", "佐藤 花子", "鈴木 一郎"] },
    { team: "Bチーム", members: ["高橋 美咲", "田中 健太", "渡辺 さくら"] },
    { team: "Cチーム", members: ["伊藤 翔太", "中村 優子"] },
    { team: "Dチーム", members: ["小林 大輔", "加藤 理恵"] },
  ];

  const allMembers = [];
  for (const t of teams) {
    for (const m of t.members) {
      allMembers.push({ name: m, team: t.team });
    }
  }

  // ===== クライアントマスタ =====
  const clientNames = [
    "株式会社サンライズ", "株式会社グローバルテック", "合同会社ネクスト",
    "株式会社フューチャーズ", "有限会社スカイラボ", "株式会社イノベート",
    "株式会社ブライトパス", "合同会社デジタルフォース", "株式会社クリエイティブ",
    "株式会社アドバンス", "株式会社プラチナム", "株式会社エクセル",
    "合同会社スマートリンク", "株式会社オーシャン", "株式会社グリーンリーフ",
  ];

  const demoClientMap = {};
  clientNames.forEach((name, i) => {
    demoClientMap[`rec_client_${i}`] = name;
  });

  // ===== 商談レコード生成 =====
  const statuses = ["成約", "申込完了", "申込依頼済み", "商談中", "提案中"];
  const products = ["光回線", "モバイルWi-Fi", "法人携帯", "UTM", "複合機", "LED", "電気"];
  const demoRecords = [];

  let recordId = 1;
  for (const member of allMembers) {
    // 各メンバー2〜4件の商談
    const dealCount = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < dealCount; j++) {
      const day = 1 + Math.floor(Math.random() * Math.min(now.getDate(), 28));
      const timestamp = new Date(year, month, day, 10 + Math.floor(Math.random() * 8), 0, 0).getTime();
      const statusIdx = Math.random() < 0.6 ? Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2);
      const sales = [50000, 100000, 150000, 200000, 300000, 500000, 800000, 1000000, 1500000, 2000000, 3000000][Math.floor(Math.random() * 11)];
      const clientIdx = Math.floor(Math.random() * clientNames.length);
      const isNew = Math.random() < 0.4;

      demoRecords.push({
        record_id: `rec_deal_${recordId++}`,
        fields: {
          "ステータス": statuses[statusIdx],
          "商材売上": sales,
          "申込完了月": timestamp,
          "クローザー/担当者": [{ name: member.name, id: `ou_${recordId}` }],
          "チーム名": { type: 3, value: [member.team] },
          "クライアント名": { link_record_ids: [`rec_client_${clientIdx}`] },
          "属性": isNew ? "新規" : "既存",
          "獲得商材": products[Math.floor(Math.random() * products.length)],
        },
      });
    }
  }

  // ===== スタッフマスタ =====
  const demoStaffList = allMembers.map((m, i) => ({
    name: m.name,
    openId: `ou_staff_${i}`,
    avatarUrl: "",
    team: m.team,
    company: "株式会社デモ",
    dept: "第一営業部",
  }));

  // ===== 目標データ =====
  const currentYM = `${year}年${String(month + 1).padStart(2, "0")}月`;
  const demoGoalRecords = allMembers.map((m, i) => {
    const goal = [2000000, 2500000, 3000000, 3500000, 4000000, 5000000][Math.floor(Math.random() * 6)];
    return {
      record_id: `rec_goal_${i}`,
      fields: {
        "スタッフ": [{ name: m.name, id: `ou_staff_${i}` }],
        "年月": { type: 1, value: [{ text: currentYM }] },
        "目標値": goal,
      },
    };
  });

  // ===== 営業日報 =====
  const reportFields = ["架電数", "決済者接続数", "アポ数", "内諾件数", "申込完了件数"];
  const demoDailyReports = [];
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const d = new Date(year, month, Math.max(1, now.getDate() - dayOffset));
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    for (const m of allMembers) {
      const rec = {
        record_id: `rec_report_${demoDailyReports.length}`,
        fields: {
          "作成者": [{ name: m.name }],
          "作成日時": d.getTime(),
        },
      };
      rec.fields["架電数"] = 10 + Math.floor(Math.random() * 40);
      rec.fields["決済者接続数"] = Math.floor(Math.random() * 10);
      rec.fields["アポ数"] = Math.floor(Math.random() * 5);
      rec.fields["内諾件数"] = Math.floor(Math.random() * 3);
      rec.fields["申込完了件数"] = Math.floor(Math.random() * 2);
      // 商談系
      rec.fields["見積コンサル数"] = Math.floor(Math.random() * 4);
      rec.fields["商談数"] = Math.floor(Math.random() * 3);
      rec.fields["申込依頼済数"] = Math.floor(Math.random() * 2);
      rec.fields["成約数"] = Math.floor(Math.random() * 2);
      demoDailyReports.push(rec);
    }
  }

  return {
    records: demoRecords,
    staffList: demoStaffList,
    clientMap: demoClientMap,
    dailyReports: demoDailyReports,
    goalRecords: demoGoalRecords,
  };
}

function initDemoMode() {
  const data = generateDemoData();

  // グローバル変数にセット
  allRecords = data.records;
  staffList = data.staffList;
  clientMap = data.clientMap;
  dailyReportRecords = data.dailyReports;
  goalRecords = data.goalRecords;

  // goalMapを構築
  goalMap = {};
  for (const rec of data.goalRecords) {
    const f = rec.fields;
    const name = f["スタッフ"][0]?.name || "";
    const ym = f["年月"]?.value?.[0]?.text || "";
    const goal = f["目標値"] || 0;
    if (name && ym) {
      if (!goalMap[name]) goalMap[name] = {};
      goalMap[name][ym] = goal;
    }
  }

  buildAvatarMap();

  // UI表示
  document.getElementById("larkLogin").classList.add("hidden");
  document.getElementById("loadingOverlay").classList.add("hidden");

  renderAll();
}
