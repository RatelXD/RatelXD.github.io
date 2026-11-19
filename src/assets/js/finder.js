(() => {
  const area = document.querySelector(".file-area");
  if (!area) return;
  const panels = new Map([...area.querySelectorAll("[data-panel]")].map(panel => [panel.dataset.panel, panel]));
  const up = document.querySelector("[data-up]");
  const status = document.querySelector("[data-status-path]");
  const windowTitle = document.querySelector("[data-window-title]");
  const locations = [...document.querySelectorAll(".location[data-folder], .system-menu [data-folder]")];
  const views = [...area.querySelectorAll("[data-layout]")];

  function render(id, focus) {
    const panel = panels.get(id) || panels.get("home");
    const current = panel.dataset.panel;
    for (const candidate of panels.values()) candidate.hidden = candidate !== panel;
    const heading = panel.querySelector("h1");
    const atHome = current === "home";
    for (const link of locations) {
      const chosen = link.dataset.folder === current;
      link.classList.toggle("chosen", chosen);
      if (chosen) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    up.hidden = atHome;
    windowTitle.textContent = atHome ? "파일 탐색기" : heading.textContent;
    status.textContent = atHome ? "내 작업실" : "내 작업실 / " + heading.textContent + " · " + panel.dataset.count + "개 항목";
    area.scrollTop = 0;
    if (focus) heading.focus({ preventScroll: true });
  }

  function visit(id, mode = "push", focus = true) {
    if (!panels.has(id)) return;
    const address = new URL(location.href);
    if (id === "home") address.searchParams.delete("folder");
    else address.searchParams.set("folder", id);
    if (address.href !== location.href) {
      if (mode === "replace") history.replaceState(history.state, "", address);
      else history.pushState(null, "", address);
    }
    document.dispatchEvent(new Event("desk:show"));
    render(id, focus);
  }

  function setView(value) {
    const layout = value === "grid" ? "grid" : "list";
    area.classList.toggle("icon-view", layout === "grid");
    for (const button of views) button.setAttribute("aria-pressed", String(button.dataset.layout === layout));
  }
  try { setView(localStorage.getItem("ratelxd.finder.view")); } catch { setView("list"); }
  for (const button of views) button.addEventListener("click", () => {
    setView(button.dataset.layout);
    try { localStorage.setItem("ratelxd.finder.view", button.dataset.layout); } catch { /* The view remains available for this visit. */ }
  });
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const link = event.target.closest("a[data-folder]");
    if (!link) return;
    event.preventDefault();
    visit(link.dataset.folder);
  });
  up.addEventListener("click", () => visit("home"));
  document.addEventListener("desk:reset", () => visit("home", "replace", false));
  document.addEventListener("desk:home", () => visit("home"));
  const addressFolder = () => new URLSearchParams(location.search).get("folder") || "home";
  window.addEventListener("popstate", () => {
    document.dispatchEvent(new Event("desk:show"));
    render(addressFolder(), true);
  });
  area.addEventListener("keydown", event => {
    const file = event.target.closest("a[data-file]");
    if (!file || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const files = [...file.closest(".file-list").querySelectorAll("a[data-file]")];
    const index = files.indexOf(file);
    const positions = { ArrowDown: Math.min(index + 1, files.length - 1), ArrowUp: Math.max(0, index - 1), Home: 0, End: files.length - 1 };
    if (Object.hasOwn(positions, event.key)) {
      event.preventDefault();
      files[positions[event.key]].focus();
    }
  });
  render(addressFolder(), false);
})();
