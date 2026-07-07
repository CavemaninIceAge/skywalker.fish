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

/* === Router === */
const main = document.getElementById("main");

function route() {
  const hash = location.hash || "#/";
  main.innerHTML = "";
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

window.onhashchange = route;
window.onload = () => { route(); setupNav(); };

/* === Nav === */
function setupNav() {
  document.getElementById("btn-login").onclick = showLoginModal;
  document.getElementById("btn-signup").onclick = () => { location.hash = "#/signup"; };
  updateNavState();
}

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
    document.getElementById("nav-realname").textContent = knowSkywalker ? realName : "邀请访客";
  } else {
    btnLogin.style.display = "";
    btnLogin.textContent = "Log in";
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
  location.hash = "#/";
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
  box.innerHTML = `
    <div class="pdf-modal-title">未选择的路</div>
    <div class="pdf-modal-size">PDF · The Road Not Taken</div>
    <a class="pdf-download-btn" href="files/未选择的路.pdf" download>下载</a>`;
  overlay.classList.remove("hidden");
}

/* === Profile === */
function renderProfile() {
  main.innerHTML = `
    <div class="profile-header">
      <div>
        <div class="name">于 天行 <a class="more-link" href="javascript:void(0)" onclick="showPdfModal()">More about me?</a></div>
        <div class="subtitle">北京大学 2025 级本科在读</div>
        <div class="subtitle">开发者、金融研究员、爱好社会评论、汉族男性</div>
      </div>
      <img class="avatar" src="images/avatar.png" alt="avatar" />
    </div>
    <div class="section-title">Description</div>
    <div class="section-body">我出生在哈尔滨，现在在北京读书。课余时间写代码、看市场、写点东西。相信系统可以被理解、改进，也相信写作是自我诚实的最低成本方式。我有一只很好的猫咪叫喵喵。</div>
    <div class="section-title">Education</div>
    <div class="edu-row">
      <img src="images/pku-clean.jpeg" alt="北大" />
      <div>
        <div class="school">北京大学</div>
      </div>
    </div>
    <div class="edu-row">
      <img src="images/h3z.png" alt="哈三中" />
      <div>
        <div class="school">哈尔滨市第三中学校</div>
      </div>
    </div>
    <div class="edu-row">
      <img src="images/gdfz.png" alt="工大附中" />
      <div>
        <div class="school">哈尔滨市工业大学附属中学校</div>
      </div>
    </div>
    <div class="section-title">Future Vision</div>
    <div class="section-body"></div>
  `;
}

