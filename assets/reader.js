/* SECONDBRAIN notebook reader: Scroll / Slide modes for the readable views (any [data-readable]
   view, e.g. the walkthrough and kisi-kisi), the Contents panel, text highlights, reading progress,
   and the kisi-kisi answer toggles and self-checks. Needs secondbrain.js (window.SB) loaded first. */
(function () {
  "use strict";

  var SB = window.SB;
  var root = document.documentElement;
  var book = document.body.dataset.book;
  var READABLE = {};
  Array.prototype.forEach.call(document.querySelectorAll("[data-readable]"), function (el) { READABLE[el.id.replace(/^v-/, "")] = el; });
  if (!SB || !book || !READABLE.learn) return;

  var NAMES = { learn: "Walkthrough", kisi: "Kisi-kisi" };
  Object.keys(READABLE).forEach(function (k) { if (READABLE[k].dataset.title) NAMES[k] = READABLE[k].dataset.title; });
  var VIEWS = Array.prototype.map.call(document.querySelectorAll("[data-view]"), function (el) { return el.id.replace(/^v-/, ""); });
  var view = READABLE.learn; // the readable view on screen; see syncPaged()
  var sectionsOf = function (el) { return Array.prototype.slice.call(el.querySelectorAll("section.topic")); };
  var allSections = [].concat.apply([], Object.keys(READABLE).map(function (k) { return sectionsOf(READABLE[k]); }));
  var sections = sectionsOf(view);
  var bar = document.querySelector(".sb-progress");
  var reduce = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var esc = SB.esc;

  // keep in step with route() in the page and boot.js: a view name, or an anchor inside a readable view
  // next frame, or a short timer when frames are throttled (background tabs, some embedded web views)
  function soon(fn) {
    var done = false, go = function () { if (!done) { done = true; fn(); } };
    window.requestAnimationFrame(go);
    setTimeout(go, 60);
  }
  function currentView() {
    var h = (location.hash || "").slice(1);
    if (VIEWS.indexOf(h) >= 0) return h;
    var el = h && document.getElementById(h);
    return el && el.closest("[data-readable]") ? viewOf(el) : "learn";
  }
  function viewOf(el) { var v = el.closest("[data-readable]"); return v ? v.id.replace(/^v-/, "") : "learn"; }
  function isSlide() { return root.getAttribute("data-layout") === "slide" && !!READABLE[currentView()]; }
  var pageBy = {};
  function syncPaged() {
    var v = currentView();
    if (READABLE[v] && READABLE[v] !== view) { pageBy[viewOf(view)] = page; view = READABLE[v]; sections = sectionsOf(view); page = pageBy[v] || 0; }
    root.setAttribute("data-reading", v);
    root.toggleAttribute("data-paged", isSlide());
  }
  function headerH() { return parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 64; }
  function titleOf(sec) { var h = sec && sec.querySelector("h2"); return h ? h.textContent : ""; }
  function tagOf(sec) { var t = sec && sec.querySelector(".tag"); return t ? t.textContent : ""; }

  /* ---------- book contents page (after each view's title page) ---------- */
  function chapterNo(sec) {
    if (!sec || sec.classList.contains("bk-back")) return 0;
    return sectionsOf(sec.closest("[data-readable]")).filter(function (s) { return !s.classList.contains("bk-back"); }).indexOf(sec) + 1;
  }
  Object.keys(READABLE).forEach(function (k) {
    var el = READABLE[k];
    if (el.querySelector(".kq-toc, .bk-contents")) return;
    var first = el.querySelector(":scope > section.topic, :scope > .bk-part");
    if (!first) return;
    var items = Array.prototype.map.call(el.querySelectorAll(":scope > section.topic, :scope > .bk-part"), function (c) {
      if (c.classList.contains("bk-part")) {
        return '<li class="bk-c-part">' + Array.prototype.map.call(c.children, function (x) { return esc(x.textContent.trim()); }).filter(Boolean).join(" · ") + "</li>";
      }
      var back = c.classList.contains("bk-back");
      return '<li' + (back ? ' class="bk-c-back"' : "") + '><a href="#' + c.id + '"><span class="bk-c-n">' + (back ? "" : chapterNo(c)) +
        '</span><span class="bk-c-t">' + esc(titleOf(c)) + '</span><span class="bk-c-dots" aria-hidden="true"></span><span class="bk-c-pg" data-pg-for="' + c.id + '"></span></a></li>';
    }).join("");
    var nav = document.createElement("nav");
    nav.className = "bk-contents";
    nav.setAttribute("aria-label", "Contents of " + (NAMES[k] || k));
    nav.innerHTML = '<h2 class="bk-contents-h">Contents</h2><ol class="bk-contents-list">' + items + "</ol>";
    el.insertBefore(nav, first);
  });
  // Slide mode: write each chapter's page number into the contents, like a printed book
  function numberContents() {
    var paged = isSlide();
    view.querySelectorAll("[data-pg-for]").forEach(function (pg) {
      var sec = paged && document.getElementById(pg.dataset.pgFor);
      pg.textContent = sec ? pageOf(sec) + 1 : "";
    });
  }

  /* ---------- page footer (slide mode) ---------- */
  var foot = document.createElement("div");
  foot.className = "rd-foot";
  foot.innerHTML =
    '<span class="rd-where"></span>' +
    '<div class="rd-pager">' +
    '<button class="sb-icon" data-page="-1" aria-label="Previous page"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<button class="rd-count" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="rd-jump" title="Go to a page"></button>' +
    '<button class="sb-icon" data-page="1" aria-label="Next page"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5L13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    "</div>" +
    '<span class="rd-pct"></span>' +
    '<div class="rd-jump" id="rd-jump" role="dialog" aria-label="Go to page" hidden>' +
    '<label class="rd-jump-row"><span>Go to page</span><input class="rd-jump-n" type="number" inputmode="numeric" min="1"><span class="rd-jump-of"></span></label>' +
    '<input class="rd-jump-r sb-range" type="range" min="1" aria-label="Page">' +
    '<p class="rd-jump-where" aria-live="polite"></p>' +
    '<div class="rd-jump-go"><button class="sb-btn" type="button" data-jump="cancel">Cancel</button><button class="sb-btn primary" type="button" data-jump="go">Go</button></div>' +
    "</div>";
  document.body.appendChild(foot);
  foot.addEventListener("click", function (e) {
    var b = e.target.closest("[data-page]");
    if (b) goTo(page + +b.dataset.page);
    if (e.target.closest(".rd-count")) return jumpBox.hidden ? openJump() : closeJump();
    var j = e.target.closest("[data-jump]");
    if (j) { if (j.dataset.jump === "go") jumpGo(); else closeJump(); }
  });

  /* ---------- go to page: tap "Page N of M" ---------- */
  var jumpBox = foot.querySelector(".rd-jump"), jumpN = foot.querySelector(".rd-jump-n"), jumpR = foot.querySelector(".rd-jump-r");
  var jumpWhere = foot.querySelector(".rd-jump-where"), countBtn = foot.querySelector(".rd-count");
  // chapter that page n (1-based) falls in, for the preview line
  function chapterAt(n) {
    var cur = null;
    sections.forEach(function (s) { if (pageOf(s) <= n - 1) cur = s; });
    if (!cur) return NAMES[currentView()] ? NAMES[currentView()] + " · title and contents" : "Title and contents";
    var k = chapterNo(cur);
    return (currentView() === "kisi" ? tagOf(cur).split("·")[0].trim() : k ? "Chapter " + k : "Appendix") + " · " + titleOf(cur);
  }
  function setJump(n, from) {
    n = Math.max(1, Math.min(pages, Math.round(+n || 1)));
    if (from !== "n") jumpN.value = n;
    jumpR.value = n;
    jumpR.style.setProperty("--fill", (pages > 1 ? (n - 1) / (pages - 1) * 100 : 100) + "%");
    jumpWhere.textContent = chapterAt(n);
    return n;
  }
  function openJump() {
    if (!isSlide()) return;
    jumpN.max = jumpR.max = pages;
    foot.querySelector(".rd-jump-of").textContent = "of " + pages;
    setJump(page + 1);
    jumpBox.hidden = false;
    countBtn.setAttribute("aria-expanded", "true");
    jumpN.focus();
    jumpN.select();
  }
  function closeJump(refocus) {
    if (jumpBox.hidden) return;
    jumpBox.hidden = true;
    countBtn.setAttribute("aria-expanded", "false");
    if (refocus !== false) countBtn.focus({ preventScroll: true });
  }
  function jumpGo() {
    var n = setJump(jumpN.value);
    closeJump();
    goTo(n - 1, true); // a jump, not a page turn: land straight on the page
  }
  jumpN.addEventListener("input", function () { if (jumpN.value !== "") setJump(jumpN.value, "n"); });
  jumpR.addEventListener("input", function () { setJump(jumpR.value); });
  jumpBox.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); jumpGo(); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeJump(); }
  });
  document.addEventListener("mousedown", function (e) { if (!jumpBox.hidden && !foot.contains(e.target)) closeJump(false); });

  /* ---------- pagination ---------- */
  var page = 0, pages = 1, step = 1;

  // A heading must never end a page with its text on the next one. CSS "break-after: avoid" is not reliable inside
  // multi-column layouts (and is ignored inside grids), so after each re-layout any stranded heading, together with
  // the block it belongs to, is pushed to the top of the next column.
  var HEADS = "h3, h4, .kq-h, .explain > span, .gl-h, section.topic > .tag, .pq-sub, .mn-k, p";
  var NO_HEAD = ".chain, .ex-why, .trap, .tip, .summary, .scen, .defs, .q, .face, figure, .fig, .tbl, nav, .kq-answer-bar, .kq-check";
  function headingsOf(el) {
    return Array.prototype.filter.call(el.querySelectorAll(HEADS), function (h) {
      if (h.closest(NO_HEAD)) return false;
      if (h.matches(".pq-sub, .mn-k")) return true; // a box's label or subtitle travels with what follows
      if (h.tagName === "P") { // a lead-in line such as "Every model has four parts:" belongs with its list or table
        var nx = h.nextElementSibling;
        return /:\s*$/.test(h.textContent) && !!nx && /^(UL|OL|DIV|TABLE)$/.test(nx.tagName);
      }
      return true;
    });
  }
  function visibleRects(el) { return Array.prototype.filter.call(el.getClientRects(), function (r) { return r.width && r.height; }); }
  function keepHeadings() {
    // re-check only when something that moves text has changed: size, settings, or an answer/filter opening or closing
    var sig = layoutSig();
    if (view.dataset.bkSig === sig) return;
    view.querySelectorAll(".bk-push").forEach(function (x) { x.classList.remove("bk-push"); });
    var cs = getComputedStyle(view), cols = parseInt(cs.columnCount, 10) || 1, gap = parseFloat(cs.columnGap) || 0;
    var pitch = (view.clientWidth + gap) / cols;
    var colOf = function (r) { return Math.floor((r.left - view.getBoundingClientRect().left + view.scrollLeft + 2) / pitch); };
    var heads = headingsOf(view), tried = [];
    for (var guard = 0; guard < 80; guard++) {
      var hit = null;
      for (var i = 0; i < heads.length && !hit; i++) {
        var h = heads[i];
        if (tried.indexOf(h) >= 0) continue;
        var n = h.nextElementSibling;
        while (n && !(n.textContent.trim() || n.querySelector("svg, img"))) n = n.nextElementSibling;
        if (!n) continue;
        var a = visibleRects(h), b = visibleRects(n);
        if (a.length && b.length && colOf(a[a.length - 1]) !== colOf(b[0])) hit = h;
      }
      if (!hit) break;
      tried.push(hit);
      // Move the whole unit the heading opens. Climb while the target is the first thing in its parent (so a step's
      // heading takes its list and the label above it), and take any headings or lead-in lines just before it along.
      var target = hit, prev;
      for (;;) {
        while ((prev = target.previousElementSibling) && heads.indexOf(prev) >= 0) target = prev;
        var par = target.parentElement;
        if (!target.previousElementSibling && par && !par.matches("section.topic, [data-readable]")) { target = par; continue; }
        break;
      }
      var grid = target.closest(".cols"); // a page break cannot fall inside a grid cell: move the whole grid
      if (grid) target = grid;
      var secEl = target.closest("section.topic");
      if (secEl && target === secEl.firstElementChild) continue; // chapters already start a page
      target.classList.add("bk-push");
    }
    view.dataset.bkSig = layoutSig();
  }
  function layoutSig() {
    return [view.id, view.clientWidth, view.clientHeight, root.style.cssText, root.getAttribute("data-bold"), view.querySelectorAll("[hidden]").length].join("|");
  }
  function clearKeep() {
    Object.keys(READABLE).forEach(function (k) {
      READABLE[k].querySelectorAll(".bk-push").forEach(function (x) { x.classList.remove("bk-push"); });
      delete READABLE[k].dataset.bkSig;
    });
  }

  function measure() {
    keepHeadings();
    var gap = parseFloat(getComputedStyle(view).columnGap) || 0;
    if (scrollY) scrollTo(0, 0); // the page itself never scrolls in slide mode
    step = view.clientWidth + gap;
    pages = Math.max(1, Math.ceil((view.scrollWidth + gap) / step - 0.01));
    numberContents();
  }
  function pageOf(el) {
    var x = el.getBoundingClientRect().left - view.getBoundingClientRect().left + view.scrollLeft;
    return Math.max(0, Math.min(pages - 1, Math.floor((x + 2) / step)));
  }
  function goTo(p, instant) {
    if (!isSlide()) return closeJump(false);
    page = Math.max(0, Math.min(pages - 1, p));
    view.scrollTo({ left: page * step, behavior: instant || reduce.matches ? "auto" : "smooth" });
    hidePop();
    update();
  }
  // re-flow after a resize or a type change, keeping the reader on the same part of the section
  function reflow() {
    if (anchor) return settleAnchor();
    if (!isSlide()) return update();
    var sec = currentSection(), delta = sec ? page - pageOf(sec) : page;
    measure();
    page = sec ? pageOf(sec) + Math.max(0, delta) : page;
    goTo(page, true);
  }

  // Changing the text: the line at the top of the page is noted before the change ("sb:beforeapply") and held in
  // place on every frame while a slider moves ("sb:preview", cheap: no re-paging), then the book is re-paged once
  // when the change settles ("sb:apply").
  var anchor = null, following = false;
  function anchorPage() {
    var b = rectAt(anchor.sec, anchor.off), x = b.left - view.getBoundingClientRect().left + view.scrollLeft;
    return Math.floor((x + 2) / step);
  }
  function followAnchor() {
    following = false;
    if (!anchor || !READABLE[currentView()]) return;
    if (isSlide()) {
      var gap = parseFloat(getComputedStyle(view).columnGap) || 0;
      step = view.clientWidth + gap;
      pages = Math.max(1, Math.ceil((view.scrollWidth + gap) / step - 0.01));
      page = Math.max(0, Math.min(pages - 1, anchorPage()));
      view.scrollLeft = page * step;
      count.textContent = "Page " + (page + 1) + " of " + pages;
    } else {
      scrollTo(0, Math.max(0, scrollY + rectAt(anchor.sec, anchor.off).top - anchor.y)); // same spot on screen
    }
  }
  function settleAnchor() {
    var a = anchor;
    anchor = null;
    if (!READABLE[currentView()]) return update();
    if (isSlide()) {
      measure(); // re-pages, keeps headings with their text, renumbers the contents
      anchor = a; page = Math.max(0, Math.min(pages - 1, anchorPage())); anchor = null;
      goTo(page, true);
    } else {
      scrollTo(0, Math.max(0, scrollY + rectAt(a.sec, a.off).top - a.y));
      update();
    }
  }
  document.addEventListener("sb:beforeapply", function () {
    if (anchor || !READABLE[currentView()] || restoring) return;
    var pt = topPoint();
    if (pt.sec) { anchor = pt; anchor.y = rectAt(pt.sec, pt.off).top; } // Scroll mode keeps the line at this height
  });
  document.addEventListener("sb:preview", function () { if (!following) { following = true; followAnchor(); } });
  // text selection or keyboard focus can nudge the hidden scroller; settle back onto a page edge
  var settle;
  onReadable("scroll", function () {
    if (!isSlide()) return;
    clearTimeout(settle);
    settle = setTimeout(function () {
      var want = page * step;
      if (Math.abs(view.scrollLeft - want) > 4) { page = Math.round(view.scrollLeft / step); goTo(page, true); }
    }, 180);
  }, { passive: true });

  function onReadable(type, fn, opts) {
    Object.keys(READABLE).forEach(function (k) { READABLE[k].addEventListener(type, function (e) { if (this === view) fn.call(this, e); }, opts); });
  }

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
    if (!READABLE[currentView()]) { if (bar) bar.style.setProperty("--p", 0); return; }
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
    var n = chapterNo(sec);
    where.textContent = !sec ? NAMES[currentView()] || "Introduction"
      : currentView() === "kisi" ? tagOf(sec).split("·")[0].trim() + " · " + titleOf(sec)
      : (n ? "Chapter " + n : "Appendix") + " · " + titleOf(sec);
    pctEl.textContent = Math.round(pct * 100) + "% read";
    markToc(sec);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (sec) SB.store.set("sb-progress:" + book, { pct: Math.round(pct * 100), id: sec.id, title: (currentView() === "learn" ? "" : NAMES[currentView()] + ": ") + titleOf(sec), t: Date.now() });
      savePos();
    }, 250);
  }
  var ticking = false;
  addEventListener("scroll", function () {
    if (isSlide() || ticking) return;
    ticking = true;
    soon(function () { ticking = false; update(); });
  }, { passive: true });

  /* ---------- mode switch ---------- */
  var seg = document.querySelectorAll("[data-layout-set]");
  function syncSeg() {
    var mode = root.getAttribute("data-layout");
    seg.forEach(function (b) { b.setAttribute("aria-checked", b.dataset.layoutSet === mode); });
  }
  function setLayout(mode) {
    if (mode === root.getAttribute("data-layout")) return;
    var sec = READABLE[currentView()] ? currentSection() : null;
    root.setAttribute("data-layout", mode);
    SB.set("layout", mode);
    syncSeg();
    syncPaged();
    soon(function () {
      if (isSlide()) { measure(); goTo(sec ? pageOf(sec) : 0, true); }
      else { clearKeep(); numberContents(); if (sec) sec.scrollIntoView(); else scrollTo(0, 0); update(); }
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
  onReadable("wheel", function (e) {
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
  onReadable("touchstart", function (e) {
    if (!isSlide() || e.touches.length !== 1 || e.target.closest(".figscroll, .tbl, .formula")) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  onReadable("touchend", function (e) {
    if (!touch) return;
    var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    var sel = window.getSelection();
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - touch.t < 700 && (!sel || sel.isCollapsed)) {
      goTo(page + (dx < 0 ? 1 : -1));
    }
    touch = null;
  }, { passive: true });

  /* ---------- contents panel ---------- */
  var tocList, pendingJump = null;
  // el: any element inside a readable view; switches to that view first when needed
  function jumpTo(el, block) {
    var v = viewOf(el);
    var go = function () {
      if (isSlide()) { measure(); goTo(pageOf(el), true); }
      else el.scrollIntoView({ block: block || "start" });
      if (el.id && el.matches("section.topic")) history.replaceState(null, "", "#" + el.id);
    };
    if (currentView() !== v) { pendingJump = go; location.hash = "#" + v; }
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
  function tocGroup(name) {
    var el = READABLE[name];
    if (!el) return "";
    var h1 = el.querySelector("h1");
    return '<span class="sb-label">' + NAMES[name] + '</span><div class="sb-group rd-toc">' +
      '<button class="sb-row" data-goto="_' + name + '"><span class="grow"><small>Start</small>' + esc(h1 ? h1.textContent : NAMES[name]) + "</span></button>" +
      sectionsOf(el).map(function (s, i) {
        var num = name === "kisi" ? (/^q\d/.test(s.id) ? "Q" + (+s.id.slice(1)) : "") : i + 1;
        return '<button class="sb-row" data-goto="' + s.id + '"><span class="num" aria-hidden="true">' + num + '</span><span class="grow"><small>' +
          esc(tagOf(s)) + "</small>" + esc(titleOf(s)) + "</span></button>";
      }).join("") + "</div>";
  }
  SB.panel("toc", "Contents", function (body) {
    // practice tabs are the header tabs that are not readable views
    var practice = Array.prototype.filter.call(document.querySelectorAll(".sb-nav a[href^='#']"), function (a) { return !READABLE[a.getAttribute("href").slice(1)]; });
    body.innerHTML = Object.keys(READABLE).map(tocGroup).join("") +
      (practice.length ? '<span class="sb-label">Practice</span><div class="sb-group rd-toc">' +
        practice.map(function (a) { return '<a class="sb-row" href="' + a.getAttribute("href") + '"><span class="grow">' + esc(a.textContent) + "</span></a>"; }).join("") + "</div>" : "");
    tocList = body;
    body.addEventListener("click", function (e) {
      var a = e.target.closest("a[href^='#']");
      if (a) { SB.panelClose("toc"); return; }
      var b = e.target.closest("[data-goto]");
      if (!b) return;
      SB.panelClose("toc");
      var g = b.dataset.goto;
      var target = g.charAt(0) === "_" ? READABLE[g.slice(1)].firstElementChild : document.getElementById(g);
      jumpTo(target);
    });
  }, function () { markToc(READABLE[currentView()] ? currentSection() : null); });

  /* ---------- "Check yourself": a short quiz at the end of each chapter, for recall while reading ----------
     Questions come from the notebook's own quiz and flashcards (window.SB_QUIZ / SB_CARDS). Each one goes to the
     chapter it tests: the chapter it is tagged with, or else the chapter whose wording it matches best (within its
     week when it has one). Up to two multiple-choice questions and one recall card per chapter. */
  var PQ_KEY = "sb-pq:" + book;
  var pqState = SB.store.get(PQ_KEY, {});
  var STOP = {};
  ("the and for with that this from are was were which what why how who when where into its their they not but can has have had more than one each all any most only also does did should would must may about between because under over other such these those there then them its your you our out per via use used using being been very much many some same both own off upon onto whose while like just than make made makes etc").split(" ").forEach(function (w) { STOP[w] = 1; });
  function terms(html) {
    var t = String(html).replace(/<[^>]+>/g, " ").toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
    return t.filter(function (w) { return !STOP[w]; }).map(function (w) { return w.replace(/(ies|es|s)$/, ""); });
  }
  function weekOf(sec) { var m = /week\s*(\d+)/i.exec(tagOf(sec)); return m ? +m[1] : null; }
  function buildPopQuizzes() {
    var quiz = window.SB_QUIZ ? window.SB_QUIZ.list() : [], deck = window.SB_CARDS ? window.SB_CARDS.list() : [];
    if (!quiz.length && !deck.length) return;
    var secs = [];
    Object.keys(READABLE).forEach(function (k) {
      if (k === "kisi") return; // Kisi-kisi ends every question with its own self-check
      sectionsOf(READABLE[k]).forEach(function (s) {
        if (s.classList.contains("bk-back") || /start here/i.test(tagOf(s))) return;
        secs.push({ el: s, view: k, week: weekOf(s), tf: {}, items: [] });
      });
    });
    if (!secs.length) return;
    // tf-idf vectors of each chapter's text
    var df = {};
    secs.forEach(function (c) {
      terms(textNodes(c.el).map(function (t) { return t.data; }).join(" ")).forEach(function (w) { c.tf[w] = (c.tf[w] || 0) + 1; });
      Object.keys(c.tf).forEach(function (w) { df[w] = (df[w] || 0) + 1; });
    });
    var idf = function (w) { return Math.log((secs.length + 1) / ((df[w] || 0) + 1)); };
    secs.forEach(function (c) { var n = 0; for (var w in c.tf) { var x = (1 + Math.log(c.tf[w])) * idf(w); n += x * x; } c.norm = Math.sqrt(n) || 1; });
    function place(text, hint) {
      var v = {}, n = 0, own = null, ownScore = 0, other = null, otherScore = 0;
      terms(text).forEach(function (w) { v[w] = (v[w] || 0) + 1; });
      for (var w in v) { v[w] = (1 + Math.log(v[w])) * idf(w); n += v[w] * v[w]; }
      n = Math.sqrt(n) || 1;
      secs.forEach(function (c) {
        if (hint.sec && c.el.id !== hint.sec) return;
        if (!hint.sec && hint.week && c.week && c.week !== hint.week) return; // another week's chapter
        var dot = 0;
        for (var w2 in v) if (c.tf[w2]) dot += v[w2] * (1 + Math.log(c.tf[w2])) * idf(w2);
        var sc = dot / (n * c.norm);
        // a week-tagged item belongs to its week's chapters; an untagged chapter (e.g. FOB & CIF) wins only by a clear margin
        var mine = hint.sec || !hint.week || c.week === hint.week;
        if (mine) { if (sc > ownScore) { ownScore = sc; own = c; } }
        else if (sc > otherScore) { otherScore = sc; other = c; }
      });
      var best = own, bestScore = ownScore;
      if (other && otherScore >= 0.15 && otherScore > ownScore * 1.8) { best = other; bestScore = otherScore; }
      return best && (hint.sec || bestScore >= 0.06) ? { c: best, score: bestScore } : null;
    }
    quiz.forEach(function (q, i) {
      var p = place(q.q + " " + q.o[q.a] + " " + q.o[q.a] + " " + (q.e || ""), { week: q.week });
      if (p) p.c.items.push({ kind: "q", i: i, score: p.score, it: q });
    });
    deck.forEach(function (d, i) {
      if (d.quizzable === false) return;
      var p = place(d.front + " " + d.back, { sec: d.sec, week: d.week });
      if (p) p.c.items.push({ kind: "c", i: i, score: p.score, it: d });
    });
    secs.forEach(function (c) {
      var top = function (kind, n) { return c.items.filter(function (x) { return x.kind === kind; }).sort(function (a, b) { return b.score - a.score; }).slice(0, n); };
      var pick = top("q", 2).concat(top("c", 1));
      if (pick.length) renderPopQuiz(c.el, pick);
    });
  }
  function renderPopQuiz(sec, pick) {
    var box = document.createElement("aside");
    box.className = "pq";
    box.setAttribute("aria-label", "Check yourself: " + titleOf(sec));
    var n = 0;
    box.innerHTML = '<h4 class="pq-h">Check yourself</h4><p class="pq-sub">Answer from memory before you turn the page.</p><ol class="pq-list">' +
      pick.map(function (x) {
        n++;
        if (x.kind === "q") {
          return '<li class="pq-item" data-pq="q' + x.i + '" data-a="' + x.it.a + '"><p class="pq-stem">' + x.it.q + '</p><div class="pq-opts">' +
            x.it.o.map(function (o, j) { return '<button type="button" class="pq-opt" data-j="' + j + '"><span class="pq-l">' + "ABCD"[j] + "</span><span>" + o + "</span></button>"; }).join("") +
            '</div><p class="pq-why" hidden></p></li>';
        }
        return '<li class="pq-item pq-recall" data-pq="c' + x.i + '"><p class="pq-stem"><span class="pq-tag">Recall</span>' + esc(x.it.front) + '</p>' +
          '<button type="button" class="pq-show">Show answer</button><div class="pq-back" hidden><p>' + esc(x.it.back) + '</p>' +
          '<p class="pq-rate">Did you remember it? <button type="button" data-knew="1">Yes, I knew it</button><button type="button" data-knew="0">Not yet</button></p></div></li>';
      }).join("") + '</ol><p class="pq-score" aria-live="polite"></p><button type="button" class="pq-reset" hidden>Try again</button>';
    sec.appendChild(box);
    if (typeof window.abbrify === "function") window.abbrify(box);
    box.querySelectorAll(".pq-item").forEach(function (li) { showPq(li, pqState[li.dataset.pq]); });
    scorePq(box);
  }
  // draw one question in its answered (or fresh) state
  function showPq(li, st) {
    if (li.classList.contains("pq-recall")) {
      var open = st != null;
      li.querySelector(".pq-back").hidden = !open;
      li.querySelector(".pq-show").hidden = open;
      li.querySelectorAll("[data-knew]").forEach(function (b) { b.setAttribute("aria-pressed", st === "k" ? b.dataset.knew === "1" : st === "r" ? b.dataset.knew === "0" : false); });
      return;
    }
    var a = +li.dataset.a, why = li.querySelector(".pq-why");
    li.querySelectorAll(".pq-opt").forEach(function (b) {
      var j = +b.dataset.j;
      b.disabled = st != null;
      b.classList.toggle("right", st != null && j === a);
      b.classList.toggle("wrong", st != null && j === st && j !== a);
    });
    why.hidden = st == null;
    if (st != null) {
      var src = window.SB_QUIZ.list()[+li.dataset.pq.slice(1)];
      why.innerHTML = (st === a ? '<b class="pq-ok">Correct.</b> ' : '<b class="pq-no">Not quite.</b> The answer is ' + "ABCD"[a] + ". ") + (src ? src.e : "");
      if (typeof window.abbrify === "function") window.abbrify(why);
    }
  }
  function scorePq(box) {
    var qs = box.querySelectorAll('.pq-item:not(.pq-recall)'), done = 0, right = 0, any = false;
    qs.forEach(function (li) { var st = pqState[li.dataset.pq]; if (st != null) { done++; if (st === +li.dataset.a) right++; } });
    box.querySelectorAll(".pq-item").forEach(function (li) { if (pqState[li.dataset.pq] != null) any = true; });
    box.querySelector(".pq-score").textContent = done ? right + " of " + qs.length + " correct" + (done < qs.length ? " so far" : right === qs.length ? ". Well remembered." : ". Re-read the parts you missed, then try again.") : "";
    box.querySelector(".pq-reset").hidden = !any;
  }
  document.addEventListener("click", function (e) {
    var box = e.target.closest(".pq");
    if (!box) return;
    var li = e.target.closest(".pq-item"), b;
    if ((b = e.target.closest(".pq-opt")) && li) { pqState[li.dataset.pq] = +b.dataset.j; }
    else if (e.target.closest(".pq-show") && li) { pqState[li.dataset.pq] = "seen"; }
    else if ((b = e.target.closest("[data-knew]")) && li) {
      pqState[li.dataset.pq] = b.dataset.knew === "1" ? "k" : "r";
      // a card you could not recall joins the flashcards' review pile
      if (window.SB_CARDS && window.SB_CARDS.mark) window.SB_CARDS.mark(+li.dataset.pq.slice(1), b.dataset.knew === "1");
    } else if (e.target.closest(".pq-reset")) {
      box.querySelectorAll(".pq-item").forEach(function (x) { delete pqState[x.dataset.pq]; });
    } else return;
    SB.store.set(PQ_KEY, pqState);
    box.querySelectorAll(".pq-item").forEach(function (x) { showPq(x, pqState[x.dataset.pq]); });
    scorePq(box);
    document.dispatchEvent(new CustomEvent("sb:reflow")); // answers open up: re-page if needed
  });
  buildPopQuizzes();

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
    return h.id;
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
    '<button class="hl-act hl-remove" data-act="remove" hidden><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 6V4.5h4V6M6 6l.8 10h6.4L14 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Remove</button>';
  document.body.appendChild(pop);

  var pending = null; // { sec, start, end, text } for a fresh selection, or { id } for an existing highlight
  var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;

  // first line box of a saved highlight: the toolbar sits at its top-left (or top-right when that runs off screen)
  function hlRect(id) {
    var m = document.querySelector('mark[data-hl="' + id + '"]');
    return m ? m.getClientRects()[0] || m.getBoundingClientRect() : null;
  }
  function showPop(rect) {
    var saved = !!(pending && pending.id);
    pop.querySelector('[data-act="remove"]').hidden = !saved;
    pop.hidden = false;
    var pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 10;
    var x = saved ? (rect.left + pw <= innerWidth - 8 ? rect.left : rect.right - pw)
      : rect.left + rect.width / 2 - pw / 2;
    x = Math.min(innerWidth - pw - 8, Math.max(8, x));
    // phones show their own copy menu above a fresh selection, so sit below it there
    var below = (coarse && !saved) || rect.top - ph - gap < headerH() + 4;
    var y = below ? rect.bottom + gap : rect.top - ph - gap;
    y = Math.min(innerHeight - ph - 8, Math.max(headerH() + 4, y));
    pop.style.left = x + "px";
    pop.style.top = y + "px";
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
    if (!sec || !sec.closest("[data-readable]") || b.closest("section.topic") !== sec) return null;
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
  onReadable("mouseup", function () { clearTimeout(selTimer); setTimeout(checkSelection, 10); });

  onReadable("click", function (e) {
    var m = e.target.closest("mark.hl");
    if (!m) return;
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    pending = { id: m.dataset.hl };
    showPop(hlRect(m.dataset.hl) || m.getBoundingClientRect());
  });
  pop.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep the text selection alive
  pop.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !pending) return;
    if (b.dataset.color) {
      var id = pending.id;
      if (id) recolor(id, b.dataset.color);
      else id = addHighlight(pending.sec, pending.start, pending.end, b.dataset.color);
      var sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      // keep the toolbar on the new highlight so Remove is one tap away
      var r = id && hlRect(id);
      if (!r) return hidePop();
      pending = { id: id };
      return showPop(r);
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
        "<p>Select any text in the notes, then pick a colour to save it here.</p></div>";
      return;
    }
    var bySec = {};
    hls.slice().sort(function (a, b) {
      return allSections.indexOf(document.getElementById(a.sec)) - allSections.indexOf(document.getElementById(b.sec)) || a.start - b.start;
    }).forEach(function (h) { (bySec[h.sec] = bySec[h.sec] || []).push(h); });
    hlBody.innerHTML = '<p class="sb-note" style="margin:0 2px 4px">' + n + " highlight" + (n > 1 ? "s" : "") + ", saved on this device.</p>" +
      Object.keys(bySec).map(function (sid) {
        var sec = document.getElementById(sid);
        return '<span class="sb-label">' + (viewOf(sec) === "learn" ? "" : NAMES[viewOf(sec)] + " · ") + esc(titleOf(sec)) + '</span><div class="sb-group">' +
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

  /* ---------- search: every view of the notebook, plus the flashcard decks (window.SB_CARDS) ---------- */
  var SKIP_TAGS = /^(SCRIPT|STYLE|SELECT|OPTION|TEXTAREA)$/;
  function searchNodes(el) {
    var out = [], n;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (t) {
        var p = t.parentNode;
        return SKIP_TAGS.test(p.nodeName) || p.closest("svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    while ((n = w.nextNode())) out.push(n);
    return out;
  }
  function tabName(v) {
    var a = document.querySelector('.sb-nav a[href="#' + v + '"]');
    return NAMES[v] || (a ? a.textContent : v);
  }
  // searchable units: a chapter, a quiz/mock question, a glossary entry, or a flashcard
  function buildUnits() {
    var units = [];
    VIEWS.forEach(function (v) {
      var el = document.getElementById("v-" + v);
      if (!el) return;
      if (READABLE[v]) {
        sectionsOf(el).forEach(function (s) {
          var n = chapterNo(s);
          units.push({ view: v, el: s, group: tabName(v),
            label: v === "kisi" ? tagOf(s).split("·")[0].trim() : n ? "Chapter " + n : "Appendix", title: titleOf(s) });
        });
      } else {
        Array.prototype.forEach.call(el.querySelectorAll(".qitem, .q, details.mock, .gl-row"), function (q, i) {
          var t = q.querySelector("summary, .stem, dt b");
          units.push({ view: v, el: q, group: tabName(v), label: "Item " + (i + 1), title: t ? t.textContent : "" });
        });
      }
    });
    var deck = window.SB_CARDS;
    if (deck) {
      deck.list().forEach(function (c, i) {
        units.push({ view: deck.view, card: i, text: c.front + "\n" + c.back, group: tabName(deck.view), label: c.deck || "Card " + (i + 1), title: c.front });
      });
    }
    units.forEach(function (u) { if (!u.text) u.text = searchNodes(u.el).map(function (t) { return t.data; }).join(""); u.low = u.text.toLowerCase(); });
    return units;
  }

  var units = null, query = "", occ = [], cur = -1;
  function find(q) {
    var ql = q.toLowerCase();
    occ = [];
    var hits = [];
    if (!units) units = buildUnits();
    units.forEach(function (u) {
      var i = 0, n = 0, first = -1;
      while ((i = u.low.indexOf(ql, i)) >= 0) {
        if (first < 0) first = i;
        occ.push({ u: u, n: n++ });
        i += ql.length;
      }
      if (n) hits.push({ u: u, count: n, at: first, start: occ.length - n });
    });
    return hits;
  }
  function snippet(u, at, len) {
    var a = Math.max(0, at - 50), b = Math.min(u.text.length, at + len + 70);
    var t = u.text.replace(/\s+/g, " ");
    var raw = u.text;
    var pre = raw.slice(a, at).replace(/\s+/g, " "), hit = raw.slice(at, at + len), post = raw.slice(at + len, b).replace(/\s+/g, " ");
    return (a > 0 ? "…" : "") + esc(pre) + "<b>" + esc(hit) + "</b>" + esc(post) + (b < t.length ? "…" : "");
  }

  // mark every match inside one unit; returns the first <mark> of each match, in order
  function markHits(el, q) {
    var nodes = searchNodes(el), full = nodes.map(function (t) { return t.data; }).join(""), low = full.toLowerCase(), ql = q.toLowerCase();
    var pos = [], i = 0, firsts = [];
    while ((i = low.indexOf(ql, i)) >= 0) { pos.push(i); i += ql.length; }
    for (var k = pos.length - 1; k >= 0; k--) {
      var start = pos[k], end = start + ql.length, acc = 0, parts = [];
      nodes.forEach(function (t) {
        var s = Math.max(start - acc, 0), e = Math.min(end - acc, t.length);
        if (s < e) parts.push([t, s, e]);
        acc += t.length;
      });
      var firstMark = null;
      parts.forEach(function (p) {
        var t = p[0];
        if (p[2] < t.length) t.splitText(p[2]);
        if (p[1] > 0) t = t.splitText(p[1]);
        var m = document.createElement("mark");
        m.className = "sr-hit";
        t.parentNode.insertBefore(m, t);
        m.appendChild(t);
        if (!firstMark) firstMark = m;
      });
      firsts[k] = firstMark;
      nodes = searchNodes(el); // re-read after splitting
    }
    return firsts;
  }
  function clearMarks() {
    document.querySelectorAll("mark.sr-hit").forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }
  // open anything that hides the match: kisi answers, mock model answers, closed <details>
  function reveal(m) {
    for (var p = m.parentElement; p && !p.matches("[data-view]"); p = p.parentElement) {
      if (p.tagName === "DETAILS") p.open = true;
      if (p.hidden) {
        var ctl = p.id && document.querySelector('[aria-controls="' + p.id + '"]');
        var btn = ctl || (p.previousElementSibling && p.previousElementSibling.querySelector("button[aria-expanded]"));
        if (btn) btn.click(); else p.hidden = false;
      }
    }
  }

  var srBar = document.createElement("div");
  srBar.className = "sr-bar";
  srBar.hidden = true;
  srBar.setAttribute("role", "region");
  srBar.setAttribute("aria-label", "Search matches");
  srBar.innerHTML = '<span class="sr-bar-q"></span><span class="sr-bar-n" aria-live="polite"></span>' +
    '<button class="sb-icon" data-sr="-1" aria-label="Previous match"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 12.5L10 7.5l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<button class="sb-icon" data-sr="1" aria-label="Next match"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<button class="sb-icon" data-sr="x" aria-label="Clear search"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>';
  document.body.appendChild(srBar);
  srBar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sr]");
    if (!b) return;
    if (b.dataset.sr === "x") return endSearch();
    goHit(cur + +b.dataset.sr);
  });
  function endSearch() {
    clearMarks();
    srBar.hidden = true;
    occ = []; cur = -1; query = "";
    var inp = document.querySelector(".sr-input");
    if (inp) { inp.value = ""; renderResults(); }
  }

  function goHit(k) {
    if (!occ.length) return;
    cur = (k + occ.length) % occ.length;
    var o = occ[cur], u = o.u;
    clearMarks();
    srBar.hidden = false;
    srBar.querySelector(".sr-bar-q").textContent = "“" + query + "”";
    srBar.querySelector(".sr-bar-n").textContent = (cur + 1) + " of " + occ.length;
    var land = function (el) {
      var marks = markHits(el, query), m = marks[o.n] || marks[0];
      if (!m) return;
      document.querySelectorAll('mark.sr-hit').forEach(function (x) { x.classList.remove("cur"); });
      m.classList.add("cur");
      reveal(m);
      if (READABLE[u.view]) jumpTo(m, "center");
      else soon(function () { m.scrollIntoView({ block: "center" }); });
    };
    if (u.card != null) {
      if (currentView() !== u.view) location.hash = "#" + u.view;
      var el = window.SB_CARDS.open(u.card, nthInBack(u, o.n));
      setTimeout(function () { land(el); }, 30);
      return;
    }
    if (!READABLE[u.view] && currentView() !== u.view) {
      location.hash = "#" + u.view;
      setTimeout(function () { land(u.el); }, 60);
    } else land(u.el);
  }
  // flashcards: is the n-th match on the back of the card?
  function nthInBack(u, n) {
    var ql = query.toLowerCase(), i = 0, k = 0, split = u.text.indexOf("\n");
    while ((i = u.low.indexOf(ql, i)) >= 0) { if (k++ === n) return i > split; i += ql.length; }
    return false;
  }

  var resBody, inputEl, sumEl;
  function renderResults() {
    if (!resBody) return;
    var q = inputEl.value.trim();
    if (q.length < 2) {
      sumEl.textContent = "Type at least two letters to search every chapter, question, flashcard and glossary entry in this notebook.";
      resBody.innerHTML = "";
      return;
    }
    query = q;
    var hits = find(q);
    if (!hits.length) { sumEl.textContent = "No matches for “" + q + "”."; resBody.innerHTML = ""; return; }
    sumEl.textContent = occ.length + " match" + (occ.length > 1 ? "es" : "") + " in " + hits.length + " place" + (hits.length > 1 ? "s" : "") + ".";
    var groups = {}, order = [];
    hits.slice(0, 300).forEach(function (h) {
      if (!groups[h.u.group]) { groups[h.u.group] = []; order.push(h.u.group); }
      groups[h.u.group].push(h);
    });
    resBody.innerHTML = order.map(function (g) {
      return '<span class="sb-label">' + esc(g) + '</span><div class="sb-group sr-list">' + groups[g].map(function (h) {
        return '<button class="sr-res" data-occ="' + h.start + '"><span class="sr-res-h"><span class="sr-res-l">' + esc(h.u.label) + "</span>" +
          (h.u.title ? '<span class="sr-res-t">' + esc(h.u.title.replace(/\s+/g, " ").slice(0, 90)) + "</span>" : "") +
          (h.count > 1 ? '<span class="sr-res-c">' + h.count + "</span>" : "") + '</span><span class="sr-res-s">' + snippet(h.u, h.at, q.length) + "</span></button>";
      }).join("") + "</div>";
    }).join("");
  }
  var searchTimer;
  SB.panel("search", "Search", function (body) {
    body.innerHTML = '<label class="sr-field"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12.5 12.5l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
      '<span class="sr">Search this notebook</span><input class="sr-input" type="search" data-autofocus placeholder="Search this notebook" autocomplete="off" spellcheck="false"></label>' +
      '<p class="sb-note sr-sum" aria-live="polite"></p><div class="sr-results"></div>';
    inputEl = body.querySelector(".sr-input");
    sumEl = body.querySelector(".sr-sum");
    resBody = body.querySelector(".sr-results");
    inputEl.addEventListener("input", function () { clearTimeout(searchTimer); searchTimer = setTimeout(renderResults, 180); });
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); renderResults(); if (occ.length) { SB.panelClose("search"); goHit(0); } }
    });
    resBody.addEventListener("click", function (e) {
      var b = e.target.closest("[data-occ]");
      if (!b) return;
      SB.panelClose("search");
      goHit(+b.dataset.occ);
    });
    renderResults();
  }, function () {
    units = null; // quiz lists and answers may have been re-rendered since the last search
    if (inputEl) { renderResults(); setTimeout(function () { inputEl.select(); }, 30); }
  });
  // "/" opens search, as in most readers; Enter / Shift+Enter step through matches while the srBar is up
  document.addEventListener("keydown", function (e) {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); var t = document.querySelector('[data-panel="search"]'); if (t) t.click(); }
    else if (e.key === "Escape" && !srBar.hidden && !document.querySelector(".sb-sheet.on")) endSearch();
  });

  /* ---------- wiring ---------- */
  // any element inside a readable view (a topic, a glossary entry…) that the hash points at
  function anchorTarget() {
    var el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    return el && !el.matches("[data-readable]") && el.closest("[data-readable]") ? el : null;
  }
  addEventListener("hashchange", function () {
    syncPaged();
    hidePop();
    soon(function () {
      if (pendingJump) { var j = pendingJump; pendingJump = null; return j(); }
      if (isSlide()) {
        measure();
        var t = anchorTarget();
        goTo(t ? pageOf(t) : page, true);
      } else update();
    });
  });
  var rT;
  addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(reflow, 120); });
  document.addEventListener("sb:apply", function () { soon(reflow); });
  document.addEventListener("sb:reflow", function () { soon(reflow); }); // page content changed size

  /* ---------- kisi-kisi: answer toggles, copy, self-checks ---------- */
  var CHECK_KEY = "sb-check:" + book;
  var checks = SB.store.get(CHECK_KEY, []);
  function setAnswer(btn, open) {
    var body = document.getElementById(btn.getAttribute("aria-controls"));
    if (!body) return;
    body.hidden = !open;
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "Hide answer" : "Show answer";
  }
  function syncChecks() {
    document.querySelectorAll("[data-selfcheck]").forEach(function (c) { c.checked = checks.indexOf(c.dataset.selfcheck) >= 0; });
    document.querySelectorAll("[data-check-count]").forEach(function (el) { el.textContent = checks.length; });
    document.querySelectorAll('.kq-toc a[href^="#q"]').forEach(function (a) { a.classList.toggle("done", checks.indexOf(a.getAttribute("href").slice(1)) >= 0); });
  }
  document.addEventListener("click", function (e) {
    var r = e.target.closest("[data-reveal]");
    if (r) { setAnswer(r, r.getAttribute("aria-expanded") !== "true"); return reflow(); }
    var all = e.target.closest("[data-reveal-all]");
    if (all) {
      var open = all.getAttribute("aria-pressed") !== "true";
      all.setAttribute("aria-pressed", open);
      all.textContent = open ? "Hide all answers" : "Show all answers";
      document.querySelectorAll("[data-reveal]").forEach(function (b) { setAnswer(b, open); });
      return reflow();
    }
    var c = e.target.closest("[data-copy]");
    if (c) {
      var src = document.getElementById(c.dataset.copy);
      var text = src ? Array.prototype.map.call(src.querySelectorAll("p, li"), function (p) { return p.textContent; }).join("\n\n") : "";
      var done = function () { c.textContent = "Copied"; setTimeout(function () { c.textContent = "Copy"; }, 900); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else done();
    }
  });
  document.addEventListener("change", function (e) {
    var c = e.target.closest("[data-selfcheck]");
    if (!c) return;
    checks = checks.filter(function (id) { return id !== c.dataset.selfcheck; });
    if (c.checked) checks.push(c.dataset.selfcheck);
    SB.store.set(CHECK_KEY, checks);
    syncChecks();
  });
  syncChecks();

  /* ---------- last-read position: the exact spot, restored on refresh or when the notebook is reopened ---------- */
  // { view, sec, off } for a reading view (off = character offset of the first line on screen within the chapter),
  // or { view, y } for the practice tabs
  var POS_KEY = "sb-pos:" + book, restoring = false, userMoved = false;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual"; // we restore it ourselves
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (t) { addEventListener(t, function () { userMoved = true; }, { passive: true, capture: true }); });

  // The first readable character at the top of the page (Slide) or just under the header (Scroll), found from the
  // text's own layout rather than by hit-testing a point, so open panels and their backdrop do not get in the way.
  function charRect(t, o) {
    var r = document.createRange();
    r.setStart(t, o);
    r.setEnd(t, Math.min(o + 1, t.length));
    return r.getClientRects()[0] || null;
  }
  function topPoint() {
    var sec = currentSection();
    if (!sec) return { sec: null, off: 0 };
    var paged = isSlide(), edge = paged ? view.getBoundingClientRect().left - 1 : headerH() + 14;
    var past = function (b) { return paged ? b.left >= edge : b.bottom > edge; };
    // a page can open with the end of the previous chapter: hold on to that line, not the new chapter's start
    var lastPast = function (s) {
      var ns = textNodes(s);
      for (var k = ns.length - 1; k >= 0; k--) {
        if (!/\S/.test(ns[k].data) || !ns[k].parentNode.getClientRects().length) continue;
        var b = charRect(ns[k], ns[k].length - 1);
        return !!b && past(b);
      }
      return false;
    };
    var si = sections.indexOf(sec);
    while (si > 0 && lastPast(sections[si - 1])) si--;
    sec = sections[si] || sec;
    var nodes = textNodes(sec), acc = 0;
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i], rs = t.length && /\S/.test(t.data) ? t.parentNode.getClientRects() : [];
      if (rs.length) {
        var last = charRect(t, t.length - 1);
        if (last && past(last)) {
          // this node reaches the page: find its first character that is on it
          var lo = 0, hi = t.length - 1;
          while (lo < hi) {
            var mid = (lo + hi) >> 1, b = charRect(t, mid);
            if (b && past(b)) hi = mid; else lo = mid + 1;
          }
          return { sec: sec, off: acc + lo };
        }
      }
      acc += t.length;
    }
    return { sec: sec, off: 0 };
  }
  function savePos() {
    if (restoring) return;
    var v = currentView(), rec = { view: v, t: Date.now() };
    if (READABLE[v]) {
      // mid page-turn the text under the corner belongs to another page; wait for it to settle
      if (isSlide() && Math.abs(view.scrollLeft - page * step) > 4) { clearTimeout(posTimer); posTimer = setTimeout(savePos, 300); return; }
      var pt = topPoint();
      if (pt.sec) { rec.sec = pt.sec.id; rec.off = pt.off; }
    } else rec.y = Math.round(scrollY);
    SB.store.set(POS_KEY, rec);
  }
  // screen box of the character at a saved offset
  function rectAt(sec, off) {
    var nodes = textNodes(sec), acc = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (acc + nodes[i].length > off || i === nodes.length - 1) {
        var r = document.createRange(), o = Math.min(Math.max(0, off - acc), nodes[i].length);
        r.setStart(nodes[i], o);
        r.setEnd(nodes[i], Math.min(o + 1, nodes[i].length));
        var b = r.getClientRects()[0] || r.getBoundingClientRect();
        if (b && (b.width || b.height)) return b;
        var pb = nodes[i].parentNode.getBoundingClientRect(); // text inside something now closed: fall back to the chapter
        return pb.width || pb.height ? pb : sec.getBoundingClientRect();
      }
      acc += nodes[i].length;
    }
    return sec.getBoundingClientRect();
  }
  function restorePos(pos) {
    var go = function () {
      var sec = pos.sec && document.getElementById(pos.sec);
      if (READABLE[pos.view]) {
        if (isSlide()) {
          measure();
          if (sec) {
            var b = rectAt(sec, pos.off || 0), x = b.left - view.getBoundingClientRect().left + view.scrollLeft;
            page = Math.max(0, Math.min(pages - 1, Math.floor((x + 2) / step)));
          } else page = 0;
          goTo(page, true);
        } else {
          // land the saved line just above the probe point topPoint() uses, so refreshing never creeps upward
          if (sec) scrollTo(0, Math.max(0, scrollY + rectAt(sec, pos.off || 0).top - headerH() - 12));
          else scrollTo(0, 0);
          update();
        }
      } else scrollTo(0, pos.y || 0);
    };
    restoring = true;
    if (currentView() !== pos.view) { pendingJump = go; location.hash = "#" + pos.view; }
    else go();
    setTimeout(function () { restoring = false; }, 500);
    // web fonts can arrive after this and move the text; settle again unless the reader has already moved on
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!userMoved) soon(go); });
    return true;
  }
  // open where the reader left off unless the address asks for a specific place (a chapter link, a tab link)
  function shouldResume(pos) {
    if (!pos || !pos.view || VIEWS.indexOf(pos.view) < 0) return false;
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var again = nav && (nav.type === "reload" || nav.type === "back_forward");
    var h = location.hash.slice(1);
    return again || !h || h === pos.view;
  }
  addEventListener("pagehide", savePos);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") savePos(); });
  var posTimer;
  addEventListener("scroll", function () { clearTimeout(posTimer); posTimer = setTimeout(savePos, 400); }, { passive: true });

  function start() {
    syncPaged();
    var pos = SB.store.get(POS_KEY, null);
    if (shouldResume(pos) && restorePos(pos)) return;
    if (isSlide()) {
      measure();
      var t = anchorTarget();
      page = t ? pageOf(t) : 0;
      goTo(page, true);
    } else update();
  }
  start();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!restoring) reflow(); });
})();
