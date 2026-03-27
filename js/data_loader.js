// ============================================================
// LOAD DATA
// ============================================================
async function loadData() {
  if (!WORKER_URL) {
    document.getElementById("configModal").classList.remove("hidden");
    document.getElementById("loadingOverlay").classList.add("hidden");
    return;
  }

  const overlay = document.getElementById("loadingOverlay");
  const errorBanner = document.getElementById("errorBanner");
  overlay.classList.remove("hidden");
  errorBanner.classList.remove("show");

  try {
    document.getElementById("loadingText").textContent = "Larkからデータを取得中...";
    // バッチ1: メインデータ（4並列）
    [allRecords, staffList, clientMap, dailyReportRecords] = await Promise.all([
      fetchAllRecords(), fetchStaffMaster(), fetchClientMaster(), fetchDailyReports()
    ]);
    // バッチ2: 目標データ（レート制限回避のため分離）
    await fetchGoals();
    console.log("goalMap loaded:", Object.keys(goalMap).length, "members");
    buildAvatarMap();
    document.getElementById("loadingText").textContent = `${allRecords.length}件取得完了、描画中...`;
  renderAll();
    overlay.classList.add("hidden");
  } catch (e) {
    overlay.classList.add("hidden");
    errorBanner.textContent = `エラー: ${e.message}。Worker URLと権限設定を確認してください。`;
    errorBanner.classList.add("show");
    console.error(e);
  }
}
