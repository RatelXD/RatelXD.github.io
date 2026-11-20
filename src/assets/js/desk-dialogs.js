(() => {
  const search = document.getElementById("desk-search");
  const look = document.getElementById("desk-look");
  if (!search || !look || typeof search.showModal !== "function") return;

  const input = search.querySelector("#desk-query-input");
  const list = search.querySelector("#desk-result-list");
  const pane = search.querySelector("[data-search-pane]");
  const browse = search.querySelector("[data-search-all]");
  const counter = search.querySelector("[data-result-count]");
  const layout = search.querySelector("[data-result-layout]");
  const empty = search.querySelector("[data-empty-search]");
  const miniature = search.querySelector("[data-hit-image]");
  const heading = look.querySelector("#desk-look-title");
  const zoom = look.querySelector("[data-look-zoom]");
  const openers = new Map();
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase("ko");
  const files = [...list.querySelectorAll("[data-desk-result]")].map((link, index) => {
    link.id = "desk-result-" + (index + 1);
    const title = link.querySelector(".desk-result-name").textContent;
    const { category, topic, summary, excerpt } = link.dataset;
    const fileIcon = link.querySelector(".desk-result-icon").getAttribute("src");
    return { link, title, fileIcon, terms: normalize([title, category, topic, summary, excerpt].join(" ")) };
  });
  let matches = [];
  let selected = null;

  function showText(element, value) {
    element.textContent = value || "";
    element.hidden = !value;
  }

  function showImage(element, src, alt = "") {
    element.alt = alt;
    element.hidden = !src;
    if (!src) element.removeAttribute("src");
    else if (src !== element.getAttribute("src")) element.src = src;
  }

  function select(file, scroll = false) {
    if (selected) selected.link.setAttribute("aria-selected", "false");
    selected = file;
    if (!selected) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    const { link, title, fileIcon } = selected;
    link.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", link.id);
    showImage(miniature, link.dataset.image || fileIcon, link.dataset.alt || "");
    miniature.classList.toggle("is-thumbnail", Boolean(link.dataset.image));
    showText(search.querySelector("[data-hit-title]"), title);
    showText(search.querySelector("[data-hit-type]"), [link.dataset.category, link.dataset.topic].filter(Boolean).join(" / "));
    showText(search.querySelector("[data-hit-summary]"), link.dataset.summary);
    if (scroll) link.scrollIntoView({ block: "nearest" });
  }

  function filter(expand = true) {
    const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    matches = files.filter(file => {
      const include = words.every(word => file.terms.includes(word));
      file.link.hidden = !include;
      return include;
    });
    pane.hidden = !expand;
    browse.hidden = words.length > 0;
    browse.setAttribute("aria-expanded", String(expand));
    browse.setAttribute("aria-label", expand ? "목록 접기" : "전체 항목 보기");
    browse.title = browse.getAttribute("aria-label");
    input.setAttribute("aria-expanded", String(expand && matches.length > 0));
    layout.hidden = matches.length === 0;
    empty.hidden = matches.length > 0;
    counter.textContent = (words.length ? "검색 결과 " : "전체 항목 ") + matches.length + "개";
    select(expand ? matches[0] || null : null);
    list.scrollTop = 0;
  }

  function present(dialog, opener, initialFocus) {
    if (document.querySelector("dialog[open]")) return false;
    openers.set(dialog, opener instanceof HTMLElement ? opener : document.activeElement);
    dialog.returnValue = "";
    dialog.showModal();
    initialFocus.focus({ preventScroll: true });
    return true;
  }

  function openSearch(opener) {
    if (search.open) {
      input.focus();
      input.select();
      return;
    }
    if (document.querySelector("dialog[open]")) return;
    input.value = "";
    filter(false);
    present(search, opener, input);
    measureViewport();
  }

  function setZoom(expanded) {
    look.classList.toggle("is-expanded", expanded);
    zoom.setAttribute("aria-pressed", String(expanded));
    zoom.setAttribute("aria-label", expanded ? "훑어보기 원래 크기로" : "훑어보기 확대");
    zoom.title = expanded ? "원래 크기로" : "확대";
  }

  function openPreview(url, opener) {
    if (!url || document.querySelector("dialog[open]")) return false;
    const address = new URL(url, location.href);
    const file = files.find(({ link }) => link.origin === address.origin && link.pathname === address.pathname);
    if (!file) return false;
    const data = file.link.dataset;
    const app = data.family === "lab" || data.family === "about";
    heading.textContent = file.title;
    showText(look.querySelector("[data-look-heading]"), file.title);
    showText(look.querySelector("[data-look-location]"), [data.category, data.topic].filter(Boolean).join(" / "));
    showText(look.querySelector("[data-look-date]"), [data.dateLabel, data.date].filter(Boolean).join(" "));
    showText(look.querySelector("[data-look-summary]"), data.summary);
    showText(look.querySelector("[data-look-excerpt]"), data.excerpt === data.summary ? "" : data.excerpt);
    showImage(look.querySelector("[data-look-image]"), data.image, data.alt || "");
    showImage(look.querySelector("[data-look-icon]"), file.fileIcon);
    showImage(look.querySelector("[data-look-app]"), app ? file.fileIcon : "");
    const original = look.querySelector("[data-open-original]");
    original.href = file.link.href;
    original.textContent = data.family === "lab" ? "실습실 열기" : (data.family === "about" ? "프로필 열기" : "문서 열기");
    setZoom(false);
    look.querySelector(".desk-look-body").scrollTop = 0;
    return present(look, opener, heading);
  }

  function measureViewport() {
    if (!search.open || !window.visualViewport) return;
    search.style.setProperty("--desk-visible-height", Math.round(visualViewport.height) + "px");
    search.style.setProperty("--desk-visible-top", Math.round(visualViewport.offsetTop) + "px");
  }
  window.visualViewport?.addEventListener("resize", measureViewport);
  window.visualViewport?.addEventListener("scroll", measureViewport);
  zoom.addEventListener("click", () => setZoom(!look.classList.contains("is-expanded")));

  for (const dialog of [search, look]) {
    dialog.querySelector("[data-desk-dismiss]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      if (dialog === search) document.dispatchEvent(new Event("desk:search-close"));
      const opener = openers.get(dialog);
      openers.delete(dialog);
      if (dialog.returnValue === "open-window" || document.querySelector("dialog[open]")) return;
      if (opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
      else {
        const summary = opener?.closest("details")?.querySelector("summary");
        const fallback = summary?.getClientRects().length ? summary
          : [...document.querySelectorAll("a[data-file],button[data-spotlight]")].find(el => el.getClientRects().length);
        fallback?.focus({ preventScroll: true });
      }
    });
  }

  input.addEventListener("input", () => filter(Boolean(input.value.trim())));
  input.addEventListener("keydown", event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter" && selected) {
      event.preventDefault();
      selected.link.click();
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (pane.hidden) {
      filter(true);
      if (event.key === "ArrowUp" && matches.length) select(matches.at(-1), true);
    } else if (matches.length) {
      const next = matches.indexOf(selected) + (event.key === "ArrowDown" ? 1 : -1);
      select(matches[(next + matches.length) % matches.length], true);
    }
  });
  list.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse") return;
    const link = event.target.closest("[data-desk-result]");
    const file = matches.find(item => item.link === link);
    if (file && selected !== file) select(file);
  });
  browse.addEventListener("click", () => {
    filter(pane.hidden);
    input.focus({ preventScroll: true });
  });
  search.querySelector("[data-reset-query]").addEventListener("click", () => {
    input.value = "";
    filter(true);
    input.focus();
  });

  document.addEventListener("desk:preview", event => openPreview(event.detail?.url, event.detail?.opener));
  document.addEventListener("desk:spotlight", event => openSearch(event.detail?.opener));
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const launcher = event.target.closest("button[data-spotlight]");
    if (launcher) openSearch(launcher);
    const previewButton = event.target.closest("button[data-preview-url]");
    if (previewButton) openPreview(previewButton.dataset.previewUrl, previewButton);
  });
  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    const active = document.querySelector("dialog[open]");
    if (event.key === "Escape" && (active === look || active === search)) {
      event.preventDefault();
      active.close();
      return;
    }
    const commandSpace = event.metaKey && event.code === "Space" && !event.ctrlKey;
    const searchKey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    if ((commandSpace || searchKey) && !event.altKey && !event.shiftKey) {
      if (active && active !== search) return;
      event.preventDefault();
      if (event.repeat) return;
      if (commandSpace && search.open) search.close();
      else openSearch(document.activeElement);
      return;
    }
    if (event.code !== "Space" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat) return;
    if (active) {
      if (active === look && !event.target.closest("button, input, select, textarea, [contenteditable=true]")) {
        event.preventDefault();
        look.close();
      }
      return;
    }
    const file = event.target.closest("a[data-file][href]");
    if (file && openPreview(file.href, file)) event.preventDefault();
  });

  if (new URL(location.href).searchParams.get("search") === "1") {
    const launcher = [...document.querySelectorAll("button[data-spotlight]")].find(button => button.getClientRects().length);
    openSearch(launcher || document.activeElement);
  }
})();
