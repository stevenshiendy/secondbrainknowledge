# SECONDBRAIN

Study notes and course notebooks, kept like books.

Open `index.html` in any browser (double-click works), or host the folder on any static host such as GitHub Pages.

## Reading preferences

The **Aa** button opens the preferences panel. It slides in from the right on wide screens and up from the bottom on phones. Every page uses the same saved settings:

- **Themes:** Light, Dark, Sepia, Navy, Charcoal, Sage. In every theme, body text has a contrast ratio of at least 9:1 and secondary text at least 4.5:1.
- **Match system light/dark:** follows the device setting. The sun/moon button in the header switches between light and dark.
- **High contrast:** shows secondary text at full strength and makes rules heavier.
- **Font size, font, bold text, justify text**
- **Line, character and word spacing; page width** (page width shows on wide screens only)

Settings are saved in the browser on each device.

## Reading a notebook

The toolbar at the top right works like the Malaka Books reader:

- **Scroll / Slide:** Scroll is one long page. Slide turns the walkthrough into pages: two side by side on wide screens, one on phones. Turn pages with the ‹ › buttons, the arrow keys, a trackpad or mouse wheel, or a swipe. Each topic starts on a new page.
- **Contents** (list icon): jump to any topic, or to Flashcards, the quiz or the mock exam. The topic you're reading is highlighted.
- **Highlights** (marker icon): select text in the walkthrough and pick yellow, green, blue or pink. Click a highlight to change its colour or remove it. The panel lists every highlight by topic, and clicking one takes you to it.
- **Aa:** reading preferences. **Sun/moon:** switches between light and dark.

Highlights, reading progress and the chosen mode are saved in the browser on each device.

The GSCM notebook also has a **Kisi-kisi** chapter: the lecturer's 14 UTS questions, each worked through the same way (what the question asks, a numbered reasoning staircase, the diagram with a "draw this in the exam" tip, a model answer hidden behind **Show answer**, and common mistakes). Tick "I can explain this without looking" on each question to track what you've mastered. It works with Slide mode, Contents and highlights just like the walkthrough. It was built from `Steven_Shiendy_GSCM_KisiKisi_Report/REPORT.md`, keeping its wording, with the figures drawn in the page's theme colours.

## Notebooks on the shelf

- **GSCM Midterm** (`notes/gscm-midterm.html`): walkthrough, kisi-kisi, flashcards, quiz, mock exam.
- **Export-Import Midterm** (`notes/export-import.html`), ENPR6304032, Weeks 1–7: an illustrated walkthrough with the recordkeeping-fine and de minimis calculators, a 58-question quiz, 113 flashcards and a timed mock midterm. It was built from `export-import-study-pack/` (the foundations report and the practice workbook), keeping their wording and data, and restyled to the SECONDBRAIN themes. Its extra cargo, stamp and leaf colours also keep 4.5:1 contrast in every theme. `assets/exim.css` holds its content styles.

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
- `assets/secondbrain.js`: preferences, side panels, shelf progress
- `assets/reader.js`: Scroll/Slide modes, contents, highlights, reading progress
- `assets/boot.js`: applies saved settings before the page draws
