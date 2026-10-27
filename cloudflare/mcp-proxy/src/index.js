/**
 * Public MCP endpoint on our own domain. Every request to /mcp (or /) is passed through, body and
 * streamed responses included, to the Supabase `mcp` function; a plain browser visit goes to the docs.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/mcp' && url.pathname !== '/') return new Response('Not found', { status: 404 });

    const wantsStream = (request.headers.get('accept') ?? '').includes('text/event-stream');
    if (request.method === 'GET' && !wantsStream) return Response.redirect(env.DOCS, 302);

    const upstream = new Request(env.UPSTREAM + url.search, request);
    upstream.headers.delete('host');
    return fetch(upstream);
  },
};
