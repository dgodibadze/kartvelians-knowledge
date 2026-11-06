# Privacy policy: kartvelians.com MCP server

The published copy of this policy is https://kartvelians.com/privacy/mcp. Keep the two in step
(the page is served from `mcp-server/src/privacy.ts`).

Effective 2026-11-02. This policy covers the MCP server at `https://kartvelians.com/mcp`, which lets
AI assistants such as Claude look up kartvelians.com guides. The rest of the kartvelians.com website
is covered by its own policy at https://kartvelians.com/privacy.

## What the server receives

When an AI assistant calls one of the server's tools, the server receives that call's arguments: a
search text, a guide name (slug), a language code (`en` or `ka`) or a list filter. A search text is
whatever the assistant sends to look up a guide, so it can contain words from your question.

The server also receives the standard parts of any web request, such as the time, the IP address and
the user agent of the assistant's servers.

The server does not receive your conversation, your name, your email address or any account details.
It has no sign-in, sets no cookies and keeps no user accounts.

## How it is used and stored

The server answers each call from a fixed list of guide summaries built into its code. It has no
database or file storage, and it does not write the search text or other arguments to a log of its own.

## Logs kept by our hosting provider

The server runs on Cloudflare Workers. Cloudflare keeps a log of each request to the server, with
request and response metadata such as the time, the URL, the response status and connection details,
for up to 7 days. We read these logs only to find and fix errors.

## Sharing

We do not sell or share what the server receives. Cloudflare processes requests as our hosting
provider under its own privacy policy: https://www.cloudflare.com/privacypolicy/

The AI assistant you use handles your conversation under its own privacy policy.

## Retention

The server keeps nothing after it answers a call. Cloudflare's request logs are deleted after at most
7 days.

## Contact

support@kartvelians.com
