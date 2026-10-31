# SECONDBRAIN notebook brief

Give this file to Claude together with a course's study materials (slides, lecture notes, readings, forum posts, past papers, exam hints). Claude reads everything and writes a **study pack**: a walkthrough that reads like a textbook, plus practice material. The pack slots straight into a SECONDBRAIN notebook.

---

## The request

> Read every file in the course folder I've given you. Then write a SECONDBRAIN study pack for this course, following this brief exactly: the folder layout, the HTML and JSON formats, the writing rules and the final checklist. The walkthrough must read like a well-edited textbook, not like a chat reply. Cover everything the materials teach, and add nothing they don't support. Where the materials are unclear, contradict each other or look out of date, say so in `sources.md` instead of guessing.

---

## 1. What to hand back

One folder named after the course, in lowercase with hyphens (for example `operations-management-midterm/`):

```
<course>-study-pack/
├── notebook.json        course details for the shelf card and the page header
├── walkthrough.html     the book: parts, chapters, figures, glossary appendix
├── practice.json        flashcards, quiz and mock exam
├── exam-questions.md    only if the lecturer gave exam questions or a kisi-kisi
└── sources.md           which file fed which chapter, plus gaps, conflicts and updates
```

Do not write CSS, JavaScript, a page header, or a full HTML document. The site provides all of those. Write only the files above.

---

## 2. `notebook.json`

```json
{
  "slug": "operations-midterm",
  "title": "Operations Management Midterm",
  "short_title": "Operations",
  "course_code": "MGMT1234",
  "course_name": "Operations Management",
  "institution": "BINUS University",
  "lecturer": "Name as printed on the slides",
  "covers": "Sessions 1–7",
  "exam": { "type": "Essay, open book", "minutes": 120, "date": "2026-11-12" },
  "shelf_blurb": "One sentence for the library card: what the notebook covers and what practice it includes."
}
```

Leave out any field you can't find in the materials rather than inventing it.

---

## 3. `walkthrough.html`: the book

### 3.1 Overall shape

The file is an HTML **fragment**: no `<html>`, `<head>`, `<body>`, `<style>` or `<script>`. It runs top to bottom in this order:

1. **Title block.** A kicker line, the `h1` and a lede paragraph (see the example in 3.6).
2. **"Start here" chapter.** A map of the whole course: how the topics connect, in the order they're taught, with one figure. Its tag must contain the words `Start here`.
3. **Parts.** One part per week or teaching block. Each part opens with a part-title divider, followed by its chapters.
4. **Synthesis chapter** (recommended). How the topics combine in a typical exam answer.
5. **Appendices.** At least a glossary of every abbreviation. Other reference tables are welcome, such as formula sheets, a list of laws, or a timeline.

The site numbers chapters, figures and appendices by itself, and builds the contents page and page numbers. So **never write "Chapter 3", "Figure 2.1" or a table of contents yourself.**

### 3.2 Part dividers

```html
<div class="bk-part"><span class="bk-part-n">PART A</span><span class="bk-part-t">WEEK 1 · ORGANIZING FOR EXPORT AND IMPORT</span></div>
```

Use capital letters in both spans. Letter the parts A, B, C and so on.

### 3.3 Chapters

Every chapter is one `<section>`:

```html
<section class="topic" id="w3-incoterms" data-week="3">
<span class="tag">Week 3 · CILO 2</span>
<h2>Who pays for what: Incoterms 2020</h2>
…chapter body…
</section>
```

- **`id`:** unique across the whole file. Use lowercase letters, digits and hyphens, and prefix the week (`w3-…`). Practice items point at these ids.
- **`data-week`:** the week or session number as a whole number. For a range like Sessions 3–4, use the first number. Leave it off chapters that don't belong to a week, such as Start here or the synthesis chapter.
- **`.tag`:** a short label for where the chapter sits in the course, for example "Week 3 · CILO 2" or "Session 5–6". The site puts "Chapter N ·" in front of it.
- **`h2`:** a title that says what the chapter is about in plain words. A colon followed by the formal name works well.
- **Size:** aim for 600–1,500 words per chapter. Split any topic that runs longer. Merge two topics if each would be very thin.

A chapter body follows this **teaching order**, so that every chapter reads the same way:

