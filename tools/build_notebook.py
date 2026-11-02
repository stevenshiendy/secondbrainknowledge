#!/usr/bin/env python3
"""Build a SECONDBRAIN notebook from a study pack written to tools/notebook-brief.md.

    python3 -I tools/build_notebook.py <pack folder>

The pack folder holds notebook.json, walkthrough.html and practice.json (sources.md is kept
for reference). Writes notes/<slug>.html on the GSCM page shell, with Walkthrough, Flashcards,
Quiz and Mock exam tabs, and adds or refreshes the notebook's card on the home page shelf.
Without a practice.json the page has the Walkthrough only, for notes meant just for reading.
A "video" entry in notebook.json adds a Watch tab; its files live in notes/<video folder>/.
"tabs" adds more reading tabs, as [{"id", "label", "file"}], and "tab_label" renames the first.
"lang" and "languages" ({"en": slug, "id": slug}) pair two packs of one notebook with an EN/ID switch;
the first language listed holds the shelf card.
An exam-questions.md adds a Kisi-kisi tab with show-answer boxes and "I can explain this" self-checks.
Keep a copy of the pack in packs/<slug>/ so the notebook can be rebuilt.
"""
import html, json, re, sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
if len(sys.argv) != 2:
    sys.exit(__doc__)
PACK = Path(sys.argv[1]).resolve()
meta = json.loads((PACK / "notebook.json").read_text())
walk = (PACK / "walkthrough.html").read_text().strip()
extra_tabs = meta.get("tabs", [])
for tab in extra_tabs:
    tab["html"] = (PACK / tab["file"]).read_text().strip()
walk_all = "\n".join([walk] + [tab["html"] for tab in extra_tabs])
CHAPTER = re.compile(r'<section class="topic(?! kq)[^"]*" id="([^"]+)"[^>]*>.*?<h2>(.*?)</h2>', re.S)
lang, languages = meta.get("lang", "en"), meta.get("languages", {})
has_practice = (PACK / "practice.json").exists()
prac = json.loads((PACK / "practice.json").read_text()) if has_practice else {}
slug = meta["slug"]
if not re.fullmatch(r"[a-z0-9-]+", slug):
    sys.exit("notebook.json: slug must be lowercase letters, digits and hyphens")
esc = lambda s: html.escape(str(s), quote=True)

