/**
 * News Service — fetches latest India & world headlines from free RSS feeds.
 * No API key required. Sources: Times of India, NDTV, The Hindu, BBC India.
 * All news is presented through an Indian lens as per ARYA's core perspective.
 */

export interface NewsHeadline {
  title: string;
  source: string;
  link: string;
  pubDate?: string;
  description?: string;
  category: "india" | "world" | "business" | "science" | "sport";
}

const FEEDS: { url: string; source: string; category: NewsHeadline["category"] }[] = [
  { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", source: "Times of India", category: "india" },
  { url: "https://feeds.feedburner.com/ndtvnews-top-stories", source: "NDTV", category: "india" },
  { url: "https://www.thehindu.com/news/national/?service=rss", source: "The Hindu", category: "india" },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", source: "Times of India", category: "world" },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", source: "Times of India", category: "business" },
  { url: "https://www.thehindu.com/sci-tech/science/?service=rss", source: "The Hindu", category: "science" },
];

let cachedHeadlines: NewsHeadline[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function extractText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/${tag}>`, "s"));
  return match ? match[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"') : "";
}

async function fetchFeed(feedUrl: string, source: string, category: NewsHeadline["category"]): Promise<NewsHeadline[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ARYA-News-Bot/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();

    const items: NewsHeadline[] = [];
    const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    for (const block of itemBlocks.slice(0, 8)) {
      const title = extractText(block, "title");
      const link = extractText(block, "link") || extractText(block, "guid");
      const description = extractText(block, "description");
      const pubDate = extractText(block, "pubDate");
      if (title && title.length > 5) {
        items.push({ title, source, link, pubDate, description: description?.slice(0, 200), category });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchLatestNews(forceRefresh = false): Promise<NewsHeadline[]> {
  const now = Date.now();
  if (!forceRefresh && cachedHeadlines.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return cachedHeadlines;
  }

  const results = await Promise.allSettled(
    FEEDS.map(f => fetchFeed(f.url, f.source, f.category))
  );

  const all: NewsHeadline[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (all.length > 0) {
    cachedHeadlines = all;
    lastFetchTime = now;
    console.log(`[NEWS] Fetched ${all.length} headlines from ${results.filter(r => r.status === "fulfilled" && (r as any).value.length > 0).length} sources`);
  }

  return all.length > 0 ? all : cachedHeadlines;
}

export function formatNewsForChat(headlines: NewsHeadline[], category?: string, limit = 8): string {
  let filtered = category && category !== "all"
    ? headlines.filter(h => h.category === category)
    : headlines;

  filtered = filtered.slice(0, limit);
  if (filtered.length === 0) return "";

  return filtered
    .map((h, i) => `${i + 1}. **${h.title}** *(${h.source})*${h.description ? `\n   ${h.description}` : ""}`)
    .join("\n\n");
}

export function getNewsDigestText(headlines: NewsHeadline[]): string {
  const india = headlines.filter(h => h.category === "india").slice(0, 4);
  const world = headlines.filter(h => h.category === "world").slice(0, 2);
  const biz = headlines.filter(h => h.category === "business").slice(0, 2);

  const parts: string[] = [];
  if (india.length) parts.push(`🇮🇳 India:\n${india.map(h => `• ${h.title}`).join("\n")}`);
  if (world.length) parts.push(`🌏 World:\n${world.map(h => `• ${h.title}`).join("\n")}`);
  if (biz.length) parts.push(`📊 Business:\n${biz.map(h => `• ${h.title}`).join("\n")}`);
  return parts.join("\n\n");
}
