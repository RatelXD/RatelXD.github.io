(() => {
  const trash = document.querySelector("#portfolio-trash");
  const rows = [...trash.querySelectorAll("[data-bin-url]")];
  const canonical = new Set(rows.map(row => row.dataset.binUrl));
  const key = "ratelxd.finder.trashed-aliases.v1";
  const dockTrash = document.querySelector("[data-open-trash]");
  const notice = document.querySelector("[data-desk-notice]");
  const popovers = [...document.querySelectorAll(".tool-popover, .dock-stack")];
  let selected = false;
  let noticeTimer;

  function readTrash() {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return new Set(Array.isArray(saved) ? saved.filter(url => canonical.has(url)) : []);
    } catch { return new Set(); }
  }
  let removed = readTrash();
  window.portfolioTrash = { has: url => removed.has(url) };
  function announce(message) {
    clearTimeout(noticeTimer);
    notice.textContent = message;
    noticeTimer = setTimeout(() => { notice.textContent = ""; }, 2500);
  }
  function refreshTrash() {
    const n = removed.size;
    for (const row of rows) row.hidden = !removed.has(row.dataset.binUrl);
    trash.querySelector("[data-trash-empty]").hidden = n > 0;
    trash.querySelector("[data-trash-files]").hidden = n === 0;
    trash.querySelector("[data-restore-all]").hidden = n < 2;
    trash.querySelector("[data-bin-count]").textContent = n + "개의 항목";
    dockTrash.querySelector("img").src = "/assets/media/mac/" + (n ? "trash-full.png" : "trash.png");
    document.dispatchEvent(new Event("desk:trash-change"));
  }
  function saveTrash() {
    try { localStorage.setItem(key, JSON.stringify([...removed])); } catch { /* Local state still works for this visit. */ }
    refreshTrash();
  }
  function moveAlias(url) {
    if (!canonical.has(url) || removed.has(url)) return;
    removed.add(url);
    saveTrash();
    announce("별칭을 휴지통으로 옮겼습니다.");
  }
  document.addEventListener("desk:trash-alias", event => moveAlias(event.detail?.url));
  window.addEventListener("storage", event => {
    if (event.key === key || event.key === null) { removed = readTrash(); refreshTrash(); }
  });
  dockTrash.addEventListener("click", () => {
    if (document.querySelector("dialog[open]")) return;
    trash.showModal();
    trash.querySelector("[data-close-trash]").focus({ preventScroll:true });
  });
  trash.querySelector("[data-close-trash]").addEventListener("click", () => trash.close());
  trash.addEventListener("close", () => dockTrash.focus({ preventScroll:true }));
  trash.addEventListener("click", event => {
    const row = event.target.closest("[data-untrash]")?.closest("[data-bin-url]");
    if (row || event.target.closest("[data-restore-all]")) {
      if (row) removed.delete(row.dataset.binUrl);
      else removed.clear();
      saveTrash();
      (trash.querySelector(".trash-file:not([hidden]) button") || trash.querySelector("[data-close-trash]")).focus();
      announce("별칭을 RatelXD 폴더에 되돌려 놓았습니다.");
    }
  });

  const dragType = "application/x-ratelxd-alias";
  document.addEventListener("dragstart", event => {
    const alias = event.target.closest("[data-home-alias]");
    if (alias && event.dataTransfer) {
      event.dataTransfer.setData(dragType, alias.dataset.homeAlias);
      event.dataTransfer.effectAllowed = "copyMove";
    }
  });
  dockTrash.addEventListener("dragover", event => {
    if (!event.dataTransfer.types.includes(dragType)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    dockTrash.classList.add("drag-over");
  });
  dockTrash.addEventListener("dragleave", () => dockTrash.classList.remove("drag-over"));
  document.addEventListener("dragend", () => dockTrash.classList.remove("drag-over"));
  dockTrash.addEventListener("drop", event => {
    const url = event.dataTransfer.getData(dragType);
    if (!canonical.has(url)) return;
    event.preventDefault();
    dockTrash.classList.remove("drag-over");
    moveAlias(url);
  });

  function closePopovers(except) {
    for (const popover of popovers) if (popover !== except) popover.open = false;
  }
  for (const popover of popovers) popover.addEventListener("toggle", () => {
    if (popover.open) closePopovers(popover);
  });
  document.addEventListener("click", event => {
    const popover = event.target.closest(".tool-popover, .dock-stack");
    closePopovers(popover && !event.target.closest("a, button") ? popover : null);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
    const open = popovers.find(node => node.open);
    if (open) {
      open.open = false;
      open.querySelector("summary").focus();
    }
  });
  const viewSymbol = document.querySelector("[data-view-symbol] use");
  document.addEventListener("desk:state", event => {
    selected = event.detail.hasSelection;
    viewSymbol?.setAttribute("href", "#symbol-" + event.detail.layout);
  });
  document.querySelector("[data-copy-location]")?.addEventListener("click", () => {
    if (selected) document.dispatchEvent(new CustomEvent("desk:action", {detail:{action:"copy"}}));
    else document.querySelector('[data-menu-command="copy-page"]')?.click();
  });

  const desktop = document.querySelector(".desktop-files");
  const win = document.querySelector("[data-window]");
  const shortcuts = [...desktop.querySelectorAll("a")];
  function selectDesktop(link) {
    for (const item of shortcuts) item.classList.toggle("desktop-selected", item === link);
    win.classList.toggle("desktop-inactive", Boolean(link));
  }
  desktop.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (event.detail === 1 && !["touch","pen"].includes(event.pointerType) && matchMedia("(pointer:fine)").matches) {
      event.preventDefault();
      selectDesktop(link);
    } else selectDesktop(null);
  });
  desktop.addEventListener("keydown", event => {
    const index = shortcuts.indexOf(event.target.closest("a"));
    if (index < 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (event.metaKey && event.key === "ArrowDown") { shortcuts[index].click(); return; }
      const next = shortcuts[Math.max(0, Math.min(shortcuts.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))];
      next.focus();
      selectDesktop(next);
    }
  });
  document.addEventListener("pointerdown", event => {
    if (!desktop.contains(event.target)) selectDesktop(null);
  });
  document.addEventListener("desk:show", () => selectDesktop(null));
  refreshTrash();
})();
