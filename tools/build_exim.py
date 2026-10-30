"""Build notes/export-import.html from the export-import study pack.

    python3 -I tools/build_exim.py <path to export-import-study-pack folder>

Merges the pack's three self-contained pages into one SECONDBRAIN notebook:
  export-import-foundations.html -> Walkthrough view (#learn), ends with the glossary section (#glossary)
  fob-cif.html                   -> FOB & CIF view (#fobcif)
  export-import-practice.html    -> Quiz, Flashcards, Mock exam views
The pack's wording and data are kept; its colours are mapped onto the site themes by assets/exim.css.
The practice page's own glossary tab and the FOB page's mini glossary repeat entries from the report's
glossary, so only the report's copy is kept and every abbreviation tip links to it.
"""
import html
import json
import re
import shutil
import sys
import pathlib

PACK = pathlib.Path(sys.argv[1])
SITE = pathlib.Path(__file__).resolve().parent.parent
found = (PACK / "export-import-foundations.html").read_text()
fob = (PACK / "fob-cif.html").read_text()
prac = (PACK / "export-import-practice.html").read_text()

# classes that clash with notebook.css get an ex- prefix (kept in step with assets/exim.css)
CLASH = {"card", "opt", "why", "chain", "score", "pts", "tag", "ans", "row"}


def fix_classes(t):
    ren = lambda v: " ".join("ex-" + c if c in CLASH else c for c in v.split())
    t = re.sub(r'class=(["\'])([^"\']*)\1', lambda m: "class=%s%s%s" % (m.group(1), ren(m.group(2)), m.group(1)), t)
    return re.sub(r"className=(['\"])([^'\"]*)\1", lambda m: "className=%s%s%s" % (m.group(1), ren(m.group(2)), m.group(1)), t)


def one(pattern, text, flags=re.S):
    m = re.search(pattern, text, flags)
    if not m:
        raise SystemExit("not found: " + pattern)
    return m


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"<[^>]+>", "", t).lower()).strip("-")[:40]


def split_sections(body, default_tag, id_prefix="", rename=None):
    """Cut a run of <h2>…</h2> blocks into section.topic elements; "part" markers become each section's tag."""
    rename = rename or {}
    tokens = re.split(r'(<span class="part">.*?</span>|<h2(?: id="[^"]+")?>.*?</h2>)', body, flags=re.S)
    sections, part, cur, intro = [], default_tag, None, tokens[0]
    for tok in tokens[1:]:
        pm = re.match(r'<span class="part">(.*?)</span>', tok, re.S)
        hm = re.match(r'<h2(?: id="([^"]+)")?>(.*?)</h2>', tok, re.S)
        if pm:
            part = re.sub(r"<[^>]+>", "", pm.group(1)).strip()
        elif hm:
            sid = hm.group(1) or id_prefix + slug(hm.group(2))
            cur = {"id": rename.get(sid, sid), "title": hm.group(2).strip(), "tag": part, "html": ""}
            sections.append(cur)
        elif cur:
            cur["html"] += tok
    return intro, sections


BACK_MATTER = {"glossary", "fx-glossary"}  # reference sections: no chapter number

# The practice quiz numbers its extra sets as weeks 8, 9… ("Laws & flows (video)", "Regulations by level"); the report's
# parts carry the same names. Matching them lets a chapter's Check-yourself box draw on its own set.
QUIZ_SETS = {re.sub(r"\s*\(.*?\)", "", html.unescape(lbl)).strip().lower(): int(v)
             for v, lbl in re.findall(r'<option value="(\d+)">([^<]+)</option>', prac) if int(v) > 7}
DECK_WEEK = {v: QUIZ_SETS[re.sub(r"\s*\(.*?\)", "", html.unescape(lbl)).strip().lower()]
             for v, lbl in re.findall(r'<option value="([a-z]+)">([^<]+)</option>', prac)
             if re.sub(r"\s*\(.*?\)", "", html.unescape(lbl)).strip().lower() in QUIZ_SETS}


def _words(t):
    return {w.rstrip("s") for w in re.findall(r"[a-z&]+", html.unescape(t).lower())}


def week_of(tag):
    m = re.search(r"WEEK\s+(\d+)", tag, re.I)
    if m:
        return int(m.group(1))
    # a part matches a set when every word of the set's name appears in the part's label ("Regulations by level" ↔
    # "Part K · Every regulation by level …")
    tw = _words(tag)
    return next((v for name, v in QUIZ_SETS.items() if name and _words(name) <= tw), None)


