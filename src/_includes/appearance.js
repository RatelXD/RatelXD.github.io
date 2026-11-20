(() => {
  const key = "ratelxd.appearance";
  const sheet = document.getElementById("dark-appearance");
  const chromeColor = document.getElementById("dark-chrome");
  const system = sheet.media;
  let mode;
  let picker;

  function readPreference() {
    try { return localStorage.getItem(key); } catch { return mode; }
  }

  function apply(value) {
    mode = value === "light" || value === "dark" ? value : "system";
    const media = mode === "system" ? system : (mode === "dark" ? "all" : "not all");
    sheet.media = media;
    chromeColor.media = media;
    if (picker) picker.querySelector('input[value="' + mode + '"]').checked = true;
  }

  // Set the saved palette before the first window is painted.
  apply(readPreference());
  document.addEventListener("DOMContentLoaded", () => {
    picker = document.querySelector("[data-appearance-switch]");
    apply(mode);
    picker.addEventListener("change", event => {
      apply(event.target.value);
      try {
        if (mode === "system") localStorage.removeItem(key);
        else localStorage.setItem(key, mode);
      } catch { /* The choice still applies in this tab. */ }
    });
    picker.hidden = false;
  });
  window.addEventListener("storage", event => {
    if (event.key === key || event.key === null) apply(readPreference());
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) apply(readPreference());
  });
})();
