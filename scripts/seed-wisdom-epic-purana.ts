// ══════════════════════════════════════════════════════════════════════════════
//  ARYA WISDOM — Epic & Purana Seed Script
//
//  Covers: Valmiki Ramayana, Mahabharata (beyond the Gita), Garuda Purana
//
//  Usage:
//    npx tsx scripts/seed-wisdom-epic-purana.ts           — show stats
//    npx tsx scripts/seed-wisdom-epic-purana.ts translate — fill missing variants
//
//  Note: Core entries are already seeded via psql. This script is for
//  running the translate pass on entries that are missing language_variants,
//  and for viewing stats. Safe to run multiple times.
// ══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";
import { Pool } from "pg";
import { batchTranslateWisdomEntry } from "../server/arya/wisdom-translator";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const EPIC_PURANA_SOURCE_PATTERNS = [
  "Valmiki Ramayana",
  "Mahabharata",
  "Garuda Purana",
];

async function showStats() {
  const res = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN reviewed AND arya_principle IS NOT NULL THEN 1 ELSE 0 END) as wisdom_ready,
      SUM(CASE WHEN reviewed AND arya_principle IS NOT NULL AND language_variants IS NOT NULL THEN 1 ELSE 0 END) as translated
    FROM arya_knowledge
    WHERE status = 'published'
      AND (
        source_name LIKE '%Ramayana%'
        OR source_name LIKE '%Mahabharata%'
        OR source_name LIKE '%Garuda%'
      )
  `);
  const s = res.rows[0];
  console.log("\n📚 Epic & Purana Wisdom — Status");
  console.log("──────────────────────────────────");
  console.log(`  Total entries:          ${s.total}`);
  console.log(`  Wisdom-ready (reviewed): ${s.wisdom_ready}`);
  console.log(`  With language variants:  ${s.translated}`);
  console.log("");

  const bySource = await pool.query(`
    SELECT source_name,
      CASE WHEN reviewed AND arya_principle IS NOT NULL AND language_variants IS NOT NULL THEN '✓' ELSE '○' END as status
    FROM arya_knowledge
    WHERE status = 'published'
      AND (
        source_name LIKE '%Ramayana%'
        OR source_name LIKE '%Mahabharata%'
        OR source_name LIKE '%Garuda%'
      )
    ORDER BY source_name
  `);
  for (const row of bySource.rows) {
    console.log(`  ${row.status} ${row.source_name}`);
  }
  console.log("");
}

async function runTranslate() {
  console.log("\n🌐 Translating Epic & Purana entries missing language_variants…\n");

  const whereClause = EPIC_PURANA_SOURCE_PATTERNS
    .map((_, i) => `source_name LIKE $${i + 1}`)
    .join(" OR ");

  const params = EPIC_PURANA_SOURCE_PATTERNS.map(p => `%${p}%`);

  const res = await pool.query(
    `SELECT id, arya_principle, language_variants, source_name
     FROM arya_knowledge
     WHERE (${whereClause})
       AND reviewed = true
       AND arya_principle IS NOT NULL
       AND language_variants IS NULL
       AND status = 'published'
     ORDER BY source_name`,
    params,
  );

  if (!res.rows.length) {
    console.log("✅ All epic/purana entries already have language_variants.");
    return;
  }

  console.log(`   Found ${res.rows.length} entries needing translation.\n`);
  let done = 0, failed = 0;

  for (const row of res.rows) {
    process.stdout.write(`  ${row.source_name.slice(0, 55).padEnd(57)}`);
    const langs = ["hi", "ta", "te", "ml", "kn", "bn", "mr", "gu", "pa", "or"];
    const variants = await batchTranslateWisdomEntry(row.arya_principle, langs);

    if (variants && Object.keys(variants).length >= 4) {
      await pool.query(
        "UPDATE arya_knowledge SET language_variants = $1 WHERE id = $2",
        [JSON.stringify(variants), row.id],
      );
      console.log("✓");
      done++;
    } else {
      console.log("✗");
      failed++;
    }
    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n✅ Done. Translated: ${done}  Failed: ${failed}\n`);
}

async function main() {
  const mode = process.argv[2];
  try {
    await showStats();
    if (mode === "translate") {
      await runTranslate();
      await showStats();
    } else {
      console.log("  Run with 'translate' to fill any missing language_variants:");
      console.log("  npx tsx scripts/seed-wisdom-epic-purana.ts translate\n");
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
