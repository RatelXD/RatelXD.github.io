function setUpNoteSearch(form) {
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
    const values = new URLSearchParams(location.search);
    query.value = values.get("q") || "";
    if (topic) {
      const selected = values.get("topic");
      topic.value = [...topic.options].some(option => option.value === selected) ? selected : "";
    }
    filterRecords();
  }

  function applySearch() {
    filterRecords();
    const url = new URL(location.href);
    for (const field of [query, topic].filter(Boolean)) {
      const value = field.value.trim();
      if (value) url.searchParams.set(field.name, value);
      else url.searchParams.delete(field.name);
    }
    if (url.href !== location.href) history.replaceState(history.state, "", url);
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
  window.addEventListener("popstate", readLocation);
}

document.querySelectorAll("[data-note-search]").forEach(setUpNoteSearch);

const contents = document.querySelector(".story-contents");
if (contents) {
  const compact = window.matchMedia("(max-width: 55rem)");
  const setContentsSize = () => { contents.open = !compact.matches; };
  setContentsSize();
  compact.addEventListener("change", setContentsSize);
}

for (const image of document.querySelectorAll(".prose img")) {
  if (image.closest("a")) continue;
  const visual = image.closest("picture") || image;
  const container = visual.parentElement;
  const standalone = container.matches("figure") ||
    (container.matches("p") && container.childElementCount === 1 && !container.textContent.trim());
  if (!standalone) continue;

  const original = document.createElement("a");
  original.className = "image-original";
  original.href = image.dataset.full || image.src;
  original.setAttribute("aria-label", `${image.alt || "이미지"} 원본 보기`);
  const label = document.createElement("span");
  label.textContent = "원본 보기";
  visual.replaceWith(original);
  original.append(visual, label);
}
