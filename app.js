/* === Utilities === */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function esc(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/* === Router and language editions === */
const main = document.getElementById("main");
let viewGeneration = 0;
let applicationSubmitting = false;
let loginRequestVersion = 0;
let essayMode = null;
let activeEssaySlug = null;
let pendingReadingPosition = null;
const essayDocuments = new Map();

function updateLanguageChrome() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelector("nav").setAttribute("aria-label", t("navLabel"));
  document.querySelector(".language-switch").setAttribute("aria-label", t("languageLabel"));
  document.querySelectorAll("[data-language]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });
  document.querySelector('meta[name="description"]').content = t("metaDescription");
  updateNavState();
}

function route() {
  viewGeneration++;
  const hash = location.hash === "#main" ? "#/" : location.hash || "#/";
  updateLanguageChrome();
  closeStarPopup();
  main.innerHTML = "";
  const section = hash.split("/")[1] || "profile";
  if (!hash.startsWith("#/essays/")) { activeEssaySlug = null; essayMode = null; pendingReadingPosition = null; }
  const titleKey = ({ signup: "applyAccess", admin: "adminAccess" })[section] || section;
  document.title = `${t("name")} · ${messages[language][titleKey] || t("profile")}`;
  document.querySelectorAll(".nav-links a").forEach(link => {
    const active = link.hash === hash || (link.hash !== "#/" && hash.startsWith(link.hash + "/"));
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  switch (hash) {
    case "#/": renderProfile(); break;
    case "#/essays": renderEssays(); break;
    case "#/projects": renderProjects(); break;
    case "#/portfolio": renderPortfolio(); break;
    case "#/adventures": renderAdventures(); break;
    case "#/contact": renderContact(); break;
    case "#/signup": renderSignup(); break;
    case "#/admin": renderAdmin(); break;
    case "#/albums": renderAlbums(); break;
    default:
      if (hash.startsWith("#/albums/")) renderAlbumView(hash.slice(9));
      else if (hash.startsWith("#/essays/")) renderEssayArticle(hash.slice(9));
      else renderProfile();
  }
}

function setLanguage(nextLanguage) {
  if (!supportedLanguages.includes(nextLanguage) || nextLanguage === language) return;
  const fields = [...document.querySelectorAll("input[id], textarea[id]")].map(el => [el.id, el.value]);
  const knows = document.getElementById("circle-know")?.classList.contains("selected");
  const loginOpen = Boolean(document.getElementById("login-overlay"));
  const focused = document.activeElement?.id;
  const scroll = window.scrollY;
  pendingReadingPosition = captureReadingPosition();
  if (essayMode !== "parallel") essayMode = null;
  language = nextLanguage;
  try { localStorage.setItem("skywalker-language", language); } catch { /* Switching still works without storage. */ }
  const url = new URL(location.href);
  url.searchParams.set("lang", language);
  history.replaceState(null, "", url);
  dismissDialogs();
  route();
  if (knows && document.getElementById("circle-know")) toggleKnow();
  if (loginOpen) showLoginModal();
  fields.forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) { input.value = value; if (input.tagName === "TEXTAREA") autoResize.call(input); }
  });
  if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
  window.scrollTo({ top: scroll, behavior: "instant" });
}

function dismissDialogs() {
  loginRequestVersion++;
  document.querySelectorAll(".overlay:not(#modal-overlay), .login-overlay, .success-overlay").forEach(el => el.remove());
  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("hidden");
  overlay.querySelector(".modal-box").innerHTML = "";
  closeStarPopup();
}

window.onhashchange = () => { dismissDialogs(); route(); window.scrollTo(0, 0); };
window.addEventListener("popstate", () => {
  const explicit = new URL(location.href).searchParams.get("lang");
  if (supportedLanguages.includes(explicit) && explicit !== language) setLanguage(explicit);
});
window.onload = () => { setupNav(); route(); };

function setupNav() {
  document.getElementById("btn-login").onclick = showLoginModal;
  document.getElementById("btn-signup").onclick = () => { location.hash = "#/signup"; };
  document.querySelectorAll("[data-language]").forEach(button => {
    button.onclick = () => setLanguage(button.dataset.language);
  });
  document.querySelector(".skip-link").onclick = event => { event.preventDefault(); main.focus(); };
}

// Keyboard support for all existing dialog surfaces.
document.addEventListener("keydown", event => {
  const dialogs = [...document.querySelectorAll(".overlay:not(.hidden), .login-overlay, .success-overlay")];
  const dialog = dialogs.at(-1);
  if (!dialog) return;
  if (event.key === "Escape") { dismissDialogs(); document.getElementById("btn-login").focus(); return; }
  if (event.key !== "Tab") return;
  const focusable = [...dialog.querySelectorAll('button:not(:disabled), a[href], input, textarea')];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
});

