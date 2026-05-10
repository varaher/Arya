/**
 * News Service — fetches latest India & world headlines from free RSS feeds.
 * No API key required.
 * Sources: Times of India, NDTV, The Hindu, Economic Times, Moneycontrol,
 *          ET Markets, NDTV Profit, Reuters India, NASA Science.
 * Market/financial feeds refresh every 10 minutes; general news every 30 minutes.
 */

export interface NewsHeadline {
  title: string;
  source: string;
  link: string;
  pubDate?: string;
  description?: string;
  category: "india" | "world" | "business" | "markets" | "science" | "tech" | "sport";
}

const GENERAL_FEEDS: { url: string; source: string; category: NewsHeadline["category"] }[] = [
  { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", source: "Times of India", category: "india" },
  { url: "https://feeds.feedburner.com/ndtvnews-top-stories", source: "NDTV", category: "india" },
  { url: "https://www.thehindu.com/news/national/?service=rss", source: "The Hindu", category: "india" },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", source: "Times of India", category: "world" },
  { url: "https://www.thehindu.com/sci-tech/science/?service=rss", source: "The Hindu", category: "science" },
  { url: "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms", source: "Economic Times", category: "tech" },
];

const MARKET_FEEDS: { url: string; source: string; category: NewsHeadline["category"] }[] = [
  { url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", source: "ET Markets", category: "markets" },
  { url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms", source: "ET Markets", category: "markets" },
  { url: "https://www.moneycontrol.com/rss/MCtopnews.xml", source: "Moneycontrol", category: "markets" },
  { url: "https://www.moneycontrol.com/rss/marketreports.xml", source: "Moneycontrol", category: "markets" },
  { url: "https://feeds.feedburner.com/ndtvnews-business", source: "NDTV Profit", category: "business" },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", source: "Times of India", category: "business" },
  { url: "https://economictimes.indiatimes.com/rssfeeds/1373380680.cms", source: "Economic Times", category: "business" },
];

// Separate caches for general news and market data
let cachedGeneral: NewsHeadline[] = [];
let lastGeneralFetch = 0;
const GENERAL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

let cachedMarkets: NewsHeadline[] = [];
let lastMarketFetch = 0;
const MARKET_CACHE_TTL = 10 * 60 * 1000; // 10 minutes — markets move fast

function extractText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/${tag}>`, "s"));
  return match ? match[1].trim()
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "") // strip any HTML tags
    : "";
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
    for (const block of itemBlocks.slice(0, 10)) {
      const title = extractText(block, "title");
      const link = extractText(block, "link") || extractText(block, "guid");
      const description = extractText(block, "description");
      const pubDate = extractText(block, "pubDate");
      if (title && title.length > 5) {
        items.push({ title, source, link, pubDate, description: description?.slice(0, 220), category });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchLatestNews(forceRefresh = false): Promise<NewsHeadline[]> {
  const now = Date.now();
  if (!forceRefresh && cachedGeneral.length > 0 && now - lastGeneralFetch < GENERAL_CACHE_TTL) {
    return [...cachedGeneral, ...cachedMarkets];
  }

  const results = await Promise.allSettled(
    GENERAL_FEEDS.map(f => fetchFeed(f.url, f.source, f.category))
  );

  const all: NewsHeadline[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (all.length > 0) {
    cachedGeneral = all;
    lastGeneralFetch = now;
    console.log(`[NEWS] Fetched ${all.length} general headlines`);
  }

  return [...(all.length > 0 ? all : cachedGeneral), ...cachedMarkets];
}

export async function fetchMarketNews(forceRefresh = false): Promise<NewsHeadline[]> {
  const now = Date.now();
  if (!forceRefresh && cachedMarkets.length > 0 && now - lastMarketFetch < MARKET_CACHE_TTL) {
    return cachedMarkets;
  }

  const results = await Promise.allSettled(
    MARKET_FEEDS.map(f => fetchFeed(f.url, f.source, f.category))
  );

  const all: NewsHeadline[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (all.length > 0) {
    cachedMarkets = all;
    lastMarketFetch = now;
    console.log(`[MARKETS] Fetched ${all.length} market headlines`);
  }

  return all.length > 0 ? all : cachedMarkets;
}

export function formatNewsForChat(headlines: NewsHeadline[], category?: string, limit = 8): string {
  let filtered = category && category !== "all"
    ? headlines.filter(h => h.category === category)
    : headlines;

  filtered = filtered.slice(0, limit);
  if (filtered.length === 0) return "";

  return filtered
    .map((h, i) => `${i + 1}. **${h.title}** *(${h.source})*${h.pubDate ? ` — ${new Date(h.pubDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST` : ""}${h.description ? `\n   ${h.description}` : ""}`)
    .join("\n\n");
}

export function getNewsDigestText(headlines: NewsHeadline[]): string {
  const india = headlines.filter(h => h.category === "india").slice(0, 4);
  const world = headlines.filter(h => h.category === "world").slice(0, 2);
  const biz = headlines.filter(h => h.category === "business" || h.category === "markets").slice(0, 3);

  const parts: string[] = [];
  if (india.length) parts.push(`🇮🇳 India:\n${india.map(h => `• ${h.title}`).join("\n")}`);
  if (world.length) parts.push(`🌏 World:\n${world.map(h => `• ${h.title}`).join("\n")}`);
  if (biz.length) parts.push(`📊 Markets & Business:\n${biz.map(h => `• ${h.title}`).join("\n")}`);
  return parts.join("\n\n");
}
