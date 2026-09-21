/* === Utilities === */
function esc(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/* === State === */
const main = document.getElementById("main");
const sectionIds = ["about", "projects", "essays", "contact"];
let viewGeneration = 0;
let view = null; // "home" or "article"
let essayMode = null;
let activeEssaySlug = null;
let pendingReadingPosition = null;
let languageRequest = language;
let essayYear = "all";
let homeScroll = null; // where the reader left the home page when opening an essay
let homeHash = null; // the URL hash the home page had at that moment
let currentHash = location.hash;
const essayDocuments = new Map();
const loadedEssayDocuments = new Set();

const links = {
  email: "txyu25@stu.pku.edu.cn",
  github: "https://github.com/CavemaninIceAge",
  zhihu: "https://www.zhihu.com/people/SkywalkerFish",
  huggingface: "https://huggingface.co/SkywalkerFish",
  quora: "https://www.quora.com/profile/SkywalkerFish",
};

/* === Routing ===
   The site is one page with anchored sections; only an essay opens as its own view.
   Older links (#/essays, #/projects, #/contact and the removed #/portfolio, #/adventures,
   #/albums, #/signup, #/admin routes) still resolve to the matching section or the top. */
function parseHash(hash) {
  if (hash.startsWith("#/essays/")) return { kind: "article", slug: hash.slice(9) };
  const anchor = hash.replace(/^#\/?/, "");
  if (hash.startsWith("#/")) return { kind: "home", anchor: sectionIds.includes(anchor) ? anchor : "top", legacy: true };
  return { kind: "home", anchor: sectionIds.includes(anchor) || anchor === "main" ? anchor : "top", legacy: false };
}

function route(options = {}) {
  viewGeneration++;
  const target = parseHash(location.hash);
  applyLanguageChrome();
  if (target.kind === "article") { renderEssayArticle(target.slug); return target; }
  activeEssaySlug = null; essayMode = null; pendingReadingPosition = null;
  if (view !== "home" || options.force) renderHome();
  document.title = t("name");
  setCurrentSection(target.anchor === "main" ? "top" : target.anchor);
  return target;
}

function scrollToAnchor(anchor) {
  if (!anchor || anchor === "top" || anchor === "main") { window.scrollTo({ top: 0, behavior: "instant" }); return; }
  document.getElementById(anchor)?.scrollIntoView({ behavior: "instant", block: "start" });
}

function setLanguage(nextLanguage) {
  if (!supportedLanguages.includes(nextLanguage)) return;
  languageRequest = nextLanguage;
  if (nextLanguage === language) return;
  const meta = activeEssaySlug ? essays.find(essay => essay.slug === activeEssaySlug) : null;
  if (meta) {
    // Fetch the other edition first so the article swaps in one step instead of flashing a loading state.
    const edition = essayEdition(meta, nextLanguage);
    const missing = [edition.originalPath, edition.translationPath].filter(path => !loadedEssayDocuments.has(path));
    if (missing.length) {
      Promise.allSettled(missing.map(loadEssayDocument)).then(() => {
        if (languageRequest === nextLanguage && language !== nextLanguage) applyLanguage(nextLanguage);
      });
      return;
    }
  }
  applyLanguage(nextLanguage);
}

function applyLanguage(nextLanguage) {
  const focused = document.activeElement?.id;
  const scroll = window.scrollY;
  pendingReadingPosition = captureReadingPosition();
  if (essayMode !== "parallel") essayMode = null;
  language = nextLanguage;
  try { localStorage.setItem("skywalker-language", language); } catch { /* Switching still works without storage. */ }
  const url = new URL(location.href);
  url.searchParams.set("lang", language);
  history.replaceState(null, "", url);
  route({ force: true });
  if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
  window.scrollTo({ top: scroll, behavior: "instant" });
}

function cleanLegacyHash(target) {
  if (target.legacy) history.replaceState(null, "", location.pathname + location.search + (target.anchor === "top" ? "" : `#${target.anchor}`));
}

window.addEventListener("hashchange", () => {
  const wasHome = view === "home";
  const previousHash = currentHash;
  currentHash = location.hash;
  if (wasHome) { homeScroll = window.scrollY; homeHash = previousHash; }
  const target = route();
  if (target.kind === "article") { window.scrollTo({ top: 0, behavior: "instant" }); return; }
  cleanLegacyHash(target);
  currentHash = location.hash;
  // Going back to the URL the reader left returns to the spot they left, not to a section heading;
  // choosing another section from an essay still goes to that section.
  const returning = !wasHome && homeScroll !== null && currentHash === homeHash;
  if (returning) window.scrollTo({ top: homeScroll, behavior: "instant" });
  // A native anchor on an already rendered page has scrolled by itself; everything else scrolls here.
  else if (!wasHome || target.legacy) scrollToAnchor(target.anchor);
  if (!wasHome) { homeScroll = null; homeHash = null; }
  closeMobileMenu();
});
window.addEventListener("popstate", () => {
  const explicit = new URL(location.href).searchParams.get("lang");
  if (supportedLanguages.includes(explicit) && explicit !== language) setLanguage(explicit);
});

function init() {
  setupHeader();
  const target = route();
  if (target.kind === "home" && target.legacy) { cleanLegacyHash(target); scrollToAnchor(target.anchor); }
  currentHash = location.hash;
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

/* === Header === */
// The back link on an essay steps back through history when the reader came from the home page,
// so the URL and the scroll position both return to where they were; otherwise it opens the list.
function leaveEssay(event) {
  if (homeScroll === null) return;
  event.preventDefault();
  history.back();
}

function setupHeader() {
  document.querySelectorAll("[data-language]").forEach(button => {
    button.onclick = () => setLanguage(button.dataset.language);
  });
  document.querySelector(".skip-link").onclick = event => { event.preventDefault(); main.focus(); };
  const menu = document.querySelector(".mobile-menu");
  document.addEventListener("click", event => {
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeMobileMenu(); });
}

function closeMobileMenu() {
  const menu = document.querySelector(".mobile-menu");
  if (menu) menu.open = false;
}

function setCurrentSection(id) {
  document.querySelectorAll("nav[data-nav] a").forEach(link => {
    if (link.hash === `#${id}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

let sectionObserver = null;
function observeSections() {
  sectionObserver?.disconnect();
  if (typeof IntersectionObserver !== "function") return;
  const visible = new Map();
  sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting));
    const current = ["top", ...sectionIds].filter(id => visible.get(id)).at(-1);
    if (current) setCurrentSection(current);
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["top", ...sectionIds].forEach(id => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  });
}

/* === Home === */
function renderHome() {
  view = "home";
  main.innerHTML = renderHero() + renderAbout() + renderProjects() + renderEssays() + renderContact();
  setupEssayFilter();
  observeSections();
}

function renderHero() {
  return `
    <section id="top" class="hero shell">
      <div class="hero-copy">
        <p class="eyebrow">${t("eyebrow")}</p>
        <h1>${t("name")}<span class="name-alt" lang="${language === "zh" ? "en" : "zh-CN"}">${t("nameAlt")}</span></h1>
        <p class="role">${t("profileStudy")}</p>
        <p class="affiliation">${t("profileRoles")}</p>
        <div class="hero-actions">
          <a class="button primary" href="mailto:${links.email}">${t("email")}</a>
          <a class="button" href="${links.github}" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a class="button" href="${links.zhihu}" target="_blank" rel="noopener noreferrer">${t("zhihu")}</a>
          <a class="button" href="${links.huggingface}" target="_blank" rel="noopener noreferrer">HuggingFace</a>
        </div>
      </div>
      <figure class="portrait-wrap">
        <img src="images/avatar.png" alt="${t("avatarAlt")}" width="375" height="400" />
        <figcaption>${t("portraitCaption")}</figcaption>
      </figure>
    </section>`;
}

function renderAbout() {
  const schools = [
    { image: "images/pku-emblem.png", alt: "pkuAlt", name: "pku", detail: "pkuDetail" },
    { image: "images/h3z-emblem.png", alt: "h3zAlt", name: "h3z" },
    { image: "images/gdfz-emblem.png", alt: "hitAlt", name: "hitSchool" },
  ];
  return `
    <section id="about" class="section about-section">
      <div class="shell">
        <div class="section-heading section-heading--compact"><h2>${t("about")}</h2></div>
        <div class="about-grid">
          <div class="about-copy">
            <p class="bio">${t("profileBio")}</p>
            <h3>${t("futureVision")}</h3>
            <p class="future">${t("futureEmpty")}</p>
          </div>
          <div class="education">
            <h3>${t("education")}</h3>
            <ol class="background-list">
              ${schools.map(school => `
              <li>
                <img src="${school.image}" alt="${t(school.alt)}" width="44" height="44" />
                <div><strong>${t(school.name)}</strong>${school.detail ? `<span>${t(school.detail)}</span>` : ""}</div>
              </li>`).join("")}
            </ol>
          </div>
        </div>
      </div>
    </section>`;
}

function renderProjects() {
  const projects = [
    { name: t("projectProposal"), desc: t("projectProposalDesc"), download: "files/模拟政协-提案.docx" },
    { name: t("projectInterview"), desc: t("projectInterviewDesc"), download: "files/哈三中校友会采访.pdf" },
    { name: "skywalker.fish", desc: t("projectSiteDesc"), url: "https://github.com/CavemaninIceAge/skywalker.fish" },
    { name: "Mahjong", desc: t("projectMahjongDesc"), url: "https://github.com/Yizhilaomuji/Mahjong" },
    { name: "Amazon_Chess_AI", desc: t("projectAmazonDesc"), url: "https://github.com/CavemaninIceAge/Amazon_Chess_AI" },
  ];
  return `
    <section id="projects" class="section projects-section">
      <div class="shell">
        <div class="section-heading"><h2>${t("projects")}</h2></div>
        <div class="project-list">
          ${projects.map(project => `
          <article class="project-card">
            <div class="project-copy">
              <h3>${esc(project.name)}</h3>
              <p>${project.desc}</p>
            </div>
            <div class="project-links">
              ${project.url ? `<a href="${project.url}" target="_blank" rel="noopener noreferrer">${t("website")} <span aria-hidden="true">↗</span></a>` : ""}
              ${project.download ? `<a href="${project.download}" download>${t("originalDownload")} <span aria-hidden="true">↓</span></a>` : ""}
            </div>
          </article>`).join("")}
        </div>
      </div>
    </section>`;
}

const kindLabels = { diary: "kindDiary", fiction: "kindFiction", essay: "kindEssay" };

function renderEssays() {
  const sorted = [...essays].sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(sorted.map(essay => essay.date.slice(0, 4)))];
  const count = year => sorted.filter(essay => year === "all" || essay.date.startsWith(year)).length;
  if (!years.includes(essayYear)) essayYear = "all";
  const button = year => `<button type="button" class="filter-button${essayYear === year ? " is-active" : ""}" data-year="${year}" aria-pressed="${essayYear === year}">${year === "all" ? t("allYears") : year} <span>${count(year)}</span></button>`;
  return `
    <section id="essays" class="section essays-section">
      <div class="shell">
        <div class="section-heading"><h2>${t("essays")}</h2></div>
        <div class="essay-year-nav" role="group" aria-label="${t("essays")}">${[button("all"), ...years.map(button)].join("")}</div>
        <div class="essay-list">
          ${sorted.map(essay => `
          <article class="essay-item" data-year="${essay.date.slice(0, 4)}"${essayYear !== "all" && !essay.date.startsWith(essayYear) ? " hidden" : ""}>
            <time datetime="${essay.date}">${formatDate(essay.date)}</time>
            <div>
              <span class="tag">${t(kindLabels[essay.kind] || "kindEssay")}</span>
              <h3><a href="#/essays/${essay.slug}">${esc(essay.title[language])}</a></h3>
            </div>
          </article>`).join("")}
          ${sorted.length ? "" : `<p class="empty-state">${t("noEssays")}</p>`}
        </div>
      </div>
    </section>`;
}

function setupEssayFilter() {
  document.querySelectorAll(".essay-year-nav .filter-button").forEach(button => {
    button.onclick = () => filterEssays(button.dataset.year);
  });
}

function filterEssays(year) {
  essayYear = year;
  document.querySelectorAll(".essay-year-nav .filter-button").forEach(button => {
    const active = button.dataset.year === year;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll(".essay-item").forEach(item => {
    item.hidden = year !== "all" && item.dataset.year !== year;
  });
}

function renderContact() {
  return `
    <section id="contact" class="section contact-section">
      <div class="shell contact-grid">
        <div><h2>${t("contact")}</h2></div>
        <div class="contact-details">
          <a href="mailto:${links.email}">${links.email}</a>
          <p>${t("phone")}${t("colon")}15045089401<br />QQ${t("colon")}2813243845</p>
          <div class="contact-links">
            <a href="${links.github}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a href="${links.zhihu}" target="_blank" rel="noopener noreferrer">${t("zhihu")} ↗</a>
            <a href="${links.huggingface}" target="_blank" rel="noopener noreferrer">HuggingFace ↗</a>
            <a href="${links.quora}" target="_blank" rel="noopener noreferrer">Quora ↗</a>
          </div>
          <p class="contact-note">${t("moreSoon")}</p>
        </div>
      </div>
    </section>`;
}

/* === Essays === */
function captureReadingPosition() {
  const paragraphs = [...main.querySelectorAll("[data-paragraph]")];
  const headerBottom = document.querySelector(".site-header").getBoundingClientRect().bottom;
  const current = paragraphs.find(el => el.getBoundingClientRect().bottom > headerBottom);
  if (!current || window.scrollY < 100) return null;
  return { slug: activeEssaySlug, index: current.dataset.paragraph, offset: current.getBoundingClientRect().top - headerBottom };
}

function restoreReadingPosition(position) {
  if (!position || position.slug !== activeEssaySlug) return;
  const paragraph = main.querySelector(`[data-paragraph="${position.index}"]`);
  if (paragraph) {
    const headerBottom = document.querySelector(".site-header").getBoundingClientRect().bottom;
    window.scrollBy(0, paragraph.getBoundingClientRect().top - headerBottom - position.offset);
  }
}

function setEssayMode(mode) {
  if (!["original", "translation", "parallel"].includes(mode) || mode === essayMode) return;
  pendingReadingPosition = captureReadingPosition();
  essayMode = mode;
  route();
}

function loadEssayDocument(path) {
  if (!essayDocuments.has(path)) {
    const request = fetch(path).then(response => {
      if (!response.ok) throw new Error("Essay unavailable");
      return response.text();
    }).then(text => {
      const source = new DOMParser().parseFromString(text, "text/html");
      const body = source.querySelector(".essay-body");
      if (!body) throw new Error("Essay body missing");
      loadedEssayDocuments.add(path);
      return { title: source.title, body: body.innerHTML, paragraphs: [...body.children].map(el => el.outerHTML) };
    }).catch(error => { essayDocuments.delete(path); throw error; });
    essayDocuments.set(path, request);
  }
  return essayDocuments.get(path);
}

// Which file pairs with the original for a given edition. English originals pair with the
// Chinese rendition; Chinese originals pair with English, unless a Chinese rendition exists
// for a mixed-language original and the reader is in Chinese.
function essayEdition(meta, lang) {
  const translationLanguage = lang === "zh" && meta.hasChineseTranslation ? "zh"
    : meta.originalLanguage === "en" ? "zh" : "en";
  return {
    translationLanguage,
    originalPath: `essays/${meta.slug}.html`,
    translationPath: `essays/${translationLanguage}/${meta.slug}.html`,
  };
}

async function renderEssayArticle(slug) {
  view = "article";
  setCurrentSection("essays");
  const meta = essays.find(essay => essay.slug === slug);
  if (!meta) {
    document.title = t("name");
    main.innerHTML = `<div class="article-page shell"><a class="back-link" href="#essays" onclick="leaveEssay(event)">${t("backEssays")}</a><p class="empty-state">${t("notFound")}</p></div>`;
    return;
  }
  if (activeEssaySlug !== slug) { activeEssaySlug = slug; essayMode = null; }
  const { translationLanguage, originalPath, translationPath } = essayEdition(meta, language);
  if (!essayMode) essayMode = (language === meta.originalLanguage && !(language === "zh" && meta.hasChineseTranslation)) ? "original" : "translation";
  const mode = essayMode;
  const generation = viewGeneration;
  const requestedLanguage = language;
  const position = pendingReadingPosition;
  pendingReadingPosition = null;
  const originalLabel = t(meta.originalLanguage === "en" ? "originalEnglish" : "originalChinese");
  const translationLabel = t(translationLanguage === "en" ? "englishTranslation" : "chineseTranslation");
  const controls = `<div class="reading-controls" role="group" aria-label="${t("readingMode")}">
    ${["original", "translation", "parallel"].map(value => `<button type="button" class="filter-button reading-option${mode === value ? " is-active" : ""}" aria-pressed="${mode === value}" onclick="setEssayMode('${value}')">${t({ original: "readOriginal", translation: "readTranslation", parallel: "readParallel" }[value])}</button>`).join("")}
  </div>`;
  function header(title) {
    return `<div class="article-page shell"><a class="back-link" href="#essays" onclick="leaveEssay(event)">${t("backEssays")}</a><article class="essay-article${mode === "parallel" ? " parallel-reading" : ""}">
      <header class="essay-header">
        <p class="tag">${t(kindLabels[meta.kind] || "kindEssay")}</p>
        <h1>${esc(title)}</h1>
        <p class="essay-date"><time datetime="${meta.date}">${formatDate(meta.date)}</time></p>
        ${controls}
      </header>`;
  }
  const footer = `</article></div>`;
  main.innerHTML = `${header(meta.title[language])}<p class="empty-state" role="status">${t("loading")}</p>${footer}`;
  try {
    const [original, translated] = await Promise.all([
      mode !== "translation" ? loadEssayDocument(originalPath) : null,
      mode !== "original" ? loadEssayDocument(translationPath) : null,
    ]);
    if (generation !== viewGeneration || requestedLanguage !== language) return;
    let content, title;
    if (mode === "parallel") {
      title = meta.title[language];
      const length = Math.max(original.paragraphs.length, translated.paragraphs.length);
      content = `<div class="parallel-headings"><h2>${originalLabel}</h2><h2>${translationLabel}</h2></div>`;
      for (let index = 0; index < length; index++) {
        content += `<div class="parallel-row" data-paragraph="${index}">
          <div class="essay-body" lang="${meta.originalLanguage === "zh" ? "zh-CN" : "en"}"><span class="parallel-mobile-label">${originalLabel}</span>${original.paragraphs[index] || ""}</div>
          <div class="essay-body" lang="${translationLanguage === "zh" ? "zh-CN" : "en"}"><span class="parallel-mobile-label">${translationLabel}</span>${translated.paragraphs[index] || ""}</div>
        </div>`;
      }
    } else {
      const current = mode === "original" ? original : translated;
      const bodyLanguage = mode === "original" ? meta.originalLanguage : translationLanguage;
      title = current.title || meta.title[bodyLanguage];
      content = `<p class="translation-note">${mode === "original" ? originalLabel : translationLabel}</p><div class="essay-body" lang="${bodyLanguage === "zh" ? "zh-CN" : "en"}">${current.body}</div>`;
    }
    document.title = `${title} · ${t("name")}`;
    main.innerHTML = `${header(title)}${content}${footer}`;
    if (mode !== "parallel") main.querySelectorAll(".essay-body > *").forEach((el, index) => { el.dataset.paragraph = index; });
    restoreReadingPosition(position);
  } catch {
    if (generation !== viewGeneration || requestedLanguage !== language) return;
    main.innerHTML = `${header(meta.title[language])}<div class="empty-state"><p>${t("essayLoadError")}</p><button type="button" class="button" onclick="route()">${t("retry")}</button></div>${footer}`;
  }
}
