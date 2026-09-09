#!/usr/bin/env python3
"""Render index.html from site/content.json.

Run directly (python build.py) or let the editor call it when you save.
Everything editable lives in site/content.json; the CSS and JS are copied
through untouched from site/partials/.
"""

import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
PARTIALS = SITE / "partials"
CONTENT = SITE / "content.json"
OUTPUT = ROOT / "index.html"


def load_content():
    with CONTENT.open(encoding="utf-8") as fh:
        return json.load(fh)


def build_jsonld(c):
    """Person + ScholarlyArticle, kept in step with the visible content."""
    pub = c["publication"]
    schema = pub.get("schema", {})
    graph = []

    if pub.get("title"):
        graph.append({
            "@type": "ScholarlyArticle",
            "name": pub["title"],
            "author": {"@type": "Person", "name": c["person"]["name"], "url": c["meta"]["url"]},
            "datePublished": schema.get("date_published", ""),
            "inLanguage": "en",
            "license": schema.get("license", ""),
            "isPartOf": {"@type": "PublicationEvent", "name": schema.get("event", "")},
            "keywords": schema.get("keywords", []),
            "codeRepository": schema.get("code_repository", ""),
            "url": next((l["href"] for l in pub.get("links", [])), ""),
        })

    person = c["person"]
    graph.append({
        "@type": "Person",
        "name": person["name"],
        "url": c["meta"]["url"],
        "image": c["meta"]["url"].rstrip("/") + "/img/vansh.jpg",
        "jobTitle": person["job_title"],
        "description": person["schema_description"],
        "affiliation": {"@type": "CollegeOrUniversity", "name": person["affiliation"]},
        "knowsAbout": person["knows_about"],
        "sameAs": [person["github"], person["linkedin"]],
    })

    return json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=2, ensure_ascii=False)


def render(content=None):
    c = content if content is not None else load_content()

    env = Environment(
        loader=FileSystemLoader(str(SITE)),
        autoescape=False,          # content may contain intentional HTML
        keep_trailing_newline=True,
        trim_blocks=False,
        lstrip_blocks=False,
    )
    tpl = env.get_template("template.html.j2")

    # section numbers come from the menu, so they can never drift out of step
    by_href = {m["href"]: m["num"] for m in c.get("menu", [])}

    html = tpl.render(
        css=(PARTIALS / "style.css").read_text(encoding="utf-8"),
        app_js=(PARTIALS / "app.js").read_text(encoding="utf-8"),
        globe_js=(PARTIALS / "globe.js").read_text(encoding="utf-8"),
        head_js=(PARTIALS / "head.js").read_text(encoding="utf-8"),
        jsonld=build_jsonld(c),
        num=lambda href: by_href.get(href, ""),
        **c,
    )
    return html


def main():
    html = render()
    OUTPUT.write_text(html, encoding="utf-8")
    kb = len(html.encode("utf-8")) / 1024
    print(f"built {OUTPUT.name}  {kb:.0f} KB  ({html.count(chr(10)) + 1} lines)")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - surface a readable message to the GUI
        print(f"BUILD FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
