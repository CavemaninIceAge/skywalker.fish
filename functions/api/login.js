export async function onRequestPost({ env, request }) {
  const { nickname, password_hash } = await request.json();

  if (!nickname || !password_hash) {
    return new Response("Missing nickname or password", { status: 400 });
  }

  const user = await env.DB.prepare(
    "SELECT id, nickname, name, know_skywalker FROM users WHERE nickname = ? AND password_hash = ?"
  ).bind(nickname, password_hash).first();

  if (!user) {
    return new Response("Invalid credentials", { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true, nickname: user.nickname, name: user.name, know_skywalker: user.know_skywalker }), {
    headers: { "Content-Type": "application/json" },
  });
}
