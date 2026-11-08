# SECONDBRAIN notebook brief

Give this file to Claude together with a course's study materials (slides, lecture notes, readings, forum posts, past papers, exam hints), or with a set of articles to study. Claude reads everything and writes a **study pack**: a walkthrough that reads like a textbook, plus practice material. The pack slots straight into a SECONDBRAIN notebook.

A pack is one of two kinds:

- **A course notebook** (the usual kind): a walkthrough of the whole course, with flashcards, a quiz, a mock exam and, when the lecturer gave them, worked answers to the exam questions.
- **Article notes**: notes on one or more papers, for summary and understanding. They have an Overview tab and one tab per paper, and no practice material.

Either kind can also come in a second language (section 3.8).

---

## The request

> Read every file in the folder I've given you. Then write a SECONDBRAIN study pack from it, following this brief exactly: the folder layout, the HTML and JSON formats, the writing rules and the final checklist. The walkthrough must read like a well-edited textbook, not like a chat reply. Cover everything the materials teach. Say what the authors and lecturers wrote and explain their points and reasoning, but add nothing of your own: no outside facts, calculations, advice or conclusions they did not give. Where the materials are unclear, contradict each other or look out of date, say so in `sources.md` instead of guessing or correcting them in the book.

---

## 1. What to hand back

One folder named after the course, in lowercase with hyphens (for example `operations-management-midterm/`):

```
<course>-study-pack/
├── notebook.json        course details for the shelf card and the page header
├── walkthrough.html     the book: parts, chapters, figures, glossary appendix
├── practice.json        flashcards, quiz and mock exam (course notebooks only)
├── exam-questions.md    only if the lecturer gave exam questions or a kisi-kisi
└── sources.md           which file fed which chapter, plus gaps, conflicts and updates
```

Article notes leave out `practice.json` and add one file per paper, written like `walkthrough.html` (section 3.7):

```
<topic>-study-pack/
├── notebook.json
├── walkthrough.html     the Overview tab: how the papers connect, a comparison, glossary, references
├── paper1.html          Paper 1's tab
├── paper2.html          Paper 2's tab
└── sources.md
```

Do not write CSS, JavaScript, a page header, or a full HTML document. The site provides all of those. Write only the files above.

Some parts of a notebook are added afterwards in the SECONDBRAIN repo, not in the pack: a **Watch** tab for a video, a **Memorize** tab of endless quizzes built from the worked answers, and the PDF and other downloads. Do not write files for them (see section 9).

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
  "cover": "c-sea",
  "exam": { "type": "Essay, open book", "minutes": 120, "date": "2026-11-12" },
  "shelf_blurb": "One sentence for the library card: what the notebook covers and what practice it includes."
}
```

- **`slug`:** lowercase letters, digits and hyphens. It becomes the page name, `notes/<slug>.html`.
- **`short_title`:** the name in the page header, so keep it to two or three words.
- **`course_name`:** printed large on the shelf card's cover. A long word may carry a soft hyphen, typed as the character itself (U+00AD) rather than `&shy;`, as in `Entre­preneurship`, so it breaks neatly.
- **`covers`:** what the notebook covers, such as "Sessions 1–5 and 7". For article notes, name the papers: "Youk & Park (2023) · Elgueta-Ruiz et al. (2026)".
- **`cover`:** the shelf card's colour: `c-plum` (the default), `c-sea`, `c-clay` or `c-moss`.
- **`exam`:** the exam's format, as the materials give it. Leave it out for article notes.

Leave out any field you can't find in the materials rather than inventing it. For article notes, put a short label such as `"ARTICLE NOTES"` in `course_code`, since there is no course.

Article notes also name their tabs:

```json
  "tab_label": "Overview",
  "tabs": [
    { "id": "paper1", "label": "Paper 1", "file": "paper1.html" },
    { "id": "paper2", "label": "Paper 2", "file": "paper2.html" }
  ]
