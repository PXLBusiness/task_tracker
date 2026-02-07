let miniTimers = [];
let miniTickInterval = null;

function requestResize() {
  const container = document.querySelector(".mini-container");
  if (!container) return;

  const height = Math.ceil(container.scrollHeight);
  window.api.resizeMiniWindow(height);
}

function renderMiniTimers() {
  const container = document.getElementById("miniTimers");

  if (!miniTimers.length && miniTickInterval) {
    clearInterval(miniTickInterval);
    miniTickInterval = null;
  }

  if (!miniTimers.length) {
    container.innerHTML = `<div class="mini-empty">No active timers</div>`;
    return;
  }

  container.innerHTML = miniTimers
    .map((t) => {
      const elapsed = getElapsedTime(t.started_at);

      return `
        <div class="mini-timer">
          <div class="mini-task">${t.task_name}</div>
          <div class="mini-client">${t.client_name}</div>

          <div class="mini-footer">
            <div class="mini-elapsed">${elapsed}</div>
            <div class="mini-actions">
              <button class="mini-btn finish" data-id="${t.id}">✓</button>
              <button class="mini-btn cancel" data-id="${t.id}">✕</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  attachMiniActions();
  requestResize();
}

function attachMiniActions() {
  document.querySelectorAll(".mini-btn.finish").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.api.finishTimerFromMini(btn.dataset.id);
    });
  });

  document.querySelectorAll(".mini-btn.cancel").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.api.cancelTimerFromMini(btn.dataset.id);
    });
  });
}

function getElapsedTime(start) {
  const diff = Date.now() - new Date(start).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("hideMiniBtn").addEventListener("click", () => {
    window.api.hideMiniWindow();
  });

  window.api.onTimersUpdated((timers) => {
    console.log("Mini window timers:", timers);

    miniTimers = Array.isArray(timers) ? timers : [];
    renderMiniTimers();

    // Start ticking if not already running
    if (miniTickInterval) clearInterval(miniTickInterval);

    if (miniTimers.length > 0) {
      miniTickInterval = setInterval(renderMiniTimers, 1000);
    }
  });
});
