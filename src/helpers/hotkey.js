class ScreenKeys {
  constructor() {
    this.store = new Map();
  }
  limit(check) {
    this._scope = check;
  }
  isActive() {
    return !this._scope || this._scope();
  }
  add(key, handler) {
    this.store.set(key.toLowerCase().replace(/[ ]/g, ''), handler);
  }
}

const chain = [];
export const hotkeys = {
  subscribe: (v) => {
    init_once();

    const t = new ScreenKeys();
    chain.push(t);
    v(t);

    return () => {
      const ind = chain.findIndex((a) => a === t);
      if (ind >= 0) chain.splice(ind, 1);
    };
  },
};

var ready = false;
function init_once() {
  if (ready) return;
  ready = true;

  document.addEventListener('keydown', (ev) => {
    const isEditableTarget = (target) => {
      if (!target) return false;
      /** @type {Element|null} */
      const el = target instanceof Element ? target : null;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      // contenteditable or "textbox" patterns used by some UI libs
      if (/** @type {any} */ (el).isContentEditable) return true;
      const closest = el.closest?.(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]'
      );
      return !!closest;
    };

    // Never hijack keyboard shortcuts while typing/editing text.
    // This includes Cmd/Ctrl+A (select all), arrows with shift, etc.
    if (isEditableTarget(ev.target)) return;

    if (
      chain.length &&
      (ev.ctrlKey ||
        ev.altKey ||
        ev.metaKey ||
        ev.shiftKey ||
        ev.key.length > 1 ||
        ev.key === ' ')
    ) {
      const code = [];
      if (ev.ctrlKey) code.push('ctrl');
      if (ev.altKey) code.push('alt');
      if (ev.metaKey) code.push('meta');
      if (ev.shiftKey) code.push('shift');
      let evKey = ev.key.toLocaleLowerCase();
      if (ev.key === ' ') {
        evKey = 'space';
      }
      code.push(evKey);

      const key = code.join('+');
      for (let i = chain.length - 1; i >= 0; i--) {
        const t = chain[i];
        // Only fall back to plain key bindings when there are NO modifiers.
        // Otherwise a binding like "a" could incorrectly hijack Cmd/Ctrl+A.
        const h =
          t.store.get(key) ||
          (!ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.shiftKey ? t.store.get(evKey) : null);
        if (h) {
          if (t.isActive()) {
            h(ev);
            ev.preventDefault();
            return;
          }
        }
      }
    }
  });
}
