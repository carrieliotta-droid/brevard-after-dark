export async function onRequestPost({ env }) {
  try {
    const row = await env.DB.prepare(`
      INSERT INTO counters (name, count, updated_at)
      VALUES ('page_views', 1, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        count = count + 1,
        updated_at = datetime('now')
      RETURNING count
    `).first();

    return Response.json({ count: row.count }, {
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
