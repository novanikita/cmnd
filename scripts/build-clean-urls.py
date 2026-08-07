#!/usr/bin/env python3
"""Publish pages as /slug/ instead of /slug.html and add .html redirect stubs.

GitHub Pages serves directory indexes natively. Relative asset paths break in
subfolders, so each moved page gets <base href="/"> in production only.
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


def rewrite_legacy_urls(html: str, slug: str) -> str:
    """Point canonical/og links and in-page .html refs at the clean URL."""
    html = html.replace(f"{SITE_ORIGIN}/{slug}.html", f"{SITE_ORIGIN}/{slug}")
    html = html.replace(f'href="{slug}.html"', f'href="/{slug}"')
    html = html.replace(f"href='{slug}.html'", f"href='/{slug}'")
    return html


def transform_page(site_dir: pathlib.Path, html_path: pathlib.Path) -> None:
    slug = html_path.stem
    target = f"/{slug}"
    canonical = f"{SITE_ORIGIN}{target}"

    content = html_path.read_text(encoding="utf-8")
    content = rewrite_legacy_urls(content, slug)
    content = inject_base_href(content)

    dest_dir = site_dir / slug
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / "index.html").write_text(content, encoding="utf-8")

    html_path.write_text(
        REDIRECT_TEMPLATE.format(canonical=canonical, target=target),
        encoding="utf-8",
    )


def main() -> int:
    site_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
    if not site_dir.is_dir():
        print(f"Site directory not found: {site_dir}", file=sys.stderr)
        return 1

    pages = sorted(p for p in site_dir.glob("*.html") if p.name not in KEEP_FLAT)
    for html_path in pages:
        transform_page(site_dir, html_path)
        print(f"  /{html_path.stem}/  ←  {html_path.name} (+ redirect stub)")

    print(f"Clean URLs ready for {len(pages)} pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