# ---------- exam-questions.md becomes the Kisi-kisi tab ----------
def kisi_view(md):
    titles = {m.group(1): re.sub(r"<[^>]+>", "", m.group(2)) for m in CHAPTER.finditer(walk_all)}
    def inline(t):
        t = esc(t).replace("&#x27;", "'").replace("&quot;", '"')
        t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
        t = re.sub(r"\*(.+?)\*", r"<i>\1</i>", t)
        t = re.sub(r"(https?://[^\s<]+[^\s<.,;)])", r'<a href="\1">\1</a>', t)
        def chapter(m):
            if m.group(1) not in titles:
                problems.append("exam-questions.md names unknown chapter " + m.group(1))
            return '<a href="#%s">%s</a>' % (m.group(1), titles.get(m.group(1), m.group(1)))
        return re.sub(r"`([^`]+)`", chapter, t)
    def paras(text):
        out = []
        for block in re.split(r"\n\s*\n", text.strip()):
            out.append(block.strip() if block.lstrip().startswith("<figure") else "<p>%s</p>" % inline(block.strip()))
        return "".join(out)
    items = lambda text: [re.sub(r"^(- |\d+\. )", "", l.strip()) for l in text.strip().splitlines() if l.strip()]
    block = lambda n, head, body: '<div class="kq-block kq-%d"><h3 class="kq-h">%s</h3>%s</div>' % (n, head, body)

    h1 = re.search(r"^# (.+)$", md, re.M).group(1)
    parts = re.split(r"^## ", md, flags=re.M)
    intro = [p.strip() for p in re.sub(r"^# .+$", "", parts[0], flags=re.M).split("---")[0].split("\n\n") if p.strip()]
    sections, toc, refs = [], [], ""
    for part in parts[1:]:
        first, _, body = part.partition("\n")
        body = body.replace("\n---\n", "\n").strip()
        if first.strip() == "References":
            refs = ('<section class="topic kq bk-back" id="q-refs"><span class="tag">References · Kisi-kisi</span><h2>References</h2>%s</section>' % paras(body))
            continue
        m = re.match(r"Q(\d+)([A-Z]?)\.\s*(.+)", first)
        if not m:
            problems.append("exam-questions.md: heading not understood: " + first[:60])
            continue
        num, sid = m.group(1) + m.group(2), "q%02d%s" % (int(m.group(1)), m.group(2).lower())
        title = re.search(r"^\*\*Title:\*\*\s*(.+)$", body, re.M)
        title = title.group(1).strip() if title else re.split(r"(?<=[.?!:])\s", m.group(3))[0]
        weight = re.search(r"^\*\*Weight / CILO:\*\*\s*(.+)$", body, re.M)
        sub = dict(re.findall(r"^### (.+?)\n(.*?)(?=^### |\Z)", body, re.M | re.S))
        need = [k for k in ("What the question is really asking", "Reasoning staircase", "Model answer") if k not in sub]
        problems.extend("exam-questions.md: Q%s has no %s" % (num, k) for k in need)
        if need:
            continue
        html_ = ['<section class="topic kq" id="%s"><span class="tag">Question %s · Kisi-kisi</span><h2>%s</h2>' % (sid, num, inline(title))]
        html_.append(block(1, "The question", '<p class="kq-lead">%s</p>%s' % (inline(m.group(3)), '<p class="kq-keys">%s</p>' % inline(weight.group(1)) if weight else "")))
        html_.append(block(1, "What the question is really asking", paras(sub["What the question is really asking"])))
        if "Key terms" in sub:
            html_.append(block(2, "Key terms", "<ul>%s</ul>" % "".join("<li>%s</li>" % inline(i) for i in items(sub["Key terms"]))))
        steps = "".join('<li><span class="kq-n" aria-hidden="true">%d</span><span class="sr">Step %d: </span><p>%s</p></li>' % (i + 1, i + 1, inline(t)) for i, t in enumerate(items(sub["Reasoning staircase"])))
        html_.append(block(2, "Reasoning staircase", '<ol class="kq-steps">%s</ol>' % steps))
        if "Draw this in the exam" in sub:
            html_.append(block(3, "Draw this in the exam", paras(sub["Draw this in the exam"])))
        html_.append(block(4, "Model answer", '<div class="kq-answer"><div class="kq-answer-bar"><button class="kq-reveal" data-reveal aria-expanded="false" aria-controls="%s-ans">Show answer</button><button class="kq-copy" data-copy="%s-ans">Copy</button></div><div class="kq-answer-body" id="%s-ans" hidden>%s</div></div>' % (sid, sid, sid, paras(sub["Model answer"]))))
        if "Common mistakes" in sub:
            html_.append(block(5, "Common mistakes", '<ul class="kq-mistakes">%s</ul>' % "".join("<li>%s</li>" % inline(i) for i in items(sub["Common mistakes"]))))
        html_.append('<label class="kq-check"><input type="checkbox" data-selfcheck="%s"><span>I can explain this without looking</span></label></section>' % sid)
        sections.append("".join(html_))
        toc.append('<a href="#%s"><b>Q%s</b> %s</a>' % (sid, num, inline(title)))
    how = "".join("<p>%s</p>" % inline(p) for p in intro[1:])
    return "\n".join(filter(None, [
        '<p class="kicker">%s · Kisi-kisi</p>' % esc(meta.get("course_code", "")),
        "<h1>%s</h1>" % esc(h1),
        '<p class="lede">%s</p>' % inline(intro[0]) if intro else "",
        '<div class="kq-how">%s</div>' % how if how else "",
        '<div class="kq-bar"><span class="kq-count"><b data-check-count>0</b> of %d marked “I can explain this”</span><button class="kq-all" data-reveal-all aria-pressed="false">Show all answers</button></div>' % len(sections),
        '<nav class="kq-toc" aria-label="Kisi-kisi questions">%s</nav>' % "".join(toc),
        *sections, refs]))