/* === Essays === */
const essays = [
    { date: "2026-06-26", slug: "freshman-spring-end", title: "大一下终" },
    { date: "2026-05-29", slug: "beijing-station", title: "永远的北京" },
    { date: "2026-05-11", slug: "chasing-lightning", title: "追逐下一道闪电（机考前的一个深夜）" },
    { date: "2026-05-10", slug: "ideal-middle-class", title: "An Ideal Type of Middle-Class Family" },
    { date: "2026-05-14", slug: "transfer-summer-eve", title: "转专业夏前夜" },
    { date: "2024-12-20", slug: "69-days", title: "距高考169天特别增载" },
    { date: "2024-12-20", slug: "letter-to-grandma", title: "距离高考169天-写给我姥姥" },
    { date: "2024-08-24", slug: "behind-goebbels", title: "在戈培尔的身后" },
    { date: "2026-01-30", slug: "yulinzhou-sunset", title: "在鱼鳞洲的日落" },
    { date: "2026-06-02", slug: "wind-in-cracks", title: "缝里的风" },
    { date: "2026-06-02", slug: "it-died-before-me", title: "它比我先死了" },
    { date: "2026-06-02", slug: "dancing-on-ruins", title: "在废墟上跳舞" },
    { date: "2026-06-02", slug: "she-was-never-that-strong", title: "她从来没有那么强大" },
    { date: "2024-09-01", slug: "morning-in-the-fields", title: "清晨在田野上？" },
    { date: "2024-09-01", slug: "nineteen-gone", title: "19岁完辽" },
    { date: "2024-10-02", slug: "return-train", title: "回程的车" },
    { date: "2024-09-15", slug: "ambition", title: "野心家" },
    { date: "2024-09-11", slug: "diary-20240911", title: "日记" },
    { date: "2024-09-10", slug: "rereading-a-poem", title: "重读一首诗" },
    { date: "2024-09-08", slug: "three-years-rental", title: "出租屋三年" },
    { date: "2024-09-10", slug: "paddy-field", title: "水田" },
    { date: "2024-07-01", slug: "diary-20240701", title: "日记" },
    { date: "2024-07-02", slug: "in-siping", title: "在四平" },
    { date: "2024-07-03", slug: "in-kaiyuan", title: "在开原" },
    { date: "2024-07-06", slug: "diary-20240706", title: "日记" },
    { date: "2024-07-09", slug: "in-tianjin", title: "在天津" },
    { date: "2024-07-10", slug: "arrived-beijing", title: "抵达北京！" },
    { date: "2024-07-18", slug: "diary-20240718", title: "日记" },
    { date: "2024-08-04", slug: "how-to-remember-highschool", title: "我用什么回忆高中生活？" },
    { date: "2024-08-16", slug: "resolve-to-write", title: "日记-决心写《未选择的路》" },
    { date: "2024-08-16", slug: "korla-pear", title: "库尔勒大香梨" },
    { date: "2024-08-12", slug: "envious-young-love", title: "羡慕你们中学时代的恋爱" },
    { date: "2024-08-11", slug: "invisible-guardian", title: "隐形守护者" },
    { date: "2024-07-18", slug: "diary-20240718b", title: "日记" },
    { date: "2024-08-28", slug: "obstruction-and-decision", title: "阻挠与决定" },
    { date: "2024-07-17", slug: "not-crushed-by-ruins", title: "我的父亲于洋鹏" },
    { date: "2024-09-03", slug: "beida-lake", title: "没在塘沽看到海，却在北大看见湖" },
    { date: "2025-07-11", slug: "diary-20250711", title: "日记-想起千六的一篇文章" },
    { date: "2025-07-03", slug: "diary-20250703", title: "日记" },
    { date: "2025-07-01", slug: "diary-20250701", title: "日记-Resolution to Change Major" },
    { date: "2025-06-29", slug: "diary-20250629", title: "日记" },
    { date: "2025-06-27", slug: "diary-20250627", title: "日记" },
    { date: "2025-06-24", slug: "diary-20250624", title: "日记" },
    { date: "2025-06-21", slug: "diary-20250621", title: "日记" },
    { date: "2025-06-20", slug: "diary-20250620", title: "日记" },
    { date: "2025-06-19", slug: "diary-20250619", title: "日记" },
    { date: "2025-06-14", slug: "diary-20250614", title: "日记" },
    { date: "2025-06-13", slug: "diary-20250613", title: "日记" },
    { date: "2025-06-12", slug: "diary-20250612", title: "日记" },
    { date: "2025-06-10", slug: "after-gaokao-day1", title: "高考后第一天！" },
    { date: "2025-10-01", slug: "birthday-self", title: "生日自贺" },
    { date: "2025-06-01", slug: "crescent-at-dawn", title: "当我再度拉帘醒来，天边新月如钩" },
    { date: "2025-05-23", slug: "15-days-to-gaokao", title: "距离高考15天" },
    { date: "2025-02-16", slug: "stomachache-111-days", title: "距离高考111天-犯胃病" },
  ];