function updateNavState() {
  const btnLogin = document.getElementById("btn-login");
  const btnSignup = document.getElementById("btn-signup");
  const navUser = document.getElementById("nav-user");

  if (isLoggedIn()) {
    btnLogin.style.display = "none";
    btnSignup.style.display = "none";
    navUser.style.display = "flex";

    const nickname = sessionStorage.getItem("skywalker-nickname") || "";
    const realName = sessionStorage.getItem("skywalker-name") || "";
    const knowSkywalker = sessionStorage.getItem("skywalker-know") === "1";

    document.getElementById("nav-nickname").textContent = nickname;
    document.getElementById("nav-realname").textContent = knowSkywalker ? realName : t("guest");
  } else {
    btnLogin.style.display = "";
    btnLogin.textContent = t("login");
    btnLogin.onclick = showLoginModal;
    btnSignup.style.display = "";
    navUser.style.display = "none";
  }
}

function isLoggedIn() {
  return sessionStorage.getItem("skywalker-login") === "1";
}

function logout() {
  sessionStorage.removeItem("skywalker-login");
  sessionStorage.removeItem("skywalker-nickname");
  sessionStorage.removeItem("skywalker-name");
  sessionStorage.removeItem("skywalker-know");
  updateNavState();
  if (location.hash === "#/" || !location.hash) route();
  else location.hash = "#/";
}

/* Modal overlay click-to-close */
document.getElementById("modal-overlay").onclick = function (e) {
  if (e.target === this) {
    this.classList.add("hidden");
    this.querySelector(".modal-box").innerHTML = "";
  }
};

function showPdfModal() {
  const overlay = document.getElementById("modal-overlay");
  const box = overlay.querySelector(".modal-box");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", t("roadTitle"));
  box.innerHTML = `
    <div class="pdf-modal-title">${t("roadTitle")}</div>
    <div class="pdf-modal-size">${t("pdfOriginal")}</div>
    <p class="download-unavailable">${t("pdfUnavailable")}</p><button class="btn-outline" onclick="dismissDialogs()">${t("close")}</button>`;
  overlay.classList.remove("hidden");
  box.querySelector("button").focus();
}

/* === Profile === */
function renderProfile() {
  main.innerHTML = `
    <div class="profile-header">
      <div>
        <h1 class="name">${t("name")} <button class="more-link" type="button" onclick="showPdfModal()">${t("moreAbout")}</button></h1>
        <div class="subtitle">${t("profileStudy")}</div>
        <div class="subtitle">${t("profileRoles")}</div>
      </div>
      <img class="avatar" src="images/avatar.png" alt="${t("avatarAlt")}" />
    </div>
    <div class="section-title">${t("description")}</div>
    <div class="section-body">${t("profileBio")}</div>
    <div class="section-title">${t("education")}</div>
    <div class="edu-row">
      <img src="images/pku-clean.jpeg" alt="${t("pkuAlt")}" />
      <div>
        <div class="school">${t("pku")}</div>
      </div>
    </div>
    <div class="edu-row">
      <img src="images/h3z.png" alt="${t("h3zAlt")}" />
      <div>
        <div class="school">${t("h3z")}</div>
      </div>
    </div>
    <div class="edu-row">
      <img src="images/gdfz.png" alt="${t("hitAlt")}" />
      <div>
        <div class="school">${t("hitSchool")}</div>
      </div>
    </div>
    <div class="section-title">${t("futureVision")}</div>
    <div class="section-body">${t("futureEmpty")}</div>
  `;
}

/* === Essays === */


function renderEssays() {
  if (!isLoggedIn()) {
    main.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div class="section-title" style="margin:0">${t("essays")}</div>
        <button class="btn-outline" onclick="location.hash='#/albums'" style="padding:5px 18px;font-size:14px">${t("albums")}</button>
      </div>
      <div class="adventure-gate">
        <div class="game-preview">
          ${t("essaysPreview")}
        </div>
        <div class="blur-overlay">
          <div class="blocked-text">${t("accessGate")}<button class="btn-outline gate-login" onclick="showLoginModal()">${t("login")}</button></div>
        </div>
      </div>`;
    return;
  }

  essays.sort((a, b) => b.date.localeCompare(a.date));
  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div class="section-title" style="margin:0">${t("essays")}</div><button class="btn-outline" onclick="location.hash='#/albums'" style="padding:5px 18px;font-size:14px">${t("albums")}</button></div>`;
  for (const e of essays) {
    html += `
      <div class="essay-row">
        <span class="date">${formatDate(e.date)}</span>
        <a class="essay-link" href="#/essays/${e.slug}">${esc(e.title[language])}</a>
      </div>`;
  }
  if (essays.length === 0) html += `<p style="color:var(--muted)">${t("noEssays")}</p>`;
  main.innerHTML = html;
}

function captureReadingPosition() {
  const paragraphs = [...main.querySelectorAll("[data-paragraph]")];
  const navBottom = document.querySelector("nav").getBoundingClientRect().bottom;
  const current = paragraphs.find(el => el.getBoundingClientRect().bottom > navBottom);
  if (!current || window.scrollY < 100) return null;
  return { slug: activeEssaySlug, index: current.dataset.paragraph, offset: current.getBoundingClientRect().top - navBottom };
}

function restoreReadingPosition(position) {
  if (!position || position.slug !== activeEssaySlug) return;
  const paragraph = main.querySelector(`[data-paragraph="${position.index}"]`);
  if (paragraph) {
    const navBottom = document.querySelector("nav").getBoundingClientRect().bottom;
    window.scrollBy(0, paragraph.getBoundingClientRect().top - navBottom - position.offset);
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
      return { title: source.title, body: body.innerHTML, paragraphs: [...body.children].map(el => el.outerHTML) };
    }).catch(error => { essayDocuments.delete(path); throw error; });
    essayDocuments.set(path, request);
  }
  return essayDocuments.get(path);
}