1. **The chain**: four short cells covering Problem, Big idea, How (tools) and Result. One or two sentences each.
2. **In plain words**: two to four paragraphs explaining the idea as a good tutor would, with a concrete example from the course's own context.
3. **At least one figure** that shows the mechanism: a flow, a cycle, a matrix, a timeline or a comparison. See 3.5.
4. **The details to memorise**: definitions, lists, steps, tables and formulas, each under an `h3` subheading.
5. **An exam tip** wherever the materials show how the topic is examined.
6. **A link to the next chapter**: one line explaining why the next topic follows from this one. Leave it off the last chapter of the book.

### 3.4 Building blocks

Use only these blocks. They are already styled in all six reading themes, so add no `style` attributes except the two shown for figures.

| Block | Markup | Use it for |
|---|---|---|
| Chain | `<div class="chain"><div><span>Problem</span>…</div><div><span>Big idea</span>…</div><div><span>How (tools)</span>…</div><div><span>Result</span>…</div></div>` | Chapter opener (always four cells) |
| Plain words | `<div class="explain"><span>In plain words</span><p>…</p><p>…</p></div>` | The tutor-style explanation |
| Subheading | `<h3>…</h3>`, then `<h4>…</h4>` below it | Sections within a chapter; never skip a level |
| Steps | `<ol class="steps"><li><b>Name</b>what it means</li>…</ol>` | Ordered stages and processes (two to eight items) |
| Two columns | `<div class="cols"><div>…</div><div>…</div></div>` | Side-by-side lists, such as "A vs B" |
| Table | `<div class="tbl"><table><tr><th>…</th></tr><tr><td>…</td></tr></table></div>` | Comparisons and classifications (three or more rows) |
| Exam tip | `<div class="tip"><b>Exam tip:</b> …</div>` | How a question on this is asked and answered |
| Update note | `<div class="tip"><b>Update:</b> …</div>` | A source that is out of date (see 5.4) |
| Mnemonic | `<span class="mnemo">TIM WOODS</span>`, inside a heading or sentence | Memory aids, followed by what each letter stands for |
| Formula | `<div class="formula">EOQ = √(2DS / H)` ⏎ `D = 1,200 units, S = 50, H = 3 → EOQ ≈ 200</div>` | Formulas, each with a worked example on the next line. ⏎ means a real line break; the box keeps line breaks exactly as typed, so keep each line short |
| Next link | `<p class="next"><b>Link to next topic →</b> …</p>` | The final line of a chapter |
| Lists | plain `<ul>`/`<ol>`; start each item with `<b>Term</b>:` | Definitions and must-know facts |

Inline tags: `<b>` for a key term the first time it is defined, `<i>` for foreign words and titles, and `<a href="#chapter-id">` to point to another chapter. Do not use `<br>`, empty paragraphs, emojis or Markdown syntax inside the HTML.

### 3.5 Figures

Draw every figure as inline SVG using the site's diagram classes. They switch colour with the reader's theme, so **never write a colour, a `fill=`/`stroke=` value or a font size** into the SVG.

```html
<figure><div class=figscroll><svg class="dg" viewBox="0 0 900 220" role="img" aria-label="Push vs pull: push builds stock to a forecast; pull starts on a real order" style="--mw:640px;max-width:900px">
<defs><marker id="w3a-m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" class="mk"/></marker></defs>
<rect x="20" y="40" width="240" height="70" rx="6" class="b"/>
<text x="140" y="70" text-anchor="middle" class="tt">FORECAST</text>
<text x="140" y="90" text-anchor="middle" class="sm">build to a guess</text>
<rect x="330" y="40" width="240" height="70" rx="6" class="a"/>
<text x="450" y="70" text-anchor="middle" class="tt ta">REAL ORDER</text>
<text x="450" y="90" text-anchor="middle" class="sm">customer pulls</text>
<line x1="262" y1="75" x2="328" y2="75" class="ln" marker-end="url(#w3a-m)"/>
</svg></div><figcaption>One or two sentences on what to notice, written so the figure can be redrawn in an exam.</figcaption></figure>
```

| Class | Draws |
|---|---|
| `b` | a plain box |
| `a` | a highlighted (accent) box |
| `f` | a warning or problem box |
| `zone` | an outline grouping several boxes |
| `tt` | bold label text; add `ta` (accent) or `tf` (warning) for colour |
| `sm` | small explanatory text |
| `mut` | muted text |
| `ln` | a line or arrow, with variants `lc` (accent), `lf` (warning), `lm` (muted), `la2` (thick accent) and `err` (thick warning) |
| `mk`, `mkc`, `mkf` | arrowhead fills for plain, accent and warning arrows |
| `ax`, `grid` | chart axes and gridlines |
| `dot`, `dotf` | data points |
| `bar1`, `bar2` | chart bars, plain and accent |
| `band` | a shaded range |

