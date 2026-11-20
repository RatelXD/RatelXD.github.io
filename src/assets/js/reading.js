function setUpNoteSearch(form, view) {
  const archive = form.closest("[data-archive]");
  const query = form.elements.namedItem("q");
  const topic = form.elements.namedItem("topic");
  const total = archive.querySelector("[data-total]");
  const empty = archive.querySelector("[data-no-results]");
  const normalize = text => text.normalize("NFKC").toLocaleLowerCase("ko");
  const records = [...archive.querySelectorAll("[data-record]")].map(row => ({
    row,
    text: normalize(row.querySelector(".record-main").textContent),
    topic: row.dataset.topic
  }));

  function filterRecords() {
    const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    const selected = topic?.value || "";
    let count = 0;
    for (const record of records) {
      const matches = (!selected || record.topic === selected) && words.every(word => record.text.includes(word));
      record.row.hidden = !matches;
      if (matches) count++;
    }
    total.textContent = `${words.length || selected ? "검색 결과" : "전체"} ${count}편`;
    empty.hidden = count > 0;
  }

  function readLocation() {
    const values = view.url.searchParams;
    query.value = values.get("q") || "";
    if (topic) {
      const selected = values.get("topic");
      topic.value = [...topic.options].some(option => option.value === selected) ? selected : "";
    }
    filterRecords();
  }

  function applySearch() {
    filterRecords();
    const url = new URL(view.url);
    for (const field of [query, topic].filter(Boolean)) {
      const value = field.value.trim();
      if (value) url.searchParams.set(field.name, value);
      else url.searchParams.delete(field.name);
    }
    if (url.href !== view.url.href) view.setUrl(url, "replace");
  }

  form.hidden = false;
  readLocation();
  form.addEventListener("submit", event => {
    event.preventDefault();
    applySearch();
  });
  query.addEventListener("input", applySearch);
  topic?.addEventListener("change", applySearch);
  archive.querySelector("[data-reset-search]").addEventListener("click", () => {
    form.reset();
    applySearch();
    query.focus();
  });
  view.win.addEventListener("desk:route", readLocation);
}

function setupReader(view) {
  const win = view.win;
  for (const form of win.querySelectorAll("[data-note-search]")) setUpNoteSearch(form, view);

  const contents = win.querySelector(".story-contents");
  if (contents) {
    const documentPage = contents.closest(".story-page");
    const pane = contents.closest(".reader-scroll");
    let previousLayout;
    const setContentsSize = () => {
      const layout = getComputedStyle(documentPage).display;
      if (layout !== previousLayout) {
        contents.open = layout === "grid";
        previousLayout = layout;
      }
    };
    setContentsSize();
    if (pane && "ResizeObserver" in window) {
      const observer = new ResizeObserver(setContentsSize);
      observer.observe(pane);
      win.addEventListener("desk:close", () => observer.disconnect(), {once:true});
    }
  }

  const imageDialog = win.querySelector("[data-image-dialog]");
  const canPreview = typeof imageDialog?.showModal === "function";
  if (canPreview) {
    const closeButton = imageDialog.querySelector("[data-close-image]");
    closeButton.addEventListener("click", () => imageDialog.close());
    imageDialog.addEventListener("click", event => {
      if (event.target !== imageDialog) return;
      const bounds = imageDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) imageDialog.close();
    });
  }

  for (const image of win.querySelectorAll(".prose img")) {
    if (image.closest("a")) continue;
    const visual = image.closest("picture") || image;
    const container = visual.parentElement;
    const standalone = container.matches("figure") ||
      (container.matches("p") && container.childElementCount === 1 && !container.textContent.trim());
    if (!standalone) continue;

    const original = document.createElement("a");
    original.className = "image-original";
    original.href = image.dataset.full || image.src;
    const action = canPreview ? "확대 보기" : "원본 보기";
    original.setAttribute("aria-label", `${image.alt || "이미지"} ${action}`);
    const label = document.createElement("span");
    label.textContent = action;
    visual.replaceWith(original);
    original.append(visual, label);
    if (canPreview) {
      original.setAttribute("aria-haspopup", "dialog");
      original.addEventListener("click", event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const view = new Image();
        view.alt = image.alt;
        view.src = original.href;
        imageDialog.querySelector("[data-image-stage]").replaceChildren(view);
        const caption = image.closest("figure")?.querySelector("figcaption");
        imageDialog.querySelector("[data-image-caption]").textContent = caption?.textContent.trim() || image.alt;
        imageDialog.querySelector("[data-image-source]").href = original.href;
        imageDialog.showModal();
      });
    }
  }
}