def render(view, title, kicker, h1, intro_html, sections, foot, default_tag):
    out = ['<div id="v-%s" data-view data-readable data-title="%s"%s>' % (view, title, "" if view == "learn" else " hidden"),
           '<p class="kicker">%s</p>' % kicker, "<h1>%s</h1>" % h1, fix_classes(intro_html.strip())]
    part = default_tag
    for i, s in enumerate(sections):
        if s["tag"] != part and s["tag"] != default_tag:
            # a part-title page, as in a book: "Part A" over the rest of the part's label
            bits = [b.strip() for b in s["tag"].split("·")]
            out.append('<div class="bk-part"><span class="bk-part-n">%s</span><span class="bk-part-t">%s</span></div>'
                       % (bits[0], " · ".join(bits[1:])))
        part = s["tag"]
        extra = '<p class="ex-foot">%s</p>' % foot if foot and i == len(sections) - 1 else ""
        wk = week_of(s["tag"])
        out.append('<section class="topic%s" id="%s"%s><span class="tag">%s</span><h2>%s</h2>%s%s</section>'
                   % (" bk-back" if s["id"] in BACK_MATTER else "", s["id"], ' data-week="%d"' % wk if wk else "", s["tag"], s["title"], fix_classes(s["html"].strip()), extra))
    out.append("</div>")
    return "\n".join(out)


# ---------- walkthrough: the foundations report ----------
main = found[found.index("<main>") + 6: found.index("</main>")]
hero = one(r'<header class="hero">(.*?)</header>', main).group(1)
eyebrow = one(r'<div class="eyebrow">(.*?)</div>', hero).group(1).strip()
h1 = one(r"<h1>(.*?)</h1>", hero).group(1).strip()
lede = one(r'<p class="lede">(.*?)</p>', hero).group(1).strip()
meta = re.sub(r"</?span>", "", one(r'<div class="meta">(.*?)</div>', hero).group(1)).strip()
body = main[main.index("</header>") + 9:]
KQ = re.compile(r"(?<![\w-])kq(?=-|\b)")
body = KQ.sub("rq", body)
foot = re.search(r"<footer>(.*?)</footer>", body, re.S)
if foot:
    body = body[: foot.start()]
_, sections = split_sections(body, "Start here")
assert any(s["id"] == "glossary" for s in sections), "report glossary section missing"
for s in sections:
    s["html"] = s["html"].replace(
        "Test yourself with the companion page: <b>Export-Import Practice</b> (quiz, flashcards and a mock midterm with answer key).",
        'Test yourself in this notebook\'s <a href="#quiz">Quiz</a>, <a href="#flashcards">Flashcards</a> and <a href="#mock-exam">Mock exam</a> tabs (with answer key).')
    # the pack's separate FOB and CIF page is this notebook's FOB & CIF tab
    s["html"] = re.sub(r'The companion page <b>(.*?)</b> in this study pack', r'The <a href="#fobcif">\1</a> tab in this notebook', s["html"])
# ---------- additions written for this notebook (tools/exim-additions/) ----------
# Each is placed straight after a fixed spot in the pack's text, so rebuilding from a newer pack keeps it.
ADD = SITE / "tools" / "exim-additions"
mnemonic = re.sub(r"<!--.*?-->\s*", "", (ADD / "general-prohibitions-mnemonic.html").read_text(), flags=re.S).strip()
g1 = next(s for s in sections if s["id"] == "g1")
at = g1["html"].index("<h3>The 10 General Prohibitions</h3>")
end = g1["html"].index("</table></div>", at) + len("</table></div>")
g1["html"] = g1["html"][:end] + "\n" + mnemonic + g1["html"][end:]

# the course assignments (tools/exim-additions/assignments/, in file-name order) get a tab of their own, and each related
# walkthrough chapter links to its assignment
AS_FILES = sorted((ADD / "assignments").glob("*.html"))
as_sections = [re.sub(r"<!--.*?-->\s*", "", f.read_text(), flags=re.S).strip() for f in AS_FILES]
as_title = {re.search(r'id="([^"]+)"', x).group(1): re.sub(r"<[^>]+>", "", re.search(r"<h2>(.*?)</h2>", x, re.S).group(1)) for x in as_sections}
AS_LINKS = {"b6": "as-gatt", "f2": "as-eska-dgd", "g1": "as-ear", "h5": "as-label-lc"}
for s_ in sections:
    aid = AS_LINKS.get(s_["id"])
    if aid:
        s_["html"] += '\n<p class="as-link"><span>Our assignment on this topic</span><a href="#%s">%s</a></p>' % (aid, as_title[aid])
