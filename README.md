# tau-emotion-bench.github.io

Project page for **τ-Emotion-Bench: Exposing the Interaction Fragility of LLM Agents through Real-World User Emotions**.

Built from the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template).

## Layout

- `index.html` — the project page
- `leaderboard.html` — the leaderboard page; its rows come from `static/js/leaderboard-data.js`
- `static/css/bulma.min.css`, `static/css/index.css` — template styles, with page-specific additions at the bottom of `index.css`
- `static/css/site.css` — colour tokens for light and dark mode, top bar and mode toggle, shared by both pages
- `static/css/theme.css` — minimal black-and-white skin for the project page
- `static/css/leaderboard.css` — leaderboard table
- `static/js/leaderboard-data.js` — leaderboard results, one ranking per user agent
- `static/js/leaderboard.js`, `static/js/theme.js`, `static/js/index.js` — leaderboard rendering, light/dark toggle, BibTeX copy and scroll-to-top
- `static/images/` — figures cropped from the paper, the project logo (`logo.png`, `favicon.ico`, `apple-touch-icon.png`) and the ASU logo

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Updating results for a new paper version

- **Leaderboard:** edit `static/js/leaderboard-data.js`. There is one ranking per user agent (Qwen3-235B-A22B-Instruct-2507 and GLM-5.2). Each entry holds Pass^1 (Avg@3), Pass^3 and the ten per-domain Pass^3 scores; rows are sorted and ranked automatically. Change `updated` to the new date.
- **Project page:** the numbers live in `index.html`: the headline sentence under the chart, the TL;DR and Tracer bullets, the Pass^3 table (paper Table 3), the Tracer table (averages from paper Tables 4 and 5, plus Tracer-High from appendix Table 11) and the one-line findings. Bold marks the best value in each column.
- **Figures:** replace the PNGs in `static/images/` with crops from the new PDF, keeping the file names.

## Open items

Search `index.html` for `TODO`: the arXiv link, the BibTeX eprint, and the `citation_*` meta tags are still to be filled in once the paper is on arXiv.
