#!/usr/bin/env python3
"""Build a SECONDBRAIN notebook from a study pack written to tools/notebook-brief.md.

    python3 -I tools/build_notebook.py <pack folder>

The pack folder holds notebook.json, walkthrough.html and practice.json (sources.md is kept
for reference). Writes notes/<slug>.html on the GSCM page shell, with Walkthrough, Flashcards,
Quiz and Mock exam tabs, and adds or refreshes the notebook's card on the home page shelf.
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
prac = json.loads((PACK / "practice.json").read_text())
slug = meta["slug"]
if not re.fullmatch(r"[a-z0-9-]+", slug):
    sys.exit("notebook.json: slug must be lowercase letters, digits and hyphens")
if (PACK / "exam-questions.md").exists():
    print("note: exam-questions.md is not built yet; add it as a Kisi-kisi view by hand")
esc = lambda s: html.escape(str(s), quote=True)

# ---------- check the walkthrough against the brief ----------
problems = []
for bad in ("<style", "<script", "<html", "<body", 'fill="#', 'stroke="#', "<img", "foreignObject"):
    if bad.lower() in walk.lower():
        problems.append("walkthrough.html contains " + bad)
ids = re.findall(r'\bid="([^"]+)"', walk)
problems += ["duplicate id: " + i for i in sorted({i for i in ids if ids.count(i) > 1})]
problems += ["broken link: #" + h for h in sorted(set(re.findall(r'href="#([^"]+)"', walk)) - set(ids))]
chapters = {m.group(1): re.sub(r"<[^>]+>", "", m.group(2))
            for m in re.finditer(r'<section class="topic[^"]*" id="([^"]+)"[^>]*>.*?<h2>(.*?)</h2>', walk, re.S)}
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
header = shell[shell.index("<header"): shell.index("</header>") + 9]
header = header.replace("GSCM Midterm</span>", esc(short) + "</span>")
header = re.sub(r'<nav class="sb-nav".*?</nav>', '<nav class="sb-nav" id="nav" aria-label="Notebook sections">\n    '
                '<a href="#learn">Walkthrough</a><a href="#cards">Flashcards</a><a href="#quiz">Quiz</a><a href="#mock">Mock exam</a>\n  </nav>',
                header, flags=re.S)

n_q = len(quiz)
minutes = mock.get("minutes")
mock_lede = " ".join(filter(None, [
    "A full practice paper%s." % (" to answer in %d minutes" % minutes if minutes else ""),
    esc(mock.get("instructions", "")),
    "Write your answer on paper first, then open the model answer and compare. Each question links to the chapters it draws on.",
]))
views = f'''<div id="v-learn" data-view data-readable>
{walk}
</div>

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

page = (head + '<body data-book="%s" data-progress-view="v-learn">\n\n' % slug + header
        + '\n\n<main class="wrap" id="main">\n\n<!-- ================= WALKTHROUGH (%s/walkthrough.html) ================= -->\n'
        % esc(PACK.name) + views + "\n\n</main>\n\n<script>" + script + "</script>\n"
        + '<script src="../assets/secondbrain.js"></script>\n<script src="../assets/reader.js"></script>\n</body>\n</html>\n')
(SITE / "notes" / (slug + ".html")).write_text(page)

# ---------- shelf card on the home page ----------
n_back = len(re.findall(r'<section class="topic[^"]*\bbk-back\b', walk))
n_abbr = sum(1 for c in cards if c["deck"] == "abbreviations")
stats = ["<li><b>%d</b> chapters</li>" % (len(chapters) - n_back)]
if n_back:
    stats.append("<li><b>%d</b> appendices</li>" % n_back)
stats.append("<li><b>%d</b> flashcards%s</li>" % (len(cards) - n_abbr, " + <b>%d</b> abbreviations" % n_abbr if n_abbr else ""))
stats.append("<li><b>%d</b> quiz questions</li>" % n_q)
if data["mock"]:
    stats.append("<li><b>%d</b> mock-exam questions</li>" % len(data["mock"]))
href = "notes/%s.html" % slug
meta_line = " · ".join(filter(None, [meta.get("lecturer"), meta.get("course_name"), meta.get("covers")]))
card = f'''<article class="book" data-progress-for="{slug}">
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
          <a href="{href}#cards">Flashcards</a>
          <a href="{href}#quiz">Quiz</a>
          <a href="{href}#mock">Mock exam</a>
        </div>
      </div>
    </article>'''
index = (SITE / "index.html").read_text()
mine = re.compile(r'<article class="book" data-progress-for="%s">.*?</article>' % re.escape(slug), re.S)
if mine.search(index):
    index = mine.sub(lambda m: card, index)
else:  # after the last book on the shelf
    last = list(re.finditer(r'<article class="book".*?</article>', index, re.S))[-1]
    index = index[: last.end()] + "\n    " + card + index[last.end():]
(SITE / "index.html").write_text(index)
print("built %s: %d chapters, %d flashcards, %d quiz questions, %d mock questions"
      % (href, len(chapters) - n_back, len(cards), n_q, len(data["mock"])))