# ---------- check the walkthrough against the brief ----------
problems = []
n_kisi = 0
if (PACK / "exam-questions.md").exists():
    kisi = kisi_view((PACK / "exam-questions.md").read_text())
    n_kisi = kisi.count('class="topic kq" id="q')
    extra_tabs.insert(0, {"id": "kisi", "label": "Kisi-kisi", "file": "exam-questions.md", "html": kisi})
    walk_all += "\n" + kisi
for bad in ("<style", "<script", "<html", "<body", 'fill="#', 'stroke="#', "<img", "foreignObject"):
    if bad.lower() in walk_all.lower():
        problems.append("walkthrough.html contains " + bad)
ids = re.findall(r'\bid="([^"]+)"', walk_all)
problems += ["duplicate id: " + i for i in sorted({i for i in ids if ids.count(i) > 1})]
problems += ["broken link: #" + h for h in sorted(set(re.findall(r'href="#([^"]+)"', walk_all)) - set(ids))]
chapters = {m.group(1): re.sub(r"<[^>]+>", "", m.group(2)) for m in CHAPTER.finditer(walk_all)}
cards, quiz, mock = prac.get("flashcards", []), prac.get("quiz", []), prac.get("mock_exam", {})
for kind, items in (("flashcard", cards), ("quiz item", quiz)):
    for n, it in enumerate(items):
        if it.get("chapter") and it["chapter"] not in chapters:
            problems.append("%s %d names unknown chapter %s" % (kind, n + 1, it["chapter"]))
for n, q in enumerate(quiz):
    if not 0 <= q["answer"] < len(q["options"]):
        problems.append("quiz item %d: answer out of range" % (n + 1))
if problems:
    sys.exit("pack problems:\n  " + "\n  ".join(problems))

video = meta.get("video")
if video:
    for name in (video["file"], video.get("poster")):
        if name and not (SITE / "notes" / video["folder"] / name).exists():
            sys.exit("notebook.json: video file not found: notes/%s/%s" % (video["folder"], name))

# ---------- practice data, in the shape the page script below reads ----------
decks = prac.get("decks", {})
data = {
    "decks": decks,
    "cards": [{"d": c["deck"], "f": c["front"], "b": c["back"], "w": c.get("week"), "c": c.get("chapter"),
               "x": c.get("quizzable", True)} for c in cards],
    "quiz": [{"q": q["q"], "o": q["options"], "a": q["answer"], "e": q.get("why", ""), "w": q.get("week"),
              "c": q.get("chapter")} for q in quiz],
    "mock": [{"s": s.get("title", "Section " + s.get("id", "")), "q": q["q"], "m": q.get("marks"),
              "a": q.get("model_answer", ""), "p": q.get("marking_points", []),
              "r": [[c, chapters[c]] for c in q.get("chapters", []) if c in chapters]}
             for s in mock.get("sections", []) for q in s.get("questions", [])],
}
data_js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

# ---------- page ----------
shell = (SITE / "notes" / "gscm-midterm.html").read_text()
head = shell[: shell.index("<body")]
title, short = meta.get("title", slug), meta.get("short_title", meta.get("title", slug))
head = re.sub(r"<title>.*?</title>", lambda m: "<title>%s · SECONDBRAIN</title>" % esc(title), head)
head = re.sub(r'<meta name="description" content="[^"]*">',
              lambda m: '<meta name="description" content="%s">' % esc(meta.get("shelf_blurb", title)), head)
head = head.replace('<html lang="en">', '<html lang="%s">' % esc(lang))
if languages:
    primary, first = next(iter(languages.values())), next(iter(languages))
    if lang == first:  # the shelf links here; go straight to the language this reader chose last time
        redirect = "".join('if(l===%s)location.replace(%s+location.hash);' % (json.dumps(k), json.dumps(v + ".html")) for k, v in languages.items() if k != first)
        head = head.replace("</head>", '<script>try{var l=localStorage.getItem("sb-lang:%s");%s}catch(e){}</script>\n</head>' % (primary, redirect))
