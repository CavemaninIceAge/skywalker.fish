export async function onRequestPost({ env, request }) {
  const body = await request.json();
  const { name, shared_experience, how_found, who_are_you, nickname, password_hash, know_skywalker } = body;

  if (!nickname || !password_hash) {
    return new Response("Missing required fields", { status: 400 });
  }

  if (know_skywalker) {
    if (!name || !shared_experience) {
      return new Response("Missing name or shared_experience", { status: 400 });
    }
  } else {
    if (!who_are_you || !how_found) {
      return new Response("Missing who_are_you or how_found", { status: 400 });
    }
  }

  if (nickname.length > 30 || password_hash.length > 64) {
    return new Response("Input too long", { status: 400 });
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM applications WHERE nickname = ? AND status = 'pending'"
  ).bind(nickname).first();

  if (existing) {
    return new Response("该昵称已有待审批的申请", { status: 409 });
  }

  const existingUser = await env.DB.prepare(
    "SELECT id FROM users WHERE nickname = ?"
  ).bind(nickname).first();

  if (existingUser) {
    return new Response("该昵称已被占用", { status: 409 });
  }

  const result = await env.DB.prepare(`
    INSERT INTO applications (name, shared_experience, how_found, who_are_you, nickname, password_hash, know_skywalker)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
  `).bind(
    name || "", shared_experience || "",
    how_found || "", who_are_you,
    nickname, password_hash,
    know_skywalker ? 1 : 0
  ).run();

  // Send email notification
  const appId = result.meta?.last_row_id;
  if (appId) {
    const app = await env.DB.prepare(
      "SELECT * FROM applications WHERE id = ?"
    ).bind(appId).first();

    if (app) {
      // Fire-and-forget email notification (don't block response)
      sendEmailNotification(env, app).catch(e =>
        console.error("Email notification error:", e.message)
      );
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}

async function sendEmailNotification(env, application) {
  if (!env.EMAIL_API_KEY) {
    console.log("EMAIL_API_KEY not set, skipping email");
    return;
  }

  const knowText = application.know_skywalker
    ? `认识于天行（姓名：${application.name || "未提供"}）`
    : `不认识于天行（从 ${application.how_found || "未知渠道"} 听说）`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.EMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Skywalker.Fish <notifications@skywalker.fish>",
      to: "2500015471@stu.pku.edu.cn",
      subject: `[Skywalker.Fish] 新申请：${application.nickname}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>新用户申请</h2>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">昵称</td>
                <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${application.nickname}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">来源</td>
                <td style="padding:8px;border-bottom:1px solid #eee">${knowText}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">自我介绍</td>
                <td style="padding:8px;border-bottom:1px solid #eee">${application.who_are_you || application.shared_experience || "未提供"}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">申请时间</td>
                <td style="padding:8px;border-bottom:1px solid #eee">${application.created_at || ""}</td></tr>
          </table>
          <p>管理后台：<a href="https://skywalker.fish/#/admin" style="color:#d77757">skywalker.fish/#/admin</a></p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Email send failed:", errText);
  }
}
