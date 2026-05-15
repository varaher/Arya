import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ── Seeded random (deterministic per day/hour) ────────────────
function sr(seed: number): number {
  const x = Math.sin(seed + 1.9438) * 43758.5453;
  return x - Math.floor(x);
}

function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function hourlySeed(): number {
  return dailySeed() * 100 + new Date().getHours();
}

// ── Market Indices ────────────────────────────────────────────
export interface IndexData {
  name: string;
  shortName: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[]; // 20 points, 0–100 normalised
}

const INDEX_BASES = [
  { name: "NIFTY 50",    shortName: "NIFTY",    base: 24350 },
  { name: "SENSEX",      shortName: "SENSEX",   base: 80200 },
  { name: "BANK NIFTY",  shortName: "BANK NF",  base: 52100 },
  { name: "NIFTY IT",    shortName: "NIFTY IT", base: 39400 },
];

export function getMarketIndices(): IndexData[] {
  const seed = hourlySeed();
  return INDEX_BASES.map((b, i) => {
    const pct = (sr(seed * 7 + i * 13) * 2.8 - 1.4) / 100; // ±1.4%
    const value = b.base * (1 + pct);
    const changeAbs = value - b.base;
    // build intraday sparkline: 20 points trending toward final value
    const spark = Array.from({ length: 20 }, (_, j) => {
      const noise = sr(seed * 5 + i * 17 + j * 11) * 20 - 10;
      const trend = (j / 19) * pct * 100 * 5; // amplify for visual
      return 50 + trend + noise * 0.5;
    });
    return {
      name: b.name,
      shortName: b.shortName,
      value: Math.round(value * 10) / 10,
      change: Math.round(changeAbs * 10) / 10,
      changePercent: Math.round(pct * 10000) / 100,
      sparkline: spark,
    };
  });
}

// ── Market News ───────────────────────────────────────────────
export interface NewsItem {
  id: string;
  headline: string;
  impactChips: string[];
  sentiment: "positive" | "negative" | "neutral";
  aryaRead: string;
}

// Two sets — rotate weekly so returning users see fresh content
const NEWS_SETS: NewsItem[][] = [
  [
    {
      id: "rbi-rates",
      headline: "RBI held interest rates steady — no EMI relief yet",
      impactChips: ["Home Loans", "Fixed Deposits", "Banks"],
      sentiment: "neutral",
      aryaRead: "Rates staying put means your EMI won't change this month. But it also means the 'rate cut rally' that investors were pricing in hasn't arrived.",
    },
    {
      id: "it-selloff",
      headline: "IT stocks fell 2.8% after weak US jobs data",
      impactChips: ["IT Sector", "US Markets", "Exports"],
      sentiment: "negative",
      aryaRead: "If you work in IT or hold IT stocks, you're exposed to the same risk twice — your job and your portfolio both depend on US tech spending.",
    },
    {
      id: "gold-high",
      headline: "Gold crossed ₹75,000 per 10g — a new all-time high",
      impactChips: ["Gold", "Rupee", "Inflation"],
      sentiment: "neutral",
      aryaRead: "Gold rising this sharply usually means people are nervous about something. Currency weakness, inflation, or global uncertainty — worth asking which one concerns you.",
    },
  ],
  [
    {
      id: "smallcap-warning",
      headline: "SEBI flagged 'froth' in small-cap stocks even as prices rose",
      impactChips: ["Small Caps", "Retail Investors", "SEBI"],
      sentiment: "neutral",
      aryaRead: "When a regulator publicly warns about overvaluation while prices are still rising — that's historically been a signal worth taking seriously.",
    },
    {
      id: "rupee-weak",
      headline: "Rupee hit a 6-month low against the dollar",
      impactChips: ["Imports", "Fuel", "Inflation"],
      sentiment: "negative",
      aryaRead: "A weaker rupee makes imported goods more expensive — fuel, electronics, raw materials. Your costs just went up quietly, even if nothing else changed.",
    },
    {
      id: "sip-record",
      headline: "SIP inflows hit ₹21,000 crore — a new monthly record",
      impactChips: ["Mutual Funds", "Long Term", "Retail"],
      sentiment: "positive",
      aryaRead: "Record SIP inflows during volatility is unusual discipline from retail investors. The question is whether that discipline holds if the market falls 25%.",
    },
  ],
  [
    {
      id: "fii-selling",
      headline: "Foreign investors pulled out ₹14,000 crore from Indian equities",
      impactChips: ["FII Flows", "Markets", "Currency"],
      sentiment: "negative",
      aryaRead: "FIIs leaving usually signals a risk-off environment globally — they're choosing safer assets elsewhere. This isn't about India specifically.",
    },
    {
      id: "nifty-ath",
      headline: "NIFTY hit a new all-time high for the third time this quarter",
      impactChips: ["Equities", "Retail Investors", "Valuations"],
      sentiment: "positive",
      aryaRead: "All-time highs feel good if you're already invested. But they're also when future returns tend to be more modest. Worth thinking about what you're expecting from here.",
    },
    {
      id: "realty-up",
      headline: "Real estate prices in metro cities up 12% year-on-year",
      impactChips: ["Real Estate", "Affordability", "Construction"],
      sentiment: "neutral",
      aryaRead: "Property prices rising 12% while incomes grow slower means affordability is declining. If you're weighing rent vs buy, the math has shifted again.",
    },
  ],
];

