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
    default:
      if (hash.startsWith("#/essays/")) renderEssayArticle(hash.slice(9));
      else renderProfile();
  }
}

window.onhashchange = route;
window.onload = route;

/* === Profile === */
function renderProfile() {
  main.innerHTML = `
    <div class="profile-header">
      <div>
        <div class="name">于 天行</div>
        <div class="subtitle">北京大学 2025 级本科在读</div>
      </div>
      <img class="avatar" src="images/avatar.png" alt="avatar" />
    </div>
    <div class="section-title">Description</div>
    <div class="section-body"></div>
    <div class="section-title">Education</div>
    <div class="edu-row">
      <img src="images/pku.png" alt="北大" />
      <div>
        <div class="school">北京大学</div>
        <div class="years">2025 — 今</div>
      </div>
    </div>
    <div class="edu-row">
      <img src="images/h3z.png" alt="哈三中" />
      <div>
        <div class="school">哈尔滨市第三中学校</div>
        <div class="years">2021 — 2024</div>
      </div>
    </div>
    <div class="edu-row">
      <img src="images/gdfz.png" alt="工大附中" />
      <div>
        <div class="school">哈尔滨市工业大学附属中学校</div>
        <div class="years">2017 — 2021</div>
      </div>
    </div>
    <div class="section-title">Future Vision</div>
    <div class="section-body"></div>
  `;
}

/* === Essays === */
function renderEssays() {
  const essays = [
    { date: "2026-06-15", slug: "first", title: "写在前面" },
  ];
  let html = '<div class="section-title" style="margin-top:0">Essays</div>';
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
  main.innerHTML = `
    <a class="back-link" href="#/essays">← 返回 Essays</a>
    <div class="essay-article">
      <h1></h1>
      <div class="date-big"></div>
      <div class="body"></div>
    </div>
  `;
}

/* === Projects === */
function renderProjects() {
  const projects = [
    { name: "skywalker.fish", desc: "This website.", url: "https://github.com/CavemaninIceAge/skywalker.fish" },
  ];
  main.innerHTML = '<div class="section-title" style="margin-top:0">Projects</div>';
  for (const p of projects) {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="proj-name">${p.name}</div>
      <div class="proj-desc">${p.desc}</div>
      <div class="proj-actions">
        ${p.url ? `<a class="proj-card-btn" href="${p.url}" target="_blank">Website</a>` : ""}
      </div>`;
    card.onclick = () => card.classList.toggle("open");
    main.appendChild(card);
  }
  if (projects.length === 0) {
    main.innerHTML += '<p style="color:var(--muted)">暂无项目</p>';
  }
}

/* === Portfolio === */
const holdings = [
  { code: "510300", name: "沪深300ETF", weight: 35, pnl: 2.3, cost: 3.85, price: 3.94, shares: 3200 },
  { code: "600519", name: "贵州茅台", weight: 25, pnl: -1.2, cost: 1680, price: 1660, shares: 50 },
  { code: "000858", name: "五粮液", weight: 15, pnl: 5.7, cost: 145, price: 153.3, shares: 300 },
  { code: "300750", name: "宁德时代", weight: 12, pnl: -0.8, cost: 210, price: 208.3, shares: 180 },
  { code: "00700", name: "腾讯控股", weight: 8, pnl: 1.5, cost: 380, price: 385.7, shares: 70 },
  { code: "688981", name: "中芯国际", weight: 5, pnl: 3.1, cost: 52, price: 53.6, shares: 260 },
];

function renderPortfolio() {
  const container = document.createElement("div");
  container.className = "portfolio-container";

  const field = document.createElement("div");
  field.className = "star-field";
  field.id = "star-field";

  const positions = [
    { x: 8, y: 6 }, { x: 22, y: 28 }, { x: 42, y: 8 },
    { x: 58, y: 32 }, { x: 72, y: 12 }, { x: 88, y: 22 },
  ];

  holdings.forEach((h, i) => {
    const size = 26 + (h.weight / 35) * 34;
    const opacity = 0.55 + (h.pnl > 0 ? 0.4 : 0.15);
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = positions[i].x + "%";
    star.style.top = positions[i].y + "%";
    star.style.width = size + "px";
    star.style.height = size + "px";
    star.style.opacity = opacity;
    star.title = h.name;
    star.onclick = (e) => { e.stopPropagation(); showStarPopup(h); };
    field.appendChild(star);
  });

  field.onclick = () => closeStarPopup();

  container.appendChild(field);

  const divider = document.createElement("div");
  divider.className = "portfolio-divider";
  divider.innerHTML = `
    <span class="line"></span>
    <span class="label" id="history-link">历史上的星空</span>
    <span class="line"></span>`;
  container.appendChild(divider);

  const historyPanel = document.createElement("div");
  historyPanel.className = "history-panel";
  historyPanel.id = "history-panel";
  container.appendChild(historyPanel);

  main.appendChild(container);

  document.getElementById("history-link").onclick = renderHistory;
}

function showStarPopup(h) {
  let popup = document.getElementById("star-popup");
  if (popup) popup.remove();

  const pnlClass = h.pnl >= 0 ? "up" : "down";
  const pnlSign = h.pnl >= 0 ? "+" : "";

  popup = document.createElement("div");
  popup.id = "star-popup";
  popup.className = "star-popup";
  popup.innerHTML = `
    <button class="close" onclick="document.getElementById('star-popup').remove()">×</button>
    <h3>${h.name} <span style="font-size:14px;color:var(--muted)">${h.code}</span></h3>
    <div class="detail">
      成本价：¥${h.cost}<br/>
      现价：¥${h.price}<br/>
      持仓：${h.shares} 股<br/>
      盈亏：<span class="${pnlClass}">${pnlSign}${h.pnl}%</span><br/>
      仓位占比：${h.weight}%
    </div>`;
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
  let html = '<h2>历史上的星空</h2><table class="history-table">';
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
  const loggedIn = sessionStorage.getItem("skywalker-login") === "1";
  if (loggedIn) {
    renderGames();
  } else {
    main.innerHTML = `
      <div class="adventure-gate">
        <div class="game-preview">
          创意小游戏合集<br/>
          井字棋 · 数独 · 贪吃蛇 · 扫雷
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
    </div>`;
}