header = shell[shell.index("<header"): shell.index("</header>") + 9]
header = header.replace("GSCM Midterm</span>", esc(short) + "</span>")
lang_switch = ""
if languages:
    lang_switch = '<span class="sb-lang" role="group" aria-label="Language">' + "".join(
        '<button type="button" lang="%s" data-lang-to="%s" aria-pressed="%s">%s</button>' % (k, esc(v), "true" if k == lang else "false", k.upper())
        for k, v in languages.items()) + '</span>'
header = re.sub(r'<nav class="sb-nav".*?</nav>', '<nav class="sb-nav" id="nav" aria-label="Notebook sections">\n    '
                '<a href="#learn">' + esc(meta.get("tab_label", "Walkthrough")) + '</a>' + "".join('<a href="#%s">%s</a>' % (esc(t["id"]), esc(t["label"])) for t in extra_tabs) + ('<a href="#watch">Watch</a>' if video else '') + ('<a href="#cards">Flashcards</a><a href="#quiz">Quiz</a><a href="#mock">Mock exam</a>' if has_practice else '') + lang_switch + '\n  </nav>',
                header, flags=re.S)

n_q = len(quiz)
minutes = mock.get("minutes")
mock_lede = " ".join(filter(None, [
    "A full practice paper%s." % (" to answer in %d minutes" % minutes if minutes else ""),
    esc(mock.get("instructions", "")),
    "Write your answer on paper first, then open the model answer and compare. Each question links to the chapters it draws on.",
]))
watch = ""
if video:
    src = esc(video["folder"]) + "/"
    poster = ' poster="%s%s"' % (src, esc(video["poster"])) if video.get("poster") else ""
    stamp = lambda t: "%d:%02d" % (t // 60, t % 60)
    chapter_buttons = "".join('<button data-t="%s"><b>%s</b> %s</button>' % (t, stamp(int(t)), esc(n)) for t, n in video.get("chapters", []))
    watch = f'''

<!-- ================= WATCH ({esc(video["folder"])}/) ================= -->
<div id="v-watch" data-view hidden>
<h1>{esc(video.get("title", "Watch"))}</h1>
<p class="lede">{esc(video.get("blurb", ""))}</p>
<div class="watch-video"><video id="watchvideo" controls playsinline preload="metadata"{poster} src="{src}{esc(video["file"])}"></video></div>
<div class="watch-chapters">{chapter_buttons}</div>
</div>'''

tab_views = "".join('''

<!-- ================= %s (%s/%s) ================= -->
<div id="v-%s" data-view data-readable data-title="%s" hidden>
%s
</div>''' % (esc(t["label"]).upper(), esc(PACK.name), esc(t["file"]), esc(t["id"]), esc(t["label"]), t["html"]) for t in extra_tabs)
learn_title = ' data-title="%s"' % esc(meta["tab_label"]) if meta.get("tab_label") else ""
views = f'''<div id="v-learn" data-view data-readable{learn_title}>
{walk}
</div>{tab_views}{watch}'''
if has_practice:
    views += f'''

<!-- ================= FLASHCARDS ================= -->
<div id="v-cards" data-view hidden>
<h1>Flashcards</h1>
<p class="lede">Tap the card to flip it. "Got it" removes the card from this round; "Again" keeps it. Choose a deck to study one week at a time. Your progress is saved on this device.</p>
<div class="deck-bar">
  <select id="deck" aria-label="Deck"></select>
  <button id="shuffle">Shuffle</button>
  <button id="reset">Reset progress</button>
  <span class="counter" id="count"></span>
</div>
<div class="card" id="card" tabindex="0" role="button" aria-label="Flip card">
  <div class="side" id="side">Question</div>
  <div class="q" id="front"></div>
  <div class="a" id="back" hidden></div>
</div>
<div class="row">
  <button id="again">Again</button>
  <button id="got" class="primary">Got it</button>
</div>
</div>

<!-- ================= QUIZ ================= -->
<div id="v-quiz" data-view hidden>
<h1>Self-check quiz</h1>
<p class="lede">Pick an answer and the explanation appears straight away. Aim for at least {round(n_q * .8)} of {n_q} before moving on to the mock exam.</p>
<div class="score" id="score">0 / 0 answered</div>
<div id="quizlist"></div>
<button id="quizreset">Restart quiz</button>
</div>

<!-- ================= MOCK EXAM ================= -->
<div id="v-mock" data-view hidden>
<h1>Mock exam</h1>
<p class="lede">{mock_lede}</p>
<div id="mocklist"></div>
</div>'''

script = """
const DATA=%s;
const BOOK=document.body.dataset.book;
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const DECKS=Object.assign({All:"All decks"},DATA.decks), CARDS=DATA.cards, QUIZ=DATA.quiz;
const htmlText=t=>String(t).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[c]);

/* ---------- routing: a view name, or an anchor inside the walkthrough ---------- */
const views=["learn","cards","quiz","mock"];
function route(){
  const h=(location.hash||"#learn").slice(1);
  const t=views.includes(h)?null:document.getElementById(h);
  const home=t&&t.closest("[data-readable]");
  const v=views.includes(h)?h:home?home.id.slice(2):"learn";
  document.querySelectorAll("[data-view]").forEach(el=>el.hidden=el.id!=="v-"+v);
  document.querySelectorAll("#nav a").forEach(a=>a.setAttribute("aria-current",a.getAttribute("href")==="#"+v?"page":"false"));
  if(home)t.scrollIntoView();else window.scrollTo(0,0);
}
addEventListener("hashchange",route);

/* ---------- flashcards ---------- */
const KNOWN=BOOK+"-known";
let known=new Set(store.get(KNOWN,[])), order=[], idx=0, flipped=false;
const deckSel=document.getElementById("deck");
Object.entries(DECKS).forEach(([k,v])=>{const o=document.createElement("option");o.value=k;o.textContent=v;deckSel.appendChild(o)});
const inDeck=c=>deckSel.value==="All"||c.d===deckSel.value;
function buildDeck(shuf){
  order=CARDS.map((c,i)=>i).filter(i=>inDeck(CARDS[i])&&!known.has(i));
  if(shuf)for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  idx=0;show();
}
function show(){
  flipped=false;
  const total=CARDS.filter(inDeck).length;
  document.getElementById("count").textContent=`${order.length} left · ${total-order.length}/${total} known`;
  const f=document.getElementById("front"),b=document.getElementById("back"),s=document.getElementById("side");
  if(!order.length){s.textContent="Deck done";f.textContent="You know every card in this deck.";b.hidden=true;return}
  const c=CARDS[order[idx%%order.length]];
  s.textContent=DECKS[c.d]+" · question";f.textContent=c.f;b.textContent=c.b;b.hidden=true;f.hidden=false;
}
function flip(){if(!order.length)return;flipped=!flipped;document.getElementById("back").hidden=!flipped;document.getElementById("side").textContent=DECKS[CARDS[order[idx%%order.length]].d]+(flipped?" · answer":" · question")}
document.getElementById("card").addEventListener("click",flip);
document.getElementById("card").addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();flip()}});
document.getElementById("got").onclick=()=>{if(!order.length)return;known.add(order[idx%%order.length]);store.set(KNOWN,[...known]);order.splice(idx%%order.length,1);show()};
document.getElementById("again").onclick=()=>{if(!order.length)return;idx++;show()};
document.getElementById("shuffle").onclick=()=>buildDeck(true);
document.getElementById("reset").onclick=()=>{known=new Set();store.set(KNOWN,[]);buildDeck(true)};
deckSel.onchange=()=>buildDeck(true);

/* ---------- quiz ---------- */
let answered=0,correct=0;
function buildQuiz(){
  answered=0;correct=0;const L=document.getElementById("quizlist");L.innerHTML="";
  QUIZ.forEach((q,qi)=>{
    const d=document.createElement("div");d.className="qitem";
    const st=document.createElement("div");st.className="stem";st.textContent=(qi+1)+". "+q.q;d.appendChild(st);
    q.o.forEach((o,oi)=>{const b=document.createElement("button");b.className="opt";b.id=`q${qi}o${oi}`;b.textContent=o;
      b.onclick=()=>{if(d.dataset.done)return;d.dataset.done=1;answered++;if(oi===q.a)correct++;
        d.querySelectorAll(".opt").forEach((x,xi)=>{if(xi===q.a)x.classList.add("right");else if(xi===oi)x.classList.add("wrong")});
        const w=document.createElement("div");w.className="why";w.textContent=(oi===q.a?"Correct. ":"Not quite. ")+q.e;d.appendChild(w);score()};
      d.appendChild(b)});
    L.appendChild(d)});
  score();
}
function score(){document.getElementById("score").textContent=`${correct} correct · ${answered} / ${QUIZ.length} answered`}
document.getElementById("quizreset").onclick=()=>{buildQuiz();window.scrollTo(0,0)};

/* ---------- mock exam ---------- */
const M=document.getElementById("mocklist");let sec="";
DATA.mock.forEach((m,i)=>{
  if(m.s!==sec){sec=m.s;const h=document.createElement("h2");h.className="msec";h.textContent=sec;M.appendChild(h)}
  const d=document.createElement("details");d.className="mock";
  d.innerHTML=`<summary>Q${i+1}. ${htmlText(m.q)}${m.m?`<span class="pts">[${m.m} marks]</span>`:""}</summary><div class="ans"><b>Model answer</b>`
    +m.a.split(/\\n\\s*\\n/).map(p=>`<p>${htmlText(p.trim())}</p>`).join("")
    +(m.p.length?`<b>Marking points</b><ul>${m.p.map(p=>`<li>${htmlText(p)}</li>`).join("")}</ul>`:"")
    +(m.r.length?`<p class="why">Revise: ${m.r.map(r=>`<a href="#${r[0]}">${htmlText(r[1])}</a>`).join(" · ")}</p>`:"")+`</div>`;
  M.appendChild(d)});

/* ---------- hooks for assets/reader.js: search, and the chapter "Check yourself" boxes ---------- */
window.SB_CARDS={view:"cards",
  list:()=>CARDS.map(c=>({deck:DECKS[c.d],front:c.f,back:c.b,sec:c.c,week:c.w,quizzable:c.x})),
  open:(i,back)=>{deckSel.value="All";buildDeck(false);order=[i].concat(order.filter(x=>x!==i));idx=0;show();if(back)flip();return document.getElementById("card");},
  mark:(i,knew)=>{if(knew)known.add(i);else known.delete(i);store.set(KNOWN,[...known]);}};
window.SB_QUIZ={list:()=>QUIZ.map(q=>({q:htmlText(q.q),o:q.o.map(htmlText),a:q.a,e:htmlText(q.e),week:q.w}))};

buildDeck(true);buildQuiz();route();
""" % data_js
if not has_practice:  # only the routing is needed
    script = "\n" + script[script.index("/* ---------- routing"): script.index("/* ---------- flashcards")] + "route();\n"
tabs = ["learn"] + [t["id"] for t in extra_tabs] + ["watch"] * bool(video) + ["cards", "quiz", "mock"] * has_practice
script = script.replace('["learn","cards","quiz","mock"]', json.dumps(tabs, separators=(",", ":")))
if video:
    script += """
/* ---------- watch: chapter buttons; leaving the tab pauses the video ---------- */
const vid=document.getElementById("watchvideo");
document.querySelectorAll(".watch-chapters button").forEach(b=>b.onclick=()=>{vid.currentTime=+b.dataset.t;vid.play()});
addEventListener("hashchange",()=>{if(document.getElementById("v-watch").hidden)vid.pause()});
"""

if languages:
    script += """
/* ---------- language switch: keeps the chapter being read and remembers the choice ---------- */
document.querySelectorAll("[data-lang-to]").forEach(b=>b.onclick=()=>{
  try{localStorage.setItem("sb-lang:%s",b.lang)}catch(e){}
  const open=document.querySelector("[data-view]:not([hidden])");
  const here=[...open.querySelectorAll("section.topic")].filter(s=>{const r=s.getBoundingClientRect();return r.left<innerWidth/2&&r.top<innerHeight/2}).pop();
  location.href=b.dataset.langTo+".html#"+(here?here.id:open.id.slice(2));
});
""" % next(iter(languages.values()))

page = (head + '<body data-book="%s" data-progress-view="v-learn">\n\n' % slug + header
        + '\n\n<main class="wrap" id="main">\n\n<!-- ================= WALKTHROUGH (%s/walkthrough.html) ================= -->\n'
        % esc(PACK.name) + views + "\n\n</main>\n\n<script>" + script + "</script>\n"
        + '<script src="../assets/secondbrain.js"></script>\n<script src="../assets/reader.js"></script>\n</body>\n</html>\n')
(SITE / "notes" / (slug + ".html")).write_text(page)

# ---------- shelf card on the home page ----------
n_back = len(re.findall(r'<section class="topic(?! kq)[^"]*\bbk-back\b', walk_all))
n_abbr = sum(1 for c in cards if c["deck"] == "abbreviations")
stats = ["<li><b>%d</b> chapters</li>" % (len(chapters) - n_back)]
if n_back:
    stats.append("<li><b>%d</b> appendices</li>" % n_back)
if has_practice:
    stats.append("<li><b>%d</b> flashcards%s</li>" % (len(cards) - n_abbr, " + <b>%d</b> abbreviations" % n_abbr if n_abbr else ""))
    stats.append("<li><b>%d</b> quiz questions</li>" % n_q)
if data["mock"]:
    stats.append("<li><b>%d</b> mock-exam questions</li>" % len(data["mock"]))
if n_kisi:
    stats.append("<li><b>%d</b> worked exam answers</li>" % n_kisi)
href = "notes/%s.html" % slug
meta_line = " · ".join(filter(None, [meta.get("lecturer"), meta.get("course_name"), meta.get("covers")]))
practice_links = "\n          ".join(f'<a href="{href}#{esc(t["id"])}">{esc(t["label"])}</a>' for t in extra_tabs)
for code, other in languages.items():
    if code != lang:
        practice_links += f'\n          <a href="notes/{esc(other)}.html" data-lang-pick="{esc(code)}" data-lang-key="{esc(slug)}" lang="{esc(code)}">{esc(meta.get("language_names", {}).get(code, code.upper()))}</a>'
practice_links += f'<a href="{href}#cards">Flashcards</a>\n          <a href="{href}#quiz">Quiz</a>\n          <a href="{href}#mock">Mock exam</a>' if has_practice else ""
also = "".join(' data-progress-also="%s"' % esc(v) for k, v in languages.items() if k != lang)
card = f'''<article class="book" data-progress-for="{slug}"{also}>
      <a class="cover {esc(meta.get("cover", "c-plum"))}" href="{href}" aria-hidden="true" tabindex="-1">
        <span class="code">{esc(meta.get("course_code", ""))}</span>
        <span class="t">{esc(meta.get("course_name", title))}</span>
        <span class="rule"></span>
        <span class="by">{esc(" · ".join(filter(None, [meta.get("covers"), meta.get("institution", "").replace(" University", "")])))}</span>
      </a>
      <div class="book-body">
        <h2><a href="{href}">{esc(title)} Notebook</a></h2>
        <p class="meta">{esc(meta_line)}</p>
        <ul class="stats">
          {"".join(stats)}
        </ul>
        <div class="prog">
          <div class="bar"><span></span></div>
          <span class="prog-text">Not started</span>
        </div>
        <div class="jump">
          <a data-resume="{href}" hidden>Resume</a>
          {f'<a href="{href}#watch">Watch</a>' if video else ""}{practice_links}
        </div>
      </div>
    </article>'''
index = (SITE / "index.html").read_text()
mine = re.compile(r'<article class="book" data-progress-for="%s"[^>]*>.*?</article>' % re.escape(slug), re.S)
if languages and lang != next(iter(languages)):
    pass  # the shelf card belongs to the notebook's first language
elif mine.search(index):
    index = mine.sub(lambda m: card, index)
else:  # after the last book on the shelf
    last = list(re.finditer(r'<article class="book".*?</article>', index, re.S))[-1]
    index = index[: last.end()] + "\n    " + card + index[last.end():]
(SITE / "index.html").write_text(index)
print("built %s: %d chapters, %d flashcards, %d quiz questions, %d mock questions"
      % (href, len(chapters) - n_back, len(cards), n_q, len(data["mock"])))
