export async function onRequestGet({ env, request }) {
  const adminKey = request.headers.get("X-Admin-Key");
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM applications ORDER BY created_at DESC"
  ).all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost({ env, request }) {
  const adminKey = request.headers.get("X-Admin-Key");
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { action, id } = await request.json();

  if (!id || !action) {
    return new Response("Missing id or action", { status: 400 });
  }

  if (action === "approve") {
    const app = await env.DB.prepare(
      "SELECT * FROM applications WHERE id = ? AND status = 'pending'"
    ).bind(id).first();

    if (!app) {
      return new Response("Application not found or already processed", { status: 404 });
    }

    await env.DB.prepare(
      "INSERT OR IGNORE INTO users (nickname, password_hash) VALUES (?1, ?2)"
    ).bind(app.nickname, app.password_hash).run();

    await env.DB.prepare(
      "UPDATE applications SET status = 'approved' WHERE id = ?"
    ).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action === "reject") {
    await env.DB.prepare(
      "UPDATE applications SET status = 'rejected' WHERE id = ? AND status = 'pending'"
    ).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Invalid action", { status: 400 });
}
