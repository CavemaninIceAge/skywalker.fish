// Handle email-based approval/rejection via signed links
// Simple HMAC-SHA256 for signed approval tokens (self-contained for Cloudflare Pages)
async function createToken(action, appId, secret) {
  const msg = `${action}:${appId}:${secret}`;
  const enc = new TextEncoder().encode(msg);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 32);
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  if (!action || !id || !token) {
    return new Response("Missing parameters", { status: 400 });
  }

  // Verify token
  const secret = env.ADMIN_KEY || "fallback-secret-change-me";
  const expectedToken = await createToken(action, id, secret);

  if (token !== expectedToken) {
    return new Response(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
        <h2 style="color:#dc2626">链接无效或已过期</h2>
        <p>请登录管理后台操作。</p>
        <a href="https://skywalker.fish/#/admin" style="color:#d77757">前往管理后台</a>
      </body></html>
    `, {
      status: 400,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  if (action === "approve") {
    const app = await env.DB.prepare(
      "SELECT * FROM applications WHERE id = ? AND status = 'pending'"
    ).bind(id).first();

    if (!app) {
      return new Response(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
          <h2>申请已处理</h2>
          <p>该申请已被批准或拒绝，无需重复操作。</p>
          <a href="https://skywalker.fish/" style="color:#d77757">返回首页</a>
        </body></html>
      `, {
        headers: { "Content-Type": "text/html;charset=utf-8" },
      });
    }

    await env.DB.prepare(
      "INSERT OR IGNORE INTO users (nickname, password_hash, name, know_skywalker) VALUES (?1, ?2, ?3, ?4)"
    ).bind(app.nickname, app.password_hash, app.name || "", app.know_skywalker ? 1 : 0).run();

    await env.DB.prepare(
      "UPDATE applications SET status = 'approved' WHERE id = ?"
    ).bind(id).run();

    return new Response(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
        <div style="width:52px;height:52px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <polyline points="6,12 10,16 18,8" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 style="color:#16a34a">已批准</h2>
        <p>用户 <strong>${app.nickname}</strong> 的申请已批准。</p>
        <a href="https://skywalker.fish/" style="color:#d77757">返回首页</a>
      </body></html>
    `, {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  if (action === "reject") {
    const app = await env.DB.prepare(
      "SELECT * FROM applications WHERE id = ? AND status = 'pending'"
    ).bind(id).first();

    if (!app) {
      return new Response(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
          <h2>申请已处理</h2>
          <p>该申请已被批准或拒绝，无需重复操作。</p>
          <a href="https://skywalker.fish/" style="color:#d77757">返回首页</a>
        </body></html>
      `, {
        headers: { "Content-Type": "text/html;charset=utf-8" },
      });
    }

    await env.DB.prepare(
      "UPDATE applications SET status = 'rejected' WHERE id = ? AND status = 'pending'"
    ).bind(id).run();

    return new Response(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
        <h2 style="color:#dc2626">已拒绝</h2>
        <p>用户 <strong>${app.nickname}</strong> 的申请已被拒绝。</p>
        <a href="https://skywalker.fish/" style="color:#d77757">返回首页</a>
      </body></html>
    `, {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  return new Response("Invalid action", { status: 400 });
}