async function renderEssayArticle(slug) {
  if (!isLoggedIn()) { location.hash = "#/essays"; return; }
  const meta = essays.find(essay => essay.slug === slug);
  if (!meta) {
    main.innerHTML = `<a class="back-link" href="#/essays">${t("backEssays")}</a><p>${t("notFound")}</p>`;
    return;
  }
  if (activeEssaySlug !== slug) { activeEssaySlug = slug; essayMode = null; }
  // English originals stay untouched in English. Mixed originals also have an optional Chinese rendition.
  const translationLanguage = language === "zh" && meta.hasChineseTranslation ? "zh"
    : meta.originalLanguage === "en" ? "zh" : "en";
  if (!essayMode) essayMode = (language === meta.originalLanguage && !(language === "zh" && meta.hasChineseTranslation)) ? "original" : "translation";
  const mode = essayMode;
  const generation = viewGeneration;
  const requestedLanguage = language;
  const position = pendingReadingPosition;
  pendingReadingPosition = null;
  const originalLabel = t(meta.originalLanguage === "en" ? "originalEnglish" : "originalChinese");
  const translationLabel = t(translationLanguage === "en" ? "englishTranslation" : "chineseTranslation");
  const controls = `<div class="reading-controls" role="group" aria-label="${t("readingMode")}">
    ${["original", "translation", "parallel"].map(value => `<button class="reading-option" aria-pressed="${mode === value}" onclick="setEssayMode('${value}')">${t({ original: "readOriginal", translation: "readTranslation", parallel: "readParallel" }[value])}</button>`).join("")}
  </div>`;
  function header(title) {
    return `<a class="back-link" href="#/essays">${t("backEssays")}</a><article class="essay-article ${mode === "parallel" ? "parallel-reading" : ""}">
      <h1>${esc(title)}</h1><div class="date-big">${formatDate(meta.date)}</div>${controls}`;
  }
  main.innerHTML = `${header(meta.title[language])}<p class="empty-state" role="status">${t("loading")}</p></article>`;
  const originalPath = `essays/${slug}.html`;
  const translationPath = `essays/${translationLanguage}/${slug}.html`;
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
    main.innerHTML = `${header(title)}${content}</article>`;
    if (mode !== "parallel") main.querySelectorAll(".essay-body > *").forEach((el, index) => { el.dataset.paragraph = index; });
    restoreReadingPosition(position);
  } catch {
    if (generation !== viewGeneration || requestedLanguage !== language) return;
    main.innerHTML = `${header(meta.title[language])}<div class="empty-state"><p>${t("essayLoadError")}</p><button class="btn-outline" onclick="route()">${t("retry")}</button></div></article>`;
  }
}

/* === Album === */
function renderAlbums() {
  main.innerHTML = `
    <h1 class="section-title page-title">${t("albums")}</h1>
    <div class="album-grid">
      <a class="album-card" href="#/albums/pku">
        <img src="images/pku-clean.jpeg" alt="${t("pkuAlt")}" />
        <div class="album-name">${t("pku")}</div>
      </a>
    </div>`;
}

function renderAlbumView(name) {
  let decoded;
  try { decoded = decodeURIComponent(name); } catch { decoded = ""; }
  const known = decoded === "pku" || decoded === "北京大学";
  main.innerHTML = `
    <div class="album-view">
      <a class="album-back" href="#/albums">${t("back")}</a>
      <h1 class="album-title">${known ? t("pku") : t("albums")}</h1>
      <p class="empty-state">${t("noPhotos")}</p>
    </div>`;
}

