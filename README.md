# SECONDBRAIN

Study notes and course notebooks, kept like books.

Open `index.html` in any browser (double-click works), or host the folder on any static host such as GitHub Pages.

## Reading preferences

The **Aa** button opens the preferences panel. It slides in from the right on wide screens and up from the bottom on phones. Every page uses the same saved settings:

- **Themes:** Light, Dark, Sepia, Navy, Charcoal, Sage. In every theme, body text has a contrast ratio of at least 9:1 and secondary text at least 4.5:1.
- **Match system light/dark:** follows the device setting. The sun/moon button in the header switches between light and dark.
- **High contrast:** shows secondary text at full strength and makes rules heavier.
- **Font size** (the current size shows as a badge beside the label, and in a bubble over the slider while you drag), **font, bold text, justify text**. Changing the size is live and smooth, and the line you are reading stays in place while the text grows or shrinks.
- **Line, character and word spacing; page width** (page width shows on wide screens only)

Settings are saved in the browser on each device.

## Reading a notebook

The toolbar at the top right works like the Malaka Books reader:

- **Scroll / Slide:** Scroll is one long page. Slide turns the walkthrough into pages: two side by side on wide screens, one on phones. Turn pages with the ‹ › buttons, the arrow keys, a trackpad or mouse wheel, or a swipe. To jump straight to a page, tap **Page N of M**, then type a number or drag the slider (it shows which chapter you will land in) and press **Go**. Each topic starts on a new page.
- **Search** (magnifier icon, or press `/`): finds a word or phrase across the whole notebook, including every chapter, Kisi-kisi, FOB & CIF, quiz and mock-exam questions (model answers too), flashcards and the glossary. Results are grouped by tab with a short preview; tap one to jump there with every match marked. A bar at the bottom steps through all matches (‹ ›) and ✕ clears them.
- **Contents** (list icon): jump to any topic, or to Flashcards, the quiz or the mock exam. The topic you're reading is highlighted.
- **Highlights** (marker icon): select text in the notes and pick yellow, green, blue or pink. A small toolbar then sits at the top of the highlight with **Remove**, the colours and **Copy**. Tap any highlight later to bring it back. The panel lists every highlight by topic, and clicking one takes you to it.
- **Aa:** reading preferences. **Sun/moon:** switches between light and dark.

Most chapters in the Walkthrough and FOB & CIF tabs end with a **Check yourself** box: two multiple-choice questions and one recall card, to answer from memory before moving on. They are drawn from the notebook's own quiz and flashcards. Each item goes to the chapter it tests: the chapter it is tagged with, otherwise the chapter whose wording it matches best within its week. Answers are saved. Rating a recall card **Not yet** adds that card to the Flashcards tab's review pile, and **Try again** clears a box.

Each notebook remembers the exact spot you were reading: the line at the top of the screen in Scroll mode, or the page in Slide mode, and in any tab. Refreshing, reopening the notebook or tapping **Resume** on the home page brings you straight back there. A link to a specific chapter or tab still goes to that chapter or tab.

Highlights, reading progress and the chosen mode are saved in the browser on each device.

Every reading view is laid out as a book (`assets/book.css`): a title page, a contents page (with page numbers in Slide mode), part-title pages, numbered chapters and figures, indented paragraphs with a drop cap, and reference sections set as appendices. Headings keep one design whatever the reading font, text size or spacing: they stay in the book serif, and the font and spacing settings change only the body text. In Slide mode a heading never sits at the bottom of a page with its text on the next; the reader moves it, with the box or list it opens, to the next page. Boxes and two-column lists re-flow with the text size, so big text stacks them instead of splitting words.

The GSCM notebook also has a **Kisi-kisi** chapter: the lecturer's 14 UTS questions, each worked through the same way (what the question asks, a numbered reasoning staircase, the diagram with a "draw this in the exam" tip, a model answer hidden behind **Show answer**, and common mistakes). Tick "I can explain this without looking" on each question to track what you've mastered. It works with Slide mode, Contents and highlights just like the walkthrough. It was built from `Steven_Shiendy_GSCM_KisiKisi_Report/REPORT.md`, keeping its wording, with the figures drawn in the page's theme colours.

