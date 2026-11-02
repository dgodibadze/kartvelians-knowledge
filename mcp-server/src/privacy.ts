// Privacy policy for the MCP server, served at https://kartvelians.com/privacy/mcp
// so the directory listing links to a page on the company's own domain.

export const PRIVACY_PATH = "/privacy/mcp";

export const PRIVACY_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy policy: kartvelians.com MCP server</title>
<link rel="canonical" href="https://kartvelians.com/privacy/mcp">
<style>
body{font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#1a1a1a;background:#fff}
h1{font-size:1.5rem}h2{font-size:1.15rem;margin-top:1.75rem}
a{color:#0b57d0}code{background:#f2f2f2;padding:0 .25rem;border-radius:3px}
@media (prefers-color-scheme:dark){body{color:#e8e8e8;background:#141414}a{color:#8ab4f8}code{background:#2a2a2a}}
</style>
</head>
<body>
<h1>Privacy policy: kartvelians.com MCP server</h1>
<p>Effective 2026-11-02. This policy covers the MCP server at <code>https://kartvelians.com/mcp</code>, which lets AI assistants such as Claude look up kartvelians.com guides. The rest of the kartvelians.com website is covered by its own <a href="https://kartvelians.com/privacy">privacy policy</a>.</p>

<h2>What the server receives</h2>
<p>When an AI assistant calls one of the server's tools, the server receives that call's arguments: a search text, a guide name (slug), a language code (<code>en</code> or <code>ka</code>) or a list filter. A search text is whatever the assistant sends to look up a guide, so it can contain words from your question.</p>
<p>The server also receives the standard parts of any web request, such as the time, the IP address and the user agent of the assistant's servers.</p>
<p>The server does not receive your conversation, your name, your email address or any account details. It has no sign-in, sets no cookies and keeps no user accounts.</p>

<h2>How it is used and stored</h2>
<p>The server answers each call from a fixed list of guide summaries built into its code. It has no database or file storage, and it does not write the search text or other arguments to a log of its own.</p>

<h2>Logs kept by our hosting provider</h2>
<p>The server runs on Cloudflare Workers. Cloudflare keeps a log of each request to the server, with request and response metadata such as the time, the URL, the response status and connection details, for up to 7 days. We read these logs only to find and fix errors.</p>

<h2>Sharing</h2>
<p>We do not sell or share what the server receives. Cloudflare processes requests as our hosting provider under its own <a href="https://www.cloudflare.com/privacypolicy/">privacy policy</a>. The AI assistant you use handles your conversation under its own privacy policy.</p>

<h2>Retention</h2>
<p>The server keeps nothing after it answers a call. Cloudflare's request logs are deleted after at most 7 days.</p>

<h2>Contact</h2>
<p>Questions about this policy or the MCP server: <a href="mailto:support@kartvelians.com">support@kartvelians.com</a>.</p>
</body>
</html>
`;
