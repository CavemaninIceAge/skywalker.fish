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

  await env.DB.prepare(`
    INSERT INTO applications (name, shared_experience, how_found, who_are_you, nickname, password_hash, know_skywalker)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
  `).bind(
    name || "", shared_experience || "",
    how_found || "", who_are_you,
    nickname, password_hash,
    know_skywalker ? 1 : 0
  ).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}
