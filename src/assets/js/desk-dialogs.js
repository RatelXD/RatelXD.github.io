(() => {
  const search = document.getElementById("desk-search");
  const look = document.getElementById("desk-look");
  if (!search || !look || typeof search.showModal !== "function") return;

  const input = search.querySelector("#desk-query-input");
  const list = search.querySelector("#desk-result-list");
  const counter = search.querySelector("[data-result-count]");
  const empty = search.querySelector("[data-empty-search]");
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase("ko");
  const files = [...list.querySelectorAll("[data-desk-result]")].map((link, index) => {
    link.id = `desk-result-${index + 1}`;
    const title = link.querySelector(".desk-result-name").textContent;
    const { category, topic, summary } = link.dataset;
    return { link, title, terms: normalize([title, category, topic, summary].join(" ")) };
  });
  const openers = new Map();
  let matches = [];
  let selected = null;

  function select(file, scroll = false) {
    if (selected) selected.link.setAttribute("aria-selected", "false");
    selected = file;
    if (!selected) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    selected.link.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", selected.link.id);
    if (scroll) selected.link.scrollIntoView({ block: "nearest" });
  }

  function filter() {
    const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    matches = files.filter(file => {
      const include = words.every(word => file.terms.includes(word));
      file.link.hidden = !include;
      return include;
    });
    select(matches[0] || null);
    list.scrollTop = 0;
    counter.textContent = `${words.length ? "검색 결과" : "전체 항목"} ${matches.length}개`;
    empty.hidden = matches.length > 0;
  }

  function present(dialog, opener, initialFocus) {
    if (document.querySelector("dialog[open]")) return;
    openers.set(dialog, opener);
    dialog.showModal();
    initialFocus.focus({ preventScroll: true });
  }

  function openSearch(opener) {
    if (search.open) {
      input.focus();
      input.select();
      return;
    }
    input.value = "";
    filter();
    present(search, opener, input);
  }

  function textField(element, value) {
    element.textContent = value;
    element.hidden = !value;
  }

  function openPreview(url, opener) {
    const address = new URL(url, location.href);
    const file = files.find(({ link }) => link.origin === address.origin && link.pathname === address.pathname);
    if (!file || document.querySelector("dialog[open]")) return false;
    const data = file.link.dataset;
    const heading = look.querySelector("#desk-look-title");
    heading.textContent = file.title;
    textField(look.querySelector("[data-look-location]"), [data.category, data.topic].filter(Boolean).join(" / "));
    textField(look.querySelector("[data-look-date]"), [data.dateLabel, data.date].filter(Boolean).join(" "));
    textField(look.querySelector("[data-look-summary]"), data.summary);
    textField(look.querySelector("[data-look-excerpt]"), data.excerpt === data.summary ? "" : data.excerpt);
    const image = look.querySelector("[data-look-image]");
    image.hidden = !data.image;
    if (data.image) {
      image.src = data.image;
      image.alt = data.alt;
    } else {
      image.removeAttribute("src");
      image.alt = "";
    }
    look.querySelector("[data-open-original]").href = file.link.href;
    look.querySelector(".desk-look-body").scrollTop = 0;
    present(look, opener, heading);
    return true;
  }

  for (const dialog of [search, look]) {
    dialog.querySelector("[data-desk-dismiss]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
        dialog.close();
      }
    });
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      if (dialog === search) {
        const url = new URL(location.href);
        if (url.searchParams.get("search") === "1") {
          url.searchParams.delete("search");
          history.replaceState(history.state, "", url);
        }
      }
      const opener = openers.get(dialog);
      openers.delete(dialog);
      if (opener?.isConnected && !document.querySelector("dialog[open]")) opener.focus({ preventScroll: true });
    });
  }

  input.addEventListener("input", filter);
  input.addEventListener("keydown", event => {
    if (event.isComposing || event.keyCode === 229 || !matches.length) return;
    if (event.key === "Enter") {
      event.preventDefault();
      selected.link.click();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
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
  search.querySelector("[data-reset-query]").addEventListener("click", () => {
    input.value = "";
    filter();
    input.focus();
  });

  document.addEventListener("click", event => {
    const searchButton = event.target.closest("button[data-spotlight]");
    if (searchButton) openSearch(searchButton);
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
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
      if (active && active !== search) return;
      event.preventDefault();
      if (!event.repeat) openSearch(document.activeElement);
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