function renderEssays() {
  if (!isLoggedIn()) {
    main.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div class="section-title" style="margin:0">Essays</div>
        <button class="btn-outline" onclick="location.hash='#/albums'" style="padding:5px 18px;font-size:14px">ALBUM</button>
      </div>
      <div class="adventure-gate">
        <div class="game-preview">
          随笔与思考
        </div>
        <div class="blur-overlay">
          <div class="blocked-text">You are blocked currently.<br/>Log in Please.</div>
        </div>
      </div>`;
    return;
  }

  essays.sort((a, b) => b.date.localeCompare(a.date));
  let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div class="section-title" style="margin:0">Essays</div><button class="btn-outline" onclick="location.hash=\'#/albums\'" style="padding:5px 18px;font-size:14px">ALBUM</button></div>';
  for (const e of essays) {
    html += `
      <div class="essay-row">
        <span class="date">${e.date}</span>
        <a class="essay-link" href="#/essays/${e.slug}">${e.title}</a>
      </div>`;
  }
  if (essays.length === 0) html += '<p style="color:var(--muted)">暂无文章</p>';
  main.innerHTML = html;
}

function renderEssayArticle(slug) {
  if (!isLoggedIn()) { location.hash = "#/essays"; return; }

  const meta = essays.find(e => e.slug === slug);
  const title = meta ? meta.title : slug;
  const date = meta ? meta.date : "";

  main.innerHTML = `
    <a class="back-link" href="#/essays">← 返回 Essays</a>
    <div class="essay-article">
      <h1>${title}</h1>
      <div class="date-big">${date}</div>
      <div style="text-align:center;padding:60px 0;color:var(--muted)">加载中...</div>
    </div>
  `;

  fetch(`essays/${slug}.html`)
    .then(res => {
      if (!res.ok) throw new Error("Not found");
      return res.text();
    })
    .then(text => {
      const m = text.match(/<div class="essay-body">([\s\S]*)<\/div>/);
      const bodyHtml = m ? m[1].trim() : "";
      main.innerHTML = `
        <a class="back-link" href="#/essays">← 返回 Essays</a>
        <div class="essay-article">
          <h1>${title}</h1>
          <div class="date-big">${date}</div>
          ${bodyHtml}
        </div>
      `;
    })
    .catch(() => {
      main.innerHTML = `
        <a class="back-link" href="#/essays">← 返回 Essays</a>
        <div class="essay-article">
          <h1>${title}</h1>
          <div class="date-big">${date}</div>
          <p style="color:var(--muted);text-align:center;padding:60px 0">暂无内容</p>
        </div>
      `;
    });
}

/* === Album === */
function renderAlbums() {
  const albums = [
    { name: "北京大学", cover: "images/pku-clean.jpeg" },
  ];

  let html = '<div class="section-title" style="margin-top:0">ALBUM</div>';
  html += '<div class="album-grid">';
  for (const a of albums) {
    const slug = encodeURIComponent(a.name);
    html += `
      <div class="album-card" onclick="location.hash='#/albums/${slug}'">
        <img src="${a.cover}" alt="${a.name}" />
        <div class="album-name">${a.name}</div>
      </div>`;
  }
  html += '</div>';
  main.innerHTML = html;
}

function renderAlbumView(name) {
  const albumName = decodeURIComponent(name);

  const albums = {
    "北京大学": [],
  };

  const photos = albums[albumName] || [];

  let html = '<div class="album-view">';
  html += `<button class="album-back" onclick="location.hash='#/albums'">← 返回</button>`;
  html += `<div class="album-title">${albumName}</div>`;

  if (photos.length === 0) {
    html += '<p style="color:var(--muted);text-align:center;padding:60px 0">暂无照片</p>';
  } else {
    html += '<div class="album-photos">';
    for (const p of photos) {
      html += `<img src="${p}" alt="" />`;
    }
    html += '</div>';
  }

  html += '</div>';
  main.innerHTML = html;
}

/* === Projects === */
function renderProjects() {
  const projects = [
    { name: "模拟政协——关于推动非本地高中生心理健康发展与生活状况改善的提案", desc: "模拟政协活动提案，关注非本地高中生的心理健康与生活状况。", url: "", download: "files/模拟政协-提案.docx" },
    { name: "哈三中校友会采访", desc: "校友会采访记录。", url: "", download: "files/哈三中校友会采访.pdf" },
    { name: "skywalker.fish", desc: "This website.", url: "https://github.com/CavemaninIceAge/skywalker.fish", download: "" },
    { name: "Mahjong", desc: "An automatic method to solve Sichuan Mahjong (Cooperated with XXY & ZRZ)", url: "https://github.com/Yizhilaomuji/Mahjong", download: "" },
    { name: "MomentumStrategy", desc: "Chase high and buy the low. However the result is doubtful and minimal. (Note that I have profitable strategy and I don't want it to be open-sourced.)", url: "https://github.com/CavemaninIceAge/MomentumStrategy", download: "" },
    { name: "Amazon_Chess_AI", desc: "别样的亚马逊棋大战", url: "https://github.com/CavemaninIceAge/Amazon_Chess_AI", download: "" },
    { name: "US-Leading Attempt", desc: "It should be workable.", url: "https://github.com/CavemaninIceAge/US-Leading-Attempt", download: "" },
  ];
  main.innerHTML = '<div class="section-title" style="margin-top:0">Projects</div>';
  for (const p of projects) {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="proj-name">${p.name}</div>
      <div class="proj-desc">${p.desc}</div>
    `;
    card.style.cursor = "pointer";
    card.onclick = () => showProjectPopup(p);
    main.appendChild(card);
  }
  if (projects.length === 0) {
    main.innerHTML += '<p style="color:var(--muted)">暂无项目</p>';
  }
}

