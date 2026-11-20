function setupWindowGeometry(win) {
  const stage = win.parentElement;
  const bar = win.querySelector("[data-titlebar]");
  const zoomButton = win.querySelector('[data-win="zoom"]');
  const grip = win.querySelector("[data-resize]");
  const desktop = matchMedia("(min-width:48.01rem) and (pointer:fine)");
  const offset = { x:0, y:0 };
  let gesture = null;

  function move(x, y) {
    offset.x = x;
    offset.y = y;
    win.style.setProperty("--win-x", x + "px");
    win.style.setProperty("--win-y", y + "px");
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  function keepInside(x = offset.x, y = offset.y) {
    if (win.hidden || win.classList.contains("is-max")) return;
    const area = stage.getBoundingClientRect();
    const rect = win.getBoundingClientRect();
    const left = rect.left - offset.x;
    const top = rect.top - offset.y;
    move(clamp(x, area.left - left, area.right - left - rect.width),
      clamp(y, area.top - top, area.bottom - top - rect.height));
  }
  function zoom(value) {
    win.classList.toggle("is-max", value);
    const label = value ? "원래 크기로" : "창 확대";
    zoomButton.setAttribute("aria-pressed", String(value));
    zoomButton.setAttribute("aria-label", label);
    zoomButton.title = label;
    if (grip) grip.disabled = value;
    if (!value) keepInside();
  }
  function restoreSize() {
    win.style.removeProperty("--win-width");
    win.style.removeProperty("--win-height");
  }
  function resizeFrom(rect, dx, dy) {
    const area = stage.getBoundingClientRect();
    const maxWidth = area.right - rect.left;
    const maxHeight = area.bottom - rect.top;
    const width = clamp(rect.width + dx, Math.min(560,maxWidth), maxWidth);
    const height = clamp(rect.height + dy, Math.min(335,maxHeight), maxHeight);
    win.style.setProperty("--win-width", width + "px");
    win.style.setProperty("--win-height", height + "px");
    const next = win.getBoundingClientRect();
    // The stage centers windows. Keep the opposite corner stationary during a resize.
    keepInside(offset.x + rect.left - next.left, offset.y + rect.top - next.top);
  }
  function startGesture(event, kind) {
    if (!desktop.matches || event.button !== 0 || win.classList.contains("is-max")) return;
    gesture = { kind, id:event.pointerId, x:event.clientX, y:event.clientY, dx:offset.x, dy:offset.y, rect:win.getBoundingClientRect() };
    event.currentTarget.setPointerCapture(event.pointerId);
    win.classList.add(kind === "move" ? "dragging" : "resizing");
    event.preventDefault();
  }
  function moveGesture(event) {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.kind === "resize") resizeFrom(gesture.rect, dx, dy);
    else keepInside(gesture.dx + dx, gesture.dy + dy);
  }
  function endGesture() {
    gesture = null;
    win.classList.remove("dragging","resizing");
  }
  bar.addEventListener("pointerdown", event => {
    if (!event.target.closest("button,a,input,select,details,summary,[role=button]")) startGesture(event, "move");
  });
  bar.addEventListener("dblclick", event => {
    if (desktop.matches && !event.target.closest("button,a,input,select,details,summary")) zoom(!win.classList.contains("is-max"));
  });
  if (grip) {
    grip.addEventListener("pointerdown", event => startGesture(event,"resize"));
    grip.addEventListener("keydown", event => {
      if (!desktop.matches || !event.key.startsWith("Arrow") || grip.disabled) return;
      event.preventDefault();
      const step = event.shiftKey ? 64 : 16;
      const horizontal = {ArrowLeft:-step,ArrowRight:step};
      const vertical = {ArrowUp:-step,ArrowDown:step};
      resizeFrom(win.getBoundingClientRect(), horizontal[event.key] || 0, vertical[event.key] || 0);
    });
  }
  for (const surface of [bar,grip].filter(Boolean)) {
    surface.addEventListener("pointermove",moveGesture);
    surface.addEventListener("lostpointercapture",endGesture);
  }
  return {
    place(x, y) { if (desktop.matches) keepInside(x, y); },
    zoom() { zoom(!win.classList.contains("is-max")); },
    fit() {
      if (desktop.matches) keepInside();
      else { restoreSize(); move(0, 0); }
    }
  };
}

