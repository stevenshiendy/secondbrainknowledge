/* Runs inside a notebook page, in headless Chrome, for build_pdf.js. Turns the live, tabbed notebook into one long book:
   cover, contents, every tab in order, with the interactive parts laid out for paper (answers hidden behind a button
   are shown, quizzes get an answer key, calculators keep their worked example). The page is thrown away afterwards. */
window.SB_PDF = (function () {
  "use strict";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var drop = function (s, el) { $$(s, el).forEach(function (x) { x.remove(); }); };
  var esc = function (t) { return window.SB.esc(t); };
  var LETTERS = "ABCDEFGH";

  function make(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }

  /* ---------- reading views: everything shown, nothing to press ---------- */
  function flattenReadable(view) {
    drop(".bk-contents, .toc, .kq-toc, .kq-bar, .kq-answer-bar, .kq-check, .pq-reset, .pq-score, .pq-rate, .pq-show, .gl-none", view);
    drop(".gl-search", view);
    $$("#rq", view).forEach(function (q) { q.replaceWith(make("p", "pdf-calc-note", "The quiz itself runs in the online notebook. This is its answer sheet.")); });
    $$("p", view).forEach(function (p) {
      p.innerHTML = p.innerHTML.replace(/\s*In the text, a dotted underline marks an abbreviation:[^<]*?filter\./, "")
        .replace(/\s*Change the numbers to see how the price ladder moves\./, " Worked through below.");
    });
    $$("[hidden]", view).forEach(function (x) { x.hidden = false; });
    $$("details", view).forEach(function (d) { d.open = true; });
    $$(".pq", view).forEach(flattenCheck);
    $$(".calc", view).forEach(flattenCalc);
    $$(".kq-answer", view).forEach(function (a) { a.insertBefore(make("p", "pdf-model-h", "Model answer"), a.firstChild); });
  }
  // "Check yourself": options as a plain list, the answers in small print under the box, as a textbook does
  function flattenCheck(box) {
    var key = [];
    box.querySelector(".pq-sub").textContent = "Answer from memory, then check below.";
    $$(".pq-item", box).forEach(function (li, i) {
      if (li.classList.contains("pq-recall")) {
        var back = li.querySelector(".pq-back");
        key.push("<b>" + (i + 1) + ".</b> " + back.textContent.trim());
        back.remove();
        return;
      }
      var a = +li.dataset.a;
      key.push("<b>" + (i + 1) + ".</b> " + LETTERS[a]);
      var list = make("ol", "pdf-opts");
      $$(".pq-opt", li).forEach(function (o) { list.appendChild(make("li", "", o.lastElementChild.innerHTML)); });
      li.querySelector(".pq-opts").replaceWith(list);
      drop(".pq-why", li);
    });
    box.appendChild(make("p", "pdf-key", "<b>Answers</b> " + key.join(" &nbsp; ")));
  }
  // calculators keep the example they open with
  function flattenCalc(box) {
    $$("input, select", box).forEach(function (f) {
      var shown = f.tagName === "SELECT" ? f.options[f.selectedIndex].textContent : Number(f.value).toLocaleString("en-US");
      f.replaceWith(make("b", "pdf-val", esc(shown)));
    });
    box.appendChild(make("p", "pdf-calc-note", "A worked example. The online notebook lets you change these values."));
  }

  /* ---------- practice tabs: rebuilt from the notebook's own data ---------- */
  function cardsView(view) {
    var h1 = $("h1", view).textContent, groups = {}, order = [];
    window.SB_CARDS.list().forEach(function (c) {
      var d = c.deck || "Cards";
      if (!groups[d]) { groups[d] = []; order.push(d); }
      groups[d].push(c);
    });
    var total = 0;
    view.innerHTML = "<h1>" + esc(h1) + '</h1><p class="lede">Cover the right-hand column and answer from memory.</p>' +
      order.map(function (d) {
        total += groups[d].length;
        return '<h2 class="pdf-deck">' + esc(d) + ' <small>' + groups[d].length + ' cards</small></h2><table class="pdf-cards"><tbody>' +
          groups[d].map(function (c) { return "<tr><td>" + esc(c.front) + "</td><td>" + esc(c.back) + "</td></tr>"; }).join("") + "</tbody></table>";
      }).join("");
    return total;
  }
  function quizView(view) {
    var h1 = $("h1", view).textContent, quiz = window.SB_QUIZ.list();
    view.innerHTML = "<h1>" + esc(h1) + '</h1><p class="lede">Pick an answer for each question, then check yourself against the answers and explanations that follow.</p>' +
      '<ol class="pdf-quiz">' + quiz.map(function (q) {
        return '<li><p class="pdf-stem">' + q.q + '</p><ol class="pdf-opts">' + q.o.map(function (o) { return "<li>" + o + "</li>"; }).join("") + "</ol></li>";
      }).join("") + "</ol>" +
      '<h2 class="pdf-answers-h" id="' + view.id + '-answers">Answers and explanations</h2><ol class="pdf-explain">' +
      quiz.map(function (q) { return "<li><b>" + LETTERS[q.a] + ".</b> " + (q.e || ""); }).join("") + "</ol>";
  }
  // the model answers move behind the questions, so the paper can be sat like a real exam
  function mockView(view) {
    var answers = [];
    $$("details.mock", view).forEach(function (d) {
      var sum = $("summary", d), ans = $(".ans", d), q = /^Q\d+/.exec(sum.textContent);
      answers.push('<h3 class="pdf-ans-q">' + (q ? q[0] : "") + '</h3>' + ans.innerHTML.replace(/^<b>Model answer<\/b>/, ""));
      d.replaceWith(make("p", "pdf-mq", sum.innerHTML));
    });
    $$(".q", view).forEach(function (q) {
      var num = $(".num", q), model = $(".model", q);
      drop("input, textarea, button, label.num", q);
      $$("[style]", q).forEach(function (x) { if (!x.textContent.trim()) x.remove(); });
      if (model) { answers.push('<h3 class="pdf-ans-q">' + esc(num.textContent.replace(/ ·.*/, "")) + "</h3>" + model.innerHTML); model.remove(); }
    });
    drop('.timer, #tm-go, #tm-reset, button, .result', view);
    $$(".sub", view).forEach(function (s) { s.innerHTML = s.innerHTML.replace("Write your answer in the box (it is kept in this browser only), then open the model answer to self-mark.", "Write your answers on paper, then mark them against the model answers."); });
    $$(".lede", view).forEach(function (s) { s.innerHTML = s.innerHTML.replace("then open the model answer", "then turn to the model answers"); });
    var key = $(".key-tbl", view);
    if (key) { // Export-Import prints its Section A key with the answers
      var keyH = $$("h2", view).filter(function (h) { return /answer key at a glance/i.test(h.textContent); })[0];
      if (keyH) keyH.remove();
      key.hidden = false;
      key.remove();
    }
    var h = make("h2", "pdf-answers-h", "Model answers");
    h.id = view.id + "-answers";
    view.appendChild(h);
    if (key) { view.appendChild(make("h3", "pdf-ans-q", "Section A key")); view.appendChild(key); }
    view.appendChild(make("div", "pdf-model", answers.join("")));
  }
  function watchView(view, meta) {
    var media = $("video, iframe", view), box = media && media.closest(".watch-video, .watch-frame");
    var chapters = $$(".watch-chapters button", view).map(function (b) { return "<li><b>" + esc(b.firstChild.textContent) + "</b> " + esc(b.lastChild.textContent.trim()) + "</li>"; });
    drop(".watch-chapters", view);
    $$("a", view).forEach(function (a) { if (/own page/.test(a.textContent)) a.remove(); });
    $$(".sub", view).forEach(function (s) { s.innerHTML = s.innerHTML.replace(/\s*with chapters and captions in the player/, " with captions in the picture").replace(/\s*\.\s*$/, "."); });
    var fig = make("figure", "pdf-poster", meta.poster ? '<img src="' + esc(meta.poster) + '" alt="">' : "");
    if (box) box.replaceWith(fig);
    if (chapters.length) view.appendChild(make("ol", "pdf-chapters", chapters.join("")));
    view.appendChild(make("p", "pdf-watch-note", "Watch or download it from the Watch tab of the online notebook."));
  }

  /* ---------- links, running heads, contents ---------- */
  function fixLinks(viewIds) {
    $$("main a[href]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (h.charAt(0) === "#") { if (viewIds[h.slice(1)]) a.setAttribute("href", "#v-" + h.slice(1)); }
      else if (!/^(https?:|mailto:)/.test(h)) a.removeAttribute("href"); // a page of the site, which the PDF has no way to reach
    });
  }
  function clip(t, n) { t = t.replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).replace(/[\s,;:·-]+$/, "") + "…" : t; }
  function cssText(t) { return '"' + t.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }

  function assemble(meta) {
    var main = $("#main");
    Array.prototype.slice.call(document.body.children).forEach(function (el) { if (el !== main && el.tagName !== "SCRIPT") el.remove(); });
    drop(".dl-fig, .dl-watch");
    var root = document.documentElement;
    root.removeAttribute("data-paged");
    root.setAttribute("data-layout", "scroll");
    main.className = "";

    var views = $$("[data-view]", main), viewIds = {}, pages = "", blocks = [];
    var navName = {};
    meta.nav.forEach(function (n) { navName[n[0]] = n[1]; });
    views.forEach(function (v) { viewIds[v.id.slice(2)] = 1; });
    var pageN = 0;
    var named = function (el, head) {
      var name = "p" + (++pageN);
      el.style.page = name;
      pages += "@page " + name + " { @top-right { content: " + cssText(clip(head, 62)) + "; } }\n";
    };

    views.forEach(function (v) {
      var id = v.id.slice(2), label = navName[id] || id;
      v.hidden = false;
      var entries = [], block = { id: v.id, label: label, entries: entries };
      if (v.hasAttribute("data-readable")) {
        flattenReadable(v);
        var chapter = 0, partN = 0;
        Array.prototype.slice.call(v.children).forEach(function (c) {
          if (c.classList.contains("bk-part")) {
            c.id = c.id || v.id + "-part-" + (++partN);
            entries.push({ part: Array.prototype.map.call(c.children, function (x) { return esc(x.textContent.trim()); }).filter(Boolean).join(" · ") });
            c.style.page = "plain";
            return;
          }
          if (!c.matches("section.topic")) return;
          var back = c.classList.contains("bk-back");
          if (!back) chapter++;
          var title = c.querySelector("h2").textContent, tag = c.querySelector(".tag");
          var isKisi = v.id === "v-kisi";
          var n = isKisi ? (/^q\d/.test(c.id) ? "Q" + c.id.slice(1).replace(/^0+/, "").toUpperCase() : "") : back ? "" : String(chapter);
          entries.push({ id: c.id, n: n, title: title, back: back });
          var where = isKisi ? (tag ? tag.textContent.split("·")[0].trim() : "") : back ? "Appendix" : "Chapter " + chapter;
          named(c, (where ? where + " · " : "") + title);
        });
      } else if (id === "watch") {
        watchView(v, meta);
        named(v, label);
      } else if (window.SB_CARDS && id === window.SB_CARDS.view) {
        cardsView(v);
        named(v, label);
      } else if (id === "quiz") {
        quizView(v);
        named(v, label);
        entries.push({ id: v.id + "-answers", n: "", title: "Answers and explanations" });
      } else {
        mockView(v);
        named(v, label);
        entries.push({ id: v.id + "-answers", n: "", title: "Model answers" });
      }
      blocks.push(block);
    });
    fixLinks(viewIds);

    var row = function (id, n, title, cls) {
      return "<li" + (cls ? ' class="' + cls + '"' : "") + '><a href="#' + id + '"><span class="bk-c-n">' + n + '</span><span class="bk-c-t">' + esc(title) +
        '</span><span class="bk-c-dots" aria-hidden="true"></span><span class="bk-c-pg" data-pg-for="' + id + '"></span></a></li>';
    };
    var contents = make("nav", "pdf-contents", '<h2 class="bk-contents-h">Contents</h2>' + blocks.map(function (b) {
      return '<ol class="bk-contents-list pdf-c-view"><li class="pdf-c-head"><a href="#' + b.id + '"><span class="bk-c-t">' + esc(b.label) + '</span><span class="bk-c-dots" aria-hidden="true"></span><span class="bk-c-pg" data-pg-for="' + b.id + '"></span></a></li>' +
        b.entries.map(function (e) {
          return e.part ? '<li class="bk-c-part">' + e.part + "</li>" : row(e.id, e.n, e.title, e.back ? "bk-c-back" : "");
        }).join("") + "</ol>";
    }).join(""));
    contents.setAttribute("aria-label", "Contents");

    var cover = make("section", "pdf-cover " + meta.cover.cls,
      '<span class="pdf-cover-code">' + esc(meta.cover.code) + '</span><span class="pdf-cover-t">' + esc(meta.cover.title) + '</span><span class="pdf-cover-rule"></span>' +
      '<span class="pdf-cover-by">' + esc(meta.cover.by) + "</span>" + (meta.cover.meta.indexOf(meta.cover.title) === 0 ? "" : '<span class="pdf-cover-meta">' + esc(meta.cover.meta) + "</span>") + '<span class="pdf-cover-brand">SECOND<i>BRAIN</i></span>');
    main.insertBefore(contents, main.firstChild);
    main.insertBefore(cover, contents);

    var style = make("style");
    style.textContent = pages.replace(/^/, "@page { @top-left { content: " + cssText(meta.short) + "; } }\n");
    document.head.appendChild(style);
    return { views: blocks.map(function (b) { return b.label + " (" + b.entries.length + ")"; }) };
  }

  // write page numbers into the contents; ids the PDF does not know stay blank and are reported
  function number(map) {
    var missing = [];
    $$("[data-pg-for]").forEach(function (c) {
      var n = map[c.dataset.pgFor];
      if (n) c.textContent = n; else missing.push(c.dataset.pgFor);
    });
    return missing;
  }
  // anything wider than the page's text column, measured at print width
  function overflow() {
    var w = $("#main").clientWidth, seen = [];
    $$("#main *").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width && r.right > $("#main").getBoundingClientRect().left + w + 2 && !el.closest("svg .x") && !el.closest(".pdf-cover")) {
        if (!el.parentElement || el.parentElement.getBoundingClientRect().right <= $("#main").getBoundingClientRect().left + w + 2) seen.push(el.tagName + "." + (el.className.baseVal || el.className) + " in " + ((el.closest("section.topic, [data-view]") || {}).id || "?"));
      }
    });
    return seen;
  }
  return { assemble: assemble, number: number, overflow: overflow };
})();
