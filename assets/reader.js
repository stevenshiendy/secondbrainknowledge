/* SECONDBRAIN notebook reader: Scroll / Slide modes for the walkthrough, the Contents panel,
   text highlights, and reading progress. Needs secondbrain.js (window.SB) loaded first. */
(function () {
  "use strict";

  var SB = window.SB;
  var root = document.documentElement;
  var book = document.body.dataset.book;
  var view = document.getElementById("v-learn");
  if (!SB || !book || !view) return;

  var sections = Array.prototype.slice.call(view.querySelectorAll("section.topic"));
  var bar = document.querySelector(".sb-progress");
  var reduce = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var esc = SB.esc;

  function currentView() {
    var h = (location.hash || "").slice(1);
    return /^(cards|quiz|mock)$/.test(h) ? h : "learn";
  }
  function isSlide() { return root.getAttribute("data-layout") === "slide" && currentView() === "learn"; }
  function headerH() { return parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 64; }
  function titleOf(sec) { var h = sec && sec.querySelector("h2"); return h ? h.textContent : ""; }
  function tagOf(sec) { var t = sec && sec.querySelector(".tag"); return t ? t.textContent : ""; }

  /* ---------- page footer (slide mode) ---------- */
  var foot = document.createElement("div");
  foot.className = "rd-foot";
  foot.innerHTML =
    '<span class="rd-where"></span>' +
    '<div class="rd-pager">' +
    '<button class="sb-icon" data-page="-1" aria-label="Previous page"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<span class="rd-count" aria-live="polite"></span>' +
    '<button class="sb-icon" data-page="1" aria-label="Next page"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5L13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    "</div>" +
    '<span class="rd-pct"></span>';
  document.body.appendChild(foot);
  foot.addEventListener("click", function (e) {
    var b = e.target.closest("[data-page]");
    if (b) goTo(page + +b.dataset.page);
  });

  /* ---------- pagination ---------- */
  var page = 0, pages = 1, step = 1;

  function measure() {
    var gap = parseFloat(getComputedStyle(view).columnGap) || 0;
    if (scrollY) scrollTo(0, 0); // the page itself never scrolls in slide mode
    step = view.clientWidth + gap;
    pages = Math.max(1, Math.ceil((view.scrollWidth + gap) / step - 0.01));
  }
  function pageOf(el) {
    var x = el.getBoundingClientRect().left - view.getBoundingClientRect().left + view.scrollLeft;
    return Math.max(0, Math.min(pages - 1, Math.floor((x + 2) / step)));
  }
  function goTo(p, instant) {
    if (!isSlide()) return;
    page = Math.max(0, Math.min(pages - 1, p));
    view.scrollTo({ left: page * step, behavior: instant || reduce.matches ? "auto" : "smooth" });
    hidePop();
    update();
  }
  // re-flow after a resize or a type change, keeping the reader on the same part of the section
  function reflow() {
    if (!isSlide()) return update();
    var sec = currentSection(), delta = sec ? page - pageOf(sec) : page;
    measure();
    page = sec ? pageOf(sec) + Math.max(0, delta) : page;
    goTo(page, true);
  }
  // text selection or keyboard focus can nudge the hidden scroller; settle back onto a page edge
  var settle;
  view.addEventListener("scroll", function () {
    if (!isSlide()) return;
    clearTimeout(settle);
    settle = setTimeout(function () {
      var want = page * step;
      if (Math.abs(view.scrollLeft - want) > 4) { page = Math.round(view.scrollLeft / step); goTo(page, true); }
    }, 180);
  }, { passive: true });

  function currentSection() {
    var cur = null;
    if (isSlide()) {
      sections.forEach(function (s) { if (pageOf(s) <= page) cur = s; });
    } else {
      var line = headerH() + 48;
      sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) cur = s; });
    }
    return cur;
  }

  /* ---------- reading progress ---------- */
  var where = foot.querySelector(".rd-where"), count = foot.querySelector(".rd-count"), pctEl = foot.querySelector(".rd-pct");
  var saveTimer;
  function update() {
    if (currentView() !== "learn") { if (bar) bar.style.setProperty("--p", 0); return; }
    var pct;
    if (isSlide()) {
      pct = pages > 1 ? page / (pages - 1) : 1;
      count.textContent = "Page " + (page + 1) + " of " + pages;
      foot.querySelector('[data-page="-1"]').disabled = page === 0;
      foot.querySelector('[data-page="1"]').disabled = page >= pages - 1;
    } else {
      var max = document.documentElement.scrollHeight - innerHeight;
      pct = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    }
    if (bar) bar.style.setProperty("--p", pct);
    var sec = currentSection();
    where.textContent = sec ? tagOf(sec).split("·")[0].trim() : "Introduction";
    pctEl.textContent = Math.round(pct * 100) + "% read";
    markToc(sec);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (sec) SB.store.set("sb-progress:" + book, { pct: Math.round(pct * 100), id: sec.id, title: titleOf(sec), t: Date.now() });
    }, 250);
  }
  var ticking = false;
  addEventListener("scroll", function () {
    if (isSlide() || ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }, { passive: true });

  /* ---------- mode switch ---------- */
  var seg = document.querySelectorAll("[data-layout-set]");
  function syncSeg() {
    var mode = root.getAttribute("data-layout");
    seg.forEach(function (b) { b.setAttribute("aria-checked", b.dataset.layoutSet === mode); });
  }
  function setLayout(mode) {
    if (mode === root.getAttribute("data-layout")) return;
    var sec = currentView() === "learn" ? currentSection() : null;
    root.setAttribute("data-layout", mode);
    SB.set("layout", mode);
    syncSeg();
    requestAnimationFrame(function () {
      if (isSlide()) { measure(); goTo(sec ? pageOf(sec) : 0, true); }
      else { if (sec) sec.scrollIntoView(); else scrollTo(0, 0); update(); }
    });
  }
  seg.forEach(function (b) { b.addEventListener("click", function () { setLayout(b.dataset.layoutSet); }); });
  syncSeg();

  /* ---------- turning pages: keys, wheel, swipe ---------- */
  function anyPanelOpen() { return !!document.querySelector(".sb-sheet.on"); }
  document.addEventListener("keydown", function (e) {
    if (!isSlide() || anyPanelOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName) && e.key === " ") return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    var d = { ArrowRight: 1, PageDown: 1, " ": e.shiftKey ? -1 : 1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (e.key === "Home") { e.preventDefault(); return goTo(0); }
    if (e.key === "End") { e.preventDefault(); return goTo(pages - 1); }
    if (d) { e.preventDefault(); goTo(page + d); }
  });
  var wheelLock = 0, wheelSum = 0;
  view.addEventListener("wheel", function (e) {
    if (!isSlide()) return;
    var inner = e.target.closest(".figscroll, .tbl, .formula");
    var dx = e.deltaX, dy = e.deltaY;
    if (inner && Math.abs(dx) > Math.abs(dy)) return; // let wide diagrams scroll sideways
    e.preventDefault();
    if (Date.now() < wheelLock) return;
    wheelSum += Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(wheelSum) > 50) {
      goTo(page + (wheelSum > 0 ? 1 : -1));
      wheelSum = 0;
      wheelLock = Date.now() + 450;
    }
  }, { passive: false });
  var touch = null;
  view.addEventListener("touchstart", function (e) {
    if (!isSlide() || e.touches.length !== 1 || e.target.closest(".figscroll, .tbl, .formula")) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  view.addEventListener("touchend", function (e) {
    if (!touch) return;
    var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    var sel = window.getSelection();
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - touch.t < 700 && (!sel || sel.isCollapsed)) {
      goTo(page + (dx < 0 ? 1 : -1));
    }
    touch = null;
  }, { passive: true });

  /* ---------- contents panel ---------- */
  var tocList;
  function jumpTo(el, block) {
    var go = function () {
      if (isSlide()) { measure(); goTo(pageOf(el), true); }
      else el.scrollIntoView({ block: block || "start" });
    };
    if (currentView() !== "learn") { location.hash = "#learn"; requestAnimationFrame(function () { requestAnimationFrame(go); }); }
    else go();
  }
  function markToc(sec) {
    if (!tocList) return;
    tocList.querySelectorAll("[data-goto]").forEach(function (b) {
      var on = !!sec && b.dataset.goto === sec.id;
      b.classList.toggle("here", on);
      if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
  }
  SB.panel("toc", "Contents", function (body) {
    body.innerHTML =
      '<span class="sb-label">Walkthrough</span><div class="sb-group rd-toc">' +
      '<button class="sb-row" data-goto="_start"><span class="grow"><small>Start</small>Course walkthrough</span></button>' +
      sections.map(function (s, i) {
        return '<button class="sb-row" data-goto="' + s.id + '"><span class="num" aria-hidden="true">' + (i + 1) + '</span><span class="grow"><small>' +
          esc(tagOf(s)) + "</small>" + esc(titleOf(s)) + "</span></button>";
      }).join("") + "</div>" +
      '<span class="sb-label">Practice</span><div class="sb-group rd-toc">' +
      '<a class="sb-row" href="#cards"><span class="grow">Flashcards</span></a>' +
      '<a class="sb-row" href="#quiz"><span class="grow">Self-check quiz</span></a>' +
      '<a class="sb-row" href="#mock"><span class="grow">Mock exam</span></a></div>';
    tocList = body;
    body.addEventListener("click", function (e) {
      var a = e.target.closest("a[href^='#']");
      if (a) { SB.panelClose("toc"); return; }
      var b = e.target.closest("[data-goto]");
      if (!b) return;
      SB.panelClose("toc");
      var target = b.dataset.goto === "_start" ? view.firstElementChild : document.getElementById(b.dataset.goto);
      if (b.dataset.goto !== "_start") history.replaceState(null, "", "#" + b.dataset.goto);
      else history.replaceState(null, "", "#learn");
      jumpTo(target);
    });
  }, function () { markToc(currentView() === "learn" ? currentSection() : null); });

  /* ---------- highlights ---------- */
  var HL_KEY = "sb-hl:" + book;
  var COLORS = [
    { id: "yellow", name: "Yellow" }, { id: "green", name: "Green" },
    { id: "blue", name: "Blue" }, { id: "pink", name: "Pink" }
  ];
  var hls = SB.store.get(HL_KEY, []);
  var saveHls = function () { SB.store.set(HL_KEY, hls); };

  function textNodes(sec) {
    var out = [], n;
    var w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, {
      acceptNode: function (t) { return t.parentNode.closest("svg, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    while ((n = w.nextNode())) out.push(n);
    return out;
  }
  // character offset of a DOM boundary point within a section's readable text (-1 when it falls in a diagram)
  function offsetOf(sec, node, off) {
    var nodes = textNodes(sec), acc = 0, i;
    if (node.nodeType !== 3) {
      var r = document.createRange();
      r.setStart(node, off);
      r.collapse(true);
      node = null;
      for (i = 0; i < nodes.length; i++) if (r.comparePoint(nodes[i], 0) >= 0) { node = nodes[i]; off = 0; break; }
      if (!node) return nodes.reduce(function (a, t) { return a + t.length; }, 0);
    }
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i] === node) return acc + off;
      acc += nodes[i].length;
    }
    return -1;
  }
  function render(h) {
    var sec = document.getElementById(h.sec);
    if (!sec) return false;
    var nodes = textNodes(sec);
    var full = nodes.map(function (t) { return t.data; }).join("");
    if (full.slice(h.start, h.end) !== h.text) {
      var at = full.indexOf(h.text);
      if (at < 0) return false;
      h.start = at; h.end = at + h.text.length;
    }
    var acc = 0, parts = [];
    nodes.forEach(function (t) {
      var s = Math.max(h.start - acc, 0), e = Math.min(h.end - acc, t.length);
      if (s < e) parts.push([t, s, e]);
      acc += t.length;
    });
    parts.forEach(function (p) {
      var t = p[0];
      if (p[2] < t.length) t.splitText(p[2]);
      if (p[1] > 0) t = t.splitText(p[1]);
      if (!/\S/.test(t.data)) return;
      var m = document.createElement("mark");
      m.className = "hl hl-" + h.color;
      m.dataset.hl = h.id;
      t.parentNode.insertBefore(m, t);
      m.appendChild(t);
    });
    return true;
  }
  function unrender(id) {
    document.querySelectorAll('mark[data-hl="' + id + '"]').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }
  function addHighlight(sec, start, end, color) {
    // snap to whole words, the way a highlighter pen would
    var raw = textNodes(sec).map(function (t) { return t.data; }).join(""), word = /[\wÀ-ɏ'’-]/;
    while (start > 0 && word.test(raw[start - 1]) && word.test(raw[start])) start--;
    while (end < raw.length && word.test(raw[end - 1]) && word.test(raw[end])) end++;
    while (start < end && /\s/.test(raw[start])) start++;
    while (end > start && /\s/.test(raw[end - 1])) end--;
    // merge with any highlight it overlaps so marks never nest
    hls.filter(function (h) { return h.sec === sec.id && h.start < end && h.end > start; }).forEach(function (h) {
      start = Math.min(start, h.start);
      end = Math.max(end, h.end);
      removeHighlight(h.id, true);
    });
    var full = textNodes(sec).map(function (t) { return t.data; }).join("");
    var h = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), sec: sec.id, start: start, end: end, text: full.slice(start, end), color: color, t: Date.now() };
    if (!/\S/.test(h.text)) return;
    hls.push(h);
    render(h);
    saveHls();
    refreshHlList();
  }
  function removeHighlight(id, quiet) {
    unrender(id);
    hls = hls.filter(function (h) { return h.id !== id; });
    if (!quiet) { saveHls(); refreshHlList(); }
  }
  function recolor(id, color) {
    hls.forEach(function (h) { if (h.id === id) h.color = color; });
    document.querySelectorAll('mark[data-hl="' + id + '"]').forEach(function (m) { m.className = "hl hl-" + color; });
    saveHls();
    refreshHlList();
  }
  hls = hls.filter(render);

  // floating highlight toolbar
  var pop = document.createElement("div");
  pop.className = "hl-pop";
  pop.setAttribute("role", "toolbar");
  pop.setAttribute("aria-label", "Highlight");
  pop.hidden = true;
  pop.innerHTML = COLORS.map(function (c) {
    return '<button class="hl-dot hl-' + c.id + '" data-color="' + c.id + '" aria-label="' + c.name + ' highlight"></button>';
  }).join("") +
    '<span class="hl-sep" aria-hidden="true"></span>' +
    '<button class="hl-act" data-act="copy">Copy</button>' +
    '<button class="hl-act" data-act="remove" hidden>Remove</button>';
  document.body.appendChild(pop);

  var pending = null; // { sec, start, end, text } for a fresh selection, or { id } for an existing highlight
  var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;

  function showPop(rect) {
    pop.hidden = false;
    var pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 10;
    var x = Math.min(innerWidth - pw - 8, Math.max(8, rect.left + rect.width / 2 - pw / 2));
    // phones show their own copy menu above the selection, so sit below it there
    var below = coarse || rect.top - ph - gap < headerH() + 4;
    var y = below ? rect.bottom + gap : rect.top - ph - gap;
    y = Math.min(innerHeight - ph - 8, Math.max(headerH() + 4, y));
    pop.style.left = x + "px";
    pop.style.top = y + "px";
    pop.querySelector('[data-act="remove"]').hidden = !pending || !pending.id;
    pop.querySelectorAll("[data-color]").forEach(function (b) {
      var cur = pending && pending.id && hls.filter(function (h) { return h.id === pending.id; })[0];
      b.setAttribute("aria-pressed", !!cur && cur.color === b.dataset.color);
    });
  }
  function hidePop() { pop.hidden = true; pending = null; }

  function readSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    var a = r.startContainer.nodeType === 3 ? r.startContainer.parentNode : r.startContainer;
    var b = r.endContainer.nodeType === 3 ? r.endContainer.parentNode : r.endContainer;
    var sec = a.closest && a.closest("section.topic");
    if (!sec || !view.contains(sec) || b.closest("section.topic") !== sec) return null;
    if (a.closest("svg") || b.closest("svg")) return null;
    var start = offsetOf(sec, r.startContainer, r.startOffset), end = offsetOf(sec, r.endContainer, r.endOffset);
    if (start < 0 || end <= start) return null;
    return { sec: sec, start: start, end: end, text: sel.toString(), rect: r.getBoundingClientRect() };
  }
  var selTimer;
  function checkSelection() {
    var s = readSelection();
    if (!s) { if (pending && !pending.id) hidePop(); return; }
    pending = s;
    showPop(s.rect);
  }
  document.addEventListener("selectionchange", function () { clearTimeout(selTimer); selTimer = setTimeout(checkSelection, coarse ? 350 : 220); });
  view.addEventListener("mouseup", function () { clearTimeout(selTimer); setTimeout(checkSelection, 10); });

  view.addEventListener("click", function (e) {
    var m = e.target.closest("mark.hl");
    if (!m) return;
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    pending = { id: m.dataset.hl };
    showPop(m.getBoundingClientRect());
  });
  pop.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep the text selection alive
  pop.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !pending) return;
    if (b.dataset.color) {
      if (pending.id) recolor(pending.id, b.dataset.color);
      else addHighlight(pending.sec, pending.start, pending.end, b.dataset.color);
      var sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      return hidePop();
    }
    if (b.dataset.act === "remove" && pending.id) { removeHighlight(pending.id); return hidePop(); }
    if (b.dataset.act === "copy") {
      var text = pending.id ? (hls.filter(function (h) { return h.id === pending.id; })[0] || {}).text : pending.text;
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; hidePop(); }, 700); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text || "").then(done, done);
      else done();
    }
  });
  document.addEventListener("mousedown", function (e) {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("mark.hl")) hidePop();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) hidePop(); });
  addEventListener("scroll", function () { if (!pop.hidden && (!pending || pending.id)) hidePop(); }, { passive: true });

  // highlights panel
  var hlBody;
  function refreshHlList() {
    var n = hls.length;
    document.querySelectorAll("[data-hl-count]").forEach(function (el) { el.textContent = n || ""; el.hidden = !n; });
    if (!hlBody) return;
    if (!n) {
      hlBody.innerHTML = '<div class="rd-empty"><div class="rd-empty-mark" aria-hidden="true"></div><p><b>No highlights yet.</b></p>' +
        "<p>Select any text in the walkthrough, then pick a colour to save it here.</p></div>";
      return;
    }
    var bySec = {};
    hls.slice().sort(function (a, b) {
      return sections.indexOf(document.getElementById(a.sec)) - sections.indexOf(document.getElementById(b.sec)) || a.start - b.start;
    }).forEach(function (h) { (bySec[h.sec] = bySec[h.sec] || []).push(h); });
    hlBody.innerHTML = '<p class="sb-note" style="margin:0 2px 4px">' + n + " highlight" + (n > 1 ? "s" : "") + ", saved on this device.</p>" +
      Object.keys(bySec).map(function (sid) {
        var sec = document.getElementById(sid);
        return '<span class="sb-label">' + esc(titleOf(sec)) + '</span><div class="sb-group">' +
          bySec[sid].map(function (h) {
            return '<div class="rd-hl"><button class="rd-hl-go" data-go="' + h.id + '"><span class="rd-hl-bar hl-' + h.color + '" aria-hidden="true"></span><span class="rd-hl-text">' +
              esc(h.text) + '</span></button><button class="rd-hl-del" data-del="' + h.id + '" aria-label="Remove highlight">' +
              '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button></div>';
          }).join("") + "</div>";
      }).join("");
  }
  SB.panel("highlights", "Highlights", function (body) {
    hlBody = body;
    body.addEventListener("click", function (e) {
      var d = e.target.closest("[data-del]");
      if (d) return removeHighlight(d.dataset.del);
      var g = e.target.closest("[data-go]");
      if (!g) return;
      var m = document.querySelector('mark[data-hl="' + g.dataset.go + '"]');
      SB.panelClose("highlights");
      if (!m) return;
      jumpTo(m, "center");
      setTimeout(function () {
        document.querySelectorAll('mark[data-hl="' + g.dataset.go + '"]').forEach(function (x) {
          x.classList.remove("hl-flash");
          void x.offsetWidth;
          x.classList.add("hl-flash");
        });
      }, 150);
    });
  }, refreshHlList);
  refreshHlList();

  /* ---------- wiring ---------- */
  addEventListener("hashchange", function () {
    root.setAttribute("data-reading", currentView());
    hidePop();
    requestAnimationFrame(function () {
      if (isSlide()) {
        measure();
        var t = /^#t-/.test(location.hash) && document.getElementById(location.hash.slice(1));
        goTo(t ? pageOf(t) : 0, true);
      } else update();
    });
  });
  var rT;
  addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(reflow, 120); });
  document.addEventListener("sb:apply", function () { requestAnimationFrame(reflow); });

  function start() {
    root.setAttribute("data-reading", currentView());
    if (isSlide()) {
      measure();
      var t = /^#t-/.test(location.hash) && document.getElementById(location.hash.slice(1));
      page = t ? pageOf(t) : 0;
      goTo(page, true);
    } else update();
  }
  start();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reflow);
})();