function showProjectPopup(project) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  const box = document.createElement("div");
  box.className = "modal-box";
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
        a.textContent = "Website";
        a.href = project.url;
        a.target = "_blank";
        a.style.textDecoration = "none";
        return a;
      })()
    : null;

  const btnDL = document.createElement("button");
  btnDL.className = "proj-card-btn";
  btnDL.textContent = project.download ? "Download" : "Download (暂无)";
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
}

/* === Portfolio === */
function renderPortfolio() {
  const container = document.createElement("div");
  container.className = "portfolio-container";

  // Loading state
  container.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--muted)">加载持仓数据...</div>';
  main.appendChild(container);

  fetch("/api/portfolio")
    .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch"))
    .then(data => {
      if (!data.holdings || data.holdings.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--muted)">暂无持仓数据</div>';
        return;
      }
      renderPortfolioChart(container, data.holdings);
      renderPortfolioFooter(container);
    })
    .catch(() => {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 0">
          <div style="color:var(--muted);margin-bottom:12px">持仓数据加载失败</div>
          <button class="btn-outline" onclick="renderPortfolio()" style="font-family:inherit">重试</button>
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
    star.title = h.name;
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
    <span class="label" id="history-link">历史上的持仓</span><br/>
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

  const pnl = h.pnl || 0;
  const pnlClass = pnl >= 0 ? "up" : "down";
  const pnlSign = pnl >= 0 ? "+" : "";

  popup = document.createElement("div");
  popup.id = "star-popup";
  popup.className = "star-popup";
  popup.innerHTML = `
    <button class="close" onclick="document.getElementById('star-popup').remove()">×</button>
    <h3>${h.name} <span style="font-size:14px;color:var(--muted)">${h.code}</span></h3>
    <div class="detail">
      成本价：¥${h.cost_price}<br/>
      现价：¥${h.price}<br/>
      持仓：${h.shares} 股<br/>
      盈亏：<span class="${pnlClass}">${pnlSign}${pnl}%</span><br/>
      仓位占比：${h.weight}%
    </div>
    ${h.market_open === false ? '<div style="margin-top:12px;font-size:12px;color:var(--muted)">非交易时段，价格为最近收盘价</div>' : ""}`;
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
  let html = '<table class="history-table">';
  html += "<thead><tr><th>日期</th><th>总市值</th><th>当日盈亏</th><th>累计盈亏</th></tr></thead><tbody>";
  let cumulative = 0;
  const dailyPnl = [156, -89, 234, -45, 112];
  for (let i = 0; i < dates.length; i++) {
    cumulative += dailyPnl[i];
    const sign = cumulative >= 0 ? "+" : "";
    const cls = cumulative >= 0 ? "up" : "down";
    html += `<tr>
      <td>${dates[i]}</td>
      <td>¥${(125000 + cumulative).toLocaleString()}</td>
      <td>¥${dailyPnl[i]}</td>
      <td class="${cls}">${sign}¥${cumulative}</td>
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
          创意小游戏合集<br/>
          井字棋 · 数独 · 贪吃蛇 · 扫雷 · 灵堂上上香
        </div>
        <div class="blur-overlay">
          <div class="blocked-text">You are blocked currently.<br/>Log in Please.</div>
        </div>
      </div>`;
  }
}

function renderGames() {
  main.innerHTML = `
    <div class="section-title" style="margin-top:0">Adventures</div>
    <div class="games-grid">
      <div class="game-card" onclick="alert('Coming soon')">
        <h3>井字棋</h3><p>Tic-Tac-Toe</p>
      </div>
      <div class="game-card" onclick="alert('Coming soon')">
        <h3>数独</h3><p>Sudoku</p>
      </div>
      <div class="game-card" onclick="alert('Coming soon')">
        <h3>贪吃蛇</h3><p>Snake</p>
      </div>
      <div class="game-card" onclick="alert('Coming soon')">
        <h3>扫雷</h3><p>Minesweeper</p>
      </div>
      <div class="game-card" onclick="alert('Coming soon')">
        <h3>灵堂上上香</h3><p>Ritual Rave at the Mortuary</p>
      </div>
    </div>`;
}

/* === Contact === */
function renderContact() {
  const contacts = [
    { label: "GitHub", value: "CavemaninIceAge", url: "https://github.com/CavemaninIceAge" },
    { label: "知乎", value: "@SkywalkerFish", url: "https://www.zhihu.com/people/SkywalkerFish" },
    { label: "邮箱", value: "txyu25@stu.pku.edu.cn", url: "mailto:txyu25@stu.pku.edu.cn" },
    { label: "电话", value: "15045089401" },
    { label: "QQ", value: "2813243845" },
    { label: "HuggingFace", value: "@SkywalkerFish", url: "https://huggingface.co/SkywalkerFish" },
    { label: "Quora", value: "@SkywalkerFish", url: "https://www.quora.com/profile/SkywalkerFish" },
  ];

  let html = '<div class="section-title" style="margin-top:0">Contact</div>';
  html += '<div class="contact-grid">';

  for (const c of contacts) {
    const link = c.url
      ? '<a class="contact-link" href="' + c.url + '" target="_blank" rel="noopener">' + c.label + '：' + c.value + '</a>'
      : '<span class="contact-item">' + c.label + '：' + c.value + '</span>';
    html += '<div class="contact-cell">' + link + '</div>';
  }

  html += '</div>';
  html += '<p class="contact-note">未完待续</p>';
  main.innerHTML = html;
}

/* === Signup === */
function renderSignup() {
  main.innerHTML = `
    <div class="signup-page">
      <div class="section-title" style="margin-top:0">Apply for Access</div>

      <div class="know-toggle">
        <button class="circle-select" id="circle-know" onclick="toggleKnow()"></button>
        <span class="column-title">于天行认识你吗？</span>
      </div>

      <div id="sig-know-yes" class="signup-conditional hidden">
        <div class="form-group">
          <label class="form-label">你的名字是？</label>
          <input class="form-input" id="sig-name" placeholder="你的真实姓名" maxlength="60" />
        </div>
        <div class="form-group">
          <label class="form-label">说出你与于天行共同经历的一件事</label>
          <span class="form-hint">越不为人知越好</span>
          <textarea class="form-textarea" id="sig-experience" rows="3" placeholder="写下只有你我知道的事..."></textarea>
        </div>
      </div>

      <div id="sig-know-no" class="signup-conditional">
        <div class="form-group">
          <label class="form-label">你从哪里听说于天行？</label>
          <input class="form-input" id="sig-howfound" placeholder="比如：朋友介绍、GitHub、社交媒体..." maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label">你是谁？</label>
          <textarea class="form-textarea" id="sig-who" rows="3" placeholder="介绍一下你自己..."></textarea>
        </div>
      </div>

      <div class="signup-section">
        <div class="form-row">
          <label class="form-label" for="sig-nickname">你的昵称？</label>
          <input class="form-input" id="sig-nickname" placeholder="用于登录" maxlength="30" />
        </div>
        <div class="form-row">
          <label class="form-label" for="sig-password">你的密码？</label>
          <input class="form-input" id="sig-password" type="password" placeholder="设置登录密码（至少 4 位）" />
        </div>
        <button class="submit-btn" id="btn-submit" onclick="submitApplication()">提交申请</button>
      </div>
    </div>`;

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
  var knowSelected = document.getElementById("circle-know").classList.contains("selected");
  var nickname = document.getElementById("sig-nickname").value.trim();
  var password = document.getElementById("sig-password").value;

  if (!nickname) { alert("请设置昵称"); return; }
  if (!password || password.length < 4) { alert("密码至少 4 位"); return; }

  var body = { nickname: nickname, know_skywalker: knowSelected };

  if (knowSelected) {
    var name = document.getElementById("sig-name").value.trim();
    var exp = document.getElementById("sig-experience").value.trim();
    if (!name) { alert("请填写你的名字"); return; }
    if (!exp) { alert("请填写共同经历"); return; }
    body.who_are_you = "";
    body.name = name;
    body.shared_experience = exp;
    body.how_found = "";
  } else {
    var who = document.getElementById("sig-who").value.trim();
    var hf = document.getElementById("sig-howfound").value.trim();
    if (!who) { alert("请填写你是谁"); return; }
    if (!hf) { alert("请填写你从哪里听说于天行"); return; }
    body.who_are_you = who;
    body.name = "";
    body.shared_experience = "";
    body.how_found = hf;
  }

  var btn = document.getElementById("btn-submit");
  btn.disabled = true;
  btn.textContent = "提交中...";

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
      alert("提交失败：" + (err || "未知错误"));
      btn.disabled = false;
      btn.textContent = "提交申请";
    }
  } catch (e) {
    alert("网络错误，请稍后重试");
    btn.disabled = false;
    btn.textContent = "提交申请";
  }
}