export function getMarketNews(): NewsItem[] {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  return NEWS_SETS[weekNum % NEWS_SETS.length];
}

// ── ARYA Market Response ──────────────────────────────────────
export interface AryaMarketResponse {
  content: string;
  pushQuestion: string;
  takeaway: string;
}

export async function askAryaAboutMarket(
  topic: string,
  businessType?: string,
  businessChallenge?: string,
): Promise<AryaMarketResponse> {
  const prompt = `You are ARYA — a thinking partner for personal and business financial decisions. You are NOT a financial advisor, broker, or investment professional.

User context:
- Business type: ${businessType || "not specified"}
- Current challenge on their mind: ${businessChallenge || "not specified"}

They are asking about: "${topic}"

YOUR RULES — non-negotiable:
1. NEVER give investment advice, price targets, buy/sell recommendations, or predictions
2. NEVER say "you should invest in X" or "X will go up/down"
3. Every response MUST end with a Socratic question specific to their situation — not a generic one
4. Be honest about uncertainty — no one reliably predicts markets
5. Use classical wisdom naturally if it fits (Chanakya on risk, Thiruvalluvar on limits) — don't force it
6. Maximum 90 words for main content — tight, direct, no filler
7. Plain language — no financial jargon at all
8. Focus on their thinking process: what they're assuming, what they're ignoring

Return ONLY valid JSON:
{
  "content": "Direct, honest response. What this means for how they should think — not what to do. No jargon.",
  "pushQuestion": "The specific Socratic question that makes them reflect on their own situation — not generic, tied to what they asked",
  "takeaway": "One sentence — the single most important thing to hold from this conversation"
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" } as any,
      max_tokens: 400,
      temperature: 0.7,
    } as any);

    const parsed = JSON.parse((resp as any).choices[0].message.content || "{}");
    return {
      content: parsed.content || "Markets create a lot of noise. The question is whether the signal changes anything about your plan.",
      pushQuestion: parsed.pushQuestion || "What specifically are you worried would happen — and what would you do if it did?",
      takeaway: parsed.takeaway || "The goal isn't to predict the market. It's to not need to.",
    };
  } catch {
    return {
      content: "Markets move in ways that no one reliably predicts. The more useful question is whether your current setup is resilient enough that the market's short-term moves don't need to matter.",
      pushQuestion: "If this situation stayed exactly as it is for 2 more years, what in your life would actually break?",
      takeaway: "Build for resilience, not for prediction.",
    };
  }
}
