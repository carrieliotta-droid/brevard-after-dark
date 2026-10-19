export async function onRequestGet({ env }) {
  try {
    const row = await env.DB.prepare(
      "SELECT count, updated_at FROM counters WHERE name = 'page_views'"
    ).first();

    return Response.json({
      count: row?.count ?? 0,
      updatedAt: row?.updated_at ?? null,
      metric: 'one visit per browser session'
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return Response.json({ error: 'Counter unavailable' }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
