function setupFinder(view, openWindow) {
  const win = view.win;
  const area = win.querySelector("#files");
  const lifetime = new AbortController();
  win.addEventListener("desk:close", () => lifetime.abort(), {once:true});
  const panels = new Map([...area.querySelectorAll("[data-panel]")].map(panel => [panel.dataset.panel,panel]));
  const available = panel => [...panel.querySelectorAll(".entry-cell:not([hidden]) > [data-entry]")];
  const layoutChoices = ["grid","list","columns","gallery"];
  const phone = matchMedia("(max-width: 42rem)");
  const collator = new Intl.Collator("ko", {numeric: true});
  const status = win.querySelector("[data-item-count]");
  const info = area.querySelector(".finder-info");
  const context = area.querySelector(".file-menu");
  const navigatorButtons = {back: win.querySelector("[data-back]"), forward: win.querySelector("[data-forward]")};
  const layoutButtons = [...win.querySelectorAll("button[data-layout]")];
  const sortButtons = [...win.querySelectorAll("button[data-sort]")];
  const railToggle = win.querySelector("[data-sidebar-toggle]");
  const known = id => panels.has(id) ? id : "home";
  const fromAddress = () => known(view.url.searchParams.get("folder"));
  let folder = fromAddress();
  let selection = null;
  let layout = "grid";
  let sort = "";
  let pointer = null;
  let noticeTimer;
  let infoOpener;
  const historyKey = view.initialHistory?.ratelFinder?.key || (Date.now().toString(36) + Math.random().toString(36).slice(2,7));
  let position = view.initialHistory?.ratelFinder?.position || 0;
  let trail = [folder];
  try {
    const saved = JSON.parse(localStorage.getItem("ratelxd.finder.preferences") || "{}");
    const favoriteView = saved.layout || localStorage.getItem("ratelxd.finder.view");
    if (layoutChoices.includes(favoriteView)) layout = favoriteView;
    if (["name","date"].includes(saved.sort)) sort = saved.sort;
    const oldTrail = JSON.parse(sessionStorage.getItem("ratelxd.trail." + historyKey) || "null");
    if (Array.isArray(oldTrail) && oldTrail[position] === folder) trail = oldTrail;
    else position = 0;
  } catch { position = 0; }

  function persistTrail() {
    view.historyData = {ratelFinder:{key:historyKey, position}};
    try { sessionStorage.setItem("ratelxd.trail." + historyKey,JSON.stringify(trail)); } catch { /* History still works in this tab. */ }
  }
  function saveView() {
    try { localStorage.setItem("ratelxd.finder.preferences",JSON.stringify({layout,sort})); } catch { /* Storage is optional. */ }
  }
  function permalink(entry) {
    return entry?.dataset.folder ? "/?folder=" + entry.dataset.folder : entry?.getAttribute("href") || "";
  }
  function syncControls() {
    const state = {
      folder, layout, sort, canBack:position > 0, canForward:position + 1 < trail.length,
      hasSelection:Boolean(selection), canPreview:Boolean(selection),
      url:permalink(selection), name:selection?.dataset.name || ""
    };
    if (navigatorButtons.back) navigatorButtons.back.disabled = !state.canBack;
    if (navigatorButtons.forward) navigatorButtons.forward.disabled = !state.canForward;
    for (const button of layoutButtons) button.setAttribute("aria-pressed",String(button.dataset.layout === layout));
    for (const button of sortButtons) button.setAttribute("aria-pressed",String(button.dataset.sort === sort));
    view.finderState = state;
    win.querySelector("[data-view-symbol] use")?.setAttribute("href", "#symbol-" + layout);
    win.dispatchEvent(new CustomEvent("desk:state", {bubbles:true, detail:state}));
  }

  function refreshStatus() {
    clearTimeout(noticeTimer);
    const count = available(panels.get(folder)).length;
    status.textContent = selection ? count + "개 중 1개 선택됨" : count + "개의 항목";
  }
  function notify(message) {
    clearTimeout(noticeTimer);
    status.textContent = message;
    noticeTimer = window.setTimeout(refreshStatus,2600);
  }
  function sidebar(open) {
    open = Boolean(open && phone.matches);
    win.classList.toggle("sidebar-open",open);
    railToggle?.setAttribute("aria-expanded",String(open));
  }
  function makeArt(entry) {
    if (entry) return entry.querySelector(".entry-art").cloneNode(true);
    const art = document.createElement("span");
    art.className = "entry-art";
    const img = document.createElement("img");
    img.src = "/assets/media/mac/folder.png";
    img.alt = "";
    art.append(img);
    return art;
  }
  function describe(entry) {
    const data = entry?.dataset || {};
    const targetId = entry ? data.folder : folder;
    const targetFolder = panels.get(targetId);
    const original = entry && !data.folder ? panels.get(new URL(entry.href).pathname.split("/")[1]) : null;
    const home = !entry && folder === "home";
    const parent = original?.dataset.title || (folder === "recent" ? "" : panels.get(folder).dataset.title);
    const at = home || !parent || parent === "RatelXD" || targetId === folder ? "RatelXD" : "RatelXD / " + parent;
    return {
      name:data.name || panels.get(folder).dataset.title,
      kind:data.kind || "폴더", targetFolder, at,
      count:targetFolder ? available(targetFolder).length : null,
      date:data.dateLabel || "", topic:data.topic || "",
      summary:data.summary || panels.get(folder).dataset.description || ""
    };
  }
  function writeDetails(dl, details, full) {
    const rows = [["위치",details.at],["항목",details.count === null ? "" : details.count+"개"],
      ["날짜",details.date],["주제",details.topic],["설명",details.summary]];
    dl.replaceChildren();
    for (const [label,value] of rows) {
      if (!value || (!full && label === "설명" && details.targetFolder)) continue;
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      term.textContent = label;
      definition.textContent = value;
      row.append(term,definition);
      dl.append(row);
    }
  }
  function renderPreview() {
    if (layout !== "columns" && layout !== "gallery") return;
    const details = describe(selection);
    area.querySelector("[data-inspect-title]").textContent = details.name;
    area.querySelector("[data-inspect-kind]").textContent = details.kind;
    area.querySelector("[data-inspect-art]").replaceChildren(makeArt(selection));
    writeDetails(area.querySelector("[data-inspect-details]"),details,false);
    area.querySelector("[data-inspect-open]").hidden = !selection;
    const children = area.querySelector("[data-child-files]");
    children.replaceChildren();
    children.parentElement.classList.toggle("child-column",Boolean(layout === "columns" && selection?.dataset.folder));
    if (layout === "columns" && selection?.dataset.folder && details.targetFolder) {
      for (const child of available(details.targetFolder)) {
        const link = document.createElement("a");
        link.href = child.href;
        link.dataset.columnChild = selection.dataset.folder;
        const name = document.createElement("span");
        name.textContent = child.dataset.name;
        link.append(makeArt(child),name);
        children.append(link);
      }
    }
    if (layout !== "gallery") return;
    const stage = area.querySelector("[data-gallery-stage]");
    let art = makeArt(selection);
    if (selection?.dataset.picture) {
      art = document.createElement("img");
      art.className = "gallery-photo";
      art.src = selection.dataset.picture;
      art.alt = "";
    }
    stage.replaceChildren(art);
    stage.dataset.caption = details.name;
  }

  function select(entry, focus=false) {
    if (entry !== selection) {
      selection?.classList.remove("selected");
      selection?.removeAttribute("aria-current");
      selection = entry;
      selection?.classList.add("selected");
      selection?.setAttribute("aria-current","true");
    }
    if (focus && entry) {
      entry.focus({preventScroll:true});
      entry.scrollIntoView({block:"nearest",inline:"nearest"});
    }
    refreshStatus();
    renderPreview();
    syncControls();
  }
  function orderFiles() {
    if (!sort) return;
    for (const panel of panels.values()) {
      const list = panel.querySelector(".entry-list");
      const rows = [...list.children];
      rows.sort((a,b) => {
        const x = a.firstElementChild.dataset;
        const y = b.firstElementChild.dataset;
        if (sort === "date" && x.date !== y.date) return y.date.localeCompare(x.date);
        return collator.compare(x.name,y.name);
      });
      list.append(...rows);
    }
  }
  function setLayout(value, remember=true) {
    if (!layoutChoices.includes(value)) return;
    layout = value;
    area.dataset.view = layout;
    if (layout === "gallery" && !selection) select(available(panels.get(folder))[0] || null);
    else { renderPreview(); syncControls(); }
    if (remember) saveView();
  }
  function setSort(value) {
    if (!["name","date"].includes(value)) return;
    sort = value;
    orderFiles();
    saveView();
    renderPreview();
    syncControls();
  }
  function display(id, focus=false) {
    context.hidePopover?.();
    folder = known(id);
    const active = panels.get(folder);
    for (const panel of panels.values()) panel.hidden = panel !== active;
    for (const link of win.querySelectorAll("a[data-folder]:not([data-entry])")) {
      if (link.dataset.folder === folder) link.setAttribute("aria-current","location");
      else link.removeAttribute("aria-current");
    }
    win.querySelector("[data-window-title]").textContent = active.dataset.title;
    const path = win.querySelector("[data-status-path]");
    path.textContent = folder === "home" ? "" : "›  " + active.dataset.title;
    active.scrollTop = 0;
    active.scrollLeft = 0;
    sidebar(false);
    select(layout === "gallery" ? available(active)[0] || null : null);
    if (focus) active.querySelector("h1").focus({preventScroll:true});
  }
  function addToTrail(id) {
    trail = trail.slice(0, position + 1);
    trail.push(id);
    position++;
  }
  function showFolder(id, focus = true) {
    const url = new URL(view.url);
    url.hash = "";
    if (id === "home") url.searchParams.delete("folder");
    else url.searchParams.set("folder", id);
    persistTrail();
    view.setUrl(url, "push");
    display(id, focus);
  }
  function visit(id) {
    if (!panels.has(id) || id === folder) return;
    addToTrail(id);
    showFolder(id);
  }
  function step(direction) {
    const next = position + direction;
    if (next < 0 || next >= trail.length) return;
    position = next;
    showFolder(trail[position]);
  }
  function openEntry(entry) {
    if (!entry) return;
    if (entry.dataset.folder) visit(entry.dataset.folder);
    else openWindow(new URL(entry.getAttribute("href"), view.url));
  }
  function showInfo(opener) {
    if (!info.showModal || document.querySelector("dialog[open]")) return;
    const details = describe(selection);
    area.querySelector("#info-title").textContent = details.name + " 정보";
    area.querySelector("[data-info-name]").textContent = details.name;
    area.querySelector("[data-info-kind]").textContent = details.kind;
    area.querySelector("[data-info-art]").replaceChildren(makeArt(selection));
    writeDetails(area.querySelector("[data-info-details]"),details,true);
    infoOpener = opener || selection || document.activeElement;
    info.showModal();
    info.querySelector("[data-info-close]").focus();
  }
  function quickLook() {
    if (!selection) return;
    if (selection.dataset.folder) showInfo(selection);
    else document.dispatchEvent(new CustomEvent("desk:preview",{detail:{url:selection.href,opener:selection}}));
  }
  async function copyLink() {
    if (!selection) return;
    const url = new URL(permalink(selection),location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      notify("링크를 복사했습니다.");
    } catch {
      showInfo(selection);
      const dl = area.querySelector("[data-info-details]");
      const input = document.createElement("input");
      input.type = "url"; input.readOnly = true; input.value = url;
      input.setAttribute("aria-label","복사할 주소");
      dl.after(input);
      input.focus(); input.select();
      info.addEventListener("close",()=>input.remove(),{once:true});
    }
  }
  function operate(action, opener) {
    if (action.startsWith("view-")) { setLayout(action.slice(5)); return; }
    if (action.startsWith("sort-")) { setSort(action.slice(5)); return; }
    if (action === "back") step(-1);
    if (action === "forward") step(1);
    if (action === "parent" && folder !== "home") visit("home");
    if (action === "open") openEntry(selection);
    if (action === "preview") quickLook();
    if (action === "info") showInfo(opener);
    if (action === "copy") copyLink();
  }

  function showContext(entry,x,y,keyboard=false) {
    if (!context.showPopover) return;
    select(entry);
    context.showPopover();
    const rect = context.getBoundingClientRect();
    context.style.left = Math.max(4,Math.min(x,innerWidth-rect.width-5)) + "px";
    context.style.top = Math.max(4,Math.min(y,innerHeight-rect.height-5)) + "px";
    if (keyboard) context.querySelector("button").focus();
  }
  area.addEventListener("contextmenu",event=>{
    const entry = event.target.closest("a[data-entry]");
    if (!entry || !context.showPopover) return;
    event.preventDefault();
    const rect = entry.getBoundingClientRect();
    showContext(entry,event.clientX || rect.left + 8,event.clientY || rect.top + 8);
  });
  context.addEventListener("click",event=>{
    const button = event.target.closest("[data-item-action]");
    if (!button) return;
    context.hidePopover();
    selection?.focus({preventScroll:true});
    operate(button.dataset.itemAction,selection);
  });
  document.addEventListener("pointerdown",event=>{
    if (context.hidePopover && context.matches(":popover-open") && !context.contains(event.target)) context.hidePopover();
  }, {signal:lifetime.signal});
  area.querySelector("[data-gallery-stage]").addEventListener("dblclick",()=>openEntry(selection));
  area.addEventListener("pointerdown",event => { pointer = {type:event.pointerType,id:event.target.closest("[data-entry]")}; });
  area.addEventListener("focusin",event => {
    const entry = event.target.closest("[data-entry]");
    if (entry && entry !== selection) select(entry);
  });
  win.addEventListener("click",event => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const source = event.target;
    if (win.classList.contains("sidebar-open") && !source.closest(".locations,[data-sidebar-toggle]")) sidebar(false);
    const child = source.closest("a[data-column-child]");
    if (child && event.detail === 1 && !["touch","pen"].includes(event.pointerType) && !matchMedia("(pointer: coarse)").matches) {
      event.preventDefault();
      const destination = child.href;
      visit(child.dataset.columnChild);
      select(available(panels.get(folder)).find(item => item.href === destination) || null,true);
      return;
    }
    const file = source.closest("a[data-entry]");
    if (file) {
      const touch = event.pointerType === "touch" || event.pointerType === "pen" ||
        (pointer?.id === file && ["touch","pen"].includes(pointer.type)) || matchMedia("(hover: none) and (pointer: coarse)").matches;
      select(file);
      if (!touch && event.detail === 1) { event.preventDefault(); return; }
      if (file.dataset.folder) { event.preventDefault(); visit(file.dataset.folder); }
      return;
    }
    const place = source.closest("a[data-folder]");
    if (place && panels.has(place.dataset.folder)) { event.preventDefault(); visit(place.dataset.folder); return; }
    const toolbar = source.closest("button[data-back],button[data-forward],button[data-parent],button[data-up],button[data-finder-info],button[data-inspect-open]");
    if (toolbar) {
      if (toolbar.hasAttribute("data-back")) operate("back");
      else if (toolbar.hasAttribute("data-forward")) operate("forward");
      else if (toolbar.hasAttribute("data-finder-info")) operate("info",toolbar);
      else if (toolbar.hasAttribute("data-inspect-open")) operate("open");
      else operate("parent");
      return;
    }
    if (source.closest(".file-panel") && !source.closest("a,button") && layout !== "gallery") select(null);
  });
  for (const button of layoutButtons) button.addEventListener("click",()=>setLayout(button.dataset.layout));
  for (const button of sortButtons) button.addEventListener("click",()=>setSort(button.dataset.sort));
  railToggle?.addEventListener("click",()=>sidebar(!win.classList.contains("sidebar-open")));
  phone.addEventListener("change",()=>sidebar(false), {signal:lifetime.signal});
  info.querySelector("[data-info-close]").addEventListener("click",()=>info.close());
  info.addEventListener("close",()=>{ if (infoOpener?.isConnected && infoOpener.getClientRects().length) infoOpener.focus({preventScroll:true}); });

  win.addEventListener("desk:action",event=>{ if (typeof event.detail?.action === "string") operate(event.detail.action,event.detail.opener); });
  win.addEventListener("desk:route", event => {
    const next = fromAddress();
    const saved = event.detail?.state?.ratelFinder;
    if (saved?.key === historyKey && trail[saved.position] === next) position = saved.position;
    else if (next !== folder) addToTrail(next);
    persistTrail();
    if (next !== folder) display(next);
    else syncControls();
  });
  win.addEventListener("keydown",event=>{
    if (event.defaultPrevented || event.isComposing || win.hidden || document.querySelector("dialog[open]") || event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    if (context.hidePopover && context.matches(":popover-open")) {
      if (["Escape","Tab"].includes(event.key)) {
        event.preventDefault(); context.hidePopover(); selection?.focus({preventScroll:true});
      } else if (["ArrowDown","ArrowUp","Home","End"].includes(event.key)) {
        event.preventDefault();
        const buttons = [...context.querySelectorAll("button:not([hidden])")];
        const at = buttons.indexOf(document.activeElement);
        const next = {ArrowDown:at+1,ArrowUp:at-1,Home:0,End:buttons.length-1}[event.key];
        buttons[(next + buttons.length) % buttons.length].focus();
      }
      return;
    }
    if (event.key === "F10" && event.shiftKey && selection && context.showPopover) {
      event.preventDefault();
      const rect = selection.getBoundingClientRect();
      showContext(selection,rect.left+8,rect.top+8,true); return;
    }
    if (event.key === "Escape" && win.classList.contains("sidebar-open")) {
      event.preventDefault(); sidebar(false); railToggle?.focus(); return;
    }
    if (!win.contains(event.target) || event.altKey || event.shiftKey) return;
    const key = event.key;
    const command = event.metaKey || event.ctrlKey;
    if (command) {
      const action = {o:"open",i:"info",c:"copy",ArrowUp:"parent",ArrowDown:"open","[":"back","]":"forward"}[key.length === 1 ? key.toLowerCase() : key];
      if (action && (selection || ["back","forward","info","parent"].includes(action))) { event.preventDefault(); operate(action); }
      else if (/^[1-4]$/.test(key)) { event.preventDefault(); setLayout(layoutChoices[Number(key)-1]); }
      return;
    }
    if (!area.contains(event.target)) return;
    const entry = event.target.closest("a[data-entry]");
    if (key === " " && entry) { event.preventDefault(); if (!event.repeat) { select(entry); quickLook(); } return; }
    if (key === "Enter" && entry) { event.preventDefault(); openEntry(entry); return; }
    if (event.target.closest("a,button") && !entry) return;
    const current = available(panels.get(folder));
    if (!current.length || !["Home","End","ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(key)) return;
    event.preventDefault();
    if (layout === "columns" && key === "ArrowRight" && entry?.dataset.folder) { visit(entry.dataset.folder); select(available(panels.get(folder))[0] || null,true); return; }
    if (layout === "columns" && key === "ArrowLeft" && folder !== "home") { visit("home"); return; }
    const index = current.indexOf(entry || selection);
    const firstTop = current[0].offsetTop;
    const columns = layout === "grid" ? current.filter(file=>file.offsetTop === firstTop).length || 1 : 1;
    const next = {Home:0,End:current.length-1,ArrowRight:index+1,ArrowLeft:index-1,ArrowDown:index<0?0:index+columns,ArrowUp:index-columns}[key];
    select(current[Math.max(0,Math.min(next,current.length-1))],true);
  });
  orderFiles();
  area.dataset.view = layout;
  persistTrail();
  display(folder);
}