function setupMenuBar(workspace) {
  const html = document.documentElement;
  const compact = matchMedia("(max-width:48rem)");
  const menuBar = document.querySelector(".system-bar");
  const menus = [...menuBar.querySelectorAll(".mac-menu")];
  const commands = [...menuBar.querySelectorAll("[data-menu-command]")];
  document.addEventListener("desk:state", refreshCommands);
  document.addEventListener("desk:windows", refreshCommands);
  function refreshCommands() {
    const current = workspace.active;
    const state = current?.finderState || {};
    const availability = {selection:state.hasSelection, preview:state.canPreview, back:state.canBack, forward:state.canForward, parent:state.folder && state.folder !== "home", window:Boolean(current)};
    for (const node of commands) {
      const needs = node.dataset.menuNeeds;
      node.disabled = Boolean(needs && !availability[needs]);
      if (node.dataset.menuMark) {
        node.dataset.checked = String(node.dataset.menuMark === state.layout || node.dataset.menuMark === state.sort);
        node.setAttribute("aria-pressed",node.dataset.checked);
      }
    }
  }
  function closeMenus(except) {
    for (const menu of menus) if (menu !== except && menu.open) menu.open = false;
  }
  function positionMenu(menu) {
    const sheet = menu.querySelector(".mac-sheet");
    if (!sheet || !menu.open) return;
    sheet.style.removeProperty("--menu-offset");
    const rect = sheet.getBoundingClientRect();
    const delta = rect.left < 5 ? 5 - rect.left : Math.min(0, innerWidth - 5 - rect.right);
    if (delta) sheet.style.setProperty("--menu-offset",delta + "px");
  }
  function items(menu) {
    return [...menu.querySelectorAll(".mac-sheet a[href],.mac-sheet button:not(:disabled),.mac-sheet input:not(:disabled)")].filter(item=>item.getClientRects().length);
  }
  function openMenu(menu, keyboard = false, last = false) {
    closeMenus(menu);
    refreshCommands();
    menu.open = true;
    positionMenu(menu);
    if (keyboard) {
      const choices = items(menu);
      (choices[last ? choices.length - 1 : 0] || menu.querySelector("summary")).focus({preventScroll:true});
    }
  }
  window.addEventListener("resize", () => {
    const open = menus.find(menu => menu.open);
    if (open) positionMenu(open);
  });
  for (const menu of menus) {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      closeMenus(menu);
      refreshCommands();
      positionMenu(menu);
    });
    menu.querySelector("summary").addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse" && menus.some(other=>other.open && other !== menu)) openMenu(menu);
    });
  }
  menuBar.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.isComposing || !event.target.closest(".mac-menu")) return;
    const menu = menus.find(other=>other.open) || event.target.closest(".mac-menu");
    if (!menu) return;
    const summary = menu.querySelector("summary");
    const directions = ["ArrowDown","ArrowUp","ArrowLeft","ArrowRight","Home","End"];
    if (event.key === "Escape" && menu.open) {
      event.preventDefault();
      menu.open = false;
      summary.focus();
      return;
    }
    if (!directions.includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const headings = menus.filter(other=>other.getClientRects().length);
      const next = (headings.indexOf(menu) + (event.key === "ArrowRight" ? 1 : -1) + headings.length) % headings.length;
      if (menu.open) openMenu(headings[next],true);
      else headings[next].querySelector("summary").focus();
      return;
    }
    if (!menu.open) { openMenu(menu,true,event.key === "ArrowUp" || event.key === "End"); return; }
    const choices = items(menu);
    if (!choices.length) return;
    const current = choices.indexOf(document.activeElement);
    let next = event.key === "Home" ? 0 : choices.length - 1;
    if (event.key === "ArrowDown") next = (current + 1) % choices.length;
    if (event.key === "ArrowUp" && current > -1) next = (current - 1 + choices.length) % choices.length;
    choices[next].focus({preventScroll:true});
  });
  menuBar.addEventListener("focusout", event => {
    if (event.relatedTarget && !menuBar.contains(event.relatedTarget)) closeMenus();
  });
  menuBar.addEventListener("focusin", event => {
    if (!event.target.closest(".mac-menu")) closeMenus();
  });
  document.addEventListener("pointerdown", event => {
    if (!event.target.closest(".mac-menu")) closeMenus();
  });

  const announcement = menuBar.querySelector("[data-menu-message]");
  let messageTimer;
  function say(message) {
    if (!announcement) return;
    announcement.textContent = message;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(()=>{ announcement.textContent = ""; },2600);
  }
  async function copyPage() {
    try {
      await navigator.clipboard.writeText(location.href);
      say("페이지 링크를 복사했습니다.");
    } catch {
      const field = document.createElement("textarea");
      field.value = location.href;
      field.setAttribute("aria-label","현재 페이지 주소");
      field.className = "visually-hidden";
      document.body.append(field);
      field.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { /* Browser clipboard setting. */ }
      field.remove();
      say(copied ? "페이지 링크를 복사했습니다." : "브라우저 주소창에서 링크를 복사할 수 있습니다.");
    }
  }
  function runCommand(action) {
    const current = workspace.active;
    if (action.startsWith("window-")) {
      if (current) workspace.control(current, action.slice(7));
    } else if (action === "spotlight") {
      const search = menuBar.querySelector(".status-search[data-spotlight]");
      search?.focus({preventScroll:true});
      search?.click();
    } else if (action === "copy-page") copyPage();
    else if (action === "reader-start" || action === "reader-end") {
      const pane = current?.win.querySelector(".reader-scroll");
      if (pane) pane.scrollTop = action === "reader-start" ? 0 : pane.scrollHeight;
    } else {
      current?.win.dispatchEvent(new CustomEvent("desk:action",{detail:{action}}));
    }
  }
  menuBar.addEventListener("click", event => {
    const item = event.target.closest(".mac-item, .status-search");
    if (!item) return;
    const menu = item.closest(".mac-menu");
    const wasOpen = menu?.open;
    closeMenus();
    if (item.dataset.menuCommand) {
      if (wasOpen) menu.querySelector("summary").focus({preventScroll:true});
      runCommand(item.dataset.menuCommand);
    }
  });
  document.addEventListener("keydown", event => {
    if (event.isComposing || event.defaultPrevented || document.querySelector("dialog[open]")) return;
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
      const activeMenu = menus.find(menu=>menu.open);
      closeMenus();
      activeMenu?.querySelector("summary").focus({preventScroll:true});
    }
  });

  const systemMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const prefInputs = [...menuBar.querySelectorAll("[data-desk-pref]")];
  const defaults = {dock:true, motion:false};
  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem("ratelxd.desktop.display") || "{}");
      return {dock:saved?.dock !== false, motion:saved?.motion === true};
    } catch { return {...defaults}; }
  }
  let prefs = loadPreferences();
  function applyPreferences() {
    const reduce = systemMotion.matches || prefs.motion;
    html.classList.toggle("dock-magnifies",prefs.dock);
    html.classList.toggle("desk-reduce-motion",reduce);
    for (const input of prefInputs) {
      const motion = input.dataset.deskPref === "motion";
      input.checked = motion ? reduce : prefs.dock;
      input.disabled = motion && systemMotion.matches;
    }
    const note = menuBar.querySelector("[data-motion-system]");
    if (note) note.hidden = !systemMotion.matches;
  }
  for (const input of prefInputs) input.addEventListener("change", () => {
    prefs[input.dataset.deskPref] = input.checked;
    applyPreferences();
    try { localStorage.setItem("ratelxd.desktop.display",JSON.stringify(prefs)); } catch { /* Local settings apply for this visit. */ }
  });
  applyPreferences();
  systemMotion.addEventListener("change",applyPreferences);
  window.addEventListener("storage",event=>{
    if (event.key === "ratelxd.desktop.display" || event.key === null) { prefs = loadPreferences(); applyPreferences(); }
  });

  const clock = menuBar.querySelector(".system-clock");
  const narrowClock = matchMedia("(max-width:28rem)");
  const shortTime = new Intl.DateTimeFormat("ko-KR",{hour:"numeric",minute:"2-digit"});
  const compactTime = new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
  const shortDate = new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"short"});
  function tick() {
    const now = new Date();
    const time = shortTime.format(now);
    const date = shortDate.format(now) + " " + time;
    clock.textContent = narrowClock.matches ? compactTime.format(now) : (compact.matches ? time : date);
    clock.setAttribute("aria-label",date);
    clock.dateTime = now.toISOString();
  }
  tick();
  narrowClock.addEventListener("change",tick);
  compact.addEventListener("change",tick);
  setInterval(tick,15000);
  const network = menuBar.querySelector("[data-network-state]");
  function updateNetwork() {
    if (network) network.textContent = navigator.onLine ? "네트워크에 연결됨" : "오프라인";
  }
  updateNetwork();
  window.addEventListener("online",updateNetwork);
  window.addEventListener("offline",updateNetwork);
  const batteryMenu = menuBar.querySelector("[data-battery-menu]");
  if (batteryMenu && typeof navigator.getBattery === "function") {
    navigator.getBattery().then(battery=>{
      function updateBattery() {
        const level = Number.isFinite(battery.level) ? Math.round(battery.level * 100) : null;
        batteryMenu.hidden = level === null;
        if (level === null) return;
        const status = level + "% · " + (battery.charging ? "전원 연결" : "배터리 사용 중");
        batteryMenu.querySelector("[data-battery-status]").textContent = status;
        batteryMenu.querySelector("summary").setAttribute("aria-label","배터리 " + status);
        batteryMenu.style.setProperty("--battery-level",String(battery.level));
      }
      updateBattery();
      battery.addEventListener("levelchange",updateBattery);
      battery.addEventListener("chargingchange",updateBattery);
    }).catch(()=>{ /* Some browsers do not expose device battery status. */ });
  }
  if (!/mac|iphone|ipad/i.test(navigator.platform)) {
    for (const key of document.querySelectorAll("[data-shortcut]")) key.textContent = "Ctrl K";
    const hint = menuBar.querySelector("[data-modifier-help]");
    if (hint && matchMedia("(pointer:fine)").matches) hint.hidden = false;
  }
  if (matchMedia("(pointer:coarse)").matches) {
    const tip = menuBar.querySelector("[data-finder-help]");
    if (tip) tip.textContent = "폴더나 파일을 한 번 탭하면 열립니다.";
  }
  refreshCommands();
}
