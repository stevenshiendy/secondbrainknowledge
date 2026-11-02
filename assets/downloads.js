/* SECONDBRAIN downloads: the Downloads panel and the small PNG / SVG buttons under each illustration in a notebook, the
   video buttons in the Watch tab, and the PDF link on each home-page card. The list of files comes from
   downloads-data.js (written by tools/downloads/build_pdf.js). Illustrations are drawn in the browser, in the current theme.
   The buttons under illustrations hold no text nodes, so saved highlights and search inside a chapter are not affected. */
(function () {
  "use strict";

  var all = window.SB_DOWNLOADS || {};
  var base = document.currentScript.src.replace(/assets\/downloads\.js.*$/, "");
  var ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5v9M6 8.8l4 4 4-4M4 16.5h12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var size = function (b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; };
  function fileLink(f, cls, html) {
    return '<a class="' + cls + '" href="' + base + f.href + '" download="' + esc(f.name) + '">' + html + "</a>";
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- home page: a PDF link on each book ---------- */
  document.querySelectorAll("[data-progress-for]").forEach(function (card) {
    var d = all[card.dataset.progressFor], jump = card.querySelector(".jump");
    if (d && d.pdf && jump) jump.insertAdjacentHTML("beforeend", fileLink(d.pdf, "", "Download PDF"));
  });

  var SB = window.SB, book = document.body.dataset.book, mine = all[book];
  if (!SB || !book) return;

  /* ---------- the illustrations in this notebook, numbered as book.css numbers them ---------- */
  var figures = Array.prototype.map.call(document.querySelectorAll("main figure, main .fig"), function (el) {
    var svg = el.querySelector("svg");
    if (!svg) return null;
    var sec = el.closest("section.topic"), view = el.closest("[data-view]"), label = "Illustration", where = "";
    if (sec) {
      var title = sec.querySelector("h2");
      where = title ? title.textContent : "";
      if (!sec.classList.contains("bk-back")) {
        var chs = Array.prototype.filter.call(view.querySelectorAll(":scope > section.topic"), function (s) { return !s.classList.contains("bk-back"); });
        label = "Figure " + (chs.indexOf(sec) + 1) + "." + (Array.prototype.indexOf.call(sec.querySelectorAll("figure, .fig"), el) + 1);
      }
    }
    var cap = el.querySelector(":scope > figcaption, :scope > .cap:not(.fig-key)");
    var name = (cap && cap.textContent.trim()) || svg.getAttribute("aria-label") || where || label;
    return { el: el, svg: svg, view: view, label: label, name: name.replace(/\s+/g, " "), where: where };
  }).filter(Boolean);

  function fileBase(f) {
    var words = f.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 8).join("-");
    return [book, f.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), words].join("-");
  }
  function save(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
  }

  /* ---------- an illustration as a file of its own ----------
     On the page, its colours and type come from the site's stylesheets, so they are written onto a copy of each shape. */
  var STYLE = { "fill": "", "stroke": "none", "stroke-width": "1px", "stroke-dasharray": "none", "stroke-dashoffset": "0px", "stroke-linecap": "butt", "stroke-linejoin": "miter", "fill-opacity": "1", "stroke-opacity": "1", "opacity": "1", "fill-rule": "nonzero", "paint-order": "normal", "visibility": "visible" };
  var TEXT = { "font-family": "", "font-size": "", "font-weight": "400", "font-style": "normal", "letter-spacing": "normal", "text-anchor": "start", "dominant-baseline": "auto" };
  function inline(from, to) {
    var cs = getComputedStyle(from), css = [], add = function (set) {
      Object.keys(set).forEach(function (p) {
        var v = cs.getPropertyValue(p);
        if (v && v !== set[p]) css.push(p + ":" + v);
      });
    };
    add(STYLE);
    if (/^(text|tspan|textPath)$/.test(from.tagName)) add(TEXT);
    if (from.tagName === "rect") add({ rx: "auto", ry: "auto" });
    if (from.tagName === "stop") add({ "stop-color": "", "stop-opacity": "1" });
    to.removeAttribute("class");
    to.setAttribute("style", css.join(";"));
  }
  function svgFile(f) {
    var copy = f.svg.cloneNode(true), froms = f.svg.querySelectorAll("*"), tos = copy.querySelectorAll("*");
    for (var i = 0; i < froms.length; i++) inline(froms[i], tos[i]);
    var box = (f.svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    if (box.length !== 4 || box.some(isNaN)) box = [0, 0, parseFloat(f.svg.getAttribute("width")) || 900, parseFloat(f.svg.getAttribute("height")) || 500];
    copy.removeAttribute("class");
    copy.removeAttribute("style");
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("viewBox", box.join(" "));
    copy.setAttribute("width", box[2]);
    copy.setAttribute("height", box[3]);
    // the page's background, so the colours read the way they do in the book
    var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", box[0]); bg.setAttribute("y", box[1]); bg.setAttribute("width", box[2]); bg.setAttribute("height", box[3]);
    bg.setAttribute("fill", getComputedStyle(document.body).backgroundColor);
    copy.insertBefore(bg, copy.firstChild);
    return { text: new XMLSerializer().serializeToString(copy), w: box[2], h: box[3] };
  }
  function download(f, kind, btn) {
    var file = svgFile(f);
    if (kind === "svg") return save(new Blob([file.text], { type: "image/svg+xml" }), fileBase(f) + ".svg");
    var img = new Image(), scale = Math.min(4, Math.max(2, 2400 / file.w));
    if (btn) btn.setAttribute("aria-busy", "true");
    var done = function () { if (btn) btn.removeAttribute("aria-busy"); };
    img.onload = function () {
      var c = document.createElement("canvas");
      c.width = Math.round(file.w * scale);
      c.height = Math.round(file.h * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function (blob) { done(); if (blob) save(blob, fileBase(f) + ".png"); }, "image/png");
    };
    img.onerror = done;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(file.text);
  }
  function figButtons(i, f) {
    return ["png", "svg"].map(function (k) {
      return '<button type="button" data-fig="' + i + '" data-as="' + k + '" data-label="' + k.toUpperCase() + '" aria-label="Download ' + esc(f.label) + " as " + k.toUpperCase() + '" title="Download as ' + k.toUpperCase() + '">' + ICON + "</button>";
    }).join("");
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-fig]");
    if (b) download(figures[+b.dataset.fig], b.dataset.as, b);
  });

  figures.forEach(function (f, i) {
    var bar = document.createElement("div");
    bar.className = "dl-fig";
    bar.innerHTML = figButtons(i, f);
    f.el.appendChild(bar);
  });

  /* ---------- Watch tab ---------- */
  var media = mine ? mine.media : [];
  var watch = document.querySelector("#v-watch .watch-video, #v-watch .watch-frame");
  if (watch && media.length) {
    var row = document.createElement("div");
    row.className = "dl-watch";
    row.innerHTML = media.map(function (m) {
      return fileLink(m, "dl-link", ICON + "<span>Download " + m.label.toLowerCase() + " <small>" + m.type + " · " + size(m.bytes) + "</small></span>");
    }).join("");
    watch.insertAdjacentElement("afterend", row);
  }

  /* ---------- the Downloads panel ---------- */
  var viewName = function (v) {
    var a = document.querySelector('.sb-nav a[href="#' + v.id.replace(/^v-/, "") + '"]');
    return a ? a.textContent : "Illustrations";
  };
  SB.panel("downloads", "Downloads", function (body) {
    var row = function (f, title, sub) {
      return fileLink(f, "sb-row dl-row", '<span class="grow">' + esc(title) + "<small>" + sub + "</small></span>" + ICON);
    };
    var html = "";
    if (mine && mine.pdf) {
      html += '<span class="sb-label">Whole book</span><div class="sb-group">' +
        row(mine.pdf, mine.pdf.title, "PDF · A4 · " + (mine.pdf.pages ? mine.pdf.pages + " pages · " : "") + size(mine.pdf.bytes)) + "</div>" +
        '<p class="sb-note">Every chapter and tab, with the contents, answers and model answers. Your highlights stay on this device and are not in the PDF.</p>';
    }
    var kinds = { video: "Videos", audio: "Audio", image: "Images" };
    Object.keys(kinds).forEach(function (k) {
      var list = media.filter(function (m) { return m.kind === k; });
      if (!list.length) return;
      html += '<span class="sb-label">' + kinds[k] + '</span><div class="sb-group">' + list.map(function (m) {
        return row(m, m.title + (k === "image" ? " poster" : k === "audio" ? " narration" : ""), m.type + " · " + (m.duration ? m.duration + " · " : "") + size(m.bytes));
      }).join("") + "</div>";
    });
    if (figures.length) {
      html += '<span class="sb-label">Illustrations · ' + figures.length + '</span><p class="sb-note dl-note">Saved in the colours of your current theme. To change them, pick another theme under Aa first.</p>';
      var last = null;
      figures.forEach(function (f, i) {
        if (f.view !== last) {
          html += (last ? "</div>" : "") + '<span class="dl-sub">' + esc(viewName(f.view)) + '</span><div class="sb-group">';
          last = f.view;
        }
        html += '<div class="dl-figrow"><span class="grow"><small>' + esc(f.label) + (f.where ? " · " + esc(f.where) : "") + "</small>" + esc(f.name) + '</span><span class="dl-fig">' + figButtons(i, f) + "</span></div>";
      });
      html += "</div>";
    }
    body.innerHTML = html;
  });
  var prefs = document.querySelector('.sb-tool-group [data-panel="prefs"]');
  if (prefs) {
    var btn = document.createElement("button");
    btn.className = "sb-icon";
    btn.dataset.panel = "downloads";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Downloads");
    btn.title = "Downloads";
    btn.innerHTML = ICON;
    prefs.parentNode.insertBefore(btn, prefs);
  }
})();
