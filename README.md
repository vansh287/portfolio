# Vansh Pandit — personal site

A single static page. No build step, no framework, no external requests.

| | |
|---|---|
| `index.html` | The built site. **Generated — edit the content, not this file.** |
| `site/content.json` | Every word on the site. |
| `site/template.html.j2` | The page structure. |
| `build.py` | Renders `content.json` + template → `index.html`. |
| `editor.py`, `site/editor.html` | The local editing app. |
| `fonts/` | Gambetta (headings) and Switzer (text), Indian Type Foundry via Fontshare, free for commercial use. Self-hosted woff2. |
| `img/vansh.jpg` | Portrait used in the introduction and the link-preview card. |
| `figures/` | Figures from the HECKTOR paper, taken from the project repo (MIT). |
| `js/` | [COBE](https://github.com/shuding/cobe) and its WebGL layer `phenomenon`, self-hosted (12 KB together) for the globe. |
| `og-image.html` → `og-image.png` | Source and output for the link-preview card. |
| `robots.txt`, `sitemap.xml` | Crawl hints. |
| `paper.html` | The paper edition — a second, standalone page linked from the footer. Hand-written, not generated. |

## Design notes

Warm white ground, near-black ink, and a **single** accent — the ink blue `#1d4f91` — used
only for links, small markers and the primary button. Gambetta sets the headings, Switzer
sets everything else. Type sizes are deliberately moderate.

```
--paper #fbfaf7    --ink   #1c1b17    --accent #1d4f91
--paper2 #f3f0e9   --ink2  #56534a    --dark   #15161a
--rule  #e3dfd5    --faint #8d8a80
```

Navigation is a three-line button fixed to the top right; it opens a panel of numbered
section links plus the external profiles, closes on Escape, on scrim click, or on choosing a
link. The map in *Where I've worked* carries over from the earlier version of this site,
restyled to the current palette, with hover and tap read-out.

**Both themes.** Light is the default; dark follows the system unless the visitor picks one
with the sun/moon button, and the choice is remembered in `localStorage`. An inline script in
`<head>` applies the stored theme before first paint so there is no flash. Every colour is a
token, so the two themes share one set of rules — the contact band is deliberately *lighter*
than the page in dark mode so it still reads as a separate block.

**Motion** is deliberate: hover feedback on work rows, tags, buttons and menu items; a
one-off entrance on the introduction; an eased cross-fade when the theme flips; the three
dots travelling the map arcs. Blocks further down lift into place on scroll via the native
`animation-timeline: view()` — it animates position only, never opacity, so a browser without
support (or a stalled timeline) still shows every word. A faint SVG grain sits over the whole
page to give the flat colour some tooth.

## Performance

The whole page is **~254 KB** over 9 requests, images included.

Figures and the portrait ship as WebP with `srcset`/`sizes` and a PNG/JPEG fallback in a
`<picture>`, so the browser fetches only the variant it needs — the pipeline diagram drops
from 500 KB to 46 KB at a 900 px slot. The two above-the-fold font files are preloaded, and
unused weights were removed from the family. Figure 1 links out to a full-resolution WebP for
anyone who wants to read the small type.

Regenerate the image variants after replacing a source file:

```bash
python - <<'EOF'
from PIL import Image
src = Image.open('figures/pipeline.png').convert('RGB')
for w in (2000, 1400, 900):
    src.resize((w, round(src.height*w/src.width)), Image.LANCZOS).save(
        f'figures/pipeline-{w}.webp', 'WEBP', quality=88, method=6)
src.save('figures/pipeline-full.webp', 'WEBP', quality=90, method=6)
EOF
```

## Accessibility and markup

Skip link, focus-visible outlines, a focus loop inside the open menu, Escape to close,
`aria-expanded` on the button, full alt text on every figure, and `prefers-reduced-motion`
honoured. JSON-LD describes both the person and the paper (`ScholarlyArticle`).

## Editing without touching code

Double-click **`Edit website.bat`** (or run `python editor.py`). A small app opens at
`http://127.0.0.1:8765` with the site previewed live beside the form.

Thirteen sections down the left: basics, photo, introduction, recent, interests, publication,
research, map, other work, education, beyond, contact, menu. Lists can be reordered with ↑ ↓
and deleted, and **+ Add** appends a new entry. Press **Save & rebuild** (or Ctrl+S) and
`index.html` is regenerated immediately.

For the photo, drop in a new picture and drag the two sliders until your face sits well —
every size the page needs is generated for you, and the original is kept so the crop can be
redone later.

Plain fields are escaped for you, so you can type real characters (`·`, `–`, `→`, `&`)
without worrying. Only fields labelled as accepting HTML will render markup.

Every save writes a timestamped copy into `site/backups/` (the last 20 are kept), and the
server binds to localhost only — nothing leaves your machine.

If you would rather edit the JSON directly, change `site/content.json` and run
`python build.py`.

## Run locally

```bash
python -m http.server 8742
# http://localhost:8742/
```

Serve it rather than opening the file directly — `file://` blocks the image loads.

## Regenerating the link-preview image

```bash
python -m http.server 8742
chrome --headless --screenshot=og-image.png --window-size=1200,630 \
       --hide-scrollbars http://localhost:8742/og-image.html
```

## The paper edition

`paper.html` is the original version of this site, typeset as a research preprint
(*"Learning to See, Carefully"*). It is kept as an alternate reading of the same material and
linked from the main footer; the main site stays canonical via `rel="canonical"`.

It is **hand-written and not part of the build** — edit it directly, not through the editor.
It is also the one page that still loads its fonts (Newsreader, IBM Plex Mono) from Google
Fonts rather than self-hosting them.

## Deploy

Plain static files, served from `main` at
[vansh287.github.io/portfolio](https://vansh287.github.io/portfolio/).
