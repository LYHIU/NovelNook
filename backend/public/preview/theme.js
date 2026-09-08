(function () {
  'use strict';
  const key = 'reading_archive_theme_v1';
  const root = document.documentElement;
  const valid = value => value === 'glass' || value === 'flat';
  let current = 'flat';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) current = saved;
  } catch {}
  root.dataset.theme = current;
  window.ArchiveTheme = {
    get current() { return current; },
    set(value) {
      if (!valid(value)) return false;
      try { localStorage.setItem(key, value); } catch { return false; }
      current = value;
      root.dataset.theme = value;
      return true;
    }
  };
})();
