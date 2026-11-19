(() => {
  const win = document.querySelector("[data-window]");
  if (!win) return;
  document.documentElement.classList.add("has-desk-js");

  const stage = win.parentElement;
  const bar = win.querySelector("[data-titlebar]");
  const zoomButton = win.querySelector('[data-win="zoom"]');
  const restore = stage.querySelector("[data-restore]");
  const finder = document.body.classList.contains("finder-page");
  const menus = [...document.querySelectorAll(".system-menu")];
  const compact = matchMedia("(max-width: 45rem)");
  const dragSurface = matchMedia("(min-width: 54rem) and (pointer: fine)");
  let offset = { x: 0, y: 0 };
  let drag = null;
  let lastFocus = null;

  function move(x, y) {
    offset = { x, y };
    win.style.setProperty("--win-x", x + "px");
    win.style.setProperty("--win-y", y + "px");
  }

  function constrain(x, y) {
    const area = stage.getBoundingClientRect();
    const rect = win.getBoundingClientRect();
    const left = rect.left - offset.x;
    const top = rect.top - offset.y;
    move(Math.max(area.left - left, Math.min(x, area.right - left - rect.width)),
      Math.max(area.top - top, Math.min(y, area.bottom - top - rect.height)));
  }

  function zoom(expanded) {
    win.classList.toggle("is-max", expanded);
    zoomButton.setAttribute("aria-pressed", String(expanded));
    zoomButton.setAttribute("aria-label", expanded ? "원래 창 크기로" : "창 확대");
    zoomButton.title = zoomButton.getAttribute("aria-label");
    if (!expanded) constrain(offset.x, offset.y);
  }

  function show(focus = true) {
    if (!win.hidden) return;
    win.hidden = false;
    restore.hidden = true;
    if (!win.classList.contains("is-max")) constrain(offset.x, offset.y);
    if (focus) {
      const target = lastFocus?.getClientRects().length ? lastFocus : win.querySelector("[data-win]");
      target.focus({ preventScroll: true });
    }
  }

  function hide(reset) {
    if (reset && !finder) {
      location.assign(bar.querySelector(".back-folder").href);
      return;
    }
    lastFocus = document.activeElement;
    if (reset) {
      document.dispatchEvent(new Event("desk:reset"));
      zoom(false);
      move(0, 0);
      lastFocus = null;
    }
    win.hidden = true;
    restore.hidden = false;
    restore.focus({ preventScroll: true });
  }

  bar.addEventListener("click", event => {
    const action = event.target.closest("[data-win]")?.dataset.win;
    if (action === "close" || action === "minimize") hide(action === "close");
    if (action === "zoom") zoom(!win.classList.contains("is-max"));
  });
  bar.addEventListener("dblclick", event => {
    if (dragSurface.matches && !event.target.closest("button, a")) zoom(!win.classList.contains("is-max"));
  });
  bar.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !dragSurface.matches || win.classList.contains("is-max") || event.target.closest("button, a")) return;
    drag = { id: event.pointerId, x: event.clientX - offset.x, y: event.clientY - offset.y };
    bar.setPointerCapture(event.pointerId);
    win.classList.add("dragging");
  });
  bar.addEventListener("pointermove", event => {
    if (drag?.id === event.pointerId) constrain(event.clientX - drag.x, event.clientY - drag.y);
  });
  bar.addEventListener("lostpointercapture", () => {
    drag = null;
    win.classList.remove("dragging");
  });
  window.addEventListener("resize", () => {
    if (!dragSurface.matches) move(0, 0);
    else if (!win.hidden && !win.classList.contains("is-max")) constrain(offset.x, offset.y);
  });

  restore.addEventListener("click", () => show());
  document.addEventListener("desk:show", () => show(false));
  document.querySelector("[data-launch-finder], [data-current-app]")?.addEventListener("click", event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (win.hidden) show();
    else if (finder) {
      document.dispatchEvent(new Event("desk:home"));
    } else {
      win.querySelector(".reader-scroll")?.focus({ preventScroll: true });
    }
  });

  function closeMenus(except) {
    for (const menu of menus) if (menu !== except) menu.open = false;
  }
  for (const menu of menus) {
    menu.addEventListener("toggle", () => { if (menu.open) closeMenus(menu); });
  }
  document.addEventListener("click", event => {
    closeMenus(event.target.closest(".system-menu a") ? null : event.target.closest(".system-menu"));
  });
  document.addEventListener("keydown", event => {
    if (event.isComposing || event.defaultPrevented || document.querySelector("dialog[open]")) return;
    const openMenu = menus.find(menu => menu.open);
    if (event.key === "Escape" && openMenu) {
      openMenu.open = false;
      openMenu.querySelector("summary").focus();
    }
    if (!finder && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      location.assign("/?search=1");
    }
  });

  const clock = document.querySelector(".system-clock");
  const formatTime = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });
  const formatDate = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  function tick() {
    const now = new Date();
    const time = formatTime.format(now);
    const full = formatDate.format(now) + " " + time;
    clock.textContent = compact.matches ? time : full;
    clock.setAttribute("aria-label", full);
    clock.dateTime = now.toISOString();
  }
  tick();
  compact.addEventListener("change", tick);
  setInterval(tick, 15000);
  const shortcut = document.querySelector("[data-shortcut]");
  if (shortcut && !/Mac|iPhone|iPad/i.test(navigator.platform)) shortcut.textContent = "Ctrl K";
})();
