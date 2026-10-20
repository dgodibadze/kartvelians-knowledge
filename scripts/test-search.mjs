#!/usr/bin/env node
// End-to-end test of the MCP server over HTTP.
// Usage: node scripts/test-search.mjs [url]   (default http://localhost:8787/mcp)

const URL_ = process.argv[2] ?? "http://localhost:8787/mcp";
let id = 0;
const failures = [];

async function rpc(method, params) {
	const res = await fetch(URL_, {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
		body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method}: HTTP ${res.status} ${text.slice(0, 200)}`);
	const body = res.headers.get("content-type")?.includes("text/event-stream")
		? JSON.parse(text.split("\n").filter((l) => l.startsWith("data:")).pop().slice(5))
		: JSON.parse(text);
	if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
	return body.result;
}

async function call(name, args) {
	const result = await rpc("tools/call", { name, arguments: args });
	return JSON.parse(result.content[0].text);
}

function expect(label, ok, detail = "") {
	console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok ? "" : `  ${detail}`}`);
	if (!ok) failures.push(label);
}

function commonFields(label, r) {
	expect(`${label}: has source_url`, typeof r.source_url === "string" && r.source_url.startsWith("https://kartvelians.com/"));
	expect(`${label}: has attribution`, typeof r.attribution === "string" && r.attribution.includes("kartvelians.com"));
}

const init = await rpc("initialize", {
	protocolVersion: "2025-06-18",
	capabilities: {},
	clientInfo: { name: "test-search", version: "0" },
});
expect("initialize returns instructions", (init.instructions ?? "").includes("search_topics"));

const tools = await rpc("tools/list", {});
const names = tools.tools.map((t) => t.name).sort().join(",");
expect("three read-only tools", names === "get_guide,list_topics,search_topics", names);
expect("all tools marked read-only", tools.tools.every((t) => t.annotations?.readOnlyHint === true));

const cases = [
	["How do I pay tolls in New York?", "ezpass", "en"],
	["როგორ ვიქირაო ბინა ნიუ-იორკში?", "rent", "ka"],
	["Is Zelle pay taxable for a housekeeper?", "housekeeper-pay-taxes", "en"],
	["OMNY weekly fare cap", "subway", "en"],
	["should I buy a car with a salvage title", "salvage-title", "en"],
	["my landlord wants a cosigner", "cosigner", "en"],
	["can I drive in New York with a Georgian license", "id-license", "en"],
	["someone called offering me a loan", "loan-calls", "en"],
	["Uber support called asking for my code", "driver-scams", "en"],
	["exchange dollars for lari hand to hand with Georgia", "money-exchange", "en"],
	["remote job no response", "remote-job", "en"],
	["მეტროში რა ღირს მგზავრობა", "subway", "ka"],
	["უბერის მძღოლი ვარ და კოდს მთხოვენ", "driver-scams", "ka"],
	["how much can a landlord take as a security deposit", "rent", "en"],
	["what does security deposit mean in English words", "glossary", "en"],
];
for (const [q, slug, lang] of cases) {
	const r = await call("search_topics", { query: q });
	const top = r.results[0]?.slug;
	expect(`"${q}" -> ${slug}`, top === slug, `got ${r.results.map((x) => x.slug).join(",") || "none"}`);
	if (lang === "ka") expect(`"${q}" answered in Georgian`, /[Ⴀ-ჿ]/.test(r.results[0]?.summary ?? ""));
	commonFields(q, r);
}

for (const q of ["Recommend a Georgian doctor", "best Georgian restaurant in Brooklyn", "ქართველი სტომატოლოგი მჭირდება"]) {
	const r = await call("search_topics", { query: q });
	expect(`"${q}" -> no match`, r.results.length === 0, `got ${r.results.map((x) => x.slug).join(",")}`);
	expect(`"${q}" -> says no guide`, /no kartvelians\.com guide|სახელმძღვანელო არ არის/i.test(r.note ?? ""));
	commonFields(q, r);
}

const generic = await call("search_topics", { query: "Georgians in New York" });
expect("generic query -> points to list_topics", generic.results.length === 0 && /list_topics/.test(generic.note ?? ""));

const tax = await call("get_guide", { slug: "housekeeper-pay-taxes" });
expect("high-risk guide has disclaimer (en)", tax.disclaimer === "General information, not legal or tax advice.");
const taxKa = await call("get_guide", { slug: "housekeeper-pay-taxes", lang: "ka" });
expect("high-risk guide has disclaimer (ka)", /საგადასახადო რჩევა/.test(taxKa.disclaimer ?? ""));
commonFields("get_guide", tax);
expect("get_guide returns key facts", Array.isArray(tax.key_facts) && tax.key_facts.length >= 3);

const ez = await call("get_guide", { slug: "ezpass" });
expect("normal guide has no disclaimer", ez.disclaimer === undefined && ez.risk === "normal");

const missing = await call("get_guide", { slug: "doctor" });
expect("unknown slug -> error", typeof missing.error === "string");

const all = await call("list_topics", {});
expect("list_topics: 12 published", all.published?.length === 12, String(all.published?.length));
expect("list_topics: planned marked coming soon", all.planned?.length > 0 && all.planned.every((p) => p.status === "coming soon"));
expect("planned has no links", JSON.stringify(all.planned).match(/https?:/) === null);

console.log(failures.length ? `\n${failures.length} failed` : "\nall passed");
process.exit(failures.length ? 1 : 0);
