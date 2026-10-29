/* SECONDBRAIN shared behaviour: saved reading preferences, side panels,
   light/dark quick toggle, header height, and library shelf progress. */
(function () {
  "use strict";

  var KEY = "sb-prefs";
  var root = document.documentElement;
  var store = {
    get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  var THEMES = [
    { id: "light", name: "Light", bg: "#FFFFFF", fg: "#1B1B1A", dark: false },
    { id: "dark", name: "Dark", bg: "#1C1916", fg: "#EFE7DB", dark: true },
    { id: "sepia", name: "Sepia", bg: "#FBF1DA", fg: "#1A1916", dark: false },
    { id: "navy", name: "Navy", bg: "#0C2731", fg: "#E4EDF0", dark: true },
    { id: "charcoal", name: "Charcoal", bg: "#3F4246", fg: "#F3F3F2", dark: true },
    { id: "sage", name: "Sage", bg: "#D3D4B5", fg: "#1B1D14", dark: false }
  ];
  var PAL = 'Palatino, "Palatino Linotype", "Book Antiqua", "EB Garamond", Georgia, serif';
  var FONTS = [
    { name: "Athelas", stack: 'Athelas, "Crimson Pro", Georgia, serif' },
    { name: "Atkinson Hyperlegible", stack: '"Atkinson Hyperlegible", Verdana, sans-serif', note: "Made for low vision" },
    { name: "Avenir Next", stack: '"Avenir Next", Avenir, "Nunito Sans", sans-serif' },
    { name: "Charter", stack: 'Charter, "Bitstream Charter", "Charis SIL", Georgia, serif' },
    { name: "Georgia", stack: 'Georgia, Gelasio, serif' },
    { name: "Iowan", stack: '"Iowan Old Style", "Source Serif 4", Georgia, serif' },
    { name: "Palatino", stack: PAL },
    { name: "San Francisco", stack: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, sans-serif' },
    { name: "New York", stack: '"New York", ui-serif, Newsreader, Georgia, serif' },
    { name: "Seravek", stack: 'Seravek, "Gill Sans Nova", Mulish, sans-serif' },
    { name: "Times New Roman", stack: '"Times New Roman", Times, Tinos, serif' }
  ];
  var DEFAULTS = { auto: true, font: "Palatino", size: 17, lh: 1.55, ls: 0, ws: 0, width: 900, bold: false, justify: false, contrast: false };
  var RANGES = {
    size: { min: 14, max: 26, step: 1, fmt: function (v) { return v + " px"; } },
    lh: { min: 1.2, max: 2.2, step: 0.05, fmt: function (v) { return (+v).toFixed(2); } },
    ls: { min: -5, max: 15, step: 1, fmt: function (v) { return v + "%"; } },
    ws: { min: -10, max: 50, step: 5, fmt: function (v) { return v + "%"; } },
    width: { min: 560, max: 1120, step: 20, fmt: function (v) { return v + " px"; } }
  };

  var prefs = Object.assign({}, DEFAULTS, store.get(KEY, {}));
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  var isDark = function (id) { return THEMES.some(function (t) { return t.id === id && t.dark; }); };

  function resolveTheme() {
    if (prefs.auto === false && prefs.theme) return prefs.theme;
    return mq.matches ? prefs.lastDark || "dark" : prefs.lastLight || "sepia";
  }

  // quiet: restyle only (used every frame while a slider is dragged); the full "sb:apply" follows when it settles
  function apply(quiet) {
    var theme = resolveTheme();
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-mode", isDark(theme) ? "dark" : "light");
    root.toggleAttribute("data-bold", !!prefs.bold);
    root.toggleAttribute("data-justify", !!prefs.justify);
    if (prefs.contrast) root.setAttribute("data-contrast", "high"); else root.removeAttribute("data-contrast");
    var font = fontFor(prefs.font);
    var s = root.style;
    s.setProperty("--reader", font.stack);
    s.setProperty("--fs", prefs.size + "px");
    s.setProperty("--lh", prefs.lh);
    s.setProperty("--ls", prefs.ls / 100 + "em");
    s.setProperty("--ws", prefs.ws / 100 + "em");
    s.setProperty("--measure", prefs.width + "px");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && !quiet) meta.content = getComputedStyle(root).getPropertyValue("--bg").trim();
    syncSheet();
    if (!quiet) document.dispatchEvent(new CustomEvent("sb:apply"));
  }

  function fontFor(name) {
    return FONTS.filter(function (f) { return f.name === name; })[0] || FONTS[6];
  }

  function save() {
    clearTimeout(settleTimer);
    live = false;
    prefs.theme = resolveTheme();
    prefs.fontStack = fontFor(prefs.font).stack;
    store.set(KEY, prefs);
    document.dispatchEvent(new CustomEvent("sb:beforeapply")); // lets the reader note the line on screen first
    apply();
  }

  // Sliders and the A−/A+ buttons: restyle once per frame while the value is moving, and do the heavy work
  // (saving, re-paging the book) once, when it settles.
  var live = false, frame = 0, settleTimer;
  function preview() {
    if (!live) { live = true; document.dispatchEvent(new CustomEvent("sb:beforeapply")); }
    if (!frame) {
      // next frame, or a short timer when the browser is throttling frames
      var go = function () {
        if (!frame) return;
        frame = 0;
        apply(true);
        document.dispatchEvent(new CustomEvent("sb:preview"));
      };
      frame = requestAnimationFrame(go) || 1;
      setTimeout(go, 50);
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(save, 260);
  }

  function pickTheme(id) {
    if (isDark(id)) prefs.lastDark = id; else prefs.lastLight = id;
    // keep following the system only while the pick matches what the system shows
    if (prefs.auto && isDark(id) !== mq.matches) prefs.auto = false;
    prefs.theme = id;
    save();
  }

  function toggleMode() {
    var nowDark = isDark(resolveTheme());
    pickTheme(nowDark ? prefs.lastLight || "sepia" : prefs.lastDark || "dark");
  }

  if (mq.addEventListener) mq.addEventListener("change", function () { if (prefs.auto) apply(); });

  /* ---------- side panels (preferences, contents, highlights) ---------- */
  var panels = {};
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var reduceMotion = function () { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; };

  // name: trigger buttons carry data-panel="<name>"; build(body) fills the panel once; onOpen(body) runs on every open
  function makePanel(name, title, build, onOpen) {
    var scrim, sheet, body, lastFocus;
    function create() {
      scrim = document.createElement("div");
      scrim.className = "sb-scrim";
      scrim.hidden = true;
      sheet = document.createElement("aside");
      sheet.className = "sb-sheet";
      sheet.hidden = true;
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-labelledby", "sb-title-" + name);
      sheet.innerHTML =
        '<div class="sb-sheet-head"><h2 id="sb-title-' + name + '">' + title + "</h2>" +
        '<button class="sb-icon" data-close aria-label="Close"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>' +
        '<div class="sb-sheet-body"></div>';
      body = sheet.querySelector(".sb-sheet-body");
      document.body.append(scrim, sheet);
      sheet.querySelector("[data-close]").addEventListener("click", close);
      scrim.addEventListener("click", close);
      sheet.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); close(); }
        if (e.key === "Tab") trap(e);
        if (/^Arrow/.test(e.key) && e.target.getAttribute("role") === "radio") moveRadio(e);
      });
      build(body);
    }
    function trap(e) {
      var f = Array.prototype.filter.call(sheet.querySelectorAll("button, input, a[href], [tabindex]"), function (el) {
        return el.tabIndex >= 0 && !el.closest("[hidden]") && el.offsetParent !== null;
      });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
    function setInert(on) {
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== sheet && el !== scrim && el.tagName !== "SCRIPT") el.inert = on;
      });
    }
    function expanded(v) {
      document.querySelectorAll('[data-panel="' + name + '"]').forEach(function (b) { b.setAttribute("aria-expanded", v); });
    }
    function open(trigger) {
      Object.keys(panels).forEach(function (k) { if (k !== name) panels[k].close(true); });
      if (!sheet) create();
      if (onOpen) onOpen(body);
      lastFocus = trigger || document.activeElement;
      scrim.hidden = sheet.hidden = false;
      setInert(true);
      expanded(true);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { scrim.classList.add("on"); sheet.classList.add("on"); });
      });
      var first = sheet.querySelector("[data-autofocus]") || sheet.querySelector("[data-close]");
      first.focus({ preventScroll: true });
    }
    // quiet: switching to another panel, so focus stays put
    function close(quiet) {
      if (!sheet || sheet.hidden) return;
      scrim.classList.remove("on");
      sheet.classList.remove("on");
      setInert(false);
      expanded(false);
      var s = scrim, h = sheet;
      var done = function () { if (!h.classList.contains("on")) s.hidden = h.hidden = true; };
      if (reduceMotion()) done(); else setTimeout(done, 300);
      if (quiet !== true && lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    panels[name] = { open: open, close: close, isOpen: function () { return !!sheet && !sheet.hidden && sheet.classList.contains("on"); }, body: function () { return body; } };
    return panels[name];
  }

  function moveRadio(e) {
    var group = Array.prototype.slice.call(e.target.parentNode.querySelectorAll('[role="radio"]'));
    var i = group.indexOf(e.target);
    var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    var next = group[(i + d + group.length) % group.length];
    e.preventDefault();
    next.focus();
    next.click();
  }

  /* ---------- reading preferences ---------- */
  var sheet;

  function rangeRow(key, label) {
    var r = RANGES[key];
    return '<div class="sb-row stack"' + (key === "width" ? ' data-wide-only' : "") + '><div class="line"><label for="sb-' + key + '">' + label +
      '</label><span class="val" id="sb-' + key + '-v"></span></div><input class="sb-range" type="range" id="sb-' + key + '" data-range="' + key +
      '" min="' + r.min + '" max="' + r.max + '" step="' + r.step + '"></div>';
  }
  function switchRow(key, icon, label) {
    return '<label class="sb-row"><span class="ic" aria-hidden="true">' + icon + '</span><span class="grow">' + label +
      '</span><span class="sb-switch"><input type="checkbox" role="switch" data-switch="' + key + '"><span></span></span></label>';
  }

  function buildPrefs(body) {
    sheet = body;
    body.innerHTML =
      '<span class="sb-label">Preview</span>' +
      '<div class="sb-preview" aria-hidden="true"><div class="aa">Aa</div><p>A second brain keeps what you learn in one calm place. Read a topic, flip the flashcards, then check yourself with the quiz before the exam.</p></div>' +
      '<span class="sb-label" id="sb-theme-l">Theme</span>' +
      '<div class="sb-themes" role="radiogroup" aria-labelledby="sb-theme-l">' +
      THEMES.map(function (t) {
        return '<button class="sb-theme" role="radio" data-theme-id="' + t.id + '"><span class="sw" style="background:' + t.bg + ";color:" + t.fg + '">Aa</span>' + t.name + "</button>";
      }).join("") + "</div>" +
      '<div class="sb-group" style="margin-top:14px">' +
      switchRow("auto", "◐", "Match system light/dark") +
      switchRow("contrast", "◑", "High contrast") + "</div>" +
      '<div class="sb-label-row"><span class="sb-label" id="sb-size-l">Font size</span>' +
      '<output class="sb-size-v" id="sb-size-v" for="sb-size" aria-live="polite"></output></div>' +
      '<div class="sb-size"><span class="lim" aria-hidden="true">' + RANGES.size.min + '</span>' +
      '<button class="sm" data-step="-1" aria-label="Smaller text">A</button>' +
      '<span class="sb-size-track"><input class="sb-range" id="sb-size" type="range" data-range="size" aria-labelledby="sb-size-l" min="' + RANGES.size.min + '" max="' + RANGES.size.max + '" step="1">' +
      '<span class="sb-bubble" aria-hidden="true"></span></span>' +
      '<button class="lg" data-step="1" aria-label="Larger text">A</button><span class="lim" aria-hidden="true">' + RANGES.size.max + "</span></div>" +
      '<span class="sb-label">Text</span><div class="sb-group">' +
      '<button class="sb-row" data-fonts-toggle aria-expanded="false" aria-controls="sb-fonts"><span class="ic" aria-hidden="true">Aa</span><span class="grow">Font</span><span class="val" id="sb-font-v"></span>' +
      '<svg class="chev" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>' +
      '<div class="sb-fonts" id="sb-fonts" role="radiogroup" aria-label="Font" hidden>' +
      FONTS.map(function (f) {
        return '<button class="sb-row" role="radio" data-font="' + esc(f.name) + '" style="font-family:' + esc(f.stack) + '"><span>' + esc(f.name) +
          (f.note ? '<br><small>' + f.note + "</small>" : "") + '</span><span class="tick" aria-hidden="true">✓</span></button>';
      }).join("") + "</div>" +
      switchRow("bold", "<b>B</b>", "Bold text") +
      switchRow("justify", "≣", "Justify text") + "</div>" +
      '<span class="sb-label">Layout</span><div class="sb-group">' +
      rangeRow("lh", "Line spacing") + rangeRow("ls", "Character spacing") + rangeRow("ws", "Word spacing") + rangeRow("width", "Page width") + "</div>" +
      '<button class="sb-btn wide" data-reset>Reset to defaults</button>' +
      '<p class="sb-note">Saved on this device and used on every SECONDBRAIN page.</p>';

    body.addEventListener("click", function (e) {
      var t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.themeId) return pickTheme(t.dataset.themeId);
      if (t.dataset.font) { prefs.font = t.dataset.font; return save(); }
      if (t.dataset.step) { prefs.size = clamp(prefs.size + +t.dataset.step, RANGES.size); flashBubble(); return preview(); }
      if (t.hasAttribute("data-fonts-toggle")) {
        var open = t.getAttribute("aria-expanded") !== "true";
        t.setAttribute("aria-expanded", open);
        body.querySelector("#sb-fonts").hidden = !open;
        return;
      }
      if (t.hasAttribute("data-reset")) {
        prefs = Object.assign({}, DEFAULTS, { layout: prefs.layout });
        save();
      }
    });
    body.addEventListener("input", function (e) {
      var k = e.target.dataset.range;
      if (!k) return;
      prefs[k] = +e.target.value;
      syncRange(e.target); // the number and the bubble keep up with the finger, even between frames
      preview();
    });
    body.addEventListener("change", function (e) {
      if (e.target.dataset.range) return save(); // slider released: settle now
      var k = e.target.dataset.switch;
      if (!k) return;
      prefs[k] = e.target.checked;
      if (k === "auto" && prefs.auto) {
        // re-follow the system using the theme last chosen for each mode
        var cur = prefs.theme;
        if (cur) { if (isDark(cur)) prefs.lastDark = cur; else prefs.lastLight = cur; }
      }
      save();
    });
    syncSheet();
  }
  makePanel("prefs", "Reading preferences", buildPrefs);

  function clamp(v, r) { return Math.min(r.max, Math.max(r.min, v)); }

  // one slider's value, fill, number and (for font size) the bubble over its handle
  function syncRange(inp) {
    var k = inp.dataset.range, r = RANGES[k], f = (prefs[k] - r.min) / (r.max - r.min);
    if (+inp.value !== prefs[k]) inp.value = prefs[k];
    inp.style.setProperty("--fill", f * 100 + "%");
    inp.setAttribute("aria-valuetext", r.fmt(prefs[k]));
    var out = sheet.querySelector("#sb-" + k + "-v");
    if (out) out.textContent = r.fmt(prefs[k]);
    var track = inp.closest(".sb-size-track");
    if (track) { track.style.setProperty("--f", f); track.querySelector(".sb-bubble").textContent = prefs[k]; }
  }
  var bubbleTimer;
  function flashBubble() {
    var t = sheet && sheet.querySelector(".sb-size-track");
    if (!t) return;
    t.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { t.classList.remove("show"); }, 900);
  }

  function syncSheet() {
    if (!sheet) return;
    var theme = resolveTheme();
    sheet.querySelectorAll("[data-theme-id]").forEach(function (b) {
      var on = b.dataset.themeId === theme;
      b.setAttribute("aria-checked", on);
      b.tabIndex = on ? 0 : -1;
    });
    sheet.querySelectorAll("[data-font]").forEach(function (b) {
      var on = b.dataset.font === prefs.font;
      b.setAttribute("aria-checked", on);
      b.tabIndex = on ? 0 : -1;
    });
    sheet.querySelector("#sb-font-v").textContent = prefs.font;
    sheet.querySelectorAll("[data-range]").forEach(syncRange);
    sheet.querySelectorAll("[data-switch]").forEach(function (inp) { inp.checked = !!prefs[inp.dataset.switch]; });
  }

  document.addEventListener("click", function (e) {
    var p = e.target.closest("[data-panel]");
    if (p && panels[p.dataset.panel]) {
      var panel = panels[p.dataset.panel];
      if (panel.isOpen()) panel.close(); else panel.open(p);
      return;
    }
    var b = e.target.closest("[data-sb]");
    if (b && b.dataset.sb === "mode") toggleMode();
  });

  /* ---------- sticky header height ---------- */
  var top = document.querySelector(".sb-top");
  if (top) {
    var setH = function () { root.style.setProperty("--header-h", top.offsetHeight + "px"); };
    setH();
    if (window.ResizeObserver) new ResizeObserver(setH).observe(top);
  }

  /* ---------- library shelf progress ---------- */
  document.querySelectorAll("[data-progress-for]").forEach(function (el) {
    var p = store.get("sb-progress:" + el.dataset.progressFor, null);
    var fill = el.querySelector(".bar span"), txt = el.querySelector(".prog-text"), link = el.querySelector("[data-resume]");
    if (!p) return;
    if (fill) fill.style.width = p.pct + "%";
    if (txt) txt.textContent = p.pct + "% read · last at “" + p.title + "”";
    if (link && p.id) { link.hidden = false; link.href = link.dataset.resume; } // the notebook reopens at the exact spot
  });

  // shared with reader.js
  window.SB = {
    store: store,
    esc: esc,
    panel: makePanel,
    panelClose: function (name) { if (panels[name]) panels[name].close(true); },
    get: function (k) { return prefs[k]; },
    set: function (k, v) { prefs[k] = v; save(); }
  };

  apply();
})();
