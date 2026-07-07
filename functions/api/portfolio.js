// Stock exchange prefix mapping
function getExchangePrefix(code) {
  if (code.startsWith("6") || code.startsWith("688") || code.startsWith("510")) return "sh";
  if (code.startsWith("0") || code.startsWith("3") || code.startsWith("159")) return "sz";
  if (code.startsWith("007")) return "hk";
  return "sh";
}

// Fetch real-time prices from Tencent stock API (batch)
async function fetchPrices(holdings) {
  const codes = holdings.map(h => `${getExchangePrefix(h.code)}${h.code}`).join(",");
  if (!codes) return {};

  try {
    const url = `https://qt.gtimg.cn/q=${codes}`;
    const res = await fetch(url, {
      headers: { "Accept": "*/*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const prices = {};

    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      // Format: v_sh510300="1~name~code~now~close~..."
      const match = line.match(/v_(\w+)="(.+)"/);
      if (!match) continue;

      const parts = match[2].split("~");
      if (parts.length < 4) continue;

      const fullCode = match[1]; // e.g. "sh510300"
      const code = fullCode.replace(/^(sh|sz|hk)/, "");
      const nowPrice = parseFloat(parts[3]);
      const closePrice = parseFloat(parts[4]) || nowPrice;
      const highPrice = parseFloat(parts[33]) || nowPrice;
      const lowPrice = parseFloat(parts[34]) || nowPrice;
      const changePercent = closePrice > 0 ? ((nowPrice - closePrice) / closePrice * 100) : 0;

      prices[code] = {
        price: nowPrice,
        close: closePrice,
        high: highPrice,
        low: lowPrice,
        changePercent: parseFloat(changePercent.toFixed(2)),
        name: parts[1] || "",
      };
    }

    return prices;
  } catch (e) {
    console.error("Stock price fetch error:", e.message);
    return {};
  }
}

// Calculate derived fields for each holding
function computeHolding(holding, priceData) {
  const quote = priceData[holding.code];
  const price = quote ? quote.price : holding.cost_price;
  const changePercent = quote ? quote.changePercent : 0;
  const currentValue = price * holding.shares;
  const costValue = holding.cost_price * holding.shares;
  const pnl = costValue > 0 ? ((currentValue - costValue) / costValue * 100) : 0;

  return {
    code: holding.code,
    name: holding.name,
    shares: holding.shares,
    cost_price: holding.cost_price,
    price: price,
    pnl: parseFloat(pnl.toFixed(2)),
    changePercent: changePercent,
    current_value: parseFloat(currentValue.toFixed(2)),
    cost_value: parseFloat(costValue.toFixed(2)),
    market_open: quote ? true : false,
  };
}

export async function onRequestGet({ env, request }) {
  try {
    // Read holdings from D1
    const { results } = await env.DB.prepare(
      "SELECT code, name, shares, cost_price FROM portfolio_holdings ORDER BY id"
    ).all();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ holdings: [], total: 0, error: "no_holdings" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch real-time prices
    const priceData = await fetchPrices(results);

    // Compute holdings with prices
    const computed = results.map(h => computeHolding(h, priceData));
    const totalValue = computed.reduce((sum, h) => sum + h.current_value, 0);
    const totalCost = computed.reduce((sum, h) => sum + h.cost_value, 0);

    // Calculate weights
    const holdings = computed.map(h => ({
      ...h,
      weight: totalValue > 0 ? parseFloat(((h.current_value / totalValue) * 100).toFixed(1)) : 0,
    }));

    return new Response(JSON.stringify({
      holdings,
      total: parseFloat(totalValue.toFixed(2)),
      total_cost: parseFloat(totalCost.toFixed(2)),
      total_pnl: totalCost > 0 ? parseFloat(((totalValue - totalCost) / totalCost * 100).toFixed(2)) : 0,
      updated_at: new Date().toISOString(),
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, holdings: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Admin: update holdings
export async function onRequestPost({ env, request }) {
  const adminKey = request.headers.get("X-Admin-Key");
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, code, name, shares, cost_price, exchange } = body;

    if (action === "upsert") {
      if (!code || shares === undefined || cost_price === undefined) {
        return new Response("Missing required fields", { status: 400 });
      }
      await env.DB.prepare(`
        INSERT INTO portfolio_holdings (code, name, shares, cost_price, exchange, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        ON CONFLICT(code) DO UPDATE SET
          name = COALESCE(?2, name),
          shares = ?3,
          cost_price = ?4,
          exchange = COALESCE(?5, exchange),
          updated_at = datetime('now')
      `).bind(code, name || "", shares, cost_price, exchange || "sh").run();

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!code) return new Response("Missing code", { status: 400 });
      await env.DB.prepare("DELETE FROM portfolio_holdings WHERE code = ?").bind(code).run();
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
