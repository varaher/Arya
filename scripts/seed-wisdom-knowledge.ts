// ══════════════════════════════════════════════════════════════════════════════
//  ARYA WISDOM KNOWLEDGE SEEDER
//
//  Usage:
//    npx tsx scripts/seed-wisdom-knowledge.ts          — shows current stats
//    npx tsx scripts/seed-wisdom-knowledge.ts translate — fills language_variants
//      for all reviewed entries that are missing them, using GPT-4o-mini.
//      Safe to run multiple times — only processes entries where variants are null.
//
//  Output costs: ~$0.01-0.05 per run depending on how many entries need translation.
// ══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";
import { Pool } from "pg";
import OpenAI from "openai";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const LANGUAGES = {
  hi: "Hindi (Devanagari script)",
  ta: "Tamil (Tamil script)",
  te: "Telugu (Telugu script)",
  ml: "Malayalam (Malayalam script)",
  kn: "Kannada (Kannada script)",
  bn: "Bengali (Bengali script)",
  gu: "Gujarati (Gujarati script)",
  pa: "Punjabi (Gurmukhi script)",
  or: "Odia (Odia script)",
  mr: "Marathi (Devanagari script)",
};

async function showStats() {
  const res = await pool.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN reviewed AND arya_principle IS NOT NULL THEN 1 ELSE 0 END) as wisdom_ready,
      SUM(CASE WHEN reviewed AND arya_principle IS NOT NULL AND language_variants IS NOT NULL THEN 1 ELSE 0 END) as with_translations,
      SUM(CASE WHEN reviewed AND arya_principle IS NOT NULL AND language_variants IS NULL THEN 1 ELSE 0 END) as needs_translation
    FROM arya_knowledge
    WHERE status = 'published'
  `);
  const s = res.rows[0];
  console.log("\n📚 ARYA Wisdom Knowledge — Current Status");
  console.log("─────────────────────────────────────────");
  console.log(`  Total records:          ${s.total}`);
  console.log(`  Wisdom-ready (reviewed): ${s.wisdom_ready}`);
  console.log(`  With translations:       ${s.with_translations}`);
  console.log(`  Needs translation:       ${s.needs_translation}`);
  console.log("");

  const byDomain = await pool.query(`
    SELECT domain, COUNT(*) as total,
      SUM(CASE WHEN reviewed AND arya_principle IS NOT NULL THEN 1 ELSE 0 END) as wisdom_ready
    FROM arya_knowledge
    WHERE status = 'published'
    GROUP BY domain ORDER BY domain
  `);
  console.log("  By domain:");
  for (const row of byDomain.rows) {
    const bar = "█".repeat(Number(row.wisdom_ready));
    console.log(`    ${row.domain.padEnd(16)} ${String(row.wisdom_ready).padStart(2)} wisdom-ready  ${bar}`);
  }
  console.log("");
}

async function translateEntry(id: string, principle: string, tradition: string): Promise<Record<string, string> | null> {
  const prompt = `You are translating wisdom for ARYA, an AI assistant.

Translate this wisdom insight into each of these languages. Return ONLY valid JSON with language codes as keys and translations as values.

CRITICAL RULES:
- Never cite any source, author, or text. The translation is ARYA's insight, not a quote.
- Keep the tone warm, direct, and natural — like a wise friend speaking in that language.
- Use natural spoken idiom, not formal literary style.
- 2-4 sentences maximum per translation.

Wisdom to translate:
"${principle}"

Languages needed (return only these keys):
${Object.entries(LANGUAGES).map(([k, v]) => `"${k}": ${v}`).join("\n")}

Return ONLY the JSON object. Example: {"hi": "...", "ta": "...", ...}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1200,
      temperature: 0.3,
    });
    const raw = resp.choices[0]?.message?.content || "{}";
    return JSON.parse(raw);
  } catch (err: any) {
    console.error(`  ✗ Translation failed for ${id}: ${err.message}`);
    return null;
  }
}

async function runTranslate() {
  console.log("\n🌐 Starting language_variants translation pass…");
  console.log("   (Only processes entries where language_variants IS NULL)\n");

  const res = await pool.query(`
    SELECT id, arya_principle, tradition, source_name
    FROM arya_knowledge
    WHERE reviewed = true
      AND arya_principle IS NOT NULL
      AND language_variants IS NULL
      AND status = 'published'
    ORDER BY tradition, source_name
  `);

  if (!res.rows.length) {
    console.log("✅ All reviewed entries already have language_variants. Nothing to do.");
    return;
  }

  console.log(`   Found ${res.rows.length} entries needing translation.\n`);

  let done = 0;
  let failed = 0;

  for (const row of res.rows) {
    const label = `${row.tradition || "?"} / ${row.source_name || row.id}`;
    process.stdout.write(`  Translating: ${label.slice(0, 60).padEnd(62)}`);

    const variants = await translateEntry(row.id, row.arya_principle, row.tradition || "");

    if (variants && Object.keys(variants).length >= 5) {
      await pool.query(
        `UPDATE arya_knowledge SET language_variants = $1 WHERE id = $2`,
        [JSON.stringify(variants), row.id],
      );
      console.log("✓");
      done++;
    } else {
      console.log("✗ (skipped — too few languages returned)");
      failed++;
    }

    // Small pause to be gentle on the API
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Done. Translated: ${done}  Failed: ${failed}\n`);
}

async function main() {
  const mode = process.argv[2];

  try {
    if (mode === "translate") {
      await showStats();
      await runTranslate();
      await showStats();
    } else {
      await showStats();
      console.log("  Run with 'translate' to fill language_variants for all entries:");
      console.log("  npx tsx scripts/seed-wisdom-knowledge.ts translate\n");
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
