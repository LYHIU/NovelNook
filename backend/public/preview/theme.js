(function () {
  'use strict';
  const key = 'reading_archive_theme_v1';
  const root = document.documentElement;
  const valid = value => value === 'glass' || value === 'flat';
  let current = 'flat';
  let syncMaterial = () => {};
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
      syncMaterial();
      return true;
    }
  };

  function setupMaterial() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const lens = document.createElement('span');
    lens.className = 'nav-lens';
    lens.setAttribute('aria-hidden', 'true');
    nav.prepend(lens);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const surfaces = 'nav,.book,.search-field,.platform-options button,.import-card,.theme-option,.settings-row>button';
    let lit = null, frame = 0, point = null;
    function clearLight() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (lit) {
        lit.removeAttribute('data-glass-lit');
        lit.style.removeProperty('--glass-x');
        lit.style.removeProperty('--glass-y');
        lit = null;
      }
    }
    function updateLens() {
      lens.hidden = current !== 'glass';
      const selected = nav.querySelector('button[aria-current="page"]');
      if (!selected) return;
      nav.style.setProperty('--lens-x', selected.offsetLeft + 'px');
      nav.style.setProperty('--lens-width', selected.offsetWidth + 'px');
    }
    function light(event) {
      if (current !== 'glass' || reducedMotion.matches || (event.type === 'pointermove' && event.pointerType === 'touch')) return;
      const surface = event.target.closest?.(surfaces);
      if (!surface) { clearLight(); return; }
      if (surface !== lit) { clearLight(); lit = surface; }
      point = {x: event.clientX, y: event.clientY};
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (!lit?.isConnected) { clearLight(); return; }
        const box = lit.getBoundingClientRect();
        lit.style.setProperty('--glass-x', Math.max(0, Math.min(100, (point.x - box.left) / box.width * 100)) + '%');
        lit.style.setProperty('--glass-y', Math.max(0, Math.min(100, (point.y - box.top) / box.height * 100)) + '%');
        lit.setAttribute('data-glass-lit', '');
      });
    }
    document.addEventListener('pointermove', light, {passive: true});
    document.addEventListener('pointerdown', light, {passive: true});
    document.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') clearLight(); }, {passive: true});
    document.addEventListener('pointercancel', clearLight, {passive: true});
    document.addEventListener('pointerout', event => { if (lit && !lit.contains(event.relatedTarget)) clearLight(); }, {passive: true});
    reducedMotion.addEventListener('change', clearLight);
    new MutationObserver(updateLens).observe(nav, {subtree: true, attributes: true, attributeFilter: ['aria-current']});
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateLens).observe(nav);
    else window.addEventListener('resize', updateLens, {passive: true});
    syncMaterial = () => { clearLight(); updateLens(); };
    updateLens();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupMaterial, {once: true});
  else setupMaterial();
})();