assign_html = ('<div id="v-assign" data-view data-readable data-title="Assignments" data-no-quiz hidden>\n'
               '<p class="kicker">ENPR6304032 · Coursework</p>\n<h1>Assignments</h1>\n'
               '<p class="lede">The written assignments submitted for this course, set out as chapters. Each one is linked from the walkthrough chapter it draws on.</p>\n'
               + "\n".join(as_sections) + "\n</div>")

learn_html = render("learn", "Walkthrough", eyebrow, h1,
                    '<p class="lede">%s</p><p class="ex-meta">%s</p>' % (lede, meta), sections, foot.group(1).strip() if foot else "", "Start here")
n_learn = len(sections)

found_js = re.findall(r"<script>(.*?)</script>", found, re.S)
assert len(found_js) == 1
fj = found_js[0]
# glossary search: scope it to the report's glossary and re-page after filtering
fj = fj.replace("document.querySelectorAll('.gl-row')", "document.querySelectorAll('#glossary .gl-row')")
fj = fj.replace("document.querySelectorAll('.gloss')", "document.querySelectorAll('#glossary .gloss')")
fj = fj.replace("none.hidden=n>0;", "none.hidden=n>0;document.dispatchEvent(new CustomEvent('sb:reflow'));")
# the practice script's abbreviation tip covers the whole notebook, so drop the report's copy (and keep what follows it)
cut = fj.index("  var tip=document.createElement('div')")
fj = fj[:cut] + fj[fj.index("\n})();", cut) + 1:]
fj = KQ.sub("rq", fj)
assert fj.count("#glossary .gl-row") == 1 and "sb:reflow" in fj
# its stylesheet, renamed the same way; the pack's colour names are mapped onto the site themes in exim.css
rq_css = ""
for st in re.findall(r"<style>(.*?)</style>", found, re.S):
    if "/* Regulation quiz" in st:
        rq_css = KQ.sub("rq", st[st.index("/* Regulation quiz"):]).strip()

# ---------- FOB & CIF explainer ----------
fm = fob[fob.index("<main>") + 6: fob.index("</main>")]
ffoot = re.search(r"<footer>(.*?)</footer>", fm, re.S)
if ffoot:
    fm = fm[: ffoot.start()]
f_eyebrow = one(r'<div class="eyebrow">(.*?)</div>', fm).group(1).strip()
f_h1 = one(r"<h1>(.*?)</h1>", fm).group(1).strip()
F_TAG = "FOB & CIF · Incoterms® 2020"
f_intro, f_sections = split_sections(fm, F_TAG, "fx-", {"glossary": "fx-glossary"})
f_intro = f_intro[f_intro.index("</h1>") + 5:]
for s in f_sections:
    s["html"] = re.sub(r'id="g-', 'id="fx-g-', s["html"]).replace('<div class="fig">', '<div class="fig wide">')
fob_html = render("fobcif", "FOB &amp; CIF", f_eyebrow, f_h1, f_intro, f_sections,
                  ffoot.group(1).strip().replace("alongside Export-Import Foundations and Export-Import Practice", "alongside this notebook's walkthrough and practice tabs") if ffoot else "", F_TAG)
fob_js = re.findall(r"<script>(.*?)</script>", fob, re.S)
assert len(fob_js) == 1

# ---------- practice views ----------
pm = prac[prac.index("<main>") + 6: prac.index("</main>")]
pm = re.sub(r'<section id="v-glossary".*?</section>', "", pm, flags=re.S)  # glossary lives in the walkthrough
pm = re.sub(r'<section id="(v-[a-z-]+)"( hidden)?>', lambda m: '<div id="%s" data-view hidden>' % m.group(1), pm).replace("</section>", "</div>")
for who, cls in (("review", "is-review"), ("know", "is-know")):
    pm, n = re.subn(r'<button class="btn" id="fc-%s" type="button" style="[^"]*">' % who, '<button class="btn %s" id="fc-%s" type="button">' % (cls, who), pm)
    assert n == 1, who