/* === Projects === */
function renderProjects() {
  const projects = [
    { name: t("projectProposal"), desc: t("projectProposalDesc"), url: "", download: "files/模拟政协-提案.docx" },
    { name: t("projectInterview"), desc: t("projectInterviewDesc"), url: "", download: "files/哈三中校友会采访.pdf" },
    { name: "skywalker.fish", desc: t("projectSiteDesc"), url: "https://github.com/CavemaninIceAge/skywalker.fish", download: "" },
    { name: "Mahjong", desc: t("projectMahjongDesc"), url: "https://github.com/Yizhilaomuji/Mahjong", download: "" },
    { name: "MomentumStrategy", desc: t("projectMomentumDesc"), url: "https://github.com/CavemaninIceAge/MomentumStrategy", download: "" },
    { name: "Amazon_Chess_AI", desc: t("projectAmazonDesc"), url: "https://github.com/CavemaninIceAge/Amazon_Chess_AI", download: "" },
    { name: "US-Leading Attempt", desc: t("projectUsDesc"), url: "https://github.com/CavemaninIceAge/US-Leading-Attempt", download: "" },
  ];
  main.innerHTML = `<div class="section-title" style="margin-top:0">${t("projects")}</div>`;
  for (const p of projects) {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="proj-name">${p.name}</div>
      <div class="proj-desc">${p.desc}</div>
    `;
    card.style.cursor = "pointer";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showProjectPopup(p); }
    };
    card.onclick = () => showProjectPopup(p);
    main.appendChild(card);
  }
  if (projects.length === 0) {
    main.innerHTML += `<p style="color:var(--muted)">${t("noProjects")}</p>`;
  }
}

function showProjectPopup(project) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  const box = document.createElement("div");
  box.className = "modal-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", project.name);
  box.style.maxWidth = "360px";
  box.style.textAlign = "center";

  const title = document.createElement("h3");
  title.textContent = project.name;
  title.style.marginBottom = "8px";

  const desc = document.createElement("p");
  desc.textContent = project.desc;
  desc.style.fontSize = "14px";
  desc.style.color = "var(--muted)";
  desc.style.marginBottom = "28px";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "12px";
  actions.style.justifyContent = "center";

  const btnSite = project.url
    ? (() => {
        const a = document.createElement("a");
        a.className = "proj-card-btn";
        a.textContent = t("website");
        a.href = project.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style.textDecoration = "none";
        return a;
      })()
    : null;

  const btnDL = document.createElement("button");
  btnDL.className = "proj-card-btn";
  btnDL.textContent = project.download ? t("originalDownload") : t("noDownload");
  btnDL.disabled = !project.download;
  btnDL.style.opacity = project.download ? "1" : "0.4";
  btnDL.style.cursor = project.download ? "pointer" : "not-allowed";
  btnDL.style.fontFamily = "inherit";
  btnDL.style.background = "none";
  if (project.download) {
    btnDL.onclick = function() {
      const a = document.createElement("a");
      a.href = project.download;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }

  if (btnSite) actions.appendChild(btnSite);
  actions.appendChild(btnDL);
  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector("a, button:not(:disabled)")?.focus();
}

/* === Portfolio === */
function renderPortfolio() {
  const generation = viewGeneration;
  const container = document.createElement("div");
  container.className = "portfolio-container";

  // Loading state
  container.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted)">${t("loadingPortfolio")}</div>`;
  main.appendChild(container);

  fetch("/api/portfolio")
    .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch"))
    .then(data => {
      if (generation !== viewGeneration || !container.isConnected) return;
      if (!data.holdings || data.holdings.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted)">${t("noPortfolio")}</div>`;
        return;
      }
      renderPortfolioChart(container, data.holdings);
      renderPortfolioFooter(container);
    })
    .catch(() => {
      if (generation !== viewGeneration || !container.isConnected) return;
      container.innerHTML = `
        <div style="text-align:center;padding:60px 0">
          <div style="color:var(--muted);margin-bottom:12px">${t("portfolioError")}</div>
          <button class="btn-outline" onclick="route()" style="font-family:inherit">${t("retry")}</button>
        </div>`;
    });
}

function renderPortfolioChart(container, holdings) {
  const field = document.createElement("div");
  field.className = "star-field";
  field.id = "star-field";

  const positions = [
    { x: 8, y: 6 }, { x: 22, y: 28 }, { x: 42, y: 8 },
    { x: 58, y: 32 }, { x: 72, y: 12 }, { x: 88, y: 22 },
  ];

  holdings.forEach((h, i) => {
    const pos = positions[i] || { x: 10 + i * 15, y: 10 + (i % 3) * 20 };
    const size = 26 + (h.weight / 35) * 34;
    const opacity = 0.55 + (h.pnl > 0 ? 0.4 : 0.15);
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = pos.x + "%";
    star.style.top = pos.y + "%";
    star.style.width = size + "px";
    star.style.height = size + "px";
    star.style.opacity = opacity;
    star.title = stockName(h);
    star.tabIndex = 0;
    star.setAttribute("role", "button");
    star.setAttribute("aria-label", `${stockName(h)}, ${formatNumber(h.weight)}%`);
    star.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showStarPopup(h); } };
    star.onclick = (e) => { e.stopPropagation(); showStarPopup(h); };
    field.appendChild(star);
  });

  field.onclick = () => closeStarPopup();
  container.innerHTML = "";
  container.appendChild(field);
}

