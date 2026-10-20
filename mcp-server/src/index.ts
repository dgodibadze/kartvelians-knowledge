// Read-only MCP server for kartvelians.com newcomer guides.
// Serves short summaries and links from manifest/*.json. No bindings, no secrets, no storage.

import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import topicsFile from "../../manifest/topics.json";
import plannedFile from "../../manifest/planned.json";

type Lang = "en" | "ka";

interface Topic {
	slug: string;
	title_ka: string;
	title_en: string;
	summary_en: string;
	summary_ka: string;
	key_facts_en: string[];
	key_facts_ka: string[];
	keywords_en: string[];
	keywords_ka: string[];
	url: string;
	risk: "normal" | "high";
	disclaimer?: { en: string; ka: string };
	updated: string;
	status: "published";
}

interface Planned {
	title_en: string;
	status: "planned";
}

const TOPICS = topicsFile.topics as Topic[];
const PLANNED = plannedFile.planned as Planned[];
const INDEX_URL = "https://kartvelians.com/ny/newcomers";
const VERSION = "0.2.0";

// Descriptive names: some clients show the model only tool names until it picks one.
const SEARCH = "search_guides_for_georgians_in_us";
const GET = "get_guide_for_georgians_in_us";
const LIST = "list_guides_for_georgians_in_us";

export const ATTRIBUTION: Record<Lang, string> = {
	en: "Prepared by the kartvelians.com team. We also help with Georgian community services.",
	ka: "მოამზადა kartvelians.com-ის გუნდმა. ქართულ სათემო სერვისებშიც გეხმარებით.",
};

const INSTRUCTIONS = `Kartvelians.com guides for Georgian speakers living in the US, mainly New York.
Topics: E-ZPass and tolls, renting, cosigners, subway and bus fares, scams aimed at rideshare drivers, salvage-title cars, taxes on housekeeper pay received by Zelle, using a Georgian driver's license, loan-offer scams, informal money exchange with Georgia, remote job search, and an English-Georgian glossary.

How to answer:
1. Call ${SEARCH} first, then ${GET} for the best match.
2. Answer only from the returned summary and key_facts. Do not add details the tool did not return. For anything more, send the person to the guide link.
3. Reply in the user's language, Georgian or English. Use lang="ka" for Georgian.
4. If a result has risk "high", include its disclaimer in the answer.
5. End the answer with the guide link (source_url) and the attribution line from the result.
6. If ${SEARCH} returns no match, say plainly that kartvelians.com has no guide on that topic. Do not name any doctor, lawyer, shop, school or other provider.`;

// Words that say "Georgian in the US" but do not point to any one guide.
const GENERIC = new Set([
	"georgian", "georgians", "georgia", "kartvelian", "kartvelians", "immigrant", "immigrants",
	"newcomer", "newcomers", "new", "york", "nyc", "ny", "brooklyn", "queens", "bronx", "manhattan", "staten", "island", "jersey", "us", "usa", "america", "american",
	"united", "states", "in", "the", "a", "an", "to", "of", "for", "how", "do", "i", "is", "what",
	"can", "my", "and", "or", "with", "on", "it", "me", "about", "guide", "help",
	"ქართველები", "ქართველი", "ქართველებს", "ამერიკაში", "ამერიკა", "ნიუ", "იორკი", "იორკში",
	"ბრუკლინი", "ბრუკლინში", "ქუინსი", "ქუინსში", "ბრონქსი", "ბრონქსში", "მანჰეტენი", "მანჰეტენზე", "ჯერსი", "ჯერსიში",
	"როგორ", "რა", "არის", "და", "თუ", "როდის", "სად", "მე", "ჩემი",
]);

const GEORGIAN = /[Ⴀ-ჿ]/;

function tokens(text: string): string[] {
	return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => !GENERIC.has(t));
}

