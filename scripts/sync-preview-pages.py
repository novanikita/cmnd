#!/usr/bin/env python3
"""Copy draft pages into preview/<token>/ with noindex and base href for assets."""

from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / "preview" / "pages.json"
NEEDLE = '<meta charset="utf-8" />'
NOINDEX = '    <meta name="robots" content="noindex,nofollow">\n'
BASE_TAG = '    <base href="../../">\n'


def inject_head(text: str) -> str:
    if NEEDLE not in text:
        raise ValueError("Expected charset meta in HTML head")

    insert = ""
    if 'name="robots"' not in text:
        insert += NOINDEX
    if "<base href" not in text:
        insert += BASE_TAG
    if not insert:
        return text

    return text.replace(NEEDLE, NEEDLE + "\n" + insert, 1)


def build_hub_html(pages: list[dict]) -> str:
    items = "\n".join(
        f'        <li><a href="{pathlib.Path(p["file"]).name}">{p["titleRu"]}</a>'
        f' <span lang="en">/ {p["titleEn"]}</span></li>'
        for p in pages
    )
    return f"""<!DOCTYPE html>
<html lang="ru">

  <head>
    <meta charset="utf-8" />
{NOINDEX}{BASE_TAG}    <title>Превью — Flowerdog</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="css/colors.css" />
    <link rel="stylesheet" href="css/normalize.css" />
    <link rel="stylesheet" href="css/settings.css" />
    <link rel="stylesheet" href="css/layout.css" />
    <link rel="stylesheet" href="css/ids.css" />
    <link rel="stylesheet" href="css/project.css" />
    <style>
      .preview-hub__list {{
        margin: 1.5em 0 0;
        padding: 0;
        list-style: none;
      }}
      .preview-hub__list li {{
        margin: 0.75em 0;
      }}
      .preview-hub__list a {{
        text-decoration: underline;
        text-underline-offset: 0.15em;
      }}
      .preview-hub__list span {{
        opacity: 0.5;
        font-size: 0.9em;
      }}
      .preview-hub__note {{
        opacity: 0.5;
        font-size: 0.85em;
        margin-top: 2em;
      }}
    </style>
  </head>

  <body class="ids">
    <main>
      <div class="ids__wrapper S">
        <div class="ids__space XL"></div>
        <h1>Черновики</h1>
        <p>Страницы для просмотра до публикации на сайте.</p>
        <ul class="preview-hub__list">
{items}
        </ul>
        <p class="preview-hub__note">Не делитесь этой ссылкой публично — доступ только по секретному URL.</p>
        <div class="ids__space XL"></div>
      </div>
    </main>
  </body>

</html>
"""


def main() -> int:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    token = config["token"]
    pages: list[dict] = config["pages"]

    if not token or not pages:
        print("preview/pages.json: token and pages are required", file=sys.stderr)
        return 1

    out_dir = ROOT / "preview" / token
    out_dir.mkdir(parents=True, exist_ok=True)

    for page in pages:
        src = ROOT / page["file"]
        if not src.is_file():
            print(f"Missing source file: {src}", file=sys.stderr)
            return 1
        dst = out_dir / src.name
        dst.write_text(inject_head(src.read_text(encoding="utf-8")), encoding="utf-8")
        print(f"  {dst.relative_to(ROOT)}")

    hub = out_dir / "index.html"
    hub.write_text(build_hub_html(pages), encoding="utf-8")
    print(f"  {hub.relative_to(ROOT)}")
    print(f"\nPreview URL path: /preview/{token}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
