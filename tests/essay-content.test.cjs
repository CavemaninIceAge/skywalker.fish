const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const catalog = vm.runInNewContext(
  `${fs.readFileSync(path.join(root, 'essay-catalog.js'), 'utf8')}\nessays;`,
  Object.create(null),
  { filename: 'essay-catalog.js' }
);
const han = /\p{Script=Han}/u;

function readEssay(relativePath) {
  const file = path.join(root, relativePath);
  assert.ok(fs.existsSync(file), `Missing essay: ${relativePath}`);
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
  try {
    const document = dom.window.document;
    const body = document.querySelector('.essay-body');
    assert.ok(body, `Missing .essay-body: ${relativePath}`);
    assert.ok(body.textContent.trim(), `Empty essay body: ${relativePath}`);
    const date = document.querySelector('meta[name="date"]')?.content;
    assert.match(date || '', /^\d{4}-\d{2}-\d{2}$/, `Missing or invalid date: ${relativePath}`);
    const paragraphs = [...body.querySelectorAll('p')].map(paragraph => paragraph.textContent);
    assert.ok(paragraphs.length, `Missing paragraphs: ${relativePath}`);
    return {
      title: document.title,
      date,
      language: document.documentElement.lang,
      paragraphs,
      text: body.textContent,
      html: body.innerHTML,
    };
  } finally {
    dom.window.close();
  }
}

test('the essay catalog contains 47 unique essays with Chinese and English titles', () => {
  assert.ok(Array.isArray(catalog));
  assert.equal(catalog.length, 47);
  assert.equal(new Set(catalog.map(essay => essay.slug)).size, 47);
  for (const essay of catalog) {
    assert.match(essay.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(typeof essay.title?.zh, 'string', `${essay.slug}: missing Chinese title`);
    assert.equal(typeof essay.title?.en, 'string', `${essay.slug}: missing English title`);
    assert.ok(essay.title.zh.trim(), `${essay.slug}: empty Chinese title`);
    assert.ok(essay.title.en.trim(), `${essay.slug}: empty English title`);
    assert.match(essay.title.zh, han, `${essay.slug}: Chinese title is not localized`);
    assert.doesNotMatch(essay.title.en, han, `${essay.slug}: Chinese text in English title`);
    assert.ok(['zh', 'en'].includes(essay.originalLanguage), `${essay.slug}: invalid original language`);
    assert.ok(['diary', 'fiction', 'essay'].includes(essay.kind), `${essay.slug}: invalid kind`);
    if (essay.slug.startsWith('diary-') || essay.title.zh.startsWith('日记')) assert.equal(essay.kind, 'diary', `${essay.slug}: diary entries are tagged as diary`);
  }
});

test('every English edition retains all original paragraphs and the original date', async t => {
  for (const essay of catalog) {
    await t.test(essay.slug, () => {
      const original = readEssay(`essays/${essay.slug}.html`);
      const english = readEssay(`essays/en/${essay.slug}.html`);
      assert.equal(english.paragraphs.length, original.paragraphs.length, 'A paragraph was added or omitted');
      assert.deepEqual(
        english.paragraphs.map(paragraph => Boolean(paragraph.trim())),
        original.paragraphs.map(paragraph => Boolean(paragraph.trim())),
        'English edition changed the placement of empty stanza separators'
      );
      assert.equal(english.date, original.date, 'English edition changed the original date');
      assert.equal(essay.date, original.date, 'Catalog date differs from the original');
      assert.equal(english.title, essay.title.en, 'English file title differs from the catalog');
      assert.match(english.language, /^en(?:-|$)/i, 'English document language is not set');
      assert.doesNotMatch(english.text, han, 'Chinese text remains in the English body');
    });
  }
});

test('every declared Chinese counterpart exists and retains the complete paragraph structure', async t => {
  const counterparts = catalog.filter(essay => essay.hasChineseTranslation);
  assert.ok(counterparts.length, 'No Chinese counterparts are declared');
  for (const slug of ['ideal-middle-class']) {
    assert.ok(counterparts.some(essay => essay.slug === slug), `${slug}: required Chinese counterpart is not declared`);
  }
  for (const essay of counterparts) {
    await t.test(essay.slug, () => {
      const original = readEssay(`essays/${essay.slug}.html`);
      const chinese = readEssay(`essays/zh/${essay.slug}.html`);
      assert.equal(chinese.paragraphs.length, original.paragraphs.length, 'Chinese counterpart omitted paragraphs');
      assert.deepEqual(
        chinese.paragraphs.map(paragraph => Boolean(paragraph.trim())),
        original.paragraphs.map(paragraph => Boolean(paragraph.trim())),
        'Chinese counterpart changed the placement of empty stanza separators'
      );
      assert.equal(chinese.date, original.date, 'Chinese counterpart changed the original date');
      assert.equal(chinese.title, essay.title.zh, 'Chinese file title differs from the catalog');
      assert.match(chinese.language, /^zh(?:-|$)/i, 'Chinese document language is not set');
      assert.match(chinese.text, han, 'Chinese counterpart has no Chinese content');
    });
  }
});

test('the original English essay is preserved verbatim and has a complete Chinese translation', () => {
  const essay = catalog.find(entry => entry.slug === 'ideal-middle-class');
  assert.equal(essay?.originalLanguage, 'en');
  const original = readEssay('essays/ideal-middle-class.html');
  const english = readEssay('essays/en/ideal-middle-class.html');
  const chinese = readEssay('essays/zh/ideal-middle-class.html');
  assert.equal(english.html, original.html, 'The original English prose or markup was rewritten');
  assert.equal(chinese.paragraphs.length, original.paragraphs.length);
  assert.ok(chinese.paragraphs.every(paragraph => han.test(paragraph)), 'A Chinese paragraph was left untranslated');
  assert.doesNotMatch(chinese.text, /[A-Za-z]{2,}/, 'English prose remains in the Chinese translation');
});
