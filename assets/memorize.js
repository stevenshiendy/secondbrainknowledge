/* The Memorize tab: one endless quiz per exam question, built from the data in #memdata.
   Items that are missed come back after a couple of questions; items that are known come back less and less often.
   A fill-in-the-blank starts as multiple choice and becomes typed once it has been answered correctly twice. */
(function () {
  var root = document.getElementById("v-memorize"), dataEl = document.getElementById("memdata");
  if (!root || !dataEl) return;
  var DATA = JSON.parse(dataEl.textContent), BOOK = document.body.dataset.book, $ = function (id) { return document.getElementById(id); };
  var GAPS = [3, 6, 14, 30, 70, 160, 350];   // questions to wait after a correct answer, by level
  var KNOWN = 3, TYPED_FROM = 2, RECALL_AFTER = 10;

  var store = {
    get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(BOOK + "-mem-" + k)); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(BOOK + "-mem-" + k, JSON.stringify(v)); } catch (e) { /* this device will not remember */ } }
  };
  var esc = function (t) { return String(t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };
  var rand = function (n) { return Math.floor(Math.random() * n); };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var terms = function (s) { var out = [], re = /\[\[(.+?)\]\]/g, m; while ((m = re.exec(s))) out.push(m[1]); return out; };
  var plain = function (s) { return s.replace(/\[\[|\]\]/g, ""); };
  var bold = function (s, only) { return esc(s).replace(/\[\[(.+?)\]\]/g, function (_, w) { return w === only ? '<mark>' + w + "</mark>" : "<b>" + w + "</b>"; }); };

  // ---------- what can be asked for one exam question ----------
  function itemsFor(ex) {
    var items = [];
    ex.line.forEach(function (stop, i) { items.push({ id: "line" + i, type: "line", i: i }); });
    ex.parts.forEach(function (p, i) { if (p.stops.length) items.push({ id: "part" + i, type: "part", i: i }); });
    ex.stops.forEach(function (st, s) {
      st.sentences.forEach(function (sent, n) {
        terms(sent).forEach(function (w, t) { items.push({ id: "gap" + s + "." + n + "." + t, type: "gap", s: s, n: n, w: w }); });
      });
    });
    ex.stops.forEach(function (st, s) {
      st.sentences.forEach(function (sent, n) { if (terms(sent).length) items.push({ id: "where" + s + "." + n, type: "where", s: s, n: n }); });
    });
    ex.stops.forEach(function (st, s) { items.push({ id: "recall" + s, type: "recall", s: s }); });
    return items;
  }
  function allTerms(ex) { var o = []; ex.stops.forEach(function (st) { o = o.concat(terms(st.text)); }); return o; }
  var numeric = function (w) { return /\d/.test(w); };
  var unit = function (w) { return /%$/.test(w) ? "%" : /\bmillion$/.test(w) ? "million" : numeric(w) ? "#" : "t"; };
  var head = function (w) { return w.toLowerCase().split(/[\s-]+/)[0]; };

  // Wrong answers come from the other key words the student is learning, the closest kind first.
  function distractors(ex, it) {
    var w = it.w, shown = terms(ex.stops[it.s].sentences[it.n]), others = [];
    DATA.exam.forEach(function (e) { if (e !== ex) others = others.concat(allTerms(e)); });
    var ok = function (x) { return x !== w && shown.indexOf(x) < 0 && head(x) !== head(w); };
    var mine = allTerms(ex).filter(ok), far = others.filter(ok), picked = [], u = unit(w), caps = /^[A-Z]/.test(w);
    var add = function (list) { shuffle(list).forEach(function (x) { if (picked.length < 3 && picked.indexOf(x) < 0) picked.push(x); }); };
    if (numeric(w)) {
      add(mine.filter(function (x) { return unit(x) === u; })); add(far.filter(function (x) { return unit(x) === u; }));
      add(mine.filter(numeric)); add(far.filter(numeric));
    } else {
      add(mine.filter(function (x) { return !numeric(x) && /^[A-Z]/.test(x) === caps; }));
      add(mine.filter(function (x) { return !numeric(x); })); add(far.filter(function (x) { return !numeric(x); }));
    }
    return picked;
  }

  // Forgives capitals, punctuation, little words and a small typing slip. Numbers must be exact.
  var squash = function (s) { return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9.%\s]/g, " ").replace(/\b(and|the|a|of|an)\b/g, " ").replace(/\s+/g, " ").trim(); };
  function edit(a, b) {
    var p = [], i, j; for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) { var d = p[0]; p[0] = i; for (j = 1; j <= b.length; j++) { var t = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, d + (a[i - 1] === b[j - 1] ? 0 : 1)); d = t; } }
    return p[b.length];
  }
  function closeEnough(typed, want) {
    var a = squash(typed), b = squash(want);
    if (!a) return false;
    if (numeric(want)) { var n = function (s) { return (s.match(/[\d.]*\d/g) || []).join(" "); }; return n(a) === n(b); }
    return a === b || edit(a, b) <= Math.floor(b.length / 7);
  }

  // ---------- one deck's memory ----------
  function Deck(ex) { this.ex = ex; this.items = itemsFor(ex); this.state = store.get(ex.id, { n: 0, streak: 0, right: 0, seen: {} }); }
  Deck.prototype.pick = function () {
    var st = this.state, self = this, last = st.last;
    var open = this.items.filter(function (it) { return it.type !== "recall" || st.n >= RECALL_AFTER; });
    var seen = open.filter(function (it) { return st.seen[it.id] && it.id !== last; });
    var due = seen.filter(function (it) { return st.seen[it.id].due <= st.n; });
    var fresh = open.filter(function (it) { return !st.seen[it.id]; });
    // Every third question brings something new, even when old items are waiting, so nobody gets stuck on the first few.
    if (fresh.length && (!due.length || st.n % 3 === 2)) {
      var basics = fresh.filter(function (it) { return it.type === "line" || it.type === "part"; });
      return basics.length ? basics[0] : fresh[rand(fresh.length)];
    }
    var missed = due.filter(function (it) { return st.seen[it.id].miss; });
    if (missed.length) {   // what was just missed comes first, with an older miss mixed in so none are left behind
      missed.sort(function (a, b) { return st.seen[b.id].due - st.seen[a.id].due; });
      return Math.random() < .7 ? missed[0] : missed[missed.length - 1];
    }
    if (due.length) {
      var soonest = Math.min.apply(null, due.map(function (it) { return st.seen[it.id].due; }));
      var first = due.filter(function (it) { return st.seen[it.id].due === soonest; });
      return first[rand(first.length)];
    }
    var lowest = Math.min.apply(null, seen.map(function (it) { return st.seen[it.id].due; }));   // nothing is due: the quiz just keeps going
    var next = seen.filter(function (it) { return st.seen[it.id].due === lowest; });
    return next[rand(next.length)] || self.items[0];
  };
  Deck.prototype.mark = function (it, right) {
    var st = this.state, cur = st.seen[it.id] || { lv: 0 };
    st.n++; st.last = it.id;
    if (right) { cur.lv = Math.min(cur.lv + 1, GAPS.length); cur.due = st.n + GAPS[cur.lv - 1]; cur.miss = false; st.streak++; st.right++; }
    else { cur.lv = Math.max(0, cur.lv - 2); cur.due = st.n + 2; cur.miss = true; st.streak = 0; }
    st.seen[it.id] = cur;
    store.set(this.ex.id, st);
  };
  Deck.prototype.known = function () { var st = this.state; return this.items.filter(function (it) { return st.seen[it.id] && st.seen[it.id].lv >= KNOWN; }).length; };
  Deck.prototype.reset = function () { this.state = { n: 0, streak: 0, right: 0, seen: {} }; store.set(this.ex.id, this.state); };

  // ---------- turning an item into a question ----------
  function ask(deck, it) {
    var ex = deck.ex, lv = (deck.state.seen[it.id] || { lv: 0 }).lv;
    if (it.type === "line") {
      var answer = ex.line[it.i], prev = it.i ? ex.line[it.i - 1] : null;
      return { kind: "The line", prompt: prev ? "In this answer's line, what comes after <b>" + esc(prev) + "</b>?" : "What is the <b>first</b> stop of this answer's line?",
        answer: answer, options: shuffle(ex.line), stop: ex.stops[it.i], showLine: true };
    }
    if (it.type === "part") {
      var part = ex.parts[it.i], correct = part.stops[rand(part.stops.length)];
      return { kind: "The exam question", prompt: "The paper asks for this. Which stop answers it?<span class=\"mem-q\">" + esc(part.text) + "</span>", answer: correct,
        options: shuffle(ex.line.filter(function (s) { return s === correct || part.stops.indexOf(s) < 0; })), stop: ex.stops[ex.line.indexOf(correct)] };
    }
    if (it.type === "where") {
      return { kind: "Where does it go?", prompt: "Which stop does this sentence belong to?<span class=\"mem-q\">" + esc(plain(ex.stops[it.s].sentences[it.n])) + "</span>",
        answer: ex.line[it.s], options: shuffle(ex.line), stop: ex.stops[it.s] };
    }
    if (it.type === "recall") {
      return { kind: "Say it", prompt: "Say the <b>" + esc(ex.line[it.s]) + "</b> paragraph out loud, or write it down, without looking. Then check.", recall: true, stop: ex.stops[it.s] };
    }
    var sentence = ex.stops[it.s].sentences[it.n], done = false;
    var gapped = esc(sentence).replace(/\[\[(.+?)\]\]/g, function (_, w) { if (w === it.w && !done) { done = true; return '<span class="mem-gap" aria-label="blank"></span>'; } return w; });
    var q = { kind: "Fill the blank · " + ex.line[it.s], prompt: gapped, answer: it.w, stop: ex.stops[it.s], target: it.w, promptClass: "mem-sentence" };
    if (lv >= TYPED_FROM) { q.typed = true; q.kind = "Type the blank · " + ex.line[it.s]; } else q.options = shuffle(distractors(ex, it).concat(it.w));
    return q;
  }

  // ---------- the page ----------
  var decks = {}; DATA.exam.forEach(function (ex) { decks[ex.id] = new Deck(ex); });
  var active = store.get("active", DATA.exam[0].id); if (!decks[active]) active = DATA.exam[0].id;
  var current = null, answered = false;

  $("mem-tabs").innerHTML = DATA.exam.map(function (ex) { return '<button type="button" data-deck="' + ex.id + '">' + esc(ex.label) + "</button>"; }).join("");
  $("mem-tabs").addEventListener("click", function (e) { var b = e.target.closest("[data-deck]"); if (b) { active = b.dataset.deck; store.set("active", active); showDeck(); } });
  $("mem-reset").addEventListener("click", function () { if (confirm("Start this quiz again from the beginning?")) { decks[active].reset(); showDeck(); } });

  function stats() {
    var d = decks[active], total = d.items.length, known = d.known();
    $("mem-count").textContent = d.state.n + " answered · streak " + d.state.streak;
    $("mem-known").textContent = known + " of " + total + " memorized";
    $("mem-bar").style.width = (100 * known / total).toFixed(1) + "%";
  }
  function showDeck() {
    var ex = decks[active].ex;
    Array.prototype.forEach.call($("mem-tabs").children, function (b) { b.setAttribute("aria-pressed", b.dataset.deck === active ? "true" : "false"); });
    $("mem-ask").innerHTML = "<summary>See the exam question</summary><p>" + esc(ex.stem) + "</p>" + (ex.topic ? "<p><b>" + esc(ex.topic) + "</b></p>" : "") + '<ol type="a">' + ex.paperParts.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ol>";
    nextQuestion();
  }
  function toCard() {   // the answer panel can be long: bring the new question back into view
    var top = $("mem-card").getBoundingClientRect().top;
    if (top < 80) window.scrollBy(0, top - 90);
  }
  function nextQuestion() {
    var d = decks[active], it = d.pick(), q = ask(d, it);
    current = { it: it, q: q }; answered = false;
    var body = '<div class="mem-kind">' + esc(q.kind) + '</div><p class="mem-prompt ' + (q.promptClass || "") + '">' + q.prompt + "</p>";
    if (q.options) body += '<div class="mem-opts">' + q.options.map(function (o, i) { return '<button type="button" class="opt" data-o="' + esc(o) + '"><span class="mem-n">' + (i + 1) + "</span>" + esc(o) + "</button>"; }).join("") + "</div>";
    if (q.typed) body += '<form class="mem-type" id="mem-form"><input id="mem-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer"><button class="primary">Check</button><button type="button" id="mem-idk">Show me</button></form>';
    if (q.recall) body += '<div class="row"><button type="button" class="primary" id="mem-reveal">Check my answer</button></div>';
    body += '<div id="mem-fb"></div>';
    $("mem-card").innerHTML = body;
    stats();
    if (q.typed) {
      $("mem-form").addEventListener("submit", function (e) { e.preventDefault(); var v = $("mem-input").value; if (v.trim()) finish(closeEnough(v, q.answer), v); });
      $("mem-idk").addEventListener("click", function () { finish(false, ""); });
      if (!root.hidden) $("mem-input").focus({ preventScroll: true });
    }
    if (q.recall) $("mem-reveal").addEventListener("click", revealRecall);
    if (q.options) Array.prototype.forEach.call($("mem-card").querySelectorAll(".opt"), function (b) { b.addEventListener("click", function () { choose(b); }); });
  }
  function choose(b) {
    if (answered) return;
    var right = b.dataset.o === current.q.answer;
    Array.prototype.forEach.call($("mem-card").querySelectorAll(".opt"), function (x) { x.disabled = true; if (x.dataset.o === current.q.answer) x.classList.add("right"); });
    if (!right) b.classList.add("wrong");
    finish(right);
  }
  function paragraph(q) {
    var st = q.stop, ex = decks[active].ex;
    return '<p class="mem-para"><span class="mem-stop">' + esc(st.name) + "</span> " + bold(st.text, q.target) + "</p>"
      + (st.text.indexOf("†") >= 0 ? '<p class="mem-note">† From outside the slides (Tanev, 2012).</p>' : "")
      + '<p class="mem-note"><b>The line:</b> ' + ex.line.map(function (s) { return s === st.name ? "<b>" + esc(s) + "</b>" : esc(s); }).join(" → ") + "</p>";
  }
  function picture(q, open) {
    return "<details class=\"mem-pic\"" + (open ? " open" : "") + "><summary>See the picture</summary>" + q.stop.svg + "<p>" + esc(q.stop.caption) + "</p></details>";
  }
  function finish(right, typed) {
    answered = true;
    var q = current.q, d = decks[active]; d.mark(current.it, right);
    var verdict = right ? (q.typed && typed && squash(typed) !== squash(q.answer) ? "Correct. Exact words: <b>" + esc(q.answer) + "</b>" : "Correct") : q.answer ? "The answer is <b>" + esc(q.answer) + "</b>" : "";
    if (q.typed) { $("mem-input").disabled = true; Array.prototype.forEach.call($("mem-form").querySelectorAll("button"), function (x) { x.disabled = true; }); }
    $("mem-fb").innerHTML = '<div class="mem-verdict ' + (right ? "is-right" : "is-wrong") + '" role="status">' + verdict + "</div>" + paragraph(q) + picture(q, !right) + '<div class="row"><button type="button" class="primary" id="mem-next">Next question</button></div>';
    $("mem-next").addEventListener("click", function () { nextQuestion(); toCard(); });
    $("mem-next").focus({ preventScroll: true });
    stats();
  }
  function revealRecall() {
    var q = current.q;
    $("mem-reveal").parentNode.remove();
    $("mem-fb").innerHTML = paragraph(q) + picture(q, false) + '<div class="row"><button type="button" class="primary" id="mem-yes">I got it</button><button type="button" id="mem-no">Not yet</button></div>';
    var done = function (right) { answered = true; decks[active].mark(current.it, right); nextQuestion(); toCard(); };
    $("mem-yes").addEventListener("click", function () { done(true); });
    $("mem-no").addEventListener("click", function () { done(false); });
    $("mem-yes").focus({ preventScroll: true });
  }

  // Number keys choose an option. Enter moves on from any focused button by itself.
  document.addEventListener("keydown", function (e) {
    if (root.hidden || answered || !current || !current.q.options || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var n = parseInt(e.key, 10), opts = $("mem-card").querySelectorAll(".opt");
    if (n >= 1 && n <= opts.length) { e.preventDefault(); choose(opts[n - 1]); }
  });

  window.SB_MEMORIZE = { decks: decks, closeEnough: closeEnough, now: function () { return current; } };
  showDeck();
})();