function renderPortfolioFooter(container) {
  const divider = document.createElement("div");
  divider.className = "portfolio-divider";
  divider.innerHTML = `
    <span class="line"></span><br/>
    <span class="label" id="history-link">${t("holdingHistory")}</span><br/>
    <span class="line"></span>`;
  container.appendChild(divider);

  const historyPanel = document.createElement("div");
  historyPanel.className = "history-panel";
  historyPanel.id = "history-panel";
  container.appendChild(historyPanel);

  document.getElementById("history-link").onclick = renderHistory;
}

function showStarPopup(h) {
  let popup = document.getElementById("star-popup");
  if (popup) popup.remove();

  const currency = h.currency || (h.exchange === "hk" || /^\d{5}$/.test(h.code) ? "HKD" : "CNY");
  const pnl = h.pnl || 0;
  const pnlClass = pnl >= 0 ? "up" : "down";
  const pnlSign = pnl >= 0 ? "+" : "";

  popup = document.createElement("div");
  popup.id = "star-popup";
  popup.className = "star-popup";
  popup.innerHTML = `
    <button class="close" aria-label="${t("close")}" onclick="document.getElementById('star-popup').remove()">×</button>
    <h3>${esc(stockName(h))} <span style="font-size:14px;color:var(--muted)">${esc(h.code)}</span></h3>
    <div class="detail">
      ${t("costPrice")}${formatMoney(h.cost_price, currency)}<br/>
      ${t("currentPrice")}${formatMoney(h.price, currency)}<br/>
      ${t("sharesLabel")}${formatNumber(h.shares)}${t("sharesSuffix")}<br/>
      ${t("pnl")}<span class="${pnlClass}">${pnlSign}${formatNumber(pnl)}%</span><br/>
      ${t("weight")}${formatNumber(h.weight)}%
    </div>
    ${h.market_open === false ? `<div style="margin-top:12px;font-size:12px;color:var(--muted)">${t("marketClosed")}</div>` : ""}`;
  document.body.appendChild(popup);
}

function closeStarPopup() {
  const p = document.getElementById("star-popup");
  if (p) p.remove();
}

function renderHistory() {
  const panel = document.getElementById("history-panel");
  if (panel.classList.contains("open")) {
    panel.classList.remove("open");
    return;
  }
  const dates = ["2026-06-17", "2026-06-16", "2026-06-15", "2026-06-14", "2026-06-13"];
  let html = `<p class="history-note">${t("historyDemo")}</p><table class="history-table">`;
  html += `<thead><tr><th>${t("date")}</th><th>${t("marketValue")}</th><th>${t("dailyPnl")}</th><th>${t("totalPnl")}</th></tr></thead><tbody>`;
  let cumulative = 0;
  const dailyPnl = [156, -89, 234, -45, 112];
  for (let i = 0; i < dates.length; i++) {
    cumulative += dailyPnl[i];
    const sign = cumulative >= 0 ? "+" : "";
    const cls = cumulative >= 0 ? "up" : "down";
    html += `<tr>
      <td>${formatDate(dates[i])}</td>
      <td>${formatMoney(125000 + cumulative)}</td>
      <td>${formatMoney(dailyPnl[i])}</td>
      <td class="${cls}">${sign}${formatMoney(cumulative)}</td>
    </tr>`;
  }
  html += "</tbody></table>";
  panel.innerHTML = html;
  panel.classList.add("open");
}

/* === Adventures === */
function renderAdventures() {
  if (isLoggedIn()) {
    renderGames();
  } else {
    main.innerHTML = `
      <div class="adventure-gate">
        <div class="game-preview">
          ${t("gameCollection")}<br/>
          ${t("gameList")}
        </div>
        <div class="blur-overlay">
          <div class="blocked-text">${t("accessGate")}<button class="btn-outline gate-login" onclick="showLoginModal()">${t("login")}</button></div>
        </div>
      </div>`;
  }
}

function renderGames() {
  const games = ["gameTicTacToe", "gameSudoku", "gameSnake", "gameMinesweeper", "gameRitual"];
  main.innerHTML = `
    <h1 class="section-title page-title">${t("adventures")}</h1>
    <div class="games-grid">
      ${games.map(key => `<div class="game-card"><h3>${t(key)}</h3><p>${t("comingSoon")}</p></div>`).join("")}
    </div>`;
}

/* === Contact === */
function renderContact() {
  const contacts = [
    { label: "GitHub", value: "CavemaninIceAge", url: "https://github.com/CavemaninIceAge" },
    { label: t("zhihu"), value: "@SkywalkerFish", url: "https://www.zhihu.com/people/SkywalkerFish" },
    { label: t("email"), value: "txyu25@stu.pku.edu.cn", url: "mailto:txyu25@stu.pku.edu.cn" },
    { label: t("phone"), value: "15045089401" },
    { label: "QQ", value: "2813243845" },
    { label: "HuggingFace", value: "@SkywalkerFish", url: "https://huggingface.co/SkywalkerFish" },
    { label: "Quora", value: "@SkywalkerFish", url: "https://www.quora.com/profile/SkywalkerFish" },
  ];

  let html = `<div class="section-title" style="margin-top:0">${t("contact")}</div>`;
  html += '<div class="contact-grid">';

  for (const c of contacts) {
    const link = c.url
      ? '<a class="contact-link" href="' + c.url + '" target="_blank" rel="noopener">' + c.label + t('colon') + c.value + '</a>'
      : '<span class="contact-item">' + c.label + t('colon') + c.value + '</span>';
    html += '<div class="contact-cell">' + link + '</div>';
  }

  html += '</div>';
  html += `<p class="contact-note">${t("moreSoon")}</p>`;
  main.innerHTML = html;
}

