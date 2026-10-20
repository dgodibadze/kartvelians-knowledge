# kartvelians-knowledge

Lets AI assistants answer everyday-life questions from Georgian speakers in the US, mainly New
York, using the newcomer guides published on [kartvelians.com](https://kartvelians.com/ny/newcomers).

The assistant gets short summaries, a few key facts and a link to each guide. It never gets the
full guide text. Every answer points back to the guide on kartvelians.com.

Topics: E-ZPass and tolls, renting, cosigners, subway and bus fares, scams aimed at Uber and Lyft
drivers, salvage-title cars, taxes on housekeeper pay received by Zelle, driving on a Georgian
license, loan-offer scams, informal money exchange with Georgia, remote job search, and a glossary
of English words. Questions can be in English or Georgian.

## Connect

**Remote MCP server (any MCP client):** `https://kartvelians.com/mcp`
Streamable HTTP, read-only, no sign-in.

- Claude (web or desktop): Settings, Connectors, Add custom connector, paste the URL.
- Claude Code: `claude mcp add --transport http kartvelians https://kartvelians.com/mcp`
- Other clients: add a remote (streamable HTTP) MCP server with the URL above.

**Claude Code plugin (skill plus server):**

```
/plugin marketplace add dgodibadze/kartvelians-knowledge
/plugin install kartvelians-knowledge@kartvelians
```

The skill alone is at `plugin/skills/kartvelians-knowledge/SKILL.md`.

## Tools

| Tool | Returns |
|---|---|
| `search_guides_for_georgians_in_us(query, lang?)` | Up to 5 matching guides: slug, title, summary, risk, url |
| `get_guide_for_georgians_in_us(slug, lang?)` | Title, summary, key facts, risk, disclaimer if high risk, updated date, url |
| `list_guides_for_georgians_in_us(status?)` | Published guides, and planned topics marked "coming soon" |

Every reply includes `source_url` and an attribution line. `lang` is `en` or `ka`. It defaults to
the language of the query.

## Disclaimer

The summaries are general information as stated on each guide's update date. They are not legal,
tax or financial advice. Rules, fees and amounts change. Each guide cites the official sources it
relies on. Two topics are marked high risk and always carry the note "General information, not
legal or tax advice": taxes on housekeeper pay, and informal money exchange.

## Repository layout

```
manifest/topics.json          one entry per published guide
manifest/planned.json         planned topics, English titles only
plugin/                       Claude Code plugin: skill and MCP config
mcp-server/                   Cloudflare Worker serving the MCP endpoint
scripts/check-manifest.mjs    safety check, fails on a violation (--live also checks the site)
scripts/test-search.mjs       end-to-end test of the MCP server
server.json                   MCP Registry metadata
llms.txt                      copy of https://kartvelians.com/llms.txt
```

## Adding a guide

When a guide goes live on kartvelians.com:

1. Add its entry to `manifest/topics.json`. Write the summaries and key facts by hand. Do not paste guide text.
2. Remove it from `manifest/planned.json` if it was there.
3. Add a row to the table in `plugin/skills/kartvelians-knowledge/SKILL.md`.
4. Run `node scripts/check-manifest.mjs --live`.
5. Start `npx wrangler dev` in `mcp-server/` and run `node scripts/test-search.mjs`.
6. Commit, push, then deploy the Worker with `npx wrangler deploy` from `mcp-server/`.
7. Refresh `llms.txt` with `curl -s https://kartvelians.com/llms.txt > llms.txt` once the site's copy lists the guide.

## Licenses

Code: MIT, see `LICENSE`. Summaries: CC BY 4.0, see `CONTENT-LICENSE.md`. The full guides are not
included and remain © kartvelians.com.
