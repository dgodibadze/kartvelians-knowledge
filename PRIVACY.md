# Privacy policy: kartvelians.com MCP server

Effective 2026-10-21. This policy covers the MCP server at `https://kartvelians.com/mcp` and the
skill in this repository. The kartvelians.com website has its own policy at
https://kartvelians.com/privacy.

## What the server receives

When an AI assistant calls a tool, the server receives the tool's arguments: a search text, a
guide name (slug), a language code (`en` or `ka`) or a status filter. It also receives the standard
parts of any web request, such as the time, the IP address and the user agent of the assistant's
servers.

The server does not receive your conversation, your name, your email or any account details. It
has no sign-in, sets no cookies and keeps no user accounts.

## How it is used and stored

The server answers each call from a fixed list of guide summaries built into its code, then
forgets the call. It has no database or file storage and writes no logs of its own.

The server runs on Cloudflare Workers. Cloudflare keeps a log of each request to this server
(request and response metadata, such as the time, the URL and the response status) for up to
7 days. We read these logs only to find and fix errors.

## Sharing

We do not sell or share what the server receives. Cloudflare processes requests as our hosting
provider under its own privacy policy: https://www.cloudflare.com/privacypolicy/

The AI assistant you use (for example Claude or ChatGPT) handles your conversation under its own
privacy policy.

## Retention

Nothing is kept by the server. Cloudflare's request logs are deleted after at most 7 days.

## Contact

support@kartvelians.com