/* === Signup === */
function renderSignup() {
  main.innerHTML = `
    <div class="signup-page">
      <div class="section-title" style="margin-top:0">${t("applyAccess")}</div>

      <div class="know-toggle">
        <button class="circle-select" id="circle-know" role="checkbox" aria-checked="false" aria-labelledby="know-question" onclick="toggleKnow()"></button>
        <span class="column-title" id="know-question">${t("knowQuestion")}</span>
      </div>

      <div id="sig-know-yes" class="signup-conditional hidden">
        <div class="form-group">
          <label class="form-label" for="sig-name">${t("yourName")}</label>
          <input class="form-input" id="sig-name" placeholder="${t("realNamePlaceholder")}" maxlength="60" />
        </div>
        <div class="form-group">
          <label class="form-label" for="sig-experience">${t("experienceLabel")}</label>
          <span class="form-hint">${t("experienceHint")}</span>
          <textarea class="form-textarea" id="sig-experience" rows="3" placeholder="${t("experiencePlaceholder")}"></textarea>
        </div>
      </div>

      <div id="sig-know-no" class="signup-conditional">
        <div class="form-group">
          <label class="form-label" for="sig-howfound">${t("howFoundLabel")}</label>
          <input class="form-input" id="sig-howfound" placeholder="${t("howFoundPlaceholder")}" maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label" for="sig-who">${t("whoLabel")}</label>
          <textarea class="form-textarea" id="sig-who" rows="3" placeholder="${t("whoPlaceholder")}"></textarea>
        </div>
      </div>

      <div class="signup-section">
        <div class="form-row">
          <label class="form-label" for="sig-nickname">${t("nicknameLabel")}</label>
          <input class="form-input" id="sig-nickname" placeholder="${t("nicknameHint")}" maxlength="30" />
        </div>
        <div class="form-row">
          <label class="form-label" for="sig-password">${t("passwordLabel")}</label>
          <input class="form-input" id="sig-password" type="password" autocomplete="new-password" placeholder="${t("passwordHint")}" />
        </div>
        <button class="submit-btn" id="btn-submit" onclick="submitApplication()">${t("submitApplication")}</button>
      </div>
    </div>`;

  const submitButton = document.getElementById("btn-submit");
  submitButton.disabled = applicationSubmitting;
  submitButton.textContent = t(applicationSubmitting ? "submitting" : "submitApplication");
  document.querySelectorAll(".form-textarea").forEach(function (ta) {
    ta.addEventListener("input", autoResize);
    autoResize.call(ta);
  });
}

function autoResize() {
  this.style.height = "auto";
  this.style.height = Math.max(72, this.scrollHeight) + "px";
}

function toggleKnow() {
  var circle = document.getElementById("circle-know");
  circle.classList.toggle("selected");
  circle.setAttribute("aria-checked", String(circle.classList.contains("selected")));
  var yesDiv = document.getElementById("sig-know-yes");
  var noDiv = document.getElementById("sig-know-no");
  if (circle.classList.contains("selected")) {
    yesDiv.classList.remove("hidden");
    noDiv.classList.add("hidden");
  } else {
    yesDiv.classList.add("hidden");
    noDiv.classList.remove("hidden");
  }
}

async function submitApplication() {
  if (applicationSubmitting) return;
  var knowSelected = document.getElementById("circle-know").classList.contains("selected");
  var nickname = document.getElementById("sig-nickname").value.trim();
  var password = document.getElementById("sig-password").value;

  if (!nickname) { alert(t("enterNickname")); return; }
  if (!password || password.length < 4) { alert(t("shortPassword")); return; }

  var body = { nickname: nickname, know_skywalker: knowSelected };

  if (knowSelected) {
    var name = document.getElementById("sig-name").value.trim();
    var exp = document.getElementById("sig-experience").value.trim();
    if (!name) { alert(t("enterName")); return; }
    if (!exp) { alert(t("enterExperience")); return; }
    body.who_are_you = "";
    body.name = name;
    body.shared_experience = exp;
    body.how_found = "";
  } else {
    var who = document.getElementById("sig-who").value.trim();
    var hf = document.getElementById("sig-howfound").value.trim();
    if (!who) { alert(t("enterWho")); return; }
    if (!hf) { alert(t("enterHowFound")); return; }
    body.who_are_you = who;
    body.name = "";
    body.shared_experience = "";
    body.how_found = hf;
  }

  applicationSubmitting = true;
  var btn = document.getElementById("btn-submit");
  btn.disabled = true;
  btn.textContent = t("submitting");

  try {
    var hash = await sha256(password);
    body.password_hash = hash;
    var res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      showSuccessModal();
    } else {
      const err = await res.text();
      alert(applicationError(err, res.status));
      btn.disabled = false;
      btn.textContent = t("submitApplication");
    }
  } catch (e) {
    alert(t("networkError"));
    btn.disabled = false;
    btn.textContent = t("submitApplication");
  } finally {
    applicationSubmitting = false;
    const currentButton = document.getElementById("btn-submit");
    if (currentButton) { currentButton.disabled = false; currentButton.textContent = t("submitApplication"); }
  }
}

