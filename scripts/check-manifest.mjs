#!/usr/bin/env node
// Safety check for the manifest. Exits 1 on any violation.
// Usage: node scripts/check-manifest.mjs [--live]
//   --live  also fetch each guide URL: it must return 200, and no summary or key fact
//           may share a run of 8 or more words with the live guide text.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const LIVE = process.argv.includes("--live");
const SITE = "https://kartvelians.com/";
const SUMMARY_WARN = 400;
const SUMMARY_MAX = 450;
const SHINGLE = 8;

const errors = [];
const warnings = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const topicsDoc = JSON.parse(read("manifest/topics.json"));
const plannedDoc = JSON.parse(read("manifest/planned.json"));

const TOPIC_KEYS = new Set([
	"slug", "title_ka", "title_en", "summary_en", "summary_ka", "key_facts_en", "key_facts_ka",
	"keywords_en", "keywords_ka", "url", "risk", "disclaimer", "updated", "status",
]);
const REQUIRED = [...TOPIC_KEYS].filter((k) => k !== "disclaimer");
const PERSON_KEYS = /^(author|authors|by|name|names|poster|posted_by|contact|phone|email|group|groups|source_name)$/i;
const FACEBOOK = /facebook|\bfb\.(com|me|watch|gg)\b|\bm\.me\//i;
const GROUP = /\bgroups?\b|ჯგუფ/i;
const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g;

function strings(value, path = "") {
	if (typeof value === "string") return [[path, value]];
	if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
	if (value && typeof value === "object") {
		return Object.entries(value).flatMap(([k, v]) => {
			if (PERSON_KEYS.test(k)) fail(path || "manifest", `field "${k}" looks like a person or author field`);
			return strings(v, path ? `${path}.${k}` : k);
		});
	}
	return [];
}

function checkUrls(where, text) {
	for (const url of text.match(URL_RE) ?? []) {
		if (!url.startsWith(SITE)) fail(where, `URL not under ${SITE}: ${url}`);
	}
}

// --- topics.json
const topics = topicsDoc.topics;
if (!Array.isArray(topics) || topics.length === 0) fail("topics.json", "no topics");
const slugs = new Set();

for (const t of topics ?? []) {
	const at = `topics.json[${t.slug ?? "?"}]`;
	for (const k of REQUIRED) if (t[k] === undefined || t[k] === "") fail(at, `missing ${k}`);
	for (const k of Object.keys(t)) if (!TOPIC_KEYS.has(k)) fail(at, `unexpected field "${k}"`);
	if (slugs.has(t.slug)) fail(at, "duplicate slug");
	slugs.add(t.slug);
	if (!/^[a-z0-9-]+$/.test(t.slug ?? "")) fail(at, "slug must be lowercase letters, digits and hyphens");
	if (t.url !== `${SITE}ny/newcomers/${t.slug}`) fail(at, `url must be ${SITE}ny/newcomers/${t.slug}`);
	if (t.status !== "published") fail(at, 'status must be "published"');
	if (!["normal", "high"].includes(t.risk)) fail(at, 'risk must be "normal" or "high"');
	if (t.risk === "high" && !(t.disclaimer?.en && t.disclaimer?.ka)) fail(at, "high-risk entry needs disclaimer.en and disclaimer.ka");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(t.updated ?? "")) fail(at, "updated must be YYYY-MM-DD");

	for (const lang of ["en", "ka"]) {
		const s = t[`summary_${lang}`] ?? "";
		if (s.length > SUMMARY_MAX) fail(at, `summary_${lang} is ${s.length} chars (max ${SUMMARY_MAX})`);
		else if (s.length > SUMMARY_WARN) warn(at, `summary_${lang} is ${s.length} chars (target ${SUMMARY_WARN})`);
		const sentences = s.split(/[.!?](\s|$)/).filter((x) => x.trim()).length;
		if (sentences > 3) warn(at, `summary_${lang} has ${sentences} sentences (target 2 to 3)`);
		const facts = t[`key_facts_${lang}`] ?? [];
		if (facts.length < 3 || facts.length > 5) fail(at, `key_facts_${lang} must have 3 to 5 items`);
		for (const f of facts) if (f.length > 300) fail(at, `a key fact in ${lang} is over 300 chars`);
	}
	if ((t.key_facts_en ?? []).length !== (t.key_facts_ka ?? []).length) warn(at, "key_facts_en and key_facts_ka differ in length");
}