## Notebooks on the shelf

- **GSCM Midterm** (`notes/gscm-midterm.html`): walkthrough, kisi-kisi, flashcards, quiz, mock exam.
- **Export-Import Midterm** (`notes/export-import.html`), ENPR6304032, Weeks 1–7. It has 52 chapters in parts A–K. These include Part J "Laws & flows" (the regulations behind the video, and the export and import flows step by step) and Part K "Regulations by level" (with its own regulation quiz). It also has the recordkeeping-fine and de minimis calculators and a searchable 146-term glossary as an appendix. The other tabs are a FOB & CIF explainer, a **Watch** tab that plays the narrated explainer *The Paper Trail* (`notes/paper-trail/`) with its chapters and captions and pauses when you leave the tab. Its **Full screen** button (or the F key) fills the screen; where a browser won't do that for part of a page, as on iPhone, the player fills the browser window instead, and ✕ or Esc goes back. The build script adds the Full screen button to the copied player, and also fixes the pack's play overlay so it hides once the narration starts. The notebook also has an Assignments tab, a 92-question quiz, 163 flashcards plus a 146-card Abbreviations deck, and a timed mock midterm. A dotted underline marks an abbreviation: tap it for the full form and a link to the glossary. To rebuild it from a new version of the study pack, run `python3 -I tools/build_exim.py <path to export-import-study-pack>`. `assets/exim.css` holds its content styles. Material written for this notebook rather than taken from the pack lives in `tools/exim-additions/`. So far that is the mnemonic for the 10 General Prohibitions (Chapter 27), which the build script adds again on every rebuild along with its two Week 6 flashcards. The **Assignments** tab holds the four course assignments as chapters, each linked from the walkthrough chapter it draws on. Their source files are in `tools/exim-additions/assignments/`, and they carry no names or student numbers. Where the study pack shows that a cited regulation has since been amended or replaced, an "Update since submission" note sits beside the original text.

- **International New Venture** (`notes/international-new-venture.html`), ENPR6306032, Sessions 1–14. It has 30 chapters in parts A–G, including the EuroDisneyland, LocalBite and FreshMart cases, and three appendices (glossary, key lists, numbers sheet). A **Watch** tab plays *From Idea to Market* (`notes/international-new-venture-video/`), a 13:17 3D animated explainer with captions in the picture and chapter buttons, and pauses when you leave the tab. The exam is two essay case questions, and each case chapter keeps the student's own assignment answer in a separate section that marks where it went wrong. Practice comes as 230 flashcards plus 41 abbreviations, an 88-question quiz and a six-question case-based mock exam whose model answers link back to the chapters they draw on. It was built from the study pack in `packs/international-new-venture/`; that folder's `sources.md` records the sources, gaps, conflicts and update notes.

- **Crisis Communication** (`notes/crisis-communication.html`, in Bahasa Indonesia `notes/crisis-communication-id.html`): notes on two open-access papers, for summary and understanding, so there are no flashcards, quiz or mock exam. The **Overview** tab shows how the papers connect and compares them, and holds the glossary and references. The **Paper 1** tab covers Youk & Park (2023), an experiment on why adding a scapegoat to an apology backfires. The **Paper 2** tab covers Elgueta-Ruiz et al. (2026), a 24-year review of crisis communication research in *Public Relations Review*. Each paper's tab opens with a chapter that tells the whole article as one story and sets out the authors' own reasoning. The text says what the authors and the study notes say, explains it, and adds nothing else. The **EN / ID** switch in the header changes language, stays on the chapter being read, and is remembered on that device. The Indonesian text and figures are written by meaning and context, not translated word for word; the reader's own tools (Scroll, Slide, search and so on) stay in English. Highlights and reading position are kept separately for each language. It is built from `packs/crisis-communication/` and `packs/crisis-communication-id/`, and the first of those has a `sources.md` that lists number conflicts to check against the papers.

