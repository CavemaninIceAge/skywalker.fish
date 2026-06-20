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
    case "#/signup": renderSignup(); break;
    case "#/admin": renderAdmin(); break;
    default:
      if (hash.startsWith("#/essays/")) renderEssayArticle(hash.slice(9));
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
  if (!isLoggedIn()) {
    main.innerHTML = `
      <div class="adventure-gate">
        <div class="game-preview">
          Essays<br/>
          随笔与思考
        </div>
        <div class="blur-overlay">
          <div class="blocked-text">You are blocked currently.<br/>Log in Please.</div>
        </div>
      </div>`;
    return;
  }

  const essays = [
    { date: "2026-05-29", slug: "beijing-station", title: "永远的北京" },
    { date: "2026-05-11", slug: "chasing-lightning", title: "追逐下一道闪电（机考前的一个深夜）" },
    { date: "2026-05-10", slug: "ideal-middle-class", title: "An Ideal Type of Middle-Class Family" },
    { date: "2026-04-14", slug: "transfer-summer-eve", title: "转专业夏前夜" },
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
  if (!isLoggedIn()) { location.hash = "#/essays"; return; }

  const articles = {
    "chasing-lightning": {
      title: "追逐下一道闪电（机考前的一个深夜）",
      date: "2026-05-11",
      body: `我想，每个有科学梦想的人都会为那些命题着迷，我们不知道它们对不对，它们就在那儿，有着充分的可解释性。我看初等数论时，发现素数居然如此严谨的遵循1/lnx的分布密度，让我颇为惊讶，我们习以为常的一切里居然有众多的巧合，而我们甚至不知道那是为什么。在昨夜，我看一个留学中介的面试指导，要回答一个问题"夜空为什么是黑的"，我们用"太阳不在"、"星际尘埃"、"恒星能量衰减"这种话语在疑问的苗头熄灭它，更深的解释指向宇宙并非静态而永恒：它有有限的年龄，并且正在膨胀，遥远天体的光要么尚未抵达，要么已在宇宙膨胀中被拉长、稀释。这个巨大的秘密就这么挂在所有人的头顶，直到有一个人提出那个为什么。

我们习以为常的一切中，常常隐藏着深层的秩序。发现这些秩序，解释这些秩序，就有了后来被我们称作常识的科学。灵感从不凭空而来，它们需要联想，需要众多的积累，然后在神经元某个连接的瞬间擦出那么一点火花，然后我们捉住火花，对那些大问题而言，这如同一个人追到了一道闪电。这是一种小概率事件，但如果我们不去追逐云层，闪电的概率就会更低更低，直到不见。

我们如何定义这个笼统的"创造"，我想应该是积累基础，然后去迁移，发现可以解决更多丰富的问题，像 Dijkstra 算法一样，我们不是凭空抵达终点，而是从已经确定的地方出发，用已有知识不断更新通向远处的路径。我们不可能在对前置知识掌握不牢固清楚的情况下搜索到下一个地方的解法。我思考天才和我们的区别，在更强的算力外，或许仍然是已有的积累。所有人都需要极其大量的积累，像一个不知疲倦的人追逐一道闪电。

我相信天才的存在，也相信有些人确实拥有更强的算力和更杰出的头脑，但同样相信积累和迁移。在灵感如闪电击中我们的概率下，我们和那些没有到千古罕见的聪明人的距离，其实远远没有那么巨大。一些后来卓有成就的人，也并不总是在早期评价体系中一路领先。成绩、绩点、竞赛履历当然重要，但它们并不能穷尽一个人的上限。真正漫长的学术道路里，问题感、韧性、积累和迁移能力，都会重新塑造一个人的轨迹。哪怕是 IMO 金牌，也往往经历了从小学时代开始、持续十余年的高强度训练。今日横亘在我面前的天堑，并不只是天赋造成的，也来自他们早已完成而我尚未完成的积累。我想，天赋之外，我们更缺积累与时间。

过去一个十年已经结束了，虽然我没有像那些中学竞赛生一样打好数理基础，但也已经到了北京大学；我想从今天起学好数理基础，像那些小学时代开始每天学习数学教材的人们，我想用下一个十年追逐一道闪电。

这篇文章意象的灵感，来源于张益唐接受"晚点"采访的文章"追逐第二道闪电"。`,
    },
    "beijing-station": {
      title: "永远的北京",
      date: "2026-05-29",
      body: `走出北京站，无数次无数年这里的回忆层层叠叠，覆盖在这熟习的迎面热风里。这里就像我的家门——我得意地来、失意地来、卷土重来地归来、充满期待地来、安安静静地来来回回。那几栋厚墙高楼永远矗立在上行通道的尽头，车站永远在吞吐着五湖四海的、各怀其志的人。这座都会是永恒的，只有人们起起落落。

没有人像北京一样。在西周先民带着牲口和孩子走到这里筑城后，北京已经存在了2000多年，从14世纪至今，北京享受了700年的黄金时代，没有人有那样长的黄金时代，哪怕在人一生70年的时间里。

没有人能买下北京，没有人能一生拥有整座北京。自天子以至于庶人，我们浮浮沉沉，生活在北京里。

我们浮浮沉沉，我们生活在北京。`,
    },
    "ideal-middle-class": {
      title: "An Ideal Type of Middle-Class Family",
      date: "2026-05-10",
      body: `In School dining hall I always notice such a set of people: A 30s man looking skillful with a certain social status, a young woman looking refined and graceful, along with 2 or 3 children aged from in primary school to in middle school. That our Chinese type of American style middle-class family. The man may be an engineer in some industrial design company or computer entrepreneur, and the woman may be an employee of a prestigious government department. Their children may be in Bayi, Shiyi, Rendafuzhong etc. The children may engage in subject olympiads from a very early age. They may have voyaged around the planet. They must be proficient in some sports like soccer, badminton or basketball. They are well raised with healthy mind and good slim look which would always attract peers. In a word, they are just like their peers in California or the states of the east coast.

Each period has its noble life. It's the decent family of our times. I had nothing like them before, but I now at least surpass their children by means of school work. The past shall not be edited, But I'm sure, my child must be embraced in such a wonderful vibe, growing up with liberty, in-time guidance, and environment filled with love.

One day, maybe everyone of our society will live such a life. And it's our duty to make the world a better place for our descendants.`,
    },
    "transfer-summer-eve": {
      title: "转专业夏前夜",
      date: "2026-04-14",
      body: `到今晚走出图书馆的大门，刚刚写完去年的转数二真题过bar不少，我忽然发现，这已经是我写的第25轮机考计时模拟了。而在这以外看的算法教材、写的专题，已经繁杂无从考证。

无心夜晚穿行于北京的夏夜，潮湿炎热、晴朗又辽阔，就像朗夜里的安徽黄山。恍惚之中，有一种我高考前前后后气候的错觉——人生有许多这样悬而未决的时刻，我们或恐惧、或急切着，而"那件事"只是以恒定的脚步走来，审阅我们的准备，然后在几天中落下一句转折历史的判决。

我没想到过会有今天，我也没想到过，今天我会这样想。

我试想过体面地表达欢乐，想过存在主义地控诉或赞美世界的不公或恩典。但我只是到天文系骑车，感到复杂而难以言说的满足，只有一个直直的念头：这是一生很难再有的感受，我要学会享受它。记住这种欢欣、沉稳与隐隐不安。

甚至享受潜在的失败。看着空空的vscode，我还是会偶然犯万劫不复的错误，然后几十分钟才找出来。出来做事总要有赢有卑。在最后，我希望自己要做一个输得起的人。

人一生被闪电击中的概率很小，但如果不去追逐雷区，就永远接不到那道闪电。

往日之事不可追，未来之路光明灿烂。`,
    },
  };
  const article = articles[slug];
  const title = article ? article.title : "";
  const date = article ? article.date : "";
  const body = article ? article.body : "";
  main.innerHTML = `
    <a class="back-link" href="#/essays">← 返回 Essays</a>
    <div class="essay-article">
      <h1>${title}</h1>
      <div class="date-big">${date}</div>
      ${body.split("\n\n").map(p => `<p style="line-height:2;text-indent:2em;margin-bottom:1em">${p.replace(/\n/g, "<br/>")}</p>`).join("")}
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
    <span class="line"></span><br/>
    <span class="label" id="history-link">历史上的星空</span><br/>
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

      <div id="sig-know-no" class="signup-conditional hidden">
        <div class="form-group">
          <label class="form-label">你从哪里听说于天行？</label>
          <input class="form-input" id="sig-howfound" placeholder="比如：朋友介绍、GitHub、社交媒体..." maxlength="200" />
        </div>
      </div>

      <div class="form-group" style="margin-top:32px">
        <label class="form-label">你是谁？</label>
        <textarea class="form-textarea" id="sig-who" rows="3" placeholder="介绍一下你自己..."></textarea>
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
  var who = document.getElementById("sig-who").value.trim();
  var nickname = document.getElementById("sig-nickname").value.trim();
  var password = document.getElementById("sig-password").value;

  if (!who) { alert("请填写你是谁"); return; }
  if (!nickname) { alert("请设置昵称"); return; }
  if (!password || password.length < 4) { alert("密码至少 4 位"); return; }

  var body = { who_are_you: who, nickname: nickname, know_skywalker: knowSelected };

  if (knowSelected) {
    var name = document.getElementById("sig-name").value.trim();
    var exp = document.getElementById("sig-experience").value.trim();
    if (!name) { alert("请填写你的名字"); return; }
    if (!exp) { alert("请填写共同经历"); return; }
    body.name = name;
    body.shared_experience = exp;
    body.how_found = "";
  } else {
    var hf = document.getElementById("sig-howfound").value.trim();
    if (!hf) { alert("请填写你从哪里听说于天行"); return; }
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