```

`tab_label` renames the first tab (the walkthrough). Each entry in `tabs` adds a reading tab from its own file; its `id` must not match any chapter id. For the language fields, see section 3.8.

---

## 3. `walkthrough.html`: the book

### 3.1 Overall shape

The file is an HTML **fragment**: no `<html>`, `<head>`, `<body>`, `<style>` or `<script>`. It runs top to bottom in this order:

1. **Title block.** A kicker line, the `h1` and a lede paragraph (see the example in 3.6).
2. **"Start here" chapter.** A map of the whole course: the topics in the order they're taught, and the connections the materials make between them, with one figure. Its tag must contain the words `Start here`.
3. **Parts.** One part per week or teaching block. Each part opens with a part-title divider, followed by its chapters.
4. **Synthesis chapter** (only if the materials support one). How the topics combine in an exam answer, as the materials show it. Leave it out if they don't join the topics themselves.
5. **Appendices.** At least a glossary of every abbreviation. Other reference tables are welcome, such as key lists, a numbers sheet, formula sheets, a list of laws, a timeline, or a reference list.

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

- **`id`:** unique across the whole pack, every tab included. Use lowercase letters, digits and hyphens, and prefix the week (`w3-…`) or session (`s3-…`). Practice items point at these ids.
- **`data-week`:** the week or session number as a whole number. For a range like Sessions 3–4, use the first number. Leave it off chapters that don't belong to a week, such as Start here, the synthesis chapter, and the chapters of article notes.
- **`.tag`:** a short label for where the chapter sits in the course, for example "Week 3 · CILO 2" or "Session 5–6". The site puts "Chapter N ·" in front of it.
- **`h2`:** a title that says what the chapter is about in plain words. A colon followed by the formal name works well. Keep it short enough to read whole on a phone; Slide mode never cuts a chapter title.
- **Size:** aim for 600–1,500 words per chapter. Split any topic that runs longer. Merge two topics if each would be very thin.

A chapter body follows this **teaching order**, so that every chapter reads the same way:

1. **The chain**: four short cells covering Problem, Big idea, How (tools) and Result. One or two sentences each.
2. **In plain words**: two to four paragraphs explaining the idea and the reasoning behind it as a good tutor would, using examples the materials themselves give.
3. **At least one figure** that shows the mechanism as the materials describe it: a flow, a cycle, a matrix, a timeline or a comparison. See 3.5.
4. **The details to memorise**: definitions, lists, steps, tables and formulas, each under an `h3` subheading.
5. **An exam tip** only where the materials show how the topic is examined.
6. **A link to the next chapter**: one line giving the connection the materials make to the next topic. Leave it off where they make none, and on the last chapter of the book.

All of these, including the chain, captions and link lines, follow the rule in 5.2.

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
| Exam tip | `<div class="tip"><b>Exam tip:</b> …</div>` | How the materials say a question on this is asked and answered |
| Update note | `<div class="tip"><b>Update:</b> …</div>` | A change the materials themselves report (see 5.4) |
| Mnemonic | `<span class="mnemo">TIM WOODS</span>`, inside a heading or sentence | Memory aids, followed by what each letter stands for |
| Formula | `<div class="formula">EOQ = √(2DS / H)` ⏎ `D = 1,200 units, S = 50, H = 3 → EOQ ≈ 200</div>` | Formulas, with the materials' worked example on the next line if they print one. ⏎ means a real line break; the box keeps line breaks exactly as typed, so keep each line short |
| Next link | `<p class="next"><b>Link to next topic →</b> …</p>` | The final line of a chapter |
| Lists | plain `<ul>`/`<ol>`; start each item with `<b>Term</b>:` | Definitions and must-know facts |

Inline tags: `<b>` for a key term the first time it is defined, `<i>` for foreign words and titles, and `<a href="#chapter-id">` to point to another chapter, in any tab. Do not use `<br>`, empty paragraphs, emojis or Markdown syntax inside the HTML.

### 3.5 Figures

Draw every figure as inline SVG using the site's diagram classes. They switch colour with the reader's theme, so **never write a colour, a `fill=`/`stroke=` value or a font size** into the SVG. Readers can also download each figure as a PNG or SVG in their theme's colours, so every figure must make sense on its own, away from the text around it.

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
- Every `<marker>` `id` must be unique in the whole pack. Prefix it with the chapter id, as in `w3a-m`.
- Keep text inside its box. At this scale one line holds about 30 characters in a 240-wide box. Break longer text into several `<text>` lines 15 units apart.
- Every figure needs a `role="img"`, an `aria-label` that describes it in one sentence, and a `<figcaption>`.
- A chart plots only numbers the materials print. Where a shape stands for an idea rather than data (such as a U curve), the caption says so.
- For three small figures side by side, wrap three `<figure>`s in `<div class="trio">…</div>`.
- Use no images, external files or `<foreignObject>`.

### 3.6 Title block and appendices

```html
<p class="kicker">MGMT1234 · Operations Management · BINUS University</p>
<h1>Course walkthrough</h1>
<p class="lede">What this book covers, how each chapter is organised (problem, big idea, tools, result; then plain words, a figure and the details to memorise), what "S1–2" or "CILO" means, and that every abbreviation is spelled out the first time and listed in the glossary.</p>
```

If the course folder lacks a session that the outline lists, the lede says which one and that the book does not cover it.

Appendices use the class `bk-back`, and the site labels them "Appendix". They come last:

```html
<section class="topic bk-back" id="glossary"><span class="tag">Reference</span><h2>Glossary of abbreviations</h2>
<div class="tbl"><table class="gloss"><tr><th>Short</th><th>Stands for / meaning</th></tr>
<tr><td><b>EOQ</b></td><td>Economic Order Quantity: the order size that minimises ordering plus holding cost</td></tr>
</table></div></section>
```

Sort the glossary alphabetically. It must list **every** abbreviation used anywhere in the pack. Article notes may make it a "Glossary of abbreviations and terms" and add a `bk-back` **References** appendix with each paper's full reference.

### 3.7 Article notes: one tab per paper

Article notes use the same chapters, blocks and figures, spread over several tabs:

- **`walkthrough.html` is the Overview tab.** It opens with a title block and a "Start here" chapter on how the papers connect, with one figure. A synthesis chapter sets the papers side by side (a comparison table works well), and the glossary and references follow as appendices. It has no parts.
- **Each paper has its own file**, such as `paper1.html`, listed under `tabs` in `notebook.json`. It opens with its own title block: the kicker names the paper's type and journal, the `h1` says what the paper finds in plain words, and the lede gives the full reference and says how the tab is organised.
- **The first chapter tells the whole article as one story**, from the problem to what the authors conclude, and shows how to read the paper's numbers. Its tag is "Paper 1 · The whole article". The chapters after it follow the paper's argument in its own order (theory, method, model, results, the authors' own analysis and limits), with tags such as "Paper 1 · Method".
- **Prefix every chapter id with its paper**, as in `p1-design`, so ids stay unique across tabs.
- Chapters of article notes keep the teaching order in 3.3, except that exam tips appear only if the materials say how the papers are examined.
- Set out the authors' own reasoning: why they expected what they tested, and why they think the result came out as it did. Statistics are reported as the paper prints them, with what each one means.

### 3.8 A second language

A notebook can come in two languages, such as English and Bahasa Indonesia, with an EN / ID switch in the header that keeps the reader on the same chapter. Do this only when asked.

- **Write a second, complete pack** in its own folder, named with the language code at the end: `crisis-communication-id/` beside `crisis-communication/`. Give it the same files and **exactly the same chapter ids**, so the switch lands on the matching chapter.
- **Write it by meaning and context, not word for word.** It must say the same things as the first pack, no more and no less, and its figures must be redrawn with the second language's labels. Keep technical terms the field uses in English (for example mediator, moderator, SCCT) and explain each the first time it appears. Use the language's own number format (1.906 and 71,35% in Bahasa Indonesia).
- **Translate everything a reader sees**: title, short title, course name, covers, shelf blurb, tab labels and the tag and title of every chapter. Fields that are not text, such as `cover`, stay the same.
- **Add the language fields to both `notebook.json` files**, with the first language listed holding the shelf card:

```json
  "lang": "id",
  "languages": { "en": "crisis-communication", "id": "crisis-communication-id" },
  "language_names": { "en": "English", "id": "Bahasa Indonesia" }