for (const [path, text] of strings(topicsDoc)) {
	if (FACEBOOK.test(text)) fail(`topics.json ${path}`, "mentions Facebook");
	if (GROUP.test(text)) fail(`topics.json ${path}`, "mentions a group (no group names in summaries)");
	if (PHONE.test(text)) fail(`topics.json ${path}`, "contains a phone number");
	checkUrls(`topics.json ${path}`, text);
}

// --- planned.json: English titles only
for (const [i, p] of (plannedDoc.planned ?? []).entries()) {
	const at = `planned.json[${i}]`;
	const keys = Object.keys(p);
	if (keys.some((k) => !["title_en", "status"].includes(k))) fail(at, "only title_en and status are allowed");
	if (p.status !== "planned") fail(at, 'status must be "planned"');
	if (/[Ⴀ-ჿ]/.test(p.title_en ?? "")) fail(at, "title must be English");
	if (/https?:|www\.|\d{4}|@/.test(p.title_en ?? "")) fail(at, "title may not contain links, dates or handles");
	if ((p.title_en ?? "").length > 80) fail(at, "title over 80 chars");
	if (slugs.size && [...slugs].some((s) => (p.title_en ?? "").toLowerCase() === s)) fail(at, "already published");
}
for (const [path, text] of strings(plannedDoc)) {
	if (FACEBOOK.test(text) || GROUP.test(text)) fail(`planned.json ${path}`, "mentions Facebook or a group");
}

// --- every text file in the repo: no Facebook links or group names
const SKIP = new Set(["node_modules", ".git", ".wrangler", "check-manifest.mjs"]);
function walk(dir) {
	for (const name of readdirSync(dir)) {
		if (SKIP.has(name)) continue;
		const p = join(dir, name);
		if (relative(ROOT, p) === "eval/results") continue; // generated test output, not committed
		if (statSync(p).isDirectory()) walk(p);
		else if (/\.(md|json|txt|ts|mjs|js|toml|ya?ml)$/.test(name) && !name.endsWith("lock.json")) {
			const text = readFileSync(p, "utf8");
			if (FACEBOOK.test(text)) fail(relative(ROOT, p), "mentions Facebook");
		}
	}
}
walk(ROOT);
checkUrls("plugin/skills/kartvelians-knowledge/SKILL.md", read("plugin/skills/kartvelians-knowledge/SKILL.md"));

// --- live checks
if (LIVE) {
	const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}$%]+/gu) ?? [];
	for (const t of topics) {
		const at = `live[${t.slug}]`;
		let res;
		try {
			res = await fetch(t.url, { redirect: "manual" });
		} catch (e) {
			fail(at, `fetch failed: ${e.message}`);
			continue;
		}
		if (res.status !== 200) {
			fail(at, `${t.url} returned ${res.status}`);
			continue;
		}
		const page = (await res.text())
			.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
			// The site shows our own English summary in this box; compare against the guide text only.
			.replace(/<aside[^>]*class="[^"]*\bnc-en\b[^"]*"[\s\S]*?<\/aside>/gi, " ")
			.replace(/<[^>]+>/g, " ");
		const pw = words(page);
		const shingles = new Set();
		for (let i = 0; i + SHINGLE <= pw.length; i++) shingles.add(pw.slice(i, i + SHINGLE).join(" "));
		const own = [t.summary_ka, t.summary_en, ...t.key_facts_ka, ...t.key_facts_en];
		for (const text of own) {
			const w = words(text);
			for (let i = 0; i + SHINGLE <= w.length; i++) {
				const s = w.slice(i, i + SHINGLE).join(" ");
				if (shingles.has(s)) {
					fail(at, `shares ${SHINGLE}+ words with the live guide: "${s}"`);
					break;
				}
			}
		}
	}
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`FAIL  ${e}`);
console.log(`${topics?.length ?? 0} topics, ${plannedDoc.planned?.length ?? 0} planned, ${errors.length} errors, ${warnings.length} warnings${LIVE ? " (live)" : ""}`);
process.exit(errors.length ? 1 : 0);
