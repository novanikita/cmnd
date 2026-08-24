#!/usr/bin/env python3
"""Publish pages as /slug/ instead of /slug.html and add .html redirect stubs.

GitHub Pages serves directory indexes natively. Relative asset paths break in
subfolders, so each moved page gets <base href="/"> in production only.

Source files keep *.html links for local Live Server; this script rewrites them
to clean /slug paths in the production artifact only.
"""

from __future__ import annotations

import pathlib
import sys

SITE_ORIGIN = "https://flowerdog.studio"
CHARSET = '<meta charset="utf-8" />'
BASE_TAG = '    <base href="/">\n'
KEEP_FLAT = {"index.html"}

REDIRECT_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting…</title>
    <link rel="canonical" href="{canonical}" />
    <meta http-equiv="refresh" content="0; url={target}" />
    <script>location.replace("{target}");</script>
  </head>
  <body>
    <p><a href="{target}">Continue</a></p>
  </body>
</html>
"""


def inject_base_href(html: str) -> str:
    if "<base href" in html:
        return html
    if CHARSET not in html:
        raise ValueError("Expected charset meta tag")
    return html.replace(CHARSET, CHARSET + "\n" + BASE_TAG, 1)


def rewrite_page_links(text: str, slugs: list[str]) -> str:
    """Turn internal page links into clean /slug paths (production only)."""
    for slug in sorted(slugs, key=len, reverse=True):
        target = f"/{slug}"
        text = text.replace(f"{SITE_ORIGIN}/{slug}.html", f"{SITE_ORIGIN}/{slug}")
        replacements = (
            (f'href="{slug}.html"', f'href="{target}"'),
            (f"href='{slug}.html'", f"href='{target}'"),
            (f'href="/{slug}.html"', f'href="{target}"'),
            (f"href='/{slug}.html'", f"href='{target}'"),
            (f"href: '{slug}.html'", f"href: '{target}'"),
            (f'href: "{slug}.html"', f'href: "{target}"'),
        )
        for old, new in replacements:
            text = text.replace(old, new)
    return text


def transform_page(site_dir: pathlib.Path, html_path: pathlib.Path, slugs: list[str]) -> None:
    slug = html_path.stem
    target = f"/{slug}/"
    canonical = f"{SITE_ORIGIN}{target}"

    content = html_path.read_text(encoding="utf-8")
    content = rewrite_page_links(content, slugs)
    content = inject_base_href(content)

    dest_dir = site_dir / slug
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / "index.html").write_text(content, encoding="utf-8")

    html_path.write_text(
        REDIRECT_TEMPLATE.format(canonical=canonical, target=target),
        encoding="utf-8",
    )


def rewrite_site_artifacts(site_dir: pathlib.Path, slugs: list[str]) -> None:
    """Rewrite links in HTML/JS that stay at fixed paths after directory move."""
    paths: list[pathlib.Path] = [site_dir / "index.html"]
    paths.extend(site_dir.glob("*/index.html"))
    for rel in (
        "partials/header.html",
        "js/projects-data.js",
        "js/header-include.js",
    ):
        path = site_dir / rel
        if path.is_file():
            paths.append(path)

    for path in paths:
        original = path.read_text(encoding="utf-8")
        updated = rewrite_page_links(original, slugs)
        if updated != original:
            path.write_text(updated, encoding="utf-8")


def main() -> int:
    site_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
    if not site_dir.is_dir():
        print(f"Site directory not found: {site_dir}", file=sys.stderr)
        return 1

    pages = sorted(p for p in site_dir.glob("*.html") if p.name not in KEEP_FLAT)
    slugs = [p.stem for p in pages]

    for html_path in pages:
        transform_page(site_dir, html_path, slugs)
        print(f"  /{html_path.stem}/  ←  {html_path.name} (+ redirect stub)")

    rewrite_site_artifacts(site_dir, slugs)

    print(f"Clean URLs ready for {len(pages)} pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
