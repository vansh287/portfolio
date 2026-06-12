# Vansh Pandit — Portfolio

Two single-file portfolio sites, no build step, no dependencies. Just open the HTML.

| File | Edition | Vibe |
|------|---------|------|
| [`index.html`](index.html) | **Paper edition** — *"Learning to see, carefully"* | Typeset as a research paper about its own author. Cream paper, margin figures, desk-lamp dark mode. |
| [`scan.html`](scan.html) | **Workstation edition** — *"Signal, Extracted"* | Dark radiology / DICOM workstation. Boot sequence, slice navigator, scout-view map, W/L film-invert mode. |

The two are cross-linked in their footers — same person, two completely different ways of telling the story.

## Run locally

Any static server works. For example:

```bash
python -m http.server 8742
# then open http://localhost:8742/
```

## Deploy

These are plain static files, so any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). `index.html` is the landing page.

— BS-MS Mathematics · minor in Data Science, IISER Thiruvananthapuram