Rules for figures:

- Make the `viewBox` 900 wide, with whatever height the drawing needs. Keep `style="--mw:640px;max-width:900px"` so phones can scroll the figure sideways instead of shrinking it.
- Every `<marker>` `id` must be unique in the whole file. Prefix it with the chapter id, as in `w3a-m`.
- Keep text inside its box. At this scale one line holds about 30 characters in a 240-wide box. Break longer text into several `<text>` lines 15 units apart.
- Every figure needs a `role="img"`, an `aria-label` that describes it in one sentence, and a `<figcaption>`.
- For three small figures side by side, wrap three `<figure>`s in `<div class="trio">…</div>`.
- Use no images, external files or `<foreignObject>`.

### 3.6 Title block and appendices

```html
<p class="kicker">MGMT1234 · Operations Management · BINUS University</p>
<h1>Course walkthrough</h1>
<p class="lede">What this book covers, how each chapter is organised (problem, big idea, tools, result; then plain words, a figure and the details to memorise), what "S1–2" or "CILO" means, and that every abbreviation is spelled out the first time and listed in the glossary.</p>
```

Appendices use the class `bk-back`, and the site labels them "Appendix". They come last:

```html
<section class="topic bk-back" id="glossary"><span class="tag">Reference</span><h2>Glossary of abbreviations</h2>
<div class="tbl"><table class="gloss"><tr><th>Short</th><th>Stands for / meaning</th></tr>
<tr><td><b>EOQ</b></td><td>Economic Order Quantity: the order size that minimises ordering plus holding cost</td></tr>
</table></div></section>
```

Sort the glossary alphabetically. It must list **every** abbreviation used anywhere in the pack.

---

## 4. `practice.json`

```json
{
  "decks": { "w1": "Week 1 · Introduction", "w2": "Week 2 · Process design" },
  "flashcards": [
    { "deck": "w1", "week": 1, "chapter": "w1-what-is-scm",
      "front": "The 3 key flows in SCM",
      "back": "(1) Physical materials; (2) data and information; (3) resources, mainly finance but also people and equipment." }
  ],
  "quiz": [
    { "week": 1, "chapter": "w1-what-is-scm",
      "q": "Which is NOT one of the three key flows in supply chain management (SCM)?",
      "options": ["Physical materials", "Data and information", "Resources such as finance and people", "Advertising campaigns"],
      "answer": 3,
      "why": "The slides list materials, information and resources; advertising is a marketing activity, not a flow." }
  ],
  "mock_exam": {
    "minutes": 120,
    "instructions": "Answer all questions. Marks are shown in brackets.",
    "sections": [
      { "id": "A", "title": "Section A · Concepts",
        "questions": [
          { "q": "Explain the difference between logistics and SCM …", "marks": 15,
            "model_answer": "A complete answer at full-marks standard, in paragraphs …",
            "chapters": ["w1-what-is-scm"] }
        ] }
    ]
  }
}
```

- **Every item names its `week` and `chapter`** (a chapter `id` from the walkthrough). The site uses these to place two questions and one recall card in a "Check yourself" box at the end of each chapter, so each chapter needs **at least 2 quiz questions and 2 flashcards**.
- **Flashcards:** 6–15 per chapter. Put one fact, definition, list or contrast on each card, and write the front as a prompt rather than a yes/no question. Optionally add a separate `"abbreviations"` deck with one card per glossary entry, marked `"quizzable": false`.
- **Quiz:** 8–15 questions per week, each with four options. `answer` is the 0-based position of the correct option. Spread the right answers across all four positions. Wrong options must be plausible: things a confused student would choose, never jokes. Use `why` to explain the right answer and, where useful, why the most tempting wrong one fails.
- **Mock exam:** mirror the real exam's format, length and mark split if the materials show it (a past paper, a lecturer's hint, the course outline). Otherwise, write a balanced paper across all weeks. Model answers are written at full-marks standard, in complete paragraphs, using the course's own terms and frameworks, with the diagram described where one would earn marks.
- Base every item on the walkthrough. A student who has read the book can answer everything.

---

## 5. Writing rules

### 5.1 It must read like a book

- Write in continuous, edited prose, like a good textbook. Each chapter should stand on its own if printed.
- Never address the request or yourself. No "Sure!", "Here's…", "Let's dive in", "I hope this helps", "In this response", "As an AI", or questions to the reader such as "Ready?".
- Write in a calm, confident, third-person-neutral voice. "You" is fine when explaining how to do something.
- Explain the idea in sentences first. Lists hold the details to memorise; they never replace the explanation.
- Use a consistent spelling: follow the course materials (British or American), and keep to it.

