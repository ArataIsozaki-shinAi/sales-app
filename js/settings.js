// ============================================================
// CONFIG
// ============================================================
function saveConfig() {
  const workerUrl = document.getElementById("workerUrlInput").value.trim().replace(/\/$/, "");
  if (!workerUrl) { alert("Worker URLを入力してください"); return; }
  WORKER_URL = workerUrl;
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ workerUrl }));
  document.getElementById("configModal").classList.add("hidden");
  loadData();
}