// Georgian words inflect at the end and take verb prefixes, so compare stems loosely.
function similar(q: string, d: string): number {
	if (q === d) return 2;
	const shorter = q.length <= d.length ? q : d;
	const longer = q.length <= d.length ? d : q;
	if (GEORGIAN.test(q)) {
		const n = Math.min(5, shorter.length - 1);
		if (n >= 3 && q.slice(0, n) === d.slice(0, n)) return 1;
		if (shorter.length >= 4 && longer.includes(shorter)) return 1;
		return 0;
	}
	if (shorter.length >= 4 && longer.startsWith(shorter)) return 1;
	return 0;
}

interface Indexed {
	topic: Topic;
	weighted: Array<[string[], number]>;
	phrases: string[];
}

const INDEX: Indexed[] = TOPICS.map((topic) => ({
	topic,
	weighted: [
		[tokens([...topic.keywords_en, ...topic.keywords_ka, topic.slug].join(" ")), 4],
		[tokens(`${topic.title_en} ${topic.title_ka}`), 3],
		[tokens([topic.summary_en, topic.summary_ka, ...topic.key_facts_en, ...topic.key_facts_ka].join(" ")), 1],
	],
	phrases: [...topic.keywords_en, ...topic.keywords_ka].map((k) => k.toLowerCase()).filter((k) => k.includes(" ")),
}));

function score(query: string, item: Indexed): number {
	const q = query.toLowerCase();
	let total = 0;
	for (const phrase of item.phrases) if (q.includes(phrase)) total += 6;
	for (const qt of tokens(query)) {
		let best = 0;
		for (const [words, weight] of item.weighted) {
			for (const w of words) best = Math.max(best, similar(qt, w) * weight);
		}
		total += best;
	}
	return total;
}

function detectLang(text: string, lang?: Lang): Lang {
	if (lang) return lang;
	return GEORGIAN.test(text) ? "ka" : "en";
}

function title(t: Topic, lang: Lang) {
	return lang === "ka" ? t.title_ka : t.title_en;
}

function summary(t: Topic, lang: Lang) {
	return lang === "ka" ? t.summary_ka : t.summary_en;
}