### 5.2 Accuracy

- **Cover everything the materials teach**: every session, slide deck, reading and worked example. If a topic appears only once, it still gets a place, as a short chapter, a subsection or a box.
- **Add nothing the materials don't support.** General background is allowed only to explain something the materials do say, and must not contradict them.
- **Keep the lecturer's terms, frameworks, numbering and lists exactly** (for example "7 Rights", "FP1–FP6", the order of a model's steps), because the exam marks against them.
- Work every formula with numbers. Quote laws and regulations with their number and year (for example "Permendag No. 25 of 2021"), with an English gloss on first use when the official name is in another language.

### 5.3 Abbreviations

- Spell out every abbreviation the first time it appears **in each chapter**, as in "economic order quantity (EOQ)". After that, use the short form.
- List every abbreviation in the glossary appendix.

### 5.4 Out-of-date or conflicting sources

- If one source contradicts another, follow the most authoritative or most recent one. Note the conflict in `sources.md`.
- If the materials cite a rule or figure that you know has since been amended or replaced, keep what the course teaches, because that is what the exam marks. Add an `<b>Update:</b>` tip box saying what changed and when. List it in `sources.md` too.

### 5.5 Privacy

- Leave out student names, student numbers, group-member lists and personal contact details, even when they appear on assignment covers or forum posts.
- Lecturer and author names as printed in the course materials are fine.

---

## 6. `exam-questions.md` (only if exam questions were given)

When the lecturer has shared likely exam questions (a kisi-kisi, review sheet or past paper), work through each one in this exact shape:

```markdown
## Q3. <the question, word for word>

**Weight / CILO:** 15 marks · CILO 2   ← if known

### What the question is really asking
One short paragraph that restates it in plain words and names the topic it tests.

### Key terms
- **Term** — definition in the course's words.

### Reasoning staircase
1. First step of the argument …
2. … each step builds on the last (4–6 steps).

### Draw this in the exam
A description of the diagram to sketch (boxes, arrows, labels), plus the walkthrough figure it matches (chapter id).

### Model answer
A full-marks answer in paragraphs, written as a strong student would write it in the exam.

### Common mistakes
- Mistake → why it loses marks.
```

---

## 7. `sources.md`

```markdown
# Sources

| Chapter id | Built from |
|---|---|
| w1-what-is-scm | Session 1 slides (pp. 3–21); Lecture notes week 1 |

## Gaps
Topics listed in the course outline but missing from the materials.

## Conflicts
Where sources disagree, and which one the pack follows.

## Updates
Cited rules or figures that have since changed, and where the Update note sits.

## Not used
Files that were skipped, and why (duplicate, unreadable, off-topic).
```

---

## 8. Final checklist

Go through every line before handing the pack back.

- [ ] Every session, slide deck and reading in the folder is covered, and `sources.md` maps each chapter to its sources.
- [ ] `walkthrough.html` is a fragment with no `<style>`, `<script>`, `<html>` or colour values. All chapter ids and marker ids are unique.
- [ ] Every chapter has a tag, an h2, the four-cell chain, an "In plain words" box, at least one figure with a caption, and (except the last) a "Link to next topic" line.
- [ ] No "Chapter N", "Figure N" or table of contents is written by hand.
- [ ] Every abbreviation is spelled out on first use in each chapter and listed in the glossary.
- [ ] Every flashcard and quiz item has a `week` and a valid `chapter` id, and each chapter has at least 2 of each.
- [ ] Quiz answers are spread across positions 0–3, and every `why` explains the answer.
- [ ] The mock exam has model answers written at full-marks standard.
- [ ] No chatty phrasing anywhere: search for "Let's", "Here's", "I ", "you'll love", "!" and rewrite any hits.
- [ ] No student names or student numbers anywhere.
- [ ] Gaps, conflicts and updates are listed in `sources.md`, not guessed at.

---

## 9. After Cowork

Bring the finished pack folder to Claude Code in the SECONDBRAIN repo and ask it to add the pack as a new notebook. Claude Code places the walkthrough in a copy of the notebook page, converts `practice.json` into the flashcard, quiz and mock-exam tabs, turns `exam-questions.md` into a Kisi-kisi chapter, adds the shelf card from `notebook.json`, and checks the result in Scroll and Slide modes.
