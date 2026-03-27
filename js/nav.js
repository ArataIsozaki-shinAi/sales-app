// ============================================================
// SWIPE NAVIGATION — カルーセル方式（モバイル専用）
// ============================================================
(function() {
  var PAGE_IDS = ["individual-tab", "team-tab", "overall"];
  var SWIPE_THRESHOLD = 30;
  var VELOCITY_THRESHOLD = 0.25;

  var currentIdx = 0;
  var tracking   = false;
  var startX     = 0;
  var startY     = 0;
  var startTime  = 0;
  var currentDx  = 0;
  var locked     = null;
  var trackEl    = null;
  var containerW = 0;
  var rafId      = 0;
  var pendingDx  = null;

  function isMobile() { return window.innerWidth <= 768; }

  function isSidebarOpen() {
    var o = document.getElementById("sidebarOverlay");
    return o && o.classList.contains("open");
  }

  function getTrack() {
    return document.getElementById("swipe-track");
  }

  function isSwipeContainerActive() {
    var c = document.getElementById("swipe-container");
    return c && c.classList.contains("active");
  }

  // 横スクロール可能な要素内か判定
  // インラインstyleでoverflow-x:auto/scrollが設定された要素を検出
  // swipe-panelのCSS由来のoverflow-x:autoは誤検知するため除外
  function isInsideHorizontalScroll(target) {
    var el = target;
    while (el && !el.classList.contains("swipe-panel") && el !== document.body) {
      if (el.style) {
        var ov = el.style.overflowX || el.style.overflow;
        if (ov === "auto" || ov === "scroll") return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  // RAF-throttled transform更新
  function applyTransform(px) {
    pendingDx = px;
    if (!rafId) {
      rafId = requestAnimationFrame(function() {
        if (trackEl && pendingDx !== null) {
          trackEl.style.transform = "translate3d(" + pendingDx + "px, 0, 0)";
        }
        rafId = 0;
        pendingDx = null;
      });
    }
  }

  function snapTo(idx, animate) {
    var t = getTrack();
    if (!t) return;
    if (animate) {
      t.style.transition = "transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)";
    } else {
      t.style.transition = "none";
    }
    t.style.transform = "translate3d(" + (-idx * 100) + "%, 0, 0)";
  }

  function syncNav(id) {
    document.querySelectorAll(".bottom-nav-item").forEach(function(t) {
      t.classList.remove("active");
    });
    var bnav = document.getElementById("bnav-" + id);
    if (bnav) bnav.classList.add("active");

    document.querySelectorAll(".nav-group-btn").forEach(function(btn) {
      btn.classList.toggle("active", btn.getAttribute("data-page") === id);
    });

    // デスクトップ用 panel-active 同期
    document.querySelectorAll(".swipe-panel").forEach(function(p) {
      p.classList.remove("panel-active");
    });
    var panel = document.getElementById("page-" + id);
    if (panel) panel.classList.add("panel-active");
  }

  // ---------- touchstart ----------
  var touchTarget = null;  // タッチ開始時のターゲット要素を保存
  var pending = false;     // 方向未確定の状態

  document.addEventListener("touchstart", function(e) {
    if (!isMobile() || isSidebarOpen() || !isSwipeContainerActive()) return;

    // rank-tab-bar内のタッチはrank-tab用スワイプに任せる
    if (getRankTabBarFromTouch(e.target)) return;

    // まだ方向が確定していないのでpending状態で記録だけする
    touchTarget = e.target;
    pending    = true;
    tracking   = false;
    locked     = null;
    startX     = e.touches[0].clientX;
    startY     = e.touches[0].clientY;
    startTime  = Date.now();
    currentDx  = 0;
    trackEl    = getTrack();
    containerW = window.innerWidth;
  }, { passive: true });

  // ---------- touchmove ----------
  document.addEventListener("touchmove", function(e) {
    // pending状態: 方向を判定してtrackingを開始するか決める
    if (pending && !tracking) {
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      if (Math.abs(dx) >= Math.abs(dy)) {
        // 横方向 → 横スクロール要素内ならネイティブに任せる
        if (isInsideHorizontalScroll(touchTarget)) {
          pending = false;
          return;
        }
        locked = "h";
      } else {
        locked = "v";
      }
      pending = false;
      tracking = true;

      // trackを現在位置で固定（アニメーション中の場合）
      if (trackEl) {
        var cs = getComputedStyle(trackEl);
        var matrix = cs.transform;
        if (matrix && matrix !== "none") {
          var m = matrix.match(/matrix.*\((.+)\)/);
          if (m) {
            var vals = m[1].split(", ");
            var currentX = parseFloat(vals[4]) || 0;
            trackEl.style.transition = "none";
            trackEl.style.transform = "translate3d(" + currentX + "px, 0, 0)";
          }
        } else {
          trackEl.style.transition = "none";
        }
      }
    }

    if (!tracking || !trackEl) return;
    if (locked === "v") return;

    var dx = e.touches[0].clientX - startX;
    var basePx = -currentIdx * containerW;
    var raw = basePx + dx;
    var minPx = -(PAGE_IDS.length - 1) * containerW;

    if (raw > 0) {
      currentDx = dx * 0.18;
    } else if (raw < minPx) {
      var over = raw - minPx;
      currentDx = dx - over + over * 0.18;
    } else {
      currentDx = dx;
    }

    applyTransform(basePx + currentDx);
  }, { passive: true });

  // ---------- touchend ----------
  document.addEventListener("touchend", function(e) {
    pending = false;
    if (!tracking || !trackEl) { tracking = false; return; }
    tracking = false;

    // 残留RAFをキャンセルしてsnapToとの競合を防ぐ
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      pendingDx = null;
    }

    if (locked !== "h") {
      snapTo(currentIdx, false);
      return;
    }

    var dt = Date.now() - startTime;
    var velocity = Math.abs(currentDx) / (dt || 1);
    var newIdx = currentIdx;

    if (currentDx < -SWIPE_THRESHOLD || (velocity > VELOCITY_THRESHOLD && currentDx < -10)) {
      newIdx = Math.min(currentIdx + 1, PAGE_IDS.length - 1);
    } else if (currentDx > SWIPE_THRESHOLD || (velocity > VELOCITY_THRESHOLD && currentDx > 10)) {
      newIdx = Math.max(currentIdx - 1, 0);
    }

    currentIdx = newIdx;
    snapTo(currentIdx, true);
    syncNav(PAGE_IDS[currentIdx]);
  }, { passive: true });

  // showPage からの同期
  var _trackObserver = new MutationObserver(function() {
    var t = getTrack();
    if (!t) return;
    var m = t.style.transform.match(/translate3d\((-?[\d.]+)%/);
    if (m) {
      currentIdx = Math.round(-parseFloat(m[1]) / 100);
    }
  });

  function initObserver() {
    var t = getTrack();
    if (t) _trackObserver.observe(t, { attributes: true, attributeFilter: ["style"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initObserver);
  } else {
    initObserver();
  }

  // ============================================================
  // 売上/社数/件数パネルのスワイプ切替
  // ============================================================
  var RANK_TABS = ['sales', 'clients', 'deals'];
  var rankSwipe = {
    active: false,
    locked: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    dx: 0,
    container: null,
    currentPanel: null,
    switchFn: null  // switchOverviewTab or switchTeamTab
  };

  function getRankTabBarFromTouch(target) {
    var el = target;
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains('rank-tab-bar')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function getRankContext(tabBar) {
    // 個人タブ or チームタブかを判定
    var parent = tabBar.closest('#page-individual-tab');
    if (parent) return { prefix: 'ov-panel-', tabPrefix: 'ovtab-', currentVar: '_ovCurrentTab', switchFn: 'switchOverviewTab' };
    parent = tabBar.closest('#page-team-tab');
    if (parent) return { prefix: 'team-panel-', tabPrefix: 'teamtab-', currentVar: '_teamCurrentTab', switchFn: 'switchTeamTab' };
    return null;
  }

  function getCurrentRankIdx(ctx) {
    var current = window[ctx.currentVar] || 'sales';
    return RANK_TABS.indexOf(current);
  }

  document.addEventListener("touchstart", function(e) {
    if (!isMobile() || isSidebarOpen()) return;
    var tabBar = getRankTabBarFromTouch(e.target);
    if (!tabBar) return;

    var ctx = getRankContext(tabBar);
    if (!ctx) return;

    rankSwipe.active    = true;
    rankSwipe.locked    = null;
    rankSwipe.startX    = e.touches[0].clientX;
    rankSwipe.startY    = e.touches[0].clientY;
    rankSwipe.startTime = Date.now();
    rankSwipe.dx        = 0;
    rankSwipe.container = container;
    rankSwipe.ctx       = ctx;

    // メインカルーセルのスワイプを抑制
    tracking = false;
  }, { passive: true });

  document.addEventListener("touchmove", function(e) {
    if (!rankSwipe.active) return;

    var dx = e.touches[0].clientX - rankSwipe.startX;
    var dy = e.touches[0].clientY - rankSwipe.startY;

    if (!rankSwipe.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      rankSwipe.locked = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
    }
    if (rankSwipe.locked === "v") return;

    // 端でのラバーバンド
    var idx = getCurrentRankIdx(rankSwipe.ctx);
    if ((dx > 0 && idx === 0) || (dx < 0 && idx === RANK_TABS.length - 1)) {
      rankSwipe.dx = dx * 0.2;
    } else {
      rankSwipe.dx = dx;
    }

    // 現在のパネルをスライド追従
    var current = window[rankSwipe.ctx.currentVar] || 'sales';
    var panel = document.getElementById(rankSwipe.ctx.prefix + current);
    if (panel) {
      panel.style.transition = "none";
      panel.style.transform = "translate3d(" + rankSwipe.dx + "px, 0, 0)";
      panel.style.opacity = String(1 - Math.abs(rankSwipe.dx) / window.innerWidth * 0.3);
    }
  }, { passive: true });

  document.addEventListener("touchend", function(e) {
    if (!rankSwipe.active) return;
    rankSwipe.active = false;

    var ctx = rankSwipe.ctx;
    var current = window[ctx.currentVar] || 'sales';
    var panel = document.getElementById(ctx.prefix + current);
    var idx = getCurrentRankIdx(ctx);

    if (rankSwipe.locked !== "h" || Math.abs(rankSwipe.dx) < 5) {
      // リセット
      if (panel) { panel.style.transform = ""; panel.style.opacity = ""; panel.style.transition = ""; }
      return;
    }

    var dt = Date.now() - rankSwipe.startTime;
    var velocity = Math.abs(rankSwipe.dx) / (dt || 1);
    var shouldSwitch = Math.abs(rankSwipe.dx) > 50 || velocity > 0.3;

    var newIdx = idx;
    if (shouldSwitch) {
      if (rankSwipe.dx < 0 && idx < RANK_TABS.length - 1) newIdx = idx + 1;
      else if (rankSwipe.dx > 0 && idx > 0) newIdx = idx - 1;
    }

    if (newIdx !== idx && panel) {
      // スライドアウトしてからタブ切替
      var dir = newIdx > idx ? "-100%" : "100%";
      panel.style.transition = "transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease";
      panel.style.transform = "translate3d(" + dir + ", 0, 0)";
      panel.style.opacity = "0";

      var target = RANK_TABS[newIdx];
      var switchFnName = ctx.switchFn;
      setTimeout(function() {
        panel.style.transform = "";
        panel.style.opacity = "";
        panel.style.transition = "";
        // switchOverviewTab / switchTeamTab を呼ぶ
        if (typeof window[switchFnName] === 'function') {
          window[switchFnName](target);
        }
      }, 210);
    } else if (panel) {
      // スナップバック
      panel.style.transition = "transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease";
      panel.style.transform = "translate3d(0, 0, 0)";
      panel.style.opacity = "1";
      setTimeout(function() {
        panel.style.transform = "";
        panel.style.opacity = "";
        panel.style.transition = "";
      }, 210);
    }
  }, { passive: true });

  // ============================================================
  // 詳細ページでの右スワイプ「戻る」ジェスチャー
  // ============================================================
  var BACK_MAP = {
    "page-individual":  function() {
      var btn = document.getElementById("ind-back-btn");
      if (btn) { btn.click(); return true; }
      return false;
    },
    "page-team-detail": function() { showPage("team-tab"); return true; },
    "page-members":     function() { showPage("team-tab"); return true; },
    "page-deal-list":   function() { showPage("individual-tab"); return true; },
    "page-client-list": function() { showPage("individual-tab"); return true; },
    "page-report":      function() { showPage("individual-tab"); return true; }
  };

  var backTracking = false;
  var backStartX   = 0;
  var backStartY   = 0;
  var backStartT   = 0;
  var backLocked   = null;
  var backPageEl   = null;
  var backDx       = 0;

  function getActiveDetailPage() {
    var pages = document.querySelectorAll(".page.active:not(.swipe-container)");
    for (var i = 0; i < pages.length; i++) {
      if (BACK_MAP[pages[i].id]) return pages[i];
    }
    return null;
  }

  document.addEventListener("touchstart", function(e) {
    if (!isMobile() || isSidebarOpen()) return;
    if (isSwipeContainerActive()) return; // カルーセル内はカルーセル側が処理

    backPageEl = getActiveDetailPage();
    if (!backPageEl) return;

    backTracking = true;
    backLocked   = null;
    backStartX   = e.touches[0].clientX;
    backStartY   = e.touches[0].clientY;
    backStartT   = Date.now();
    backDx       = 0;

    backPageEl.style.transition = "none";
  }, { passive: true });

  document.addEventListener("touchmove", function(e) {
    if (!backTracking || !backPageEl) return;

    var dx = e.touches[0].clientX - backStartX;
    var dy = e.touches[0].clientY - backStartY;

    if (!backLocked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      backLocked = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
    }
    if (backLocked === "v") return;

    // 右スワイプのみ（左スワイプは無視）
    backDx = Math.max(0, dx);
    backPageEl.style.transform = "translate3d(" + backDx + "px, 0, 0)";
    backPageEl.style.opacity = String(1 - backDx / window.innerWidth * 0.3);
  }, { passive: true });

  document.addEventListener("touchend", function(e) {
    if (!backTracking || !backPageEl) { backTracking = false; return; }
    backTracking = false;

    if (backLocked !== "h" || backDx <= 0) {
      backPageEl.style.transform = "";
      backPageEl.style.opacity = "";
      backPageEl.style.transition = "";
      return;
    }

    var dt = Date.now() - backStartT;
    var velocity = backDx / (dt || 1);
    var shouldGoBack = backDx > 80 || velocity > 0.35;

    if (shouldGoBack) {
      // スライドアウトしてから遷移
      backPageEl.style.transition = "transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease";
      backPageEl.style.transform = "translate3d(" + window.innerWidth + "px, 0, 0)";
      backPageEl.style.opacity = "0.4";

      var el = backPageEl;
      var handler = BACK_MAP[el.id];
      setTimeout(function() {
        el.style.transform  = "";
        el.style.opacity    = "";
        el.style.transition = "";
        if (handler) handler();
      }, 260);
    } else {
      // スナップバック
      backPageEl.style.transition = "transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease";
      backPageEl.style.transform = "translate3d(0, 0, 0)";
      backPageEl.style.opacity = "1";
      var el2 = backPageEl;
      setTimeout(function() {
        el2.style.transform  = "";
        el2.style.opacity    = "";
        el2.style.transition = "";
      }, 260);
    }
  }, { passive: true });

})();
