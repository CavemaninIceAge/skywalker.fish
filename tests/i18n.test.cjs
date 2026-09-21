const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const tick = () => new Promise(resolve => setTimeout(resolve, 15));

async function site({ lang = 'en', hash = '', saved, browser = 'en-US', storageBlocked = false, fetch } = {}) {
  const dom = new JSDOM(html, { url: `https://skywalker.fish/${lang ? '?lang=' + lang : ''}${hash}`, runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
  w.scrolls = [];
  w.scrollTo = (...args) => w.scrolls.push(args);
  w.scrollBy = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () { w.scrolls.push(['into', this.id]); };
  Object.defineProperty(w.navigator, 'language', { value: browser });
  if (saved) w.localStorage.setItem('skywalker-language', saved);
  if (storageBlocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage denied'); } });
  w.fetch = fetch || (async url => {
    const file = path.join(root, String(url));
    if (fs.existsSync(file)) return { ok: true, text: async () => fs.readFileSync(file, 'utf8') };
    return { ok: false, status: 404 };
  });
  for (const file of ['i18n.js', 'essay-catalog.js', 'app.js']) {
    const script = w.document.createElement('script');
    script.textContent = fs.readFileSync(path.join(root, file), 'utf8');
    w.document.body.appendChild(script);
  }
  await tick();
  return w;
}
function text(w, selector) { return w.document.querySelector(selector).textContent; }
function assertEnglish(w, selector = '#main') {
  // The hero shows the Chinese name beside the English one on purpose; everything else must be English.
  const clone = w.document.querySelector(selector).cloneNode(true);
  clone.querySelectorAll('.name-alt, .language-switch').forEach(el => el.remove());
  assert.doesNotMatch(clone.textContent, /[㐀-鿿]/, `Unexpected Chinese in ${selector}: ${clone.textContent}`);
  assert.doesNotMatch(clone.textContent, /\$\{|undefined|\[object Object\]/);
}

test('both dictionaries are complete and every key is used somewhere', async () => {
  const w = await site();
  assert.deepEqual(w.eval('Object.keys(messages.zh).sort()'), w.eval('Object.keys(messages.en).sort()'));
  const sources = ['index.html', 'app.js', 'i18n.js'].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const referenced = new Set([...sources.matchAll(/t\("(\w+)"|data-i18n="(\w+)"|kind(Diary|Fiction|Essay)|"(\w+)": "\w+"/g)].flatMap(m => m.slice(1)).filter(Boolean));
  for (const key of w.eval('Object.keys(messages.en)')) {
    assert.ok(w.eval(`messages.en[${JSON.stringify(key)}] && messages.zh[${JSON.stringify(key)}]`), `${key} is empty`);
    assert.ok(sources.includes(`"${key}"`) || sources.includes(`${key}:`) || referenced.has(key), `${key} is never used`);
  }
  assert.equal(w.document.documentElement.lang, 'en');
  assert.equal(w.document.querySelector('[data-language=en]').getAttribute('aria-pressed'), 'true');
  w.close();
});

test('URL beats remembered preference; every new visitor starts in English whatever the browser says', async () => {
  for (const [options, expected] of [
    [{ lang: 'en', saved: 'zh' }, 'en'], [{ lang: null, saved: 'zh' }, 'zh-CN'], [{ lang: 'zh' }, 'zh-CN'],
    [{ lang: null, browser: 'en-GB' }, 'en'], [{ lang: null, browser: 'zh-CN' }, 'en'],
    [{ lang: 'invalid', saved: 'en' }, 'en'], [{ lang: null, storageBlocked: true, browser: 'zh-CN' }, 'en'],
  ]) {
    const w = await site(options);
    assert.equal(w.document.documentElement.lang, expected);
    w.setLanguage(expected === 'en' ? 'zh' : 'en');
    assert.notEqual(w.document.documentElement.lang, expected);
    w.close();
  }
});

test('the home page holds the four sections in order, needs no login, and is entirely English in the English edition', async () => {
  const w = await site();
  assert.deepEqual([...w.document.querySelectorAll('main section')].map(section => section.id), ['top', 'about', 'projects', 'essays', 'contact']);
  assert.equal(w.document.querySelectorAll('.essay-item').length, w.eval('essays.length'));
  assert.equal(w.document.querySelectorAll('.project-card').length, 7);
  assert.equal(w.document.querySelector('#btn-login, #btn-signup, .gate-login, .adventure-gate'), null);
  assert.equal(w.sessionStorage.length, 0);
  assertEnglish(w);
  assertEnglish(w, 'header');
  assertEnglish(w, 'footer');
  assert.equal(w.document.title, 'Tianxing Yu');
  w.setLanguage('zh');
  assert.equal(w.document.title, '于天行');
  assert.match(text(w, '#about'), /哈尔滨/);
  w.close();
});

test('older hash routes land on the matching section and removed routes fall back to the top', async () => {
  for (const [hash, anchor, cleaned] of [
    ['#/essays', 'essays', '#essays'], ['#/projects', 'projects', '#projects'], ['#/contact', 'contact', '#contact'],
    ['#/', 'top', ''], ['#/portfolio', 'top', ''], ['#/adventures', 'top', ''], ['#/albums/pku', 'top', ''], ['#/signup', 'top', ''], ['#/admin', 'top', ''],
  ]) {
    const w = await site({ hash });
    assert.ok(w.document.getElementById('top'), `${hash} did not render the home page`);
    assert.equal(w.location.hash, cleaned, `${hash} was not rewritten`);
    assert.equal(w.document.querySelector('.desktop-nav a[aria-current=page]')?.hash, anchor === 'top' ? undefined : `#${anchor}`);
    assert.equal(JSON.stringify(w.scrolls.at(-1)), JSON.stringify(anchor === 'top' ? [{ top: 0, behavior: 'instant' }] : ['into', anchor]));
    w.close();
  }
});

test('leaving an article for a section renders the home page again and scrolls to that section', async () => {
  const w = await site({ hash: '#/essays/beijing-station', lang: 'zh' });
  await tick();
  assert.equal(w.document.getElementById('top'), null);
  assert.equal(w.document.querySelector('.desktop-nav a[aria-current=page]').hash, '#essays');
  w.location.hash = '#essays'; await tick();
  assert.ok(w.document.getElementById('top'));
  assert.ok(w.document.getElementById('essays'));
  assert.equal(JSON.stringify(w.scrolls.at(-1)), JSON.stringify(['into', 'essays']));
  w.location.hash = '#/essays/beijing-station'; await tick();
  assert.equal(JSON.stringify(w.scrolls.at(-1)), JSON.stringify([{ top: 0, behavior: 'instant' }]));
  assert.match(w.document.title, /永远的北京/);
  w.close();
});

test('the static page is English before any script runs', () => {
  const dom = new JSDOM(html);
  const d = dom.window.document;
  assert.equal(d.documentElement.lang, 'en');
  assert.equal(d.title, 'Tianxing Yu');
  assert.doesNotMatch(d.querySelector('header').textContent.replace('中文', ''), /[\u3400-\u9fff]/);
  assert.equal(d.querySelector('[data-language=en]').getAttribute('aria-pressed'), 'true');
  dom.window.close();
});

test('leaving an essay returns to the spot on the home page the reader came from', async () => {
  const w = await site({ lang: 'zh' });
  Object.defineProperty(w, 'scrollY', { value: 2468, configurable: true });
  w.location.hash = '#/essays/beijing-station'; await tick();
  assert.equal(JSON.stringify(w.scrolls.at(-1)), JSON.stringify([{ top: 0, behavior: 'instant' }]));
  Object.defineProperty(w, 'scrollY', { value: 300, configurable: true });
  w.document.querySelector('.back-link').click(); await tick(); await tick();
  assert.ok(w.document.getElementById('top'), 'home page was not rendered again');
  assert.equal(w.location.hash, '');
  assert.equal(JSON.stringify(w.scrolls.at(-1)), JSON.stringify([{ top: 2468, behavior: 'instant' }]));
  // Opened directly, an essay has nowhere to return to, so the back link opens the essays section.
  const direct = await site({ hash: '#/essays/beijing-station' });
  direct.document.querySelector('.back-link').click(); await tick();
  assert.equal(direct.location.hash, '#essays');
  assert.equal(JSON.stringify(direct.scrolls.at(-1)), JSON.stringify(['into', 'essays']));
  direct.close();
  w.close();
});

test('every header label reserves the other edition so switching languages moves nothing', async () => {
  const w = await site({ lang: 'zh' });
  const messages = w.eval('messages');
  for (const link of w.document.querySelectorAll('nav[data-nav] a')) {
    assert.equal(link.textContent, messages.zh[link.dataset.i18n]);
    assert.equal(link.dataset.alt, messages.en[link.dataset.i18n]);
  }
  assert.equal(w.document.querySelector('.mobile-menu summary').dataset.alt, messages.en.menu);
  for (const button of w.document.querySelectorAll('.language-switch button')) assert.equal(button.dataset.alt, button.textContent);
  w.setLanguage('en');
  assert.equal(w.document.querySelector('.desktop-nav a').dataset.alt, messages.zh.navAbout);
  assert.equal(text(w, '.wordmark-text'), messages.en.name);
  assert.equal(new URL(w.location.href).searchParams.get('lang'), 'en');
  assert.equal(w.localStorage.getItem('skywalker-language'), 'en');
  w.close();
});

test('the year filter counts every essay, hides the others and survives a language switch', async () => {
  const w = await site({ lang: 'zh' });
  const essays = w.eval('essays');
  const buttons = [...w.document.querySelectorAll('.essay-year-nav .filter-button')];
  assert.equal(buttons[0].dataset.year, 'all');
  assert.equal(buttons[0].querySelector('span').textContent, String(essays.length));
  const years = [...new Set(essays.map(essay => essay.date.slice(0, 4)))].sort().reverse();
  assert.deepEqual(buttons.slice(1).map(button => button.dataset.year), years);
  for (const button of buttons.slice(1)) {
    assert.equal(button.querySelector('span').textContent, String(essays.filter(essay => essay.date.startsWith(button.dataset.year)).length));
  }
  buttons[1].click();
  const shown = () => [...w.document.querySelectorAll('.essay-item')].filter(item => !item.hidden);
  assert.equal(shown().length, essays.filter(essay => essay.date.startsWith(years[0])).length);
  assert.ok(shown().every(item => item.dataset.year === years[0]));
  assert.equal(w.document.querySelector('.filter-button[aria-pressed=true]').dataset.year, years[0]);
  w.setLanguage('en');
  assert.equal(shown().length, essays.filter(essay => essay.date.startsWith(years[0])).length);
  assert.equal(w.document.querySelector('.filter-button.is-active').dataset.year, years[0]);
  assertEnglish(w, '#essays');
  const dates = [...w.document.querySelectorAll('.essay-item time')].map(el => el.getAttribute('datetime'));
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.ok(w.document.querySelector('.essay-item .tag'));
  w.close();
});

test('switching language on an article fetches the other edition before the page swaps', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const w = await site({ hash: '#/essays/beijing-station', lang: 'zh', fetch: async url => {
    if (String(url).startsWith('essays/en/')) await gate;
    return { ok: true, text: async () => fs.readFileSync(path.join(root, String(url)), 'utf8') };
  } });
  await tick();
  assert.match(text(w, '.essay-body'), /北京站/);
  w.document.querySelector('[data-language=en]').click(); await tick();
  assert.equal(w.document.documentElement.lang, 'zh-CN');
  assert.match(text(w, '.essay-body'), /北京站/);
  release(); await tick();
  assert.equal(w.document.documentElement.lang, 'en');
  assert.match(text(w, '.essay-body'), /Beijing/);
  w.close();
});

test('late essay responses cannot overwrite the next page or language', async () => {
  let release;
  const response = new Promise(resolve => { release = resolve; });
  const w = await site({ hash: '#/essays/beijing-station', fetch: async () => response });
  w.location.hash = '#contact'; await tick();
  release({ ok: true, text: async () => '<div class="essay-body"><p>Old essay</p></div>' }); await tick();
  assert.match(text(w, '#main'), /Contact/);
  assert.doesNotMatch(text(w, '#main'), /Old essay/);
  w.close();
});

test('a missing or failing essay shows a localized message with a way back', async () => {
  const w = await site({ hash: '#/essays/no-such-essay' });
  assert.match(text(w, '#main'), /could not be found/);
  assert.ok(w.document.querySelector('.back-link'));
  w.close();
  const failing = await site({ hash: '#/essays/beijing-station', fetch: async () => ({ ok: false, status: 500, text: async () => '' }) });
  await tick();
  assert.match(text(failing, '#main'), /Could not load/);
  assert.equal(failing.document.querySelector('.essay-article .empty-state button').textContent, 'Try again');
  failing.close();
});

test('English original remains verbatim; Chinese translation and paragraph comparison are optional', async () => {
  const w = await site({ hash: '#/essays/ideal-middle-class', lang: 'en' });
  await tick();
  const original = new JSDOM(fs.readFileSync(path.join(root, 'essays/ideal-middle-class.html'), 'utf8'));
  assert.equal(text(w, '.essay-body'), original.window.document.querySelector('.essay-body').textContent);
  assert.equal(w.document.querySelector('.reading-option[aria-pressed=true]').textContent, 'Original');
  assertEnglish(w);
  w.setLanguage('zh'); await tick();
  assert.match(text(w, '.essay-body'), /中产阶级/);
  assert.equal(w.document.querySelector('.reading-option[aria-pressed=true]').textContent, '译文');
  w.setEssayMode('parallel'); await tick();
  assert.equal(w.document.querySelectorAll('.parallel-row').length, 3);
  assert.ok(w.document.querySelector('.parallel-row .essay-body[lang=en]'));
  assert.ok(w.document.querySelector('.parallel-row .essay-body[lang=zh-CN]'));
  assert.equal(w.document.querySelector('.parallel-row .essay-body[lang=en] p').textContent, original.window.document.querySelector('.essay-body p').textContent);
  original.window.close();
  w.close();
});

test('Chinese originals use English translations by default in English and compare aligned paragraphs', async () => {
  const w = await site({ hash: '#/essays/beijing-station', lang: 'en' });
  await tick();
  assertEnglish(w);
  assert.equal(w.document.querySelector('.reading-option[aria-pressed=true]').textContent, 'Translation');
  w.setEssayMode('parallel'); await tick();
  assert.equal(w.document.querySelectorAll('.parallel-row').length, 4);
  assert.match(text(w, '.parallel-row .essay-body[lang=zh-CN]'), /北京站/);
  w.setEssayMode('original'); await tick();
  assert.equal(text(w, 'h1'), '永远的北京');
  w.close();
});

test('no login, application, admin or portfolio code remains', () => {
  const sources = ['index.html', 'app.js', 'i18n.js', 'style.css'].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(sources, /\/api\/|sessionStorage|showLoginModal|renderSignup|renderAdmin|renderPortfolio|isLoggedIn/);
  assert.ok(!fs.existsSync(path.join(root, 'functions')));
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8'), /d1_databases/);
});
