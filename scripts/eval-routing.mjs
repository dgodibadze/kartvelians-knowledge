#!/usr/bin/env node
// Routing eval: does Claude choose this MCP server over web search, and does our search
// return the right guide? Runs each question through the Claude Code CLI (`claude -p`),
// which uses the signed-in Claude subscription. No API key needed.
//
// Usage: node scripts/eval-routing.mjs [--deferred] [--model claude-sonnet-5-5]
//                                      [--url https://kartvelians.com/mcp] [--only id,id]
//   --deferred  hide MCP tools behind tool search (the model sees names only until it
//               loads them), as some chat apps do. Note: web search is hidden the same way.
//   --hard      add eval/decoy-server.mjs (40 everyday connector tools) and a neutral system
//               prompt with no hint about connected tools.

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const opt = (name, fallback) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : fallback;
};
const DEFERRED = args.includes("--deferred");
const HARD = args.includes("--hard");
const MODEL = opt("--model", "claude-sonnet-5-5");
const URL_ = opt("--url", "https://kartvelians.com/mcp");
const ONLY = opt("--only", "")?.split(",").filter(Boolean);
const CONCURRENCY = 4;

const PREFIX = "mcp__kartvelians__";
// Read tool names from the server under test, so older versions can be compared.
const listed = await fetch(URL_, {
	method: "POST",
	headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
	body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
}).then((r) => r.text());
const TOOLS = [...new Set([...listed.matchAll(/"name":"([a-z_]+)"/g)].map((m) => m[1]))];
const SEARCH_TOOL = PREFIX + TOOLS.find((t) => t.startsWith("search"));
const GET_TOOL = PREFIX + TOOLS.find((t) => t.startsWith("get"));
if (TOOLS.length < 3) throw new Error(`could not read tools from ${URL_}`);
const SYSTEM = HARD
	? "You are Claude, a helpful AI assistant."
	: "You are a helpful assistant in a consumer chat app. Answer the user's question. You can search the web and use the user's connected tools.";

const { questions } = JSON.parse(readFileSync(join(ROOT, "eval/questions.json"), "utf8"));
const todo = ONLY.length ? questions.filter((q) => ONLY.includes(q.id)) : questions;

const work = mkdtempSync(join(tmpdir(), "kk-eval-"));
const servers = { kartvelians: { type: "http", url: URL_ } };
if (HARD) servers.decoys = { type: "stdio", command: process.execPath, args: [join(ROOT, "eval/decoy-server.mjs")] };
writeFileSync(join(work, "mcp.json"), JSON.stringify({ mcpServers: servers }));

function run(q) {
	const builtins = DEFERRED ? "WebSearch,ToolSearch" : "WebSearch";
	const allowed = [...builtins.split(","), ...TOOLS.map((t) => PREFIX + t), ...(HARD ? ["mcp__decoys"] : [])].join(",");
	const argv = [
		"-p", q.q, "--model", MODEL, "--strict-mcp-config", "--mcp-config", "mcp.json",
		"--tools", builtins, "--allowedTools", allowed, "--setting-sources", "project",
		"--system-prompt", SYSTEM, "--output-format", "stream-json", "--verbose",
		"--no-session-persistence", "--max-turns", "6",
	];
	const env = { ...process.env, ENABLE_TOOL_SEARCH: DEFERRED ? "true" : "false" };
	return new Promise((resolve) => {
		const child = spawn("claude", argv, { cwd: work, env, stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		child.stdout.on("data", (d) => (out += d));
		child.on("close", (code) => resolve(parse(q, out, code)));
	});
}

function parse(q, out, code) {
	const r = { id: q.id, group: q.group, q: q.q, expect: q.expect, tools: [], slugs: [], noMatch: false, webSearch: false, cost: 0, exit: code, answer: "" };
	const pending = new Map();
	for (const line of out.split("\n")) {
		let e;
		try {
			e = JSON.parse(line);
		} catch {
			continue;
		}
		if (e.type === "assistant") {
			for (const c of e.message.content) {
				if (c.type !== "tool_use") continue;
				r.tools.push(c.name.replace(PREFIX, "kk:").replace("mcp__decoys__", "decoy:"));
				if (c.name === "WebSearch") r.webSearch = true;
				pending.set(c.id, c);
				if (c.name === GET_TOOL) r.slugs.push(c.input.slug);
			}
		}
		if (e.type === "user") {
			for (const c of e.message.content ?? []) {
				if (c.type !== "tool_result") continue;
				const call = pending.get(c.tool_use_id);
				if (call?.name !== SEARCH_TOOL) continue;
				const text = Array.isArray(c.content) ? c.content.map((x) => x.text ?? "").join("") : String(c.content);
				try {
					const body = JSON.parse(text);
					if (body.results?.length) r.slugs.push(body.results[0].slug);
					else r.noMatch = true;
				} catch {
					/* not JSON: ignore */
				}
			}
		}
		if (e.type === "result") {
			r.cost = e.total_cost_usd ?? 0;
			r.answer = e.result ?? "";
		}
	}
	r.calledOurs = r.tools.some((t) => t.startsWith("kk:"));
	if (Array.isArray(q.expect)) r.pass = r.calledOurs && r.slugs.some((s) => q.expect.includes(s));
	else if (q.expect === "none") r.pass = !r.calledOurs || (r.noMatch && r.slugs.length === 0);
	else r.pass = !r.calledOurs;
	return r;
}

const results = [];
console.log(`decoy tools called: counted per question in the tool list`);
let next = 0;
async function worker() {
	while (next < todo.length) {
		const q = todo[next++];
		const r = await run(q);
		results.push(r);
		const mark = r.pass ? "ok  " : "MISS";
		console.log(`${mark} ${r.id.padEnd(16)} ours=${r.calledOurs ? "y" : "n"} web=${r.webSearch ? "y" : "n"} slug=${r.slugs[0] ?? (r.noMatch ? "no-match" : "-")}  [${r.tools.join(" ")}]`);
	}
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const order = new Map(questions.map((q, i) => [q.id, i]));
results.sort((a, b) => order.get(a.id) - order.get(b.id));
const groups = [...new Set(results.map((r) => r.group))];
console.log(`\n${DEFERRED ? "deferred tools" : "tools visible"}${HARD ? ", hard (decoys, neutral prompt)" : ""}, model ${MODEL}, ${URL_}, tools: ${TOOLS.join(", ")}`);
for (const g of groups) {
	const rs = results.filter((r) => r.group === g);
	const called = rs.filter((r) => r.calledOurs).length;
	console.log(`${g.padEnd(17)} pass ${rs.filter((r) => r.pass).length}/${rs.length}   called server ${called}/${rs.length}`);
}
const cost = results.reduce((s, r) => s + r.cost, 0);
console.log(`total pass ${results.filter((r) => r.pass).length}/${results.length}, est. cost $${cost.toFixed(2)}`);

const dir = join(ROOT, "eval/results");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${DEFERRED ? "deferred" : "visible"}${HARD ? "-hard" : ""}-${MODEL}.json`);
writeFileSync(file, JSON.stringify({ model: MODEL, deferred: DEFERRED, url: URL_, results }, null, 2));
console.log(`saved ${file}`);