function showSuccessModal() {
  const existing = document.getElementById("success-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.id = "success-overlay";
  overlay.innerHTML = `
    <div class="success-box" role="status">
      <div class="success-circle">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polyline points="7,14 12,19 21,9" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="success-text">${t("applicationSuccess")}</div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.onclick = function (e) {
    if (e.target === overlay) {
      overlay.remove();
      location.hash = "#/";
    }
  };

}

/* === Login Modal === */
function showLoginModal() {
  if (isLoggedIn()) return;
  loginRequestVersion++;

  const existing = document.getElementById("login-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "login-overlay";
  overlay.id = "login-overlay";
  overlay.innerHTML = `
    <div class="login-box" role="dialog" aria-modal="true" aria-labelledby="login-title" style="position:relative">
      <button class="close-btn" aria-label="${t("close")}" onclick="closeLoginModal()">&times;</button>
      <h2 id="login-title">${t("login")}</h2>
      <div class="form-group">
        <label class="form-label" for="login-nickname">${t("nickname")}</label>
        <input class="form-input" id="login-nickname" autocomplete="username" placeholder="${t("loginNicknamePlaceholder")}" maxlength="30" />
      </div>
      <div class="form-group">
        <label class="form-label" for="login-password">${t("password")}</label>
        <input class="form-input" id="login-password" type="password" autocomplete="current-password" placeholder="${t("loginPasswordPlaceholder")}" />
      </div>
      <div id="login-error" class="login-error" role="alert"></div>
      <div class="login-actions">
        <button class="btn-text" onclick="closeLoginModal()">${t("cancel")}</button>
        <button class="btn-outline" id="btn-do-login" style="border-radius:20px;padding:8px 28px;font-size:14px">${t("login")}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById("login-nickname").focus();
  document.getElementById("btn-do-login").onclick = doLogin;
  document.getElementById("login-password").onkeydown = (e) => { if (e.key === "Enter") doLogin(); };
  overlay.onclick = function (e) {
    if (e.target === overlay) closeLoginModal();
  };
}

function closeLoginModal() {
  loginRequestVersion++;
  document.getElementById("login-overlay")?.remove();
}

async function doLogin() {
  if (document.getElementById("btn-do-login").disabled) return;
  const requestVersion = ++loginRequestVersion;
  const nickname = document.getElementById("login-nickname").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  if (!nickname) { errorEl.textContent = t("enterNickname"); return; }
  if (!password) { errorEl.textContent = t("enterPassword"); return; }

  const btn = document.getElementById("btn-do-login");
  btn.disabled = true;
  btn.textContent = t("loggingIn");

  try {
    const hash = await sha256(password);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nickname, password_hash: hash }),
    });
    if (requestVersion !== loginRequestVersion) return;
    if (res.ok) {
      const data = await res.json();
      if (requestVersion !== loginRequestVersion) return;
      sessionStorage.setItem("skywalker-login", "1");
      sessionStorage.setItem("skywalker-nickname", data.nickname);
      sessionStorage.setItem("skywalker-name", data.name || "");
      sessionStorage.setItem("skywalker-know", data.know_skywalker ? "1" : "0");
      document.getElementById("login-overlay")?.remove();
      updateNavState();
      route();
    } else {
      errorEl.textContent = t("loginError");
      btn.disabled = false;
      btn.textContent = t("login");
    }
  } catch (e) {
    if (requestVersion !== loginRequestVersion) return;
    errorEl.textContent = t("networkError");
    btn.disabled = false;
    btn.textContent = t("login");
  }
}

/* === Admin === */
function renderAdmin() {
  const adminKey = sessionStorage.getItem("skywalker-admin-key");
  if (!adminKey) {
    renderAdminAuth();
    return;
  }
  loadApplications();
}

function renderAdminAuth(errorMsg) {
  main.innerHTML = `
    <div class="admin-auth">
      <h2>${t("adminAccess")}</h2>
      <input class="form-input" id="admin-key-input" type="password" aria-label="${t("adminKeyPlaceholder")}" placeholder="${t("adminKeyPlaceholder")}" />
      <div class="admin-error" id="admin-error">${errorMsg ? esc(errorMsg) : ""}</div>
      <button class="submit-btn" id="btn-admin-auth">${t("enter")}</button>
    </div>`;

  document.getElementById("btn-admin-auth").onclick = adminAuth;
  document.getElementById("admin-key-input").onkeydown = (e) => {
    if (e.key === "Enter") adminAuth();
  };
}