practice_html = fix_classes(pm)
pj = re.findall(r"<script>(.*?)</script>", prac, re.S)
assert len(pj) == 1
pj = pj[0][: pj[0].index("/* ---------- Routing ---------- */")]
# glossary search now belongs to the report's copy
pj, n = re.subn(r"\n  var q=document\.getElementById\('gl-q'\).*?none\.hidden=c>0;\n  \}\);", "", pj, flags=re.S)
assert n == 1, "practice glossary search block"
# tip's Glossary link: jump straight to the term in the walkthrough glossary
pj, n = re.subn(r"l\.href='#glossary';l\.textContent='Glossary';l\.addEventListener\('click',function\(\)\{.*?\}\);tip\.appendChild\(l\);",
                "l.href='#g-'+g.id;l.textContent='Glossary';l.addEventListener('click',function(){tip.hidden=true});tip.appendChild(l);", pj, flags=re.S)
assert n == 1, "tip glossary link"
pj = fix_classes(pj) + "renderQuiz();buildDeck();renderMock();drawT();\n['v-quiz','v-flashcards','v-mock-exam'].forEach(function(id){abbrify(document.getElementById(id))});\n"
# flashcards for the memory aids above (appended last, so saved card marks keep their positions)
pj += """CARDS.push(
  {d:'w6',f:'Mnemonic for the order of the 10 General Prohibitions',b:'Can Dogs Dig Deep? Every Elephant Probably Tramples Very Knowingly. 1 Controlled items to listed countries, 2 De minimis US content, 3 Direct product of US technology, 4 Denial Order, 5 End use or end user, 6 Embargoed destinations, 7 Proliferation of weapons, 8 Transit through prohibited countries, 9 Violating licence terms or orders, 10 Knowledge of a violation.'},
  {d:'w6',f:'The four questions behind the 10 General Prohibitions (What, Who, How, Know)',b:'What is it, and how American is it? (1–3). Who gets it, for what use, and where? (4–6). How is it used or routed? (7–8). What do I know, and am I following the rules? (9–10).'}
);
buildDeck();
"""
# search hook: assets/reader.js lists and opens flashcards through window.SB_CARDS
# (and chapter "Check yourself" boxes draw on the quiz and cards through window.SB_QUIZ / SB_CARDS)
pj += "var DECK_WEEK=%s;\n" % json.dumps(DECK_WEEK)
pj += """window.SB_CARDS={view:'flashcards',
  list:function(){return CARDS.map(function(c){return {deck:WEEKS[c.d],front:c.f,back:c.b,week:DECK_WEEK[c.d]||(/^w\\d$/.test(c.d)?+c.d.slice(1):null),quizzable:c.d!=='ab'}})},
  open:function(i,back){var d=document.getElementById('fc-deck');d.value=CARDS[i].d==='ab'?'ab':'all';buildDeck();
    order=[i].concat(order.filter(function(x){return x!==i}));pos=0;showCard();var c=document.getElementById('fc-card');if(back)c.classList.add('flipped');return c;},
  mark:function(i,knew){marks[i]=knew?'k':'r';store.set('eip-marks2',marks);tally();}};
window.SB_QUIZ={list:function(){return QUIZ.map(function(q){return {q:q.q,o:q.o,a:q.a,e:q.e,week:q.w}})}};
"""

# ---------- The Paper Trail: the pack's narrated explainer, in a Watch tab ----------
TRAIL = PACK / "the-paper-trail"
watch_html = ""
if (TRAIL / "the-paper-trail-player.html").exists():
    out_dir = SITE / "notes" / "paper-trail"
    out_dir.mkdir(exist_ok=True)
    for name in ("the-paper-trail-player.html", "narration.mp3"):
        shutil.copyfile(TRAIL / name, out_dir / name)
    watch_html = ('<div id="v-watch" data-view hidden>\n<h1>The Paper Trail</h1>\n'
                  '<p class="sub">The laws behind every export and import, and how the paperwork flows: a narrated explainer for '
                  'Weeks 1 to 7 (10:32), with chapters and captions in the player. The narration is a synthetic voice. '
                  '<a href="paper-trail/the-paper-trail-player.html" target="_blank" rel="noopener">Open it on its own page</a>.</p>\n'
                  '<div class="watch-frame"><iframe src="paper-trail/the-paper-trail-player.html" title="The Paper Trail: narrated explainer" '
                  'loading="lazy" allow="autoplay; fullscreen"></iframe></div>\n</div>')

