const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
const json = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data, text: async () => JSON.stringify(data) });

async function site({ lang = 'en', hash = '#/', saved, browser = 'en-US', storageBlocked = false, loggedIn = false, fetch } = {}) {
  const dom = new JSDOM(html, { url: `https://skywalker.fish/${lang ? '?lang=' + lang : ''}${hash}`, runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
  w.scrollTo = () => {};
  w.scrollBy = () => {};
  w.alerts = [];
  w.alert = message => w.alerts.push(message);
  w.TextEncoder = TextEncoder;
  Object.defineProperty(w.crypto, 'subtle', { value: webcrypto.subtle });
  Object.defineProperty(w.navigator, 'language', { value: browser });
  if (saved) w.localStorage.setItem('skywalker-language', saved);
  if (storageBlocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage denied'); } });
  if (loggedIn) w.sessionStorage.setItem('skywalker-login', '1');
  w.fetch = fetch || (async url => {
    if (url === '/api/portfolio') return json({ holdings: [] });
    if (url === '/api/admin') return json([]);
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
function assertEnglish(w, selector = '#main') {
  const text = w.document.querySelector(selector).textContent;
  assert.doesNotMatch(text, /[\u3400-\u9fff]/, `Unexpected Chinese in ${selector}: ${text}`);
  assert.doesNotMatch(text, /\$\{|undefined|\[object Object\]/);
}

// This is a behavioral suite: route coverage, persistence, forms and asynchronous races.
test('both dictionaries are complete and language controls sit before login', async () => {
  const w = await site();
  assert.deepEqual(w.eval('Object.keys(messages.zh).sort()'), w.eval('Object.keys(messages.en).sort()'));
  for (const key of w.eval('Object.keys(messages.en)')) assert.ok(w.eval(`messages.en[${JSON.stringify(key)}] && messages.zh[${JSON.stringify(key)}]`));
  const switcher = w.document.querySelector('.language-switch');
  assert.equal(switcher.nextElementSibling.id, 'btn-login');
  assert.equal(w.document.documentElement.lang, 'en');
  assert.equal(w.document.querySelector('[data-language=en]').getAttribute('aria-pressed'), 'true');
  w.close();
});

test('URL beats remembered preference, then browser; denied storage remains usable', async () => {
  for (const [options, expected] of [
    [{ lang: 'en', saved: 'zh' }, 'en'], [{ lang: null, saved: 'zh' }, 'zh-CN'],
    [{ lang: null, browser: 'en-GB' }, 'en'], [{ lang: null, browser: 'zh-CN' }, 'zh-CN'],
    [{ lang: 'invalid', saved: 'en' }, 'en'], [{ lang: null, storageBlocked: true, browser: 'zh-CN' }, 'zh-CN'],
  ]) {
    const w = await site(options);
    assert.equal(w.document.documentElement.lang, expected);
    w.setLanguage(expected === 'en' ? 'zh' : 'en');
    assert.notEqual(w.document.documentElement.lang, expected);
    w.close();
  }
});

test('public and private page chrome is entirely English in the English edition', async () => {
  const routes = ['#/', '#/projects', '#/portfolio', '#/essays', '#/adventures', '#/contact', '#/signup', '#/admin', '#/albums', '#/albums/pku', '#/albums/%ZZ'];
  for (const loggedIn of [false, true]) {
    const w = await site({ loggedIn });
    for (const hash of routes) {
      w.location.hash = hash; await tick();
      assertEnglish(w);
      assert.equal(w.document.documentElement.lang, 'en');
    }
    w.showLoginModal();
    if (!loggedIn) assertEnglish(w, '#login-overlay');
    w.close();
  }
});

test('switching language preserves path, form drafts, relationship toggle and password', async () => {
  const w = await site({ hash: '#/signup', lang: 'zh' });
  w.toggleKnow();
  const values = { 'sig-name': 'Test name', 'sig-experience': 'Shared experience', 'sig-nickname': 'tester', 'sig-password': 'draft-password' };
  for (const [id, value] of Object.entries(values)) w.document.getElementById(id).value = value;
  w.document.querySelector('[data-language=en]').click();
  assert.equal(w.location.hash, '#/signup');
  assert.equal(new URL(w.location.href).searchParams.get('lang'), 'en');
  assert.equal(w.localStorage.getItem('skywalker-language'), 'en');
  for (const [id, value] of Object.entries(values)) assert.equal(w.document.getElementById(id).value, value);
  assert.equal(w.document.getElementById('circle-know').getAttribute('aria-checked'), 'true');
  assertEnglish(w);
  w.close();
});

test('every header label reserves the other edition so switching languages moves nothing', async () => {
  const w = await site({ lang: 'zh' });
  const messages = w.eval('messages');
  for (const link of w.document.querySelectorAll('.nav-links a')) {
    assert.equal(link.textContent, messages.zh[link.dataset.i18n]);
    assert.equal(link.dataset.alt, messages.en[link.dataset.i18n]);
  }
  for (const button of w.document.querySelectorAll('.language-switch button')) assert.equal(button.dataset.alt, button.textContent);
  w.setLanguage('en');
  assert.equal(w.document.querySelector('.brand').dataset.alt, messages.zh.profile);
  assert.equal(w.document.getElementById('btn-signup').dataset.alt, messages.zh.signup);
  w.sessionStorage.setItem('skywalker-login', '1');
  w.updateNavState();
  assert.equal(w.document.getElementById('nav-realname').textContent, messages.en.guest);
  assert.equal(w.document.getElementById('nav-realname').dataset.alt, messages.zh.guest);
  w.close();
});

test('switching language on an article fetches the other edition before the page swaps', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const w = await site({ loggedIn: true, hash: '#/essays/beijing-station', lang: 'zh', fetch: async url => {
    if (String(url).startsWith('essays/en/')) await gate;
    return { ok: true, text: async () => fs.readFileSync(path.join(root, String(url)), 'utf8') };
  } });
  await tick();
  assert.match(w.document.querySelector('.essay-body').textContent, /北京站/);
  w.document.querySelector('[data-language=en]').click(); await tick();
  assert.equal(w.document.documentElement.lang, 'zh-CN');
  assert.match(w.document.querySelector('.essay-body').textContent, /北京站/);
  release(); await tick();
  assert.equal(w.document.documentElement.lang, 'en');
  assert.match(w.document.querySelector('.essay-body').textContent, /Beijing/);
  w.close();
});

test('login and API errors use selected language without leaking backend text', async () => {
  const w = await site({ fetch: async () => ({ ok: false, status: 401, text: async () => 'Invalid credentials' }) });
  w.showLoginModal();
  await w.doLogin();
  assert.match(w.document.getElementById('login-error').textContent, /nickname/);
  w.document.getElementById('login-nickname').value = 'tester';
  w.document.getElementById('login-password').value = 'password';
  await w.doLogin();
  assertEnglish(w, '#login-overlay');
  assert.match(w.document.getElementById('login-error').textContent, /not been approved/);
  w.setLanguage('zh');
  assert.equal(w.document.getElementById('login-nickname').value, 'tester');
  assert.equal(w.document.getElementById('login-password').value, 'password');
  assert.match(w.applicationError('该昵称已被占用', 409), /昵称/);
  w.setLanguage('en');
  assert.match(w.applicationError('该昵称已被占用', 409), /nickname is taken/);
  assert.doesNotMatch(w.applicationError('数据库出错', 500), /数据库/);
  w.close();
});

test('project popups, portfolio details and admin states are localized', async () => {
  const w = await site({ hash: '#/projects', loggedIn: true });
  w.document.querySelector('.project-card').click();
  assertEnglish(w, '.overlay:not(.hidden)');
  w.dismissDialogs();
  w.showStarPopup({ name: '贵州茅台', code: '600519', shares: 50, cost_price: 1680, price: 1700, pnl: 1.2, weight: 10, market_open: false });
  assertEnglish(w, '#star-popup');
  assert.match(w.document.getElementById('star-popup').textContent, /Kweichow Moutai/);
  w.renderApplicationList([{ id: 1, nickname: 'Tester', status: 'pending', know_skywalker: false, created_at: '2026-09-06 12:00:00', who_are_you: 'Reader' }]);
  assertEnglish(w);
  assert.match(w.document.getElementById('main').textContent, /1 application/);
  assert.ok(w.document.querySelector('#app-1 .btn-approve'));
  w.close();
});

test('portfolio retry replaces the failed view instead of duplicating it', async () => {
  const w = await site({ hash: '#/portfolio', fetch: async () => { throw new Error('offline'); } });
  assertEnglish(w);
  w.document.querySelector('.portfolio-container button').click(); await tick();
  assert.equal(w.document.querySelectorAll('.portfolio-container').length, 1);
  w.close();
});

test('late essay responses cannot overwrite the next page or language', async () => {
  let release;
  const response = new Promise(resolve => { release = resolve; });
  const w = await site({ loggedIn: true, hash: '#/essays/beijing-station', fetch: async () => response });
  w.location.hash = '#/contact'; await tick();
  release({ ok: true, text: async () => '<div class="essay-body"><p>Old essay</p></div>' }); await tick();
  assert.match(w.document.getElementById('main').textContent, /Contact/);
  assert.doesNotMatch(w.document.getElementById('main').textContent, /Old essay/);
  w.close();
});

test('a pending application survives language switching without duplicate submissions', async () => {
  let release, requests = 0;
  const response = new Promise(resolve => { release = resolve; });
  const w = await site({ hash: '#/signup', lang: 'zh', fetch: async () => { requests++; return response; } });
  for (const [id, value] of Object.entries({ 'sig-nickname': 'tester', 'sig-password': 'password', 'sig-who': 'Reader', 'sig-howfound': 'GitHub' })) w.document.getElementById(id).value = value;
  const pending = w.submitApplication(); await tick();
  w.setLanguage('en');
  assert.equal(w.document.getElementById('btn-submit').disabled, true);
  assert.equal(w.document.getElementById('btn-submit').textContent, 'Submitting…');
  await w.submitApplication();
  assert.equal(requests, 1);
  release({ ok: false, status: 409, text: async () => '该昵称已有待审批的申请' });
  await pending;
  assert.match(w.alerts.at(-1), /already pending/);
  assert.equal(w.document.getElementById('btn-submit').disabled, false);
  w.close();
});

test('login keeps the protected route and logout immediately locks it again', async () => {
  const w = await site({ hash: '#/essays', fetch: async () => json({ nickname: 'tester', name: '', know_skywalker: false }) });
  w.showLoginModal();
  w.document.getElementById('login-nickname').value = 'tester';
  w.document.getElementById('login-password').value = 'password';
  await w.doLogin();
  assert.equal(w.location.hash, '#/essays');
  assert.ok(w.document.querySelector('.essay-row'));
  w.logout(); await tick();
  w.location.hash = '#/essays'; await tick();
  assert.ok(w.document.querySelector('.gate-login'));
  w.close();
});

test('English original remains verbatim; Chinese translation and paragraph comparison are optional', async () => {
  const w = await site({ loggedIn: true, hash: '#/essays/ideal-middle-class', lang: 'en' });
  await tick();
  const original = new JSDOM(fs.readFileSync(path.join(root, 'essays/ideal-middle-class.html'), 'utf8'));
  assert.equal(w.document.querySelector('.essay-body').textContent, original.window.document.querySelector('.essay-body').textContent);
  assert.equal(w.document.querySelector('.reading-option[aria-pressed=true]').textContent, 'Original');
  assertEnglish(w);
  w.setLanguage('zh'); await tick();
  assert.match(w.document.querySelector('.essay-body').textContent, /中产阶级/);
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
  const w = await site({ loggedIn: true, hash: '#/essays/beijing-station', lang: 'en' });
  await tick();
  assertEnglish(w);
  assert.equal(w.document.querySelector('.reading-option[aria-pressed=true]').textContent, 'Translation');
  w.setEssayMode('parallel'); await tick();
  assert.equal(w.document.querySelectorAll('.parallel-row').length, 4);
  assert.match(w.document.querySelector('.parallel-row .essay-body[lang=zh-CN]').textContent, /北京站/);
  w.setEssayMode('original'); await tick();
  assert.equal(w.document.querySelector('h1').textContent, '永远的北京');
  w.close();
});

test('stale login replies cannot replace a newer account after the dialog is recreated', async () => {
  const releases = [];
  const w = await site({ fetch: async () => new Promise(resolve => releases.push(resolve)) });
  w.showLoginModal();
  w.document.getElementById('login-nickname').value = 'first';
  w.document.getElementById('login-password').value = 'password';
  const first = w.doLogin(); await tick();
  w.setLanguage('zh');
  w.document.getElementById('login-nickname').value = 'second';
  const second = w.doLogin(); await tick();
  releases[1](json({nickname:'second', name:'', know_skywalker:false})); await second;
  releases[0](json({nickname:'first', name:'', know_skywalker:false})); await first;
  assert.equal(w.sessionStorage.getItem('skywalker-nickname'), 'second');
  w.close();
});

test('canceling login prevents its delayed reply from signing the visitor in', async () => {
  let release;
  const w = await site({ fetch: async () => new Promise(resolve => { release = resolve; }) });
  w.showLoginModal();
  w.document.getElementById('login-nickname').value = 'tester';
  w.document.getElementById('login-password').value = 'password';
  const pending = w.doLogin(); await tick();
  w.closeLoginModal();
  release(json({nickname:'tester', name:'', know_skywalker:false})); await pending;
  assert.notEqual(w.sessionStorage.getItem('skywalker-login'), '1');
  w.close();
});

test('late approval response does not replace a page visited after the action', async () => {
  let release;
  const w = await site({ hash: '#/admin', fetch: async () => new Promise(resolve => { release = resolve; }) });
  w.sessionStorage.setItem('skywalker-admin-key', 'test-only');
  w.renderApplicationList([{ id: 1, nickname: 'Reader', status: 'pending' }]);
  const pending = w.approveApp(1); await tick();
  w.location.hash = '#/contact'; await tick();
  release(json({ok:true})); await pending;
  assert.match(w.document.querySelector('#main').textContent, /Contact/);
  assert.doesNotMatch(w.document.querySelector('#main').textContent, /Access applications/);
  w.close();
});

test('Hong Kong share prices keep their own currency in both languages', async () => {
  const w = await site();
  const holding = { code:'00700', name:'腾讯控股', shares:70, cost_price:380, price:400, weight:12, pnl:5 };
  w.showStarPopup(holding);
  assert.match(w.document.getElementById('star-popup').textContent, /HK\$/);
  assert.doesNotMatch(w.document.getElementById('star-popup').textContent, /CN¥/);
  w.close();
});
