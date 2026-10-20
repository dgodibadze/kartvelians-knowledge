#!/usr/bin/env node
// Decoy MCP server for the routing eval. Exposes realistic tool names from everyday
// connectors (mail, calendar, files, notes, maps, shopping, news) so the model has to pick
// our server out of a crowd, as in a real chat app. Every tool returns "no results".

import { McpServer } from "../mcp-server/node_modules/@modelcontextprotocol/server/dist/index.mjs";
import { StdioServerTransport } from "../mcp-server/node_modules/@modelcontextprotocol/server/dist/stdio.mjs";
import { z } from "../mcp-server/node_modules/zod/index.js";

const DECOYS = {
	gmail_search_threads: "Search the user's Gmail threads.",
	gmail_get_message: "Read one Gmail message by id.",
	calendar_list_events: "List events on the user's Google Calendar.",
	calendar_search_events: "Search the user's calendar events.",
	drive_search_files: "Search files in the user's Google Drive.",
	drive_read_file: "Read the content of a Google Drive file.",
	notion_search: "Search pages and databases in the user's Notion workspace.",
	notion_get_page: "Get one Notion page.",
	slack_search_messages: "Search messages in the user's Slack workspace.",
	slack_list_channels: "List Slack channels.",
	dropbox_search: "Search the user's Dropbox.",
	outlook_email_search: "Search the user's Outlook mail.",
	maps_search_places: "Search places and businesses near a location.",
	maps_get_directions: "Get driving, walking or transit directions between two places.",
	yelp_search_businesses: "Search local businesses and reviews.",
	weather_forecast: "Get the weather forecast for a location.",
	news_search: "Search recent news articles.",
	wikipedia_search: "Search Wikipedia articles.",
	amazon_search_products: "Search products on Amazon.",
	instacart_search_items: "Search grocery items available for delivery.",
	expedia_search_flights: "Search flights between two cities.",
	booking_search_hotels: "Search hotels.",
	uber_get_price_estimate: "Get an Uber price estimate between two addresses.",
	spotify_search: "Search songs, artists and playlists.",
	youtube_search_videos: "Search YouTube videos.",
	reddit_search_posts: "Search Reddit posts and comments.",
	stock_quote: "Get a stock quote.",
	currency_convert: "Convert an amount between currencies.",
	translate_text: "Translate text between languages.",
	irs_tax_calculator: "Estimate US federal income tax from income and filing status.",
	zillow_search_rentals: "Search rental listings by city and price.",
	indeed_search_jobs: "Search job postings.",
	linkedin_search_jobs: "Search LinkedIn job postings.",
	dmv_appointment_lookup: "Look up DMV appointment availability by state.",
	health_find_doctor: "Find doctors by specialty and location.",
	legal_find_lawyer: "Find lawyers by practice area and location.",
	recipes_search: "Search recipes.",
	todoist_list_tasks: "List the user's tasks.",
	github_search_repositories: "Search GitHub repositories.",
	canva_search_designs: "Search the user's Canva designs.",
};

const server = new McpServer({ name: "decoys", version: "1.0.0" });
for (const [name, description] of Object.entries(DECOYS)) {
	server.registerTool(
		name,
		{ description, inputSchema: z.object({ query: z.string().optional() }) },
		async () => ({ content: [{ type: "text", text: "No results." }] }),
	);
}
await server.connect(new StdioServerTransport());