function showSuccessModal() {
  const existing = document.getElementById("success-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.id = "success-overlay";
  overlay.innerHTML = `
    <div class="success-box">
      <div class="success-circle">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polyline points="7,14 12,19 21,9" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="success-text">Successful! Wait for the host to approve.</div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.onclick = function (e) {
    if (e.target === overlay) {
      overlay.remove();
      location.hash = "#/";
    }
  };
  setTimeout(function () {
    const el = document.getElementById("success-overlay");
    if (el) { el.remove(); location.hash = "#/"; }
  }, 4000);
}

/* === Login Modal === */
function showLoginModal() {
  if (isLoggedIn()) { logout(); return; }

  const existing = document.getElementById("login-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "login-overlay";
  overlay.id = "login-overlay";
  overlay.innerHTML = `
    <div class="login-box" style="position:relative">
      <button class="close-btn" onclick="document.getElementById('login-overlay').remove()">&times;</button>
      <h2>Log in</h2>
      <div class="form-group">
        <label class="form-label">昵称</label>
        <input class="form-input" id="login-nickname" placeholder="你的昵称" maxlength="30" />
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input class="form-input" id="login-password" type="password" placeholder="你的密码" />
      </div>
      <div id="login-error" class="login-error"></div>
      <div class="login-actions">
        <button class="btn-text" onclick="document.getElementById('login-overlay').remove()">取消</button>
        <button class="btn-outline" id="btn-do-login" style="border-radius:20px;padding:8px 28px;font-size:14px">登录</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById("btn-do-login").onclick = doLogin;
  document.getElementById("login-password").onkeydown = (e) => { if (e.key === "Enter") doLogin(); };
  overlay.onclick = function (e) {
    if (e.target === overlay) overlay.remove();
  };
}

async function doLogin() {
  const nickname = document.getElementById("login-nickname").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  if (!nickname) { errorEl.textContent = "请输入昵称"; return; }
  if (!password) { errorEl.textContent = "请输入密码"; return; }

  const btn = document.getElementById("btn-do-login");
  btn.disabled = true;
  btn.textContent = "登录中...";

  try {
    const hash = await sha256(password);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nickname, password_hash: hash }),
    });
    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem("skywalker-login", "1");
      sessionStorage.setItem("skywalker-nickname", data.nickname);
      sessionStorage.setItem("skywalker-name", data.name || "");
      sessionStorage.setItem("skywalker-know", data.know_skywalker ? "1" : "0");
      document.getElementById("login-overlay").remove();
      updateNavState();
      location.hash = "#/adventures";
    } else {
      errorEl.textContent = "昵称或密码错误，或账号尚未被批准";
      btn.disabled = false;
      btn.textContent = "登录";
    }
  } catch (e) {
    errorEl.textContent = "网络错误，请稍后重试";
    btn.disabled = false;
    btn.textContent = "登录";
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
      <h2>Admin Access</h2>
      <input class="form-input" id="admin-key-input" type="password" placeholder="Admin Key" />
      <div class="admin-error" id="admin-error">${errorMsg ? esc(errorMsg) : ""}</div>
      <button class="submit-btn" id="btn-admin-auth">进入</button>
    </div>`;

  document.getElementById("btn-admin-auth").onclick = adminAuth;
  document.getElementById("admin-key-input").onkeydown = (e) => {
    if (e.key === "Enter") adminAuth();
  };
}

async function adminAuth() {
  const key = document.getElementById("admin-key-input").value;
  if (!key) {
    document.getElementById("admin-error").textContent = "请输入 Admin Key";
    return;
  }
  sessionStorage.setItem("skywalker-admin-key", key);
  await loadApplications();
}

async function loadApplications() {
  const adminKey = sessionStorage.getItem("skywalker-admin-key");
  main.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted)">加载中...</div>';

  try {
    const res = await fetch("/api/admin", {
      headers: { "X-Admin-Key": adminKey },
    });
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem("skywalker-admin-key");
      renderAdminAuth("Admin Key 错误");
      return;
    }
    if (!res.ok) {
      main.innerHTML = '<div class="admin-empty">加载失败，请重试</div>';
      return;
    }
    const apps = await res.json();
    renderApplicationList(apps);
  } catch (e) {
    main.innerHTML = '<div class="admin-empty">加载失败，请稍后重试</div>';
  }
}

function renderApplicationList(apps) {
  const statusLabels = { pending: "待审批", approved: "已批准", rejected: "已拒绝" };

  let html = `<div class="admin-page">
    <h2>Applications</h2>
    <div class="admin-subtitle">${apps.length} 个申请</div>`;

  if (apps.length === 0) {
    html += '<div class="admin-empty">暂无申请</div>';
  }

  for (const a of apps) {
    var knowFields = a.know_skywalker
      ? `<div class="app-field"><div class="app-field-label">名字</div><div class="app-field-value">${esc(a.name)}</div></div>
         <div class="app-field"><div class="app-field-label">共同经历</div><div class="app-field-value">${esc(a.shared_experience)}</div></div>`
      : `<div class="app-field"><div class="app-field-label">从何处听说</div><div class="app-field-value">${esc(a.how_found || "未填写")}</div></div>`;

    html += `
      <div class="app-card" id="app-${a.id}">
        <div class="app-card-header">
          <span class="app-name">${esc(a.nickname)}</span>
          <span class="status-badge ${a.status}">${statusLabels[a.status] || a.status}</span>
        </div>
        <div class="app-date">${esc(a.created_at || "")}</div>
        <div class="app-field">
          <div class="app-field-label">认识于天行</div>
          <div class="app-field-value">${a.know_skywalker ? "✓ 是" : "✗ 否"}</div>
        </div>
        ${knowFields}
        </div>
        <div class="app-field">
          <div class="app-field-label">自我介绍</div>
          <div class="app-field-value">${esc(a.who_are_you || "")}</div>
        </div>
        <div class="app-field">
          <div class="app-field-label">昵称</div>
          <div class="app-field-value">${esc(a.nickname)}</div>
        </div>
        ${a.status === "pending" ? `
        <div class="app-card-actions">
          <button class="btn-approve" onclick="approveApp(${a.id})">批准</button>
          <button class="btn-reject" onclick="rejectApp(${a.id})">拒绝</button>
        </div>` : ""}
      </div>`;
  }
  html += '<a class="admin-logout" href="javascript:void(0)" onclick="adminLogout()">退出管理</a></div>';
  main.innerHTML = html;
}

async function approveApp(id) {
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
      await loadApplications();
    } else {
      if (card) card.style.opacity = "1";
      alert("操作失败");
    }
  } catch (e) {
    if (card) card.style.opacity = "1";
    alert("网络错误");
  }
}

async function rejectApp(id) {
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
      await loadApplications();
    } else {
      if (card) card.style.opacity = "1";
      alert("操作失败");
    }
  } catch (e) {
    if (card) card.style.opacity = "1";
    alert("网络错误");
  }
}

function adminLogout() {
  sessionStorage.removeItem("skywalker-admin-key");
  location.hash = "#/";
}