# ---------- assemble on the GSCM page shell ----------
shell = (SITE / "notes" / "gscm-midterm.html").read_text()
head = shell[: shell.index("<body")]
head = re.sub(r"<title>.*?</title>", "<title>Export-Import · SECONDBRAIN</title>", head)
head = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="Export-import midterm notebook (Weeks 1–7): illustrated walkthrough with calculators and glossary, FOB and CIF explainer, quiz, flashcards and a mock midterm.">', head)
head = head.replace("family=Gelasio", "family=IBM+Plex+Sans:wght@400;600;700&family=Gelasio")
head = head.replace('<link rel="stylesheet" href="../assets/book.css">',
                    '<link rel="stylesheet" href="../assets/exim.css">\n<link rel="stylesheet" href="../assets/book.css">'
                    + ("\n<style>/* Part K regulation quiz, from the study pack (kq renamed rq) */\n%s\n</style>" % rq_css if rq_css else ""))
header = shell[shell.index("<header"): shell.index("</header>") + 9].replace("GSCM Midterm</span>", "Export-Import</span>")
header = re.sub(r'<nav class="sb-nav".*?</nav>',
                '<nav class="sb-nav" id="nav" aria-label="Notebook sections">\n    <a href="#learn">Walkthrough</a><a href="#fobcif">FOB &amp; CIF</a><a href="#watch">Watch</a><a href="#assign">Assignments</a><a href="#quiz">Quiz</a>'
                '<a href="#flashcards">Flashcards</a><a href="#mock-exam">Mock exam</a><a href="#glossary">Glossary</a>\n  </nav>', header, flags=re.S)

router = """
/* ---------- routing: a view name, or an anchor inside a readable view ---------- */
const views=["learn","fobcif","watch","assign","quiz","flashcards","mock-exam"];
let lastView=null;
function route(){
  const h=(location.hash||"#learn").slice(1);
  const t=views.includes(h)?null:document.getElementById(h);
  const home=t&&t.closest("[data-readable]");
  const v=views.includes(h)?h:home?home.id.slice(2):"learn";
  if(lastView==="watch"&&v!=="watch")stopWatching();
  lastView=v;
  document.querySelectorAll("[data-view]").forEach(el=>el.hidden=el.id!=="v-"+v);
  document.querySelectorAll("#nav a").forEach(a=>a.setAttribute("aria-current",a.getAttribute("href")==="#"+v||(h==="glossary"&&a.getAttribute("href")==="#glossary")?"page":"false"));
  if(home)t.scrollIntoView();else window.scrollTo(0,0);
}
// leaving the Watch tab stops the narration (a hidden player would keep talking)
function stopWatching(){
  const f=document.querySelector("#v-watch iframe");
  if(!f)return;
  try{f.contentDocument.querySelectorAll("audio,video").forEach(m=>m.pause());}
  catch(e){f.src=f.src;} // opened from disk the player counts as another origin: reload it to silence it
}
addEventListener("hashchange",route);
route();
"""

page = (head + '<body data-book="export-import">\n\n' + header + '\n\n<main class="wrap" id="main">\n\n'
        + "<!-- ================= WALKTHROUGH (export-import-foundations.html) ================= -->\n" + learn_html
        + "\n\n<!-- ================= FOB & CIF (fob-cif.html) ================= -->\n" + fob_html
        + "\n\n<!-- ================= WATCH (the-paper-trail/) ================= -->\n" + watch_html
        + "\n\n<!-- ================= ASSIGNMENTS (tools/exim-additions/assignments/) ================= -->\n" + assign_html
        + "\n\n<!-- ================= PRACTICE (export-import-practice.html) ================= -->\n" + practice_html.strip()
        + "\n\n</main>\n\n<script>\n" + fj.strip() + "\n" + fob_js[0].strip() + "\n</script>\n<script>\n" + pj.strip() + "\n" + router + "</script>\n"
        + '<script src="../assets/secondbrain.js"></script>\n<script src="../assets/reader.js"></script>\n</body>\n</html>\n')

ids = re.findall(r'\bid="([^"]+)"', page)
dups = sorted({i for i in ids if ids.count(i) > 1})
assert not dups, "duplicate ids: %s" % dups
(SITE / "notes" / "export-import.html").write_text(page)
print("walkthrough sections", n_learn, "· fob sections", len(f_sections), "· bytes", len(page))
