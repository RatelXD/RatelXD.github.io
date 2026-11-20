(() => {
  const stage = document.querySelector(".workspace-stage");
  const initial = stage?.querySelector("[data-window]");
  if (!initial) return;
  const dock = document.querySelector(".dock");
  const launchers = [...dock.querySelectorAll("[data-dock-app]")];
  const dockPaths = new Set(launchers.map(link => new URL(link.href).pathname));
  const menu = document.querySelector(".system-bar");
  const list = menu.querySelector("[data-window-list]");
  const restore = stage.querySelector("[data-restore]");
  const notice = document.querySelector("[data-desk-notice]");
  const compact = matchMedia("(max-width:48rem)");
  const pages = new Set(stage.dataset.routes.trim().split(/\s+/));
  const windows = new Map();
  const stack = [];
  const pending = new Map();
  let active = null;
  let intent = 0;
  let opened = 0;

  function writeAddress(view, mode) {
    const url = view ? view.url : new URL("/", location.origin);
    const state = view ? view.historyData : {emptyDesktop:true};
    if (mode === "pop") return;
    if (mode === "push" && url.href !== location.href) history.pushState(state, "", url);
    else history.replaceState(state, "", url);
  }

  function syncDesktop() {
    const finder = active?.path === "/";
    menu.querySelector(".front-menu > summary").textContent = active?.win.dataset.appName || "Finder";
    for (const node of menu.querySelectorAll("[data-finder-menu]")) node.hidden = !finder;
    for (const node of menu.querySelectorAll("[data-reader-menu]")) node.hidden = !active || finder;
    const section = active?.path.split("/")[1];
    menu.querySelector("[data-enclosing-folder]").href = pages.has("/" + section + "/") && active?.win.querySelector(".story-page, [data-archive]")
      ? "/?folder=" + encodeURIComponent(section) : "/";
    for (const link of launchers) {
      const path = new URL(link.href).pathname;
      link.classList.toggle("running", stack.some(view => view.app === path));
      if (active?.app === path) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    const choices = document.createDocumentFragment();
    for (const [index, view] of stack.entries()) {
      const front = view === active;
      view.win.classList.toggle("is-behind", !front);
      view.win.inert = !front && compact.matches;
      view.win.style.zIndex = String(index + 1);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mac-item";
      button.dataset.switchWindow = view.path;
      button.dataset.checked = String(front);
      if (front) button.setAttribute("aria-current", "true");
      const mark = document.createElement("span");
      mark.className = "item-check";
      mark.setAttribute("aria-hidden","true");
      const label = document.createElement("span");
      label.textContent = view.label + (view.win.hidden ? " (최소화됨)" : "");
      button.append(mark, label);
      choices.prepend(button);
    }
    list.replaceChildren(choices);
    const last = stack.at(-1);
    restore.hidden = Boolean(active);
    if (!active) {
      const launcher = launchers.find(link => new URL(link.href).pathname === last?.app);
      restore.querySelector("img").src = launcher?.querySelector("img").src || "/assets/media/mac/" + (last ? "preview" : "finder") + ".png";
      restore.querySelector("span").textContent = last ? last.label + " 다시 열기" : "Finder 열기";
    }
    document.title = active?.title || "RatelXD의 작업실";
    document.dispatchEvent(new Event("desk:windows"));
  }

  function focusView(view) {
    const previous = view.lastFocus;
    const target = previous?.isConnected && previous.getClientRects().length ? previous : view.win.querySelector(".reader-scroll, [data-panel]:not([hidden]) h1") || view.win;
    target.focus({preventScroll:true});
  }

  function raise(view) {
    if (view === active && !view.win.hidden) return;
    if (active) {
      active.win.querySelector(".file-menu")?.hidePopover?.();
      for (const item of active.win.querySelectorAll(".tool-popover[open]")) item.open = false;
    }
    stack.splice(stack.indexOf(view), 1);
    stack.push(view);
    active = view;
    view.win.hidden = false;
    syncDesktop();
    view.geometry.fit();
  }

  function control(view, action) {
    if (action === "zoom") { view.geometry.zoom(); return; }
    if (action !== "close" && action !== "minimize") return;
    intent++;
    if (action === "close") {
      view.win.dispatchEvent(new Event("desk:close"));
      view.win.remove();
      windows.delete(view.path);
      stack.splice(stack.indexOf(view), 1);
    } else view.win.hidden = true;
    active = null;
    const next = stack.findLast(item => !item.win.hidden);
    if (next) { raise(next); focusView(next); }
    else { syncDesktop(); restore.focus({preventScroll:true}); }
    writeAddress(next, "replace");
  }

  function scrollToFragment(view) {
    const pane = view.win.querySelector(".reader-scroll");
    if (!pane || !view.url.hash) return;
    let id;
    try { id = decodeURIComponent(view.url.hash.slice(1)); } catch { return; }
    const target = [...pane.querySelectorAll("[id]")].find(node => (node.dataset.fragment || node.id) === id);
    if (target) pane.scrollTop += target.getBoundingClientRect().top - pane.getBoundingClientRect().top - 16;
  }

  function mount(win, title, url, initialHistory = null) {
    const path = win.dataset.window;
    const section = "/" + path.split("/")[1] + "/";
    const app = dockPaths.has(path) ? path : (dockPaths.has(section) ? section : null);
    const view = {
      win, path, app, title, url, initialHistory, historyData:{},
      label:win.getAttribute("aria-label"),
      setUrl(next, mode) {
        view.url = new URL(next, view.url);
        if (active === view) writeAddress(view, mode);
      }
    };
    // Relative links and media keep the base of the document they were authored in.
    for (const [selector, attribute] of [["a[href]", "href"], ["[src]", "src"], ["[poster]", "poster"], ["[data-full]", "data-full"]]) {
      for (const node of win.querySelectorAll(selector)) {
        const raw = node.getAttribute(attribute);
        if (raw && !raw.startsWith("/") && !/^[a-z][a-z\d+.-]*:/i.test(raw)) node.setAttribute(attribute, new URL(raw, url).href);
      }
    }
    for (const node of win.querySelectorAll(".prose [id]")) {
      node.dataset.fragment = node.id;
      node.id = path.replaceAll("/", "-") + node.id;
    }
    const count = stack.length;
    if (count) win.classList.add("cascaded");
    if (!win.isConnected) stage.insertBefore(win, restore);
    windows.set(path, view);
    stack.unshift(view);
    view.geometry = setupWindowGeometry(win);
    if (count) {
      const offsets = [[48,48],[-38,-32],[82,-8],[-62,44]];
      view.geometry.place(...offsets[opened++ % offsets.length]);
    }
    const lab = win.querySelector("[data-packet-lab]");
    if (path === "/") setupFinder(view, openWindow);
    else if (lab) setupPacketLab(lab);
    else setupReader(view);
    return view;
  }

  async function loadWindow(url) {
    const res = await fetch(url.pathname);
    if (!res.ok) throw new Error("Window request failed");
    const page = new DOMParser().parseFromString(await res.text(), "text/html");
    const win = page.querySelector("[data-window]");
    if (win?.dataset.window !== url.pathname) throw new Error("Missing window");
    return mount(document.importNode(win, true), page.title, url);
  }

  function showLoadError(url) {
    const link = document.createElement("a");
    link.textContent = "새 탭에서 열기";
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener";
    notice.replaceChildren("창을 불러오지 못했습니다. ", link);
  }

  async function openWindow(address, options = {}) {
    const url = new URL(address, location.href);
    const request = ++intent;
    const {launch = false, mode = "push", state = null} = options;
    if (!launch && url.pathname === "/" && url.searchParams.get("search") === "1" && mode !== "pop") {
      document.dispatchEvent(new CustomEvent("desk:spotlight", {detail:{opener:document.activeElement}}));
      return;
    }
    notice.replaceChildren();
    let view = windows.get(url.pathname);
    if (!view) {
      if (!pending.has(url.pathname)) pending.set(url.pathname, loadWindow(url).finally(() => pending.delete(url.pathname)));
      try { view = await pending.get(url.pathname); }
      catch {
        if (request === intent) {
          if (mode === "pop") writeAddress(active, "replace");
          showLoadError(url);
        }
        return;
      }
    }
    if (request !== intent) {
      if (!active) view.win.hidden = true;
      syncDesktop();
      return;
    }
    const changed = view.url.href !== url.href;
    raise(view);
    if (!launch && (changed || mode === "pop")) {
      view.url = url;
      view.win.dispatchEvent(new CustomEvent("desk:route", {detail:{state}}));
    }
    writeAddress(view, mode);
    focusView(view);
    if (!launch && (mode === "pop" || url.hash)) scrollToFragment(view);
    if (mode === "pop" && url.pathname === "/" && url.searchParams.get("search") === "1") document.dispatchEvent(new Event("desk:spotlight"));
  }

  function activateTarget(event) {
    const win = event.target.closest("[data-window]");
    const view = win && windows.get(win.dataset.window);
    if (!view) return;
    if (view !== active) { intent++; raise(view); writeAddress(view, "push"); }
    if (event.type === "focusin" && !event.target.closest("[data-win]")) view.lastFocus = event.target;
  }
  stage.addEventListener("pointerdown", activateTarget, true);
  stage.addEventListener("focusin", activateTarget);
  stage.addEventListener("click", event => {
    const button = event.target.closest("[data-win]");
    if (button) control(windows.get(button.closest("[data-window]").dataset.window), button.dataset.win);
  });
  restore.addEventListener("click", () => openWindow(stack.at(-1)?.url || "/", {launch:true}));
  compact.addEventListener("change", syncDesktop);
  window.addEventListener("resize", () => {
    for (const view of stack) view.geometry.fit();
  });
  window.addEventListener("popstate", event => {
    if (event.state?.emptyDesktop) {
      intent++;
      for (const view of stack) view.win.hidden = true;
      active = null;
      syncDesktop();
      return;
    }
    openWindow(location.href, {mode:"pop", state:event.state});
  });

  const desktopFiles = stage.querySelector(".desktop-files");
  const shortcuts = [...desktopFiles.querySelectorAll("a")];
  function selectShortcut(selected) {
    for (const link of shortcuts) link.classList.toggle("desktop-selected", link === selected);
    active?.win.classList.toggle("desktop-inactive", Boolean(selected));
  }
  desktopFiles.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (link && event.detail === 1 && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
        !["touch","pen"].includes(event.pointerType) && matchMedia("(pointer:fine)").matches) {
      event.preventDefault();
      selectShortcut(link);
    } else selectShortcut(null);
  });
  desktopFiles.addEventListener("keydown", event => {
    const at = shortcuts.indexOf(event.target.closest("a"));
    if (at < 0 || !["ArrowDown","ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    if (event.metaKey && event.key === "ArrowDown") { shortcuts[at].click(); return; }
    const next = shortcuts[Math.max(0, Math.min(shortcuts.length - 1, at + (event.key === "ArrowDown" ? 1 : -1)))];
    next.focus();
    selectShortcut(next);
  });
  document.addEventListener("pointerdown", event => {
    if (!desktopFiles.contains(event.target)) selectShortcut(null);
  }, true);

  function closePopovers(except) {
    for (const popover of document.querySelectorAll(".tool-popover[open], .dock-stack[open]")) {
      if (popover !== except) popover.open = false;
    }
  }
  document.addEventListener("toggle", event => {
    if (event.target.matches(".tool-popover[open], .dock-stack[open]")) closePopovers(event.target);
  }, true);
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
    const open = document.querySelector(".tool-popover[open], .dock-stack[open]");
    if (open) { open.open = false; open.querySelector("summary").focus(); }
  });
  document.addEventListener("click", event => {
    const element = event.target;
    closePopovers(element.closest("a,button") ? null : element.closest(".tool-popover,.dock-stack"));
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (element.closest("[data-copy-location]")) {
      if (active?.finderState?.hasSelection) active.win.dispatchEvent(new CustomEvent("desk:action", {detail:{action:"copy"}}));
      else menu.querySelector('[data-menu-command="copy-page"]').click();
      return;
    }
    const choice = element.closest("[data-switch-window]");
    if (choice) { openWindow(choice.dataset.switchWindow, {launch:true}); return; }
    const link = element.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self") || link.classList.contains("skip")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !pages.has(url.pathname)) return;
    if (link.hasAttribute("data-folder") && !link.closest("[data-window]")) {
      url.pathname = "/";
      url.search = link.dataset.folder === "home" ? "" : "?folder=" + encodeURIComponent(link.dataset.folder);
    }
    event.preventDefault();
    link.closest("dialog[open]")?.close("open-window");
    const launcher = link.hasAttribute("data-dock-app");
    const recent = launcher && stack.findLast(view => view.app === url.pathname);
    openWindow(recent ? recent.url : url, {launch:launcher});
  });

  document.addEventListener("desk:search-close", () => {
    const finder = windows.get("/");
    if (!finder || !finder.url.searchParams.has("search")) return;
    const url = new URL(finder.url);
    url.searchParams.delete("search");
    finder.setUrl(url, "replace");
  });

  const first = mount(initial, document.title, new URL(location.href), history.state);
  setupMenuBar({get active() { return active; }, control});
  document.documentElement.classList.add("has-desk-js");
  raise(first);
  writeAddress(first, "replace");
  if (first.url.hash) requestAnimationFrame(() => scrollToFragment(first));
})();