- **Entrepreneurship: A Global Perspective** (`notes/entrepreneurship-global-perspective.html`), ENPR6303032, Sessions 1–5 and 7. The course folder has no Session 6 deck, so the book does not cover it. It has 19 chapters and three appendices (glossary, key lists, numbers sheet). The **Kisi-kisi** tab works through the lecturer's mock midterm (Questions 1–3 and both choices of Question 4); points taken from outside the slides are marked "[outside the slides]" and appear only there. Practice comes as 200 flashcards plus 29 abbreviations, a 66-question quiz and a new mock paper in the same format. It was built from the study pack in `packs/entrepreneurship-global-perspective/`; the exam diagrams were drawn for this site and live in that pack's `exam-questions.md`. Its `sources.md` records the sources, gaps, conflicts and source problems.

## Adding a notebook

To turn a new course's materials into a notebook, give Claude [`tools/notebook-brief.md`](tools/notebook-brief.md) along with the materials. The brief sets out the study pack it should write: a book-style walkthrough in this site's markup, flashcards, a quiz, a mock exam, optional worked exam questions, and a source map. Then:

1. Copy the pack folder to `packs/<slug>/`, using the `slug` from its `notebook.json`.
2. Run the command below. It checks the pack (forbidden markup, duplicate ids, broken links, practice items that name a missing chapter). If the checks pass, it writes `notes/<slug>.html` with Walkthrough, Kisi-kisi (when the pack has exam questions), Flashcards, Quiz and Mock exam tabs, and adds or refreshes the notebook's card on the home page. Run it again after changing the pack.
3. Open the notebook in Scroll and Slide mode and check it before pushing.

```bash
python3 -I tools/build_notebook.py packs/<slug>
```

For notes meant only for reading, leave out `practice.json`: the notebook then has the Walkthrough alone, with no Flashcards, Quiz or Mock exam tabs.

To add more reading tabs, add `"tabs": [{"id", "label", "file"}]` to `notebook.json`, with each file written like `walkthrough.html`; `"tab_label"` renames the first tab. To offer a second language, make a second pack with the same chapter ids and set `"lang"` and `"languages": {"en": "<slug>", "id": "<slug>-id"}` in both `notebook.json` files. Build both. The first language listed holds the shelf card, and the header gets a language switch.

To add a **Watch** tab, put the video in `notes/<folder>/` and add a `"video"` entry to `notebook.json` with `folder`, `file`, and optionally `poster`, `title`, `blurb` and `chapters` as `[seconds, "name"]` pairs. Keep the file under GitHub's 100 MB limit.

If the pack has an `exam-questions.md`, the script also builds a **Kisi-kisi** tab from it: each question with its reasoning staircase, diagram, a model answer behind **Show answer**, and an "I can explain this without looking" tick.

The steps for building a notebook entirely by hand:

1. Copy `notes/gscm-midterm.html` to `notes/<name>.html`.
2. Replace everything inside `<main>`, plus the flashcard/quiz/mock data in the inline `<script>`.
3. Set `data-book="<name>"` on `<body>`, which keys the reading-progress tracking.
4. Mark each long reading view with `data-readable` (as `#v-learn` and `#v-kisi` are) so Slide mode, Contents and highlights cover it.
5. Copy the `<article class="book">` card in `index.html` and set `data-progress-for="<name>"` and its links.

Shared files:
- `assets/secondbrain.css`: themes, header, preferences panel, library
- `assets/notebook.css`: notebook content, reader toolbar, Slide mode, highlights, kisi-kisi
- `assets/exim.css`: Export-Import notebook content
- `assets/book.css`: book layout for every reading view
- `tools/build_exim.py`: rebuilds the Export-Import notebook from the study pack
- `tools/build_notebook.py`: builds any notebook from a pack written to `tools/notebook-brief.md`
- `assets/secondbrain.js`: preferences, side panels, shelf progress
- `assets/reader.js`: Scroll/Slide modes, contents, highlights, reading progress
- `assets/boot.js`: applies saved settings before the page draws
