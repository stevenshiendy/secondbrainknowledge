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
- **Export-Import Midterm** (`notes/export-import.html`), ENPR6304032, Weeks 1–7. It has 38 chapters in parts A–I, the recordkeeping-fine and de minimis calculators, and a searchable 100-term glossary as an appendix. It also has a FOB & CIF explainer with a price-ladder calculator, a 62-question quiz, 119 flashcards plus a 100-card Abbreviations deck, and a timed mock midterm. A dotted underline marks an abbreviation: tap it for the full form and a link to the glossary. To rebuild it from a new version of the study pack, run `python3 -I tools/build_exim.py <path to export-import-study-pack>`. `assets/exim.css` holds its content styles. Material written for this notebook rather than taken from the pack lives in `tools/exim-additions/`. So far that is the mnemonic for the 10 General Prohibitions (Chapter 27), which the build script adds again on every rebuild along with its two Week 6 flashcards.

## Adding a notebook

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
- `assets/secondbrain.js`: preferences, side panels, shelf progress
- `assets/reader.js`: Scroll/Slide modes, contents, highlights, reading progress
- `assets/boot.js`: applies saved settings before the page draws