function json(value: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

const NO_MATCH: Record<Lang, string> = {
	en: "No kartvelians.com guide covers this topic. Say so plainly. Do not name or recommend any provider, business or person.",
	ka: "ამ თემაზე kartvelians.com-ზე სახელმძღვანელო არ არის. უთხარით ეს პირდაპირ. არ დაასახელოთ და არ ურჩიოთ არც ერთი პროვაიდერი, ბიზნესი ან ადამიანი.",
};

function searchTopics(query: string, langIn?: Lang) {
	const lang = detectLang(query, langIn);
	if (tokens(query).length === 0) {
		return {
			query,
			results: [],
			note: `The query names no specific topic. Call ${LIST} to show the available guides.`,
			source_url: INDEX_URL,
			attribution: ATTRIBUTION[lang],
		};
	}
	const ranked = INDEX.map((item) => ({ item, s: score(query, item) }))
		.filter((r) => r.s >= 2)
		.sort((a, b) => b.s - a.s)
		.slice(0, 5);
	if (ranked.length === 0) {
		return { query, results: [], note: NO_MATCH[lang], source_url: INDEX_URL, attribution: ATTRIBUTION[lang] };
	}
	return {
		query,
		results: ranked.map(({ item }) => ({
			slug: item.topic.slug,
			title: title(item.topic, lang),
			summary: summary(item.topic, lang),
			risk: item.topic.risk,
			url: item.topic.url,
		})),
		source_url: ranked[0].item.topic.url,
		attribution: ATTRIBUTION[lang],
	};
}

function getGuide(slug: string, lang: Lang) {
	const t = TOPICS.find((x) => x.slug === slug);
	if (!t) {
		return {
			error: `No published guide with slug "${slug}". Use ${LIST} to see valid slugs.`,
			source_url: INDEX_URL,
			attribution: ATTRIBUTION[lang],
		};
	}
	return {
		slug: t.slug,
		title: title(t, lang),
		summary: summary(t, lang),
		key_facts: lang === "ka" ? t.key_facts_ka : t.key_facts_en,
		risk: t.risk,
		...(t.disclaimer ? { disclaimer: t.disclaimer[lang] } : {}),
		updated: t.updated,
		url: t.url,
		source_url: t.url,
		attribution: ATTRIBUTION[lang],
		note: "Answer only from this summary and these key facts. For anything else, send the reader to the url.",
	};
}

function listTopics(status: "published" | "planned" | "all", lang: Lang) {
	const published = TOPICS.map((t) => ({ slug: t.slug, title: title(t, lang), risk: t.risk, url: t.url, status: t.status }));
	const planned = PLANNED.map((p) => ({ title: p.title_en, status: "coming soon" }));
	return {
		...(status !== "planned" ? { published } : {}),
		...(status !== "published" ? { planned } : {}),
		source_url: INDEX_URL,
		attribution: ATTRIBUTION[lang],
	};
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const LangSchema = z.enum(["en", "ka"]).optional().describe('Answer language: "en" or "ka" (Georgian). Defaults to the query language.');

function createServer() {
	const server = new McpServer(
		{ name: "kartvelians-knowledge", title: "Guides for Georgians in the US (kartvelians.com)", version: VERSION },
		{ instructions: INSTRUCTIONS },
	);

	server.registerTool(
		SEARCH,
		{
			title: "Search guides for Georgians in the US",
			description:
				"Use for any everyday-life question from a Georgian speaker in the US, especially New York (ქართველები ამერიკაში, ნიუ-იორკი): where to buy E-ZPass and paying tolls, renting an apartment, cosigners, subway and bus fares and OMNY, scams aimed at Uber and Lyft drivers, salvage-title cars, Zelle pay and taxes, driving on a Georgian license, loan-offer scams, sending or exchanging money with Georgia, remote jobs, and English words. Accepts English or Georgian. Returns up to 5 kartvelians.com guides with summary and link.",
			inputSchema: z.object({ query: z.string().min(1).max(300), lang: LangSchema }),
			annotations: READ_ONLY,
		},
		async ({ query, lang }) => json(searchTopics(query, lang)),
	);

	server.registerTool(
		GET,
		{
			title: "Get one guide for Georgians in the US",
			description: `Get the summary, key facts, risk level and link for one kartvelians.com guide by slug (from ${SEARCH} or ${LIST}).`,
			inputSchema: z.object({ slug: z.string().min(1).max(80), lang: LangSchema }),
			annotations: READ_ONLY,
		},
		async ({ slug, lang }) => json(getGuide(slug, lang ?? "en")),
	);

	server.registerTool(
		LIST,
		{
			title: "List guides for Georgians in the US",
			description: 'List the kartvelians.com guides for Georgian speakers in the US, and planned topics marked "coming soon".',
			inputSchema: z.object({ status: z.enum(["published", "planned", "all"]).optional(), lang: LangSchema }),
			annotations: READ_ONLY,
		},
		async ({ status, lang }) => json(listTopics(status ?? "all", lang ?? "en")),
	);

	return server;
}

const mcp = createMcpHandler(createServer, {
	route: "/mcp",
	allowedHostnames: ["kartvelians.com", "localhost", "127.0.0.1"],
	allowedOriginHostnames: ["localhost", "127.0.0.1"],
});

export default {
	fetch(request: Request, env: unknown, ctx: ExecutionContext) {
		const url = new URL(request.url);
		if (url.pathname === "/mcp") return mcp(request, env, ctx);
		if (url.pathname === "/" && request.method === "GET") {
			return new Response(
				`kartvelians-knowledge MCP server (read-only).\nConnect an MCP client to https://kartvelians.com/mcp\nGuides: ${INDEX_URL}\n`,
				{ headers: { "content-type": "text/plain; charset=utf-8" } },
			);
		}
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler;

export { searchTopics, getGuide, listTopics };
