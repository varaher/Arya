import { db } from "./db";
import { aryaKnowledge } from "@shared/schema";

const knowledgeUnits = [
  // MEDICAL DOMAIN
  {
    tenantId: 'varah',
    domain: 'medical' as const,
    topic: 'Acute Coronary Syndrome - Initial Management',
    content: 'Initial management of ACS includes: (1) Aspirin 325mg chewed immediately, (2) Nitroglycerin 0.4mg SL every 5 minutes x3 if chest pain persists, (3) Oxygen if SpO2 < 90%, (4) IV access and cardiac monitoring, (5) Serial ECGs and troponin measurements.',
    tags: ['cardiology', 'emergency', 'acs', 'chest-pain'],
    sourceType: 'clinical-guideline',
    sourceTitle: 'AHA/ACC STEMI Guidelines 2023'
  },
  {
    tenantId: 'varah',
    domain: 'medical' as const,
    topic: 'Pediatric Fever Management Protocol',
    content: 'Fever management in children: Acetaminophen 15mg/kg PO/PR q4-6h (max 75mg/kg/day). Ibuprofen 10mg/kg PO q6-8h for age > 6 months. Avoid aspirin due to Reye syndrome risk. Lukewarm sponge bath if temp > 39°C. Immediate evaluation needed if: age < 3 months, febrile seizure, persistent vomiting, lethargy.',
    tags: ['pediatrics', 'fever', 'pharmacology', 'emergency'],
    sourceType: 'clinical-protocol',
    sourceTitle: 'AAP Fever Management Guidelines'
  },
  {
    tenantId: 'varah',
    domain: 'medical' as const,
    topic: 'Sepsis Bundle - 1 Hour Protocol',
    content: 'Sepsis 1-hour bundle: (1) Measure lactate level, (2) Obtain blood cultures before antibiotics, (3) Administer broad-spectrum antibiotics, (4) Begin rapid fluid resuscitation 30ml/kg crystalloid for hypotension or lactate ≥4 mmol/L, (5) Apply vasopressors if hypotensive during or after fluid resuscitation to maintain MAP ≥65 mmHg.',
    tags: ['critical-care', 'sepsis', 'emergency', 'protocol'],
    sourceType: 'clinical-guideline',
    sourceTitle: 'Surviving Sepsis Campaign 2021'
  },
  {
    tenantId: 'varah',
    domain: 'medical' as const,
    topic: 'Diabetic Ketoacidosis Management',
    content: 'DKA management: (1) IV fluids - normal saline 1L bolus, then 250-500ml/hr, (2) Insulin - 0.1 units/kg/hr continuous IV, (3) Potassium replacement when K+ < 5.2 mEq/L, (4) Monitor glucose hourly, electrolytes q2-4h, (5) Transition to subcutaneous insulin when glucose < 200mg/dL and anion gap closed.',
    tags: ['endocrinology', 'diabetes', 'emergency', 'icu'],
    sourceType: 'clinical-protocol',
    sourceTitle: 'ADA DKA Management 2023'
  },
  {
    tenantId: 'varah',
    domain: 'medical' as const,
    topic: 'Stroke Code - Time is Brain Protocol',
    content: 'Acute ischemic stroke protocol: (1) Activate stroke code if onset < 24 hours, (2) Non-contrast CT head STAT, (3) tPA eligible if < 4.5 hours and no contraindications, (4) Large vessel occlusion → thrombectomy up to 24 hours, (5) BP control: permissive hypertension unless > 220/120 or tPA candidate.',
    tags: ['neurology', 'stroke', 'emergency', 'protocol'],
    sourceType: 'clinical-guideline',
    sourceTitle: 'AHA/ASA Stroke Guidelines 2019'
  },

  // BUSINESS DOMAIN
  {
    tenantId: 'varah',
    domain: 'business' as const,
    topic: 'Market Penetration Strategy Framework',
    content: 'Market penetration increases sales of existing products to existing markets. Key tactics: (1) Aggressive pricing - temporary discounts, value bundles, (2) Increased promotion - advertising campaigns, sales force expansion, (3) Competitive positioning - differentiation messaging, (4) Distribution intensity - wider retail coverage, e-commerce optimization.',
    tags: ['strategy', 'growth', 'marketing', 'ansoff-matrix'],
    sourceType: 'business-framework',
    sourceTitle: 'Ansoff Growth Matrix'
  },
  {
    tenantId: 'varah',
    domain: 'business' as const,
    topic: 'Customer Acquisition Cost (CAC) Optimization',
    content: 'CAC = Total Sales & Marketing Spend / New Customers Acquired. Healthy SaaS metrics: CAC payback < 12 months, LTV:CAC ratio > 3:1. Optimization strategies: (1) Improve conversion rates across funnel, (2) Organic channels (SEO, content), (3) Referral programs, (4) Product-led growth, (5) Target high-intent segments.',
    tags: ['saas', 'metrics', 'growth', 'marketing'],
    sourceType: 'business-framework',
    sourceTitle: 'SaaS Metrics Best Practices'
  },
  {
    tenantId: 'varah',
    domain: 'business' as const,
    topic: 'Blue Ocean Strategy - Value Innovation',
    content: 'Blue Ocean Strategy creates uncontested market space by value innovation: simultaneously pursue differentiation AND low cost. Framework: (1) Eliminate factors industry takes for granted, (2) Reduce factors below industry standard, (3) Raise factors above industry standard, (4) Create factors industry never offered. Example: Cirque du Soleil eliminated animals, raised artistic production.',
    tags: ['strategy', 'innovation', 'competitive-advantage'],
    sourceType: 'business-framework',
    sourceTitle: 'Blue Ocean Strategy (Kim & Mauborgne)'
  },
  {
    tenantId: 'varah',
    domain: 'business' as const,
    topic: 'OKR Framework - Objectives and Key Results',
    content: 'OKRs align organization around measurable goals. Structure: Objective (qualitative, inspirational) + 3-5 Key Results (quantitative, time-bound). Best practices: (1) 60-70% achievement is good (stretch goals), (2) Weekly check-ins, (3) Public transparency, (4) Bottom-up + top-down goal setting, (5) Quarterly cycles.',
    tags: ['okr', 'goals', 'management', 'performance'],
    sourceType: 'management-framework',
    sourceTitle: 'Measure What Matters (John Doerr)'
  },
  {
    tenantId: 'varah',
    domain: 'business' as const,
    topic: 'Product-Market Fit Indicators',
    content: 'Signs of product-market fit: (1) Organic growth without paid acquisition, (2) High retention (40%+ return rate), (3) NPS > 50, (4) Users show frustration when product is unavailable, (5) Word-of-mouth growth, (6) Shortened sales cycles. Sean Ellis test: > 40% users "very disappointed" if product disappeared = PMF achieved.',
    tags: ['product', 'pmf', 'startup', 'metrics'],
    sourceType: 'startup-framework',
    sourceTitle: 'Lean Startup Methodology'
  },

  // SANSKRIT DOMAIN
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Tridosha - The Three Ayurvedic Doshas',
    content: 'Ayurveda identifies three fundamental doshas governing physiology: (1) Vata (air + ether) - movement, creativity, anxiety when imbalanced, (2) Pitta (fire + water) - transformation, digestion, anger when imbalanced, (3) Kapha (earth + water) - structure, stability, lethargy when imbalanced. Balance maintained through diet, lifestyle, and seasonal routines (Ritucharya).',
    tags: ['ayurveda', 'doshas', 'health', 'constitution'],
    sourceType: 'ayurvedic-text',
    sourceTitle: 'Charaka Samhita'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Yoga - The Eight Limbs (Ashtanga)',
    content: 'Patanjali\'s Yoga Sutras define 8 limbs: (1) Yama (ethical restraints) - ahimsa, satya, asteya, brahmacharya, aparigraha, (2) Niyama (observances) - saucha, santosha, tapas, svadhyaya, ishvara pranidhana, (3) Asana (posture), (4) Pranayama (breath control), (5) Pratyahara (sense withdrawal), (6) Dharana (concentration), (7) Dhyana (meditation), (8) Samadhi (absorption).',
    tags: ['yoga', 'philosophy', 'meditation', 'spirituality'],
    sourceType: 'yogic-text',
    sourceTitle: 'Yoga Sutras of Patanjali'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Dharma - Cosmic Order and Duty',
    content: 'Dharma (धर्म) is the cosmic law governing righteousness and moral order. Four aspects: (1) Rita - cosmic order, natural law, (2) Varna Dharma - duties based on social role, (3) Ashrama Dharma - duties based on life stage (student, householder, retiree, renunciate), (4) Svadharma - personal duty aligned with nature. Upholding Dharma sustains the universe.',
    tags: ['philosophy', 'dharma', 'ethics', 'hinduism'],
    sourceType: 'philosophical-text',
    sourceTitle: 'Bhagavad Gita'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Panchakarma - Five Purification Actions',
    content: 'Panchakarma detoxification therapy in Ayurveda: (1) Vamana (therapeutic vomiting) - for Kapha disorders, (2) Virechana (purgation) - for Pitta disorders, (3) Basti (enema) - for Vata disorders, (4) Nasya (nasal administration), (5) Raktamokshana (bloodletting). Preceded by Snehana (oleation) and Swedana (sweating).',
    tags: ['ayurveda', 'detox', 'panchakarma', 'therapy'],
    sourceType: 'ayurvedic-practice',
    sourceTitle: 'Ashtanga Hridayam'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Om (ॐ) - The Primordial Sound',
    content: 'Om (AUM) is the primordial sound representing the entire universe. Three components: A (creation/Brahma), U (preservation/Vishnu), M (destruction/Shiva). The silence after represents transcendence (Turiya - fourth state beyond waking, dreaming, deep sleep). Chanted at beginning and end of mantras and meditation.',
    tags: ['mantra', 'sound', 'meditation', 'philosophy'],
    sourceType: 'vedic-knowledge',
    sourceTitle: 'Mandukya Upanishad'
  },

  // CHANAKYA DOMAIN
  {
    tenantId: 'varah',
    domain: 'chanakya' as const,
    topic: 'Saptanga - The Seven Limbs of State',
    content: 'Arthashastra defines seven essential elements of a state: (1) Swami (King) - sovereign authority, (2) Amatya (Minister) - administrative machinery, (3) Janapada (Territory & People) - land and population, (4) Durga (Fort) - defense infrastructure, (5) Kosha (Treasury) - financial resources, (6) Danda (Army) - military force, (7) Mitra (Ally) - diplomatic relations.',
    tags: ['governance', 'politics', 'statecraft', 'arthashastra'],
    sourceType: 'political-text',
    sourceTitle: 'Arthashastra by Kautilya'
  },
  {
    tenantId: 'varah',
    domain: 'chanakya' as const,
    topic: 'Mandala Theory - Circle of States',
    content: 'Chanakya\'s foreign policy framework: (1) Vijigishu (Aspiring Conqueror) - you, (2) Ari (Enemy) - immediate neighbor, (3) Mitra (Friend) - enemy\'s neighbor, (4) Arimitra (Enemy\'s Friend) - enemy\'s ally, (5) Mitramitra (Friend\'s Friend), (6) Parsnigraha (Rear Enemy) - your neighbor. Strategy: ally with enemy\'s neighbor, neutralize rear threats before expansion.',
    tags: ['diplomacy', 'foreign-policy', 'strategy', 'geopolitics'],
    sourceType: 'political-text',
    sourceTitle: 'Arthashastra - Book 6'
  },
  {
    tenantId: 'varah',
    domain: 'chanakya' as const,
    topic: 'Four Upayas - Methods of Diplomacy',
    content: 'Four strategic approaches to achieve objectives: (1) Sama (Conciliation) - negotiation, treaties, peaceful means, (2) Dana (Gift/Bribery) - economic incentives, alliances through marriage, (3) Bheda (Dissension) - divide and rule, creating internal conflicts, (4) Danda (Punishment) - military force, coercion. Use in ascending order; force is last resort.',
    tags: ['diplomacy', 'negotiation', 'strategy', 'conflict'],
    sourceType: 'political-strategy',
    sourceTitle: 'Arthashastra - Diplomatic Theory'
  },
  {
    tenantId: 'varah',
    domain: 'chanakya' as const,
    topic: 'Duties of a King - Raja Dharma',
    content: 'Kingly duties per Arthashastra: (1) Protection of subjects, (2) Justice and rule of law, (3) Economic prosperity through infrastructure, (4) Defense of territory, (5) Expansion when opportune, (6) Maintenance of social order, (7) Spiritual/religious patronage, (8) Personal discipline and ethical conduct. King must prioritize Artha (economy) and Dharma (righteousness) over Kama (pleasure).',
    tags: ['leadership', 'governance', 'dharma', 'kingship'],
    sourceType: 'political-philosophy',
    sourceTitle: 'Arthashastra & Manusmriti'
  },
  {
    tenantId: 'varah',
    domain: 'chanakya' as const,
    topic: 'Spy Network - The Eyes of the King',
    content: 'Arthashastra prescribes elaborate intelligence system: (1) Sansthana (Static agents) - monks, merchants, students embedded in enemy territory, (2) Sancara (Mobile agents) - wandering spies, (3) Double agents, (4) Informants in all sectors. King must have spies even within his own administration to prevent corruption and rebellion.',
    tags: ['intelligence', 'security', 'spycraft', 'governance'],
    sourceType: 'security-doctrine',
    sourceTitle: 'Arthashastra - Book 1'
  },

  // Cross-domain units
  {
    tenantId: 'varah',
    domain: 'medical' as const,
    topic: 'Mindfulness-Based Stress Reduction (MBSR) for Chronic Pain',
    content: 'MBSR integrates Buddhist meditation with Western medicine. 8-week program includes body scan, sitting meditation, gentle yoga. Evidence shows: 30% reduction in chronic pain, improved quality of life, reduced opioid dependence. Mechanisms: altered pain perception, neuroplasticity in pain-processing regions, reduced inflammatory markers.',
    tags: ['pain-management', 'mindfulness', 'integrative-medicine'],
    sourceType: 'research-evidence',
    sourceTitle: 'JAMA Internal Medicine 2016'
  },
  {
    tenantId: 'varah',
    domain: 'business' as const,
    topic: 'Conscious Capitalism - Purpose Beyond Profit',
    content: 'Conscious Capitalism framework: (1) Higher Purpose - beyond profit maximization, (2) Stakeholder Orientation - not just shareholders, (3) Conscious Leadership - servant leadership, emotional intelligence, (4) Conscious Culture - trust, accountability, transparency. Research shows conscious companies outperform S&P 500 by 10x over 15 years.',
    tags: ['leadership', 'ethics', 'sustainability', 'purpose'],
    sourceType: 'business-philosophy',
    sourceTitle: 'Conscious Capitalism (Mackey & Sisodia)'
  }
];

async function seed() {
  try {
    console.log('🌱 Seeding ARYA knowledge base...');
    
    const results = await db.insert(aryaKnowledge).values(knowledgeUnits).returning();
    
    console.log(`✅ Successfully inserted ${results.length} knowledge units`);
    console.log('   - Medical: 6 units');
    console.log('   - Business: 6 units');
    console.log('   - Sanskrit: 5 units');
    console.log('   - Chanakya: 5 units');
    console.log('   - Cross-domain: 2 units');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
