# skywalker.fish

Personal website with Chinese and English editions, built with plain HTML, CSS and JavaScript and hosted as a static site on Cloudflare Pages. Everything on it is public; there is no login, no application flow and no backend.

## Layout

One page with four anchored sections — `#about`, `#projects`, `#essays`, `#contact` — under a hero with the name, role and portrait. The header stays sticky; the section links sit on the centre line, the language switch on the right, and a `<details>` menu replaces the links below 600px. An essay opens as its own view at `#/essays/<slug>`; its back link (and the browser's back button) returns the reader to the exact spot on the home page they left, while choosing another section from an essay goes to that section.

Older links keep working: `#/essays`, `#/projects` and `#/contact` scroll to their section, and the removed `#/portfolio`, `#/adventures`, `#/albums`, `#/signup` and `#/admin` routes land on the top of the page.

The visual system (warm paper background, deep-red accent, serif display type, hairline lists, red contact block) lives in `style.css` under the tokens at the top. The Chinese edition relaxes the display tracking and leading, because CJK glyphs fill the em box.

## Language editions

- Chinese: `https://skywalker.fish/?lang=zh`
- English: `https://skywalker.fish/?lang=en`
- An explicit `lang` URL parameter takes precedence over the saved language. Without either, every visitor starts in English regardless of browser preferences. Switching still works when local storage is blocked.
- Hash routes are shared between editions. Changing language keeps the current section, the essay year filter and the reading position; on an article the other edition is fetched before the page swaps so no loading state flashes.
- Header labels carry the other edition's text in `data-alt`; the stylesheet reserves that width under each label, so the header keeps the same geometry in both languages. `applyLanguageChrome()` in `i18n.js` runs from `index.html` before the first paint and again on every change.
- Shared interface copy lives in `i18n.js`; both dictionaries must have the same keys.

## Essays and faithful originals

`essays/<slug>.html` contains the original authored text. Do not edit originals merely to translate them or correct their wording.

`essay-catalog.js` declares stable slugs, original language, dates, translated titles and the `kind` of each piece (`diary`, `fiction` or `essay`), which the list shows as a tag. The list can be filtered by year. English versions live in `essays/en/`; Chinese translations of the English original and mixed-language diary live in `essays/zh/`.

The default reader is a single column in the selected language. An English original stays verbatim in the English edition. Readers may choose Original, Translation or Compare. Comparison aligns paragraphs in two columns on wider screens and groups each original paragraph with its translation on mobile.

Keep paragraph order, paragraph breaks, intentional blank stanzas, dates, links and meaning when adding a translation. English translations are reading aids; the original remains authoritative. Downloadable project documents keep their original language and are labeled accordingly.

## Development and verification

Use Node.js 24 or newer for the development checks:

```sh
npm --prefix tests ci
npm --prefix tests run check
npm --prefix tests test
python3 -m http.server 8765 --bind 127.0.0.1
```

The tests cover language precedence and persistence, section routing and legacy routes, the header geometry, the year filter, stale requests, original/translation/comparison reading, translated paragraph coverage and verbatim preservation of the English original, and that no login or API code remains.

## Hosting

Cloudflare Pages serves the repository root as static files (`wrangler.toml`). Pushing to `main` triggers the cache purge workflow. `node_modules` and tests are not application assets.
