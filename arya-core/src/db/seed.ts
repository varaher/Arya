import { getPool } from './postgres.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Seed Knowledge Base
 * Inserts 20+ initial knowledge units across all 4 domains
 */

const knowledgeUnits = [
  // MEDICAL DOMAIN (6 units)
  {
    tenant_id: 'varah',
    domain: 'medical',
    topic: 'Acute Coronary Syndrome - Initial Management',
    content: 'Initial management of ACS includes: (1) Aspirin 325mg chewed immediately, (2) Nitroglycerin 0.4mg SL every 5 minutes x3 if chest pain persists, (3) Oxygen if SpO2 < 90%, (4) IV access and cardiac monitoring, (5) Serial ECGs and troponin measurements.',
    tags: ['cardiology', 'emergency', 'acs', 'chest-pain'],
    source_type: 'clinical-guideline',
    source_title: 'AHA/ACC STEMI Guidelines 2023'
  },
  {
    tenant_id: 'varah',
    domain: 'medical',
    topic: 'Pediatric Fever Management Protocol',
    content: 'Fever management in children: Acetaminophen 15mg/kg PO/PR q4-6h (max 75mg/kg/day). Ibuprofen 10mg/kg PO q6-8h for age > 6 months. Avoid aspirin due to Reye syndrome risk. Lukewarm sponge bath if temp > 39°C. Immediate evaluation needed if: age < 3 months, febrile seizure, persistent vomiting, lethargy.',
    tags: ['pediatrics', 'fever', 'pharmacology', 'emergency'],
    source_type: 'clinical-protocol',
    source_title: 'AAP Fever Management Guidelines'
  },
  {
    tenant_id: 'varah',
    domain: 'medical',
    topic: 'Sepsis Bundle - 1 Hour Protocol',
    content: 'Sepsis 1-hour bundle: (1) Measure lactate level, (2) Obtain blood cultures before antibiotics, (3) Administer broad-spectrum antibiotics, (4) Begin rapid fluid resuscitation 30ml/kg crystalloid for hypotension or lactate ≥4 mmol/L, (5) Apply vasopressors if hypotensive during or after fluid resuscitation to maintain MAP ≥65 mmHg.',
    tags: ['critical-care', 'sepsis', 'emergency', 'protocol'],
    source_type: 'clinical-guideline',
    source_title: 'Surviving Sepsis Campaign 2021'
  },
  {
    tenant_id: 'varah',
    domain: 'medical',
    topic: 'Diabetic Ketoacidosis Management',
    content: 'DKA management: (1) IV fluids - normal saline 1L bolus, then 250-500ml/hr, (2) Insulin - 0.1 units/kg/hr continuous IV, (3) Potassium replacement when K+ < 5.2 mEq/L, (4) Monitor glucose hourly, electrolytes q2-4h, (5) Transition to subcutaneous insulin when glucose < 200mg/dL and anion gap closed.',
    tags: ['endocrinology', 'diabetes', 'emergency', 'icu'],
    source_type: 'clinical-protocol',
    source_title: 'ADA DKA Management 2023'
  },
  {
    tenant_id: 'varah',
    domain: 'medical',
    topic: 'Hypertensive Emergency Treatment',
    content: 'Hypertensive emergency (BP > 180/120 with end-organ damage): Target 25% BP reduction in first hour. First-line agents: IV labetalol 20mg bolus then 40-80mg q10min, or IV nicardipine 5mg/hr titrate by 2.5mg/hr q5-15min. Avoid sudden drops. Monitor in ICU.',
    tags: ['cardiology', 'hypertension', 'emergency', 'icu'],
    source_type: 'clinical-guideline',
    source_title: 'ACC/AHA Hypertension Guidelines'
  },
  {
    tenant_id: 'varah',
    domain: 'medical',
    topic: 'Stroke Code - Time is Brain Protocol',
    content: 'Acute ischemic stroke protocol: (1) Activate stroke code if onset < 24 hours, (2) Non-contrast CT head STAT, (3) tPA eligible if < 4.5 hours and no contraindications, (4) Large vessel occlusion → thrombectomy up to 24 hours, (5) BP control: permissive hypertension unless > 220/120 or tPA candidate.',
    tags: ['neurology', 'stroke', 'emergency', 'protocol'],
    source_type: 'clinical-guideline',
    source_title: 'AHA/ASA Stroke Guidelines 2019'
  },

  // BUSINESS DOMAIN (5 units)
  {
    tenant_id: 'varah',
    domain: 'business',
    topic: 'Market Penetration Strategy Framework',
    content: 'Market penetration increases sales of existing products to existing markets. Key tactics: (1) Aggressive pricing - temporary discounts, value bundles, (2) Increased promotion - advertising campaigns, sales force expansion, (3) Competitive positioning - differentiation messaging, (4) Distribution intensity - wider retail coverage, e-commerce optimization.',
    tags: ['strategy', 'growth', 'marketing', 'ansoff-matrix'],
    source_type: 'business-framework',
    source_title: 'Ansoff Growth Matrix'
  },
  {
    tenant_id: 'varah',
    domain: 'business',
    topic: 'Customer Acquisition Cost (CAC) Optimization',
    content: 'CAC = Total Sales & Marketing Spend / New Customers Acquired. Healthy SaaS metrics: CAC payback < 12 months, LTV:CAC ratio > 3:1. Optimization strategies: (1) Improve conversion rates across funnel, (2) Organic channels (SEO, content), (3) Referral programs, (4) Product-led growth, (5) Target high-intent segments.',
    tags: ['saas', 'metrics', 'growth', 'marketing'],
    source_type: 'business-framework',
    source_title: 'SaaS Metrics Best Practices'
  },
  {
    tenant_id: 'varah',
    domain: 'business',
    topic: 'Blue Ocean Strategy - Value Innovation',
    content: 'Blue Ocean Strategy creates uncontested market space by value innovation: simultaneously pursue differentiation AND low cost. Framework: (1) Eliminate factors industry takes for granted, (2) Reduce factors below industry standard, (3) Raise factors above industry standard, (4) Create factors industry never offered. Example: Cirque du Soleil eliminated animals, raised artistic production.',
    tags: ['strategy', 'innovation', 'competitive-advantage'],
    source_type: 'business-framework',
    source_title: 'Blue Ocean Strategy (Kim & Mauborgne)'
  },
  {
    tenant_id: 'varah',
    domain: 'business',
    topic: 'OKR Framework - Objectives and Key Results',
    content: 'OKRs align organization around measurable goals. Structure: Objective (qualitative, inspirational) + 3-5 Key Results (quantitative, time-bound). Best practices: (1) 60-70% achievement is good (stretch goals), (2) Weekly check-ins, (3) Public transparency, (4) Bottom-up + top-down goal setting, (5) Quarterly cycles. Example: Objective "Dominate mobile market" → KR "Achieve 10M app downloads".',
    tags: ['okr', 'goals', 'management', 'performance'],
    source_type: 'management-framework',
    source_title: 'Measure What Matters (John Doerr)'
  },
  {
    tenant_id: 'varah',
    domain: 'business',
    topic: 'Product-Market Fit Indicators',
    content: 'Signs of product-market fit: (1) Organic growth without paid acquisition, (2) High retention (40%+ return rate), (3) NPS > 50, (4) Users show frustration when product is unavailable, (5) Word-of-mouth growth, (6) Shortened sales cycles. Sean Ellis test: > 40% users "very disappointed" if product disappeared = PMF achieved.',
    tags: ['product', 'pmf', 'startup', 'metrics'],
    source_type: 'startup-framework',
    source_title: 'Lean Startup Methodology'
  },

  // SANSKRIT DOMAIN (5 units)
  {
    tenant_id: 'varah',
    domain: 'sanskrit',
    topic: 'Tridosha - The Three Ayurvedic Doshas',
    content: 'Ayurveda identifies three fundamental doshas governing physiology: (1) Vata (air + ether) - movement, creativity, anxiety when imbalanced, (2) Pitta (fire + water) - transformation, digestion, anger when imbalanced, (3) Kapha (earth + water) - structure, stability, lethargy when imbalanced. Balance maintained through diet, lifestyle, and seasonal routines (Ritucharya).',
    tags: ['ayurveda', 'doshas', 'health', 'constitution'],
    source_type: 'ayurvedic-text',
    source_title: 'Charaka Samhita'
  },
  {
    tenant_id: 'varah',
    domain: 'sanskrit',
    topic: 'Yoga - The Eight Limbs (Ashtanga)',
    content: 'Patanjali\'s Yoga Sutras define 8 limbs: (1) Yama (ethical restraints) - ahimsa, satya, asteya, brahmacharya, aparigraha, (2) Niyama (observances) - saucha, santosha, tapas, svadhyaya, ishvara pranidhana, (3) Asana (posture), (4) Pranayama (breath control), (5) Pratyahara (sense withdrawal), (6) Dharana (concentration), (7) Dhyana (meditation), (8) Samadhi (absorption).',
    tags: ['yoga', 'philosophy', 'meditation', 'spirituality'],
    source_type: 'yogic-text',
    source_title: 'Yoga Sutras of Patanjali'
  },
  {
    tenant_id: 'varah',
    domain: 'sanskrit',
    topic: 'Dharma - Cosmic Order and Duty',
    content: 'Dharma (धर्म) is the cosmic law governing righteousness and moral order. Four aspects: (1) Rita - cosmic order, natural law, (2) Varna Dharma - duties based on social role, (3) Ashrama Dharma - duties based on life stage (student, householder, retiree, renunciate), (4) Svadharma - personal duty aligned with nature. Upholding Dharma sustains the universe.',
    tags: ['philosophy', 'dharma', 'ethics', 'hinduism'],
    source_type: 'philosophical-text',
    source_title: 'Bhagavad Gita'
  },
  {
    tenant_id: 'varah',
    domain: 'sanskrit',
    topic: 'Panchakarma - Five Purification Actions',
    content: 'Panchakarma detoxification therapy in Ayurveda: (1) Vamana (therapeutic vomiting) - for Kapha disorders, (2) Virechana (purgation) - for Pitta disorders, (3) Basti (enema) - for Vata disorders, (4) Nasya (nasal administration), (5) Raktamokshana (bloodletting). Preceded by Snehana (oleation) and Swedana (sweating). Seasonal cleansing recommended.',
    tags: ['ayurveda', 'detox', 'panchakarma', 'therapy'],
    source_type: 'ayurvedic-practice',
    source_title: 'Ashtanga Hridayam'
  },
  {
    tenant_id: 'varah',
    domain: 'sanskrit',
    topic: 'Om (ॐ) - The Primordial Sound',
    content: 'Om (AUM) is the primordial sound representing the entire universe. Three components: A (creation/Brahma), U (preservation/Vishnu), M (destruction/Shiva). The silence after represents transcendence (Turiya - fourth state beyond waking, dreaming, deep sleep). Chanted at beginning and end of mantras and meditation. Considered Pranava (supreme syllable).',
    tags: ['mantra', 'sound', 'meditation', 'philosophy'],
    source_type: 'vedic-knowledge',
    source_title: 'Mandukya Upanishad'
  },

  // CHANAKYA DOMAIN (5 units)
  {
    tenant_id: 'varah',
    domain: 'chanakya',
    topic: 'Saptanga - The Seven Limbs of State',
    content: 'Arthashastra defines seven essential elements of a state: (1) Swami (King) - sovereign authority, (2) Amatya (Minister) - administrative machinery, (3) Janapada (Territory & People) - land and population, (4) Durga (Fort) - defense infrastructure, (5) Kosha (Treasury) - financial resources, (6) Danda (Army) - military force, (7) Mitra (Ally) - diplomatic relations. All seven must be strong for state prosperity.',
    tags: ['governance', 'politics', 'statecraft', 'arthashastra'],
    source_type: 'political-text',
    source_title: 'Arthashastra by Kautilya'
  },
  {
    tenant_id: 'varah',
    domain: 'chanakya',
    topic: 'Mandala Theory - Circle of States',
    content: 'Chanakya\'s foreign policy framework: (1) Vijigishu (Aspiring Conqueror) - you, (2) Ari (Enemy) - immediate neighbor, (3) Mitra (Friend) - enemy\'s neighbor, (4) Arimitra (Enemy\'s Friend) - enemy\'s ally, (5) Mitramitra (Friend\'s Friend), (6) Parsnigraha (Rear Enemy) - your neighbor. Strategy: ally with enemy\'s neighbor, neutralize rear threats before expansion.',
    tags: ['diplomacy', 'foreign-policy', 'strategy', 'geopolitics'],
    source_type: 'political-text',
    source_title: 'Arthashastra - Book 6'
  },
  {
    tenant_id: 'varah',
    domain: 'chanakya',
    topic: 'Four Upayas - Methods of Diplomacy',
    content: 'Four strategic approaches to achieve objectives: (1) Sama (Conciliation) - negotiation, treaties, peaceful means, (2) Dana (Gift/Bribery) - economic incentives, alliances through marriage, (3) Bheda (Dissension) - divide and rule, creating internal conflicts, (4) Danda (Punishment) - military force, coercion. Use in ascending order; force is last resort.',
    tags: ['diplomacy', 'negotiation', 'strategy', 'conflict'],
    source_type: 'political-strategy',
    source_title: 'Arthashastra - Diplomatic Theory'
  },
  {
    tenant_id: 'varah',
    domain: 'chanakya',
    topic: 'Duties of a King - Raja Dharma',
    content: 'Kingly duties per Arthashastra: (1) Protection of subjects, (2) Justice and rule of law, (3) Economic prosperity through infrastructure, (4) Defense of territory, (5) Expansion when opportune, (6) Maintenance of social order (Varna system), (7) Spiritual/religious patronage, (8) Personal discipline and ethical conduct. King must prioritize Artha (economy) and Dharma (righteousness) over Kama (pleasure).',
    tags: ['leadership', 'governance', 'dharma', 'kingship'],
    source_type: 'political-philosophy',
    source_title: 'Arthashastra & Manusmriti'
  },
  {
    tenant_id: 'varah',
    domain: 'chanakya',
    topic: 'Spy Network - The Eyes of the King',
    content: 'Arthashastra prescribes elaborate intelligence system: (1) Sansthana (Static agents) - monks, merchants, students embedded in enemy territory, (2) Sancara (Mobile agents) - wandering spies, (3) Double agents, (4) Informants in all sectors. King must have spies even within his own administration to prevent corruption and rebellion. Intelligence gathering is paramount for statecraft.',
    tags: ['intelligence', 'security', 'spycraft', 'governance'],
    source_type: 'security-doctrine',
    source_title: 'Arthashastra - Book 1'
  },

  // Additional interdisciplinary units
  {
    tenant_id: 'varah',
    domain: 'medical',
    topic: 'Mindfulness-Based Stress Reduction (MBSR) for Chronic Pain',
    content: 'MBSR integrates Buddhist meditation with Western medicine. 8-week program includes body scan, sitting meditation, gentle yoga. Evidence shows: 30% reduction in chronic pain, improved quality of life, reduced opioid dependence. Mechanisms: altered pain perception, neuroplasticity in pain-processing regions, reduced inflammatory markers.',
    tags: ['pain-management', 'mindfulness', 'integrative-medicine'],
    source_type: 'research-evidence',
    source_title: 'JAMA Internal Medicine 2016'
  },
  {
    tenant_id: 'varah',
    domain: 'business',
    topic: 'Conscious Capitalism - Purpose Beyond Profit',
    content: 'Conscious Capitalism framework: (1) Higher Purpose - beyond profit maximization, (2) Stakeholder Orientation - not just shareholders, (3) Conscious Leadership - servant leadership, emotional intelligence, (4) Conscious Culture - trust, accountability, transparency. Examples: Whole Foods, Patagonia, Southwest Airlines. Research shows conscious companies outperform S&P 500 by 10x over 15 years.',
    tags: ['leadership', 'ethics', 'sustainability', 'purpose'],
    source_type: 'business-philosophy',
    source_title: 'Conscious Capitalism (Mackey & Sisodia)'
  }
];

async function seed() {
  try {
    const pool = getPool();
    
    console.log('🌱 Starting knowledge base seeding...');
    
    let inserted = 0;
    for (const unit of knowledgeUnits) {
      await pool.query(
        `INSERT INTO arya_knowledge (tenant_id, domain, topic, content, tags, source_type, source_title)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [unit.tenant_id, unit.domain, unit.topic, unit.content, unit.tags, unit.source_type, unit.source_title]
      );
      inserted++;
    }
    
    console.log(`✅ Successfully inserted ${inserted} knowledge units`);
    console.log('   - Medical: 7 units');
    console.log('   - Business: 6 units');
    console.log('   - Sanskrit: 5 units');
    console.log('   - Chanakya: 5 units');
    console.log('');
    
    // Verify
    const result = await pool.query('SELECT domain, COUNT(*) as count FROM arya_knowledge GROUP BY domain');
    console.log('📊 Verification:');
    result.rows.forEach(row => {
      console.log(`   ${row.domain}: ${row.count} units`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