```

`lang` is the pack's own language; `languages` and `language_names` are the same in both files.

- **The second pack's `sources.md`** points to the first pack's for sources, gaps and conflicts, and records how the translation was done: which terms stay in English and which number format is used.

---

## 4. `practice.json`

Course notebooks only. Article notes leave this file out, and the notebook then has its reading tabs alone.

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
      "why": "The slides list materials, information and resources; advertising is not among them." }
  ],
  "mock_exam": {
    "minutes": 120,
    "instructions": "Answer all questions. Marks are shown in brackets.",
    "sections": [
      { "id": "A", "title": "Section A · Concepts",
        "questions": [
          { "q": "Explain the difference between logistics and SCM …", "marks": 15,
            "model_answer": "A complete answer at full-marks standard, in paragraphs …",
            "marking_points": ["Defines logistics as …", "Defines SCM as …"],
            "chapters": ["w1-what-is-scm"] }
        ] }
    ]
  }
}
```

- **Every item names its `week` and `chapter`** (a chapter `id` from the walkthrough). The site uses these to place two questions and one recall card in a "Check yourself" box at the end of each chapter, so each chapter needs **at least 2 quiz questions and 2 flashcards**.
- **Flashcards:** 6–15 per chapter. Put one fact, definition, list or contrast on each card, and write the front as a prompt rather than a yes/no question. Keep deck names short, as in "Week 1 · Introduction". Optionally add a separate `"abbreviations"` deck with one card per glossary entry, marked `"quizzable": false`.
- **Quiz:** 8–15 questions per week, each with four options. `answer` is the 0-based position of the correct option. Spread the right answers across all four positions. Wrong options must be plausible: things a confused student would choose, never jokes. Use `why` to explain the right answer and, where useful, why the most tempting wrong one fails.
- **Mock exam:** mirror the real exam's format, length and mark split if the materials show it (a past paper, a lecturer's hint, the course outline). Otherwise, write a balanced paper across all weeks. If the lecturer has given a mock paper that `exam-questions.md` works through, copy its format but ask new questions, so the two do not repeat each other; a question that sets an invented scenario says so in `sources.md`. Model answers are written at full-marks standard, in complete paragraphs, using the course's own terms and frameworks and only what the materials say, with the diagram described where one would earn marks. `marking_points` is optional: a short list of what a marker looks for.
- Base every item on the walkthrough. A student who has read the book can answer everything. Only wrong quiz options may go beyond the materials, and a `why` may not.

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
- **Say what the authors and lecturers wrote, and add nothing of your own.** Explaining what they said and their reasoning is allowed, and every claim must trace to the materials. That rules out outside background, calculations they did not print, advice, invented "common mistakes", and conclusions joining sources unless a source joins them itself.
- **Keep the lecturer's terms, frameworks, numbering and lists exactly** (for example "7 Rights", "FP1–FP6", the order of a model's steps), because the exam marks against them.
- **Mark where a point comes from a student's or user's notes** rather than from the paper's author or the lecturer.
- **Leave out material that is not the lecturer's or the authors'**, such as a classmate's slide deck or a group's presentation. List it under "Not used" in `sources.md`, with any point where it disagrees with the course.
- Show a formula's worked numbers only if the materials print them. Quote laws and regulations with their number and year (for example "Permendag No. 25 of 2021"), with an English gloss on first use when the official name is in another language.
- **Problems you find in a source**, such as a table that does not add up, go in `sources.md` and your hand-back message, not in the reading text.