async function adminAuth() {
  const key = document.getElementById("admin-key-input").value;
  if (!key) {
    document.getElementById("admin-error").textContent = t("enterAdminKey");
    return;
  }
  sessionStorage.setItem("skywalker-admin-key", key);
  await loadApplications();
}

async function loadApplications() {
  const generation = viewGeneration;
  const adminKey = sessionStorage.getItem("skywalker-admin-key");
  main.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted)">${t("loading")}</div>`;

  try {
    const res = await fetch("/api/admin", {
      headers: { "X-Admin-Key": adminKey },
    });
    if (generation !== viewGeneration) return;
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem("skywalker-admin-key");
      renderAdminAuth(t("invalidAdminKey"));
      return;
    }
    if (!res.ok) {
      main.innerHTML = `<div class="admin-empty">${t("loadError")}</div>`;
      return;
    }
    const apps = await res.json();
    if (generation === viewGeneration) renderApplicationList(apps);
  } catch (e) {
    if (generation !== viewGeneration) return;
    main.innerHTML = `<div class="admin-empty">${t("loadError")}</div>`;
  }
}

function renderApplicationList(apps) {
  const statusLabels = { pending: t("pending"), approved: t("approved"), rejected: t("rejected") };

  let html = `<div class="admin-page">
    <h2>${t("applications")}</h2>
    <div class="admin-subtitle">${apps.length === 1 ? t("applicationCountOne") : t("applicationCount", { count: formatNumber(apps.length) })}</div>`;

  if (apps.length === 0) {
    html += `<div class="admin-empty">${t("noApplications")}</div>`;
  }

  for (const a of apps) {
    var knowFields = a.know_skywalker
      ? `<div class="app-field"><div class="app-field-label">${t("fullName")}</div><div class="app-field-value">${esc(a.name)}</div></div>
         <div class="app-field"><div class="app-field-label">${t("sharedExperience")}</div><div class="app-field-value">${esc(a.shared_experience)}</div></div>`
      : `<div class="app-field"><div class="app-field-label">${t("howFound")}</div><div class="app-field-value">${esc(a.how_found || t("notProvided"))}</div></div>`;

    html += `
      <div class="app-card" id="app-${a.id}">
        <div class="app-card-header">
          <span class="app-name">${esc(a.nickname)}</span>
          <span class="status-badge ${a.status}">${statusLabels[a.status] || a.status}</span>
        </div>
        <div class="app-date">${esc(formatDate(a.created_at || ""))}</div>
        <div class="app-field">
          <div class="app-field-label">${t("knowsTianxing")}</div>
          <div class="app-field-value">${a.know_skywalker ? t("yes") : t("no")}</div>
        </div>
        ${knowFields}
        <div class="app-field">
          <div class="app-field-label">${t("introduction")}</div>
          <div class="app-field-value">${esc(a.who_are_you || "")}</div>
        </div>
        <div class="app-field">
          <div class="app-field-label">${t("nickname")}</div>
          <div class="app-field-value">${esc(a.nickname)}</div>
        </div>
        ${a.status === "pending" ? `
        <div class="app-card-actions">
          <button class="btn-approve" onclick="approveApp(${a.id})">${t("approve")}</button>
          <button class="btn-reject" onclick="rejectApp(${a.id})">${t("reject")}</button>
        </div>` : ""}
      </div>`;
  }
  html += `<a class="admin-logout" href="javascript:void(0)" onclick="adminLogout()">${t("adminLogout")}</a></div>`;
  main.innerHTML = html;
}

async function approveApp(id) {
  const generation = viewGeneration;
  const adminKey = sessionStorage.getItem("skywalker-admin-key");
  const card = document.getElementById("app-" + id);
  if (card) card.style.opacity = "0.5";

  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
      body: JSON.stringify({ action: "approve", id: id }),
    });
    if (res.ok) {
      if (generation === viewGeneration) await loadApplications();
    } else {
      if (card) card.style.opacity = "1";
      alert(t("actionError"));
    }
  } catch (e) {
    if (card) card.style.opacity = "1";
    alert(t("networkError"));
  }
}

async function rejectApp(id) {
  const generation = viewGeneration;
  const adminKey = sessionStorage.getItem("skywalker-admin-key");
  const card = document.getElementById("app-" + id);
  if (card) card.style.opacity = "0.5";

  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
      body: JSON.stringify({ action: "reject", id: id }),
    });
    if (res.ok) {
      if (generation === viewGeneration) await loadApplications();
    } else {
      if (card) card.style.opacity = "1";
      alert(t("actionError"));
    }
  } catch (e) {
    if (card) card.style.opacity = "1";
    alert(t("networkError"));
  }
}

function adminLogout() {
  sessionStorage.removeItem("skywalker-admin-key");
  location.hash = "#/";
}
