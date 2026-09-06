# skywalker.fish

Personal website with Chinese and English editions, built with plain HTML, CSS and JavaScript and Cloudflare Pages Functions.

## Language editions

- Chinese: `https://skywalker.fish/?lang=zh`
- English: `https://skywalker.fish/?lang=en`
- The language selector appears immediately before login and remains available after login.
- An explicit `lang` URL parameter takes precedence over the saved language. Without either, English browser preferences select English; other preferences select Chinese. Switching still works when local storage is blocked.
- Hash routes are shared between editions. Changing language preserves the current route and form drafts. Article reading position is restored by paragraph.
- Shared interface copy lives in `i18n.js`; both dictionaries must have the same keys.

## Essays and faithful originals

`essays/<slug>.html` contains the original authored text. Do not edit originals merely to translate them or correct their wording.

`essay-catalog.js` declares stable slugs, original language, dates and translated titles. English versions live in `essays/en/`; Chinese translations of the English original and mixed-language diary live in `essays/zh/`.

The default reader is a single column in the selected language. An English original stays verbatim in the English edition. Readers may choose Original, Translation or Compare. Comparison aligns paragraphs in two columns on wider screens and groups each original paragraph with its translation on mobile. Explicit original/comparison modes may intentionally show another language, with clear labels.

Keep paragraph order, paragraph breaks, intentional blank stanzas, dates, links and meaning when adding a translation. English translations are reading aids; the original remains authoritative. User-supplied names, application text and repository names are not automatically translated. Downloadable project documents keep their original language and are labeled accordingly.

The pre-existing link to `files/未选择的路.pdf` had no corresponding file. Its dialog now says that the manuscript is unavailable instead of offering a broken download. The existing portfolio history is sample data and is labeled as such.

## Development and verification

Use Node.js 24 or newer for the development checks:

```sh
npm --prefix tests ci
npm --prefix tests run check
npm --prefix tests test
python3 -m http.server 8765 --bind 127.0.0.1
```

The static preview does not provide the `/api/*` endpoints. Tests mock those endpoints using synthetic data and never submit applications, logins or approvals to the live site.

The tests cover language precedence and persistence, route localization, forms, stale requests, original/translation/comparison reading, translated paragraph coverage and verbatim preservation of the English original.

## Hosting

The existing host is Cloudflare Pages with D1 bindings defined in `wrangler.toml`. No runtime package build is needed. Publish the site files and existing Pages Functions through the established Cloudflare project. `node_modules`, tests and local review fixtures are not application assets.