### 5.3 Abbreviations

- Spell out every abbreviation the first time it appears **in each chapter**, as in "economic order quantity (EOQ)". After that, use the short form.
- List every abbreviation in the glossary appendix.

### 5.4 Out-of-date or conflicting sources

- If one source contradicts another, follow the most authoritative or most recent one. Note the conflict in `sources.md`.
- If the materials cite a rule or figure that you know has since been amended or replaced, keep what the course teaches, because that is what the exam marks. Put what you know in `sources.md` only, not in the book.
- Use an `<b>Update:</b>` tip box only when the materials themselves report the change. List it in `sources.md` too.

### 5.5 Privacy

- Leave out student names, student numbers, group-member lists, signatures and personal contact details, even when they appear on assignment covers, exam cover sheets or forum posts.
- Lecturer and author names as printed in the course materials are fine.

---

## 6. `exam-questions.md` (only if exam questions were given)

When the lecturer has shared likely exam questions (a kisi-kisi, review sheet, mock paper or past paper), work through each one. The site turns this file into a **Kisi-kisi** tab: each question becomes a chapter, its model answer sits behind a **Show answer** button, and the reader can tick "I can explain this without looking".

### 6.1 Shape of the file

The file opens with a title, a lede and a note on how to use the answers, then one section per question, and ends with the references:

```markdown
# Mock midterm: worked answers

MGMT1234 · Operations Management · Mock midterm (UTS), given by the lecturer for study. Closed book, 120 minutes, four essay questions of 25 marks each.

**How to use these answers.** Where the answers come from, what is marked as outside material, which parts are memory aids, and how to cite in this exam.

---

## Q1. <the question, word for word>

…

---

## Q4A. <a choice question: Topic A, word for word>

…

---

## References

Full references, one paragraph each, in the citation style the course uses.
```

- The first paragraph after the `#` title becomes the tab's lede; any paragraphs after it, up to the first `---`, are shown as a "how to use" box.
- Number the questions as the paper does. Where the paper offers a choice, work through every option and letter them `Q4A`, `Q4B`.
- `## References` is optional and goes last. It becomes an appendix.

### 6.2 Each question

```markdown
## Q3. <the question, word for word>

**Title:** A short chapter title for this question, under about 60 characters

**Weight / CILO:** 15 marks · CILO 2   ← if known

### What the question is really asking
One short paragraph that restates it in plain words and names the topic it tests.

### Key terms
- **Term** — definition in the course's words.

### Remember it as a line
**The line:** Stop → Stop → Stop → Stop → Stop.

**In one breath:** One short sentence per stop, in order.

**Keep A and B apart:** the one difference that stops two ideas being confused.

**Cite from memory:** which names (and years) to cite for which part.

### Reasoning staircase
1. **Stop.** The point of this step, and the reason it leads to the next. End on the question the next step answers.
2. **Stop.** … each step is the reason for the next (4–6 steps), and the last one closes the answer.

### Draw this in the exam
An SVG `<figure>` of the diagram, following the figure rules in section 3 and with no blank lines inside it, then a blank line.
A description of the diagram to sketch (boxes, arrows, labels), plus the walkthrough figure it matches (chapter id in backticks, which becomes a link to that chapter).

### Model answer
A full-marks answer in paragraphs, written as a strong student would write it in the exam.

### Common mistakes
- Mistake → why it loses marks. Include only mistakes the materials name; otherwise leave this section out.
```

- **Required sections:** What the question is really asking, Reasoning staircase and Model answer. The others are optional. Without a `**Title:**` line, the question's first sentence becomes the chapter title.
- **Remember it as a line** is a memory aid: a line of short names, one for each step of the staircase, so the student can rebuild the answer in order. Its words are aids, not the authors' wording, and it adds no fact that is not in the model answer. Say so in the "How to use these answers" note.
- **The reasoning staircase is a chain of reasons.** Each step opens with its stop name in bold, makes its point and ends with why that point leads to the next step. The model answer follows the same order, so the line, the staircase and the answer match.
- A chapter id in backticks anywhere in the file becomes a link to that chapter, so use only ids that exist.

### 6.3 Sources and citations in the worked answers

- **Build each answer from the course materials first.** Only if the student asks, and only where the materials do not cover a part the question requires, a small number of free, open-access sources from reputable publishers may fill the gap. Mark each such point **[outside the slides]** in the answer and in its key term, list each source in `sources.md`, and keep it out of `walkthrough.html` and `practice.json`.
- **Cite the way the exam asks.** Follow what the paper says about citations. When the exam is closed book and the student must cite from memory, keep the names to a short list that can be held in memory: the scholars and reports the questions name, plus the course textbook for everything else the course takes from it. Give that list in the "How to use these answers" note, and each question's "Cite from memory" line says which of them that answer uses.
- Keep each answer's figures exactly as the slides give them, even where an outside source has newer ones, and note the difference in `sources.md`.

---

## 7. `sources.md`

```markdown
# Sources

Which course folder or papers the pack was built from, and a note on the practice material: how the mock exam relates to the lecturer's paper, and any scenario invented for it.

**exam-questions.md.** Where the worked answers come from, any outside sources (title, publisher, licence, and the part each one fills), and how citations are handled.

| Chapter id | Built from |
|---|---|
| w1-what-is-scm | Session 1 slides (pp. 3–21); Lecture notes week 1 |

## Gaps
Topics listed in the course outline but missing from the materials, such as a session with no slide deck.

## Conflicts
Where sources disagree, and which one the pack follows.

## Updates
Cited rules or figures that have since changed. Say whether the materials report the change (and where the Update note sits) or it comes from outside them (kept out of the book).

## Source problems
Errors found in a source, such as a table that does not add up. Kept out of the book.

## Not used
Files that were skipped, and why (duplicate, unreadable, off-topic, not the lecturer's), and personal details left out of cover sheets.
```

---

## 8. Final checklist

Go through every line before handing the pack back.

- [ ] Every session, slide deck, reading and paper in the folder is covered, and `sources.md` maps each chapter to its sources.
- [ ] `walkthrough.html` and every tab file are fragments with no `<style>`, `<script>`, `<html>` or colour values. All chapter ids and marker ids are unique across the whole pack.
- [ ] Every chapter has a tag, an h2, the four-cell chain, an "In plain words" box and at least one figure with a caption. It has a "Link to next topic" line wherever the materials connect it to the next chapter.
- [ ] Every claim traces to the materials, including chains, captions, link lines, `why` text and model answers. Nothing of your own was added, and points from a student's or user's notes are marked as such.
- [ ] No "Chapter N", "Figure N" or table of contents is written by hand.
- [ ] Every abbreviation is spelled out on first use in each chapter and listed in the glossary.
- [ ] Every flashcard and quiz item has a `week` and a valid `chapter` id, and each chapter has at least 2 of each.
- [ ] Quiz answers are spread across positions 0–3, and every `why` explains the answer.
- [ ] The mock exam has model answers written at full-marks standard, and does not repeat the questions in `exam-questions.md`.
- [ ] In `exam-questions.md`, every question has the three required sections, its line, staircase and model answer run in the same order, every outside point is marked **[outside the slides]**, and every chapter id in backticks exists.
- [ ] Article notes: each paper's tab opens with "the whole article" chapter, and its ids carry the paper's prefix.
- [ ] A second-language pack has the same files and chapter ids as the first, says the same things, and both `notebook.json` files carry matching `languages`.
- [ ] No chatty phrasing anywhere: search for "Let's", "Here's", "I ", "you'll love", "!" and rewrite any hits.
- [ ] No student names, student numbers or signatures anywhere.
- [ ] Gaps, conflicts, updates and source problems are listed in `sources.md`, not guessed at or corrected in the book.

---

## 9. After Cowork

Bring the finished pack folder to Claude Code in the SECONDBRAIN repo and ask it to add the pack as a new notebook. There:

1. The pack is copied to `packs/<slug>/` and built with `python3 -I tools/build_notebook.py packs/<slug>`. That script checks the pack (forbidden markup, duplicate ids, broken links, practice items or worked answers that name a missing chapter), turns `exam-questions.md` into a Kisi-kisi tab, `practice.json` into the Flashcards, Quiz and Mock exam tabs and each entry in `tabs` into its own reading tab, and adds the shelf card from `notebook.json`. A second-language pack is built the same way, and the header then gets the EN / ID switch.
2. Extras are added in the repo if wanted: a **Watch** tab for a video (a `video` entry in `notebook.json`, with the file in `notes/<folder>/`), and a **Memorize** tab of endless quizzes built from the worked answers (`memorize.json`, which retells each model answer in easy English and adds no facts).
3. The notebook's PDF and downloads are refreshed with `node tools/downloads/build_pdf.js <slug>`.
4. The result is checked in Scroll and Slide modes, in every tab, and in both languages where there are two, before it is pushed.
