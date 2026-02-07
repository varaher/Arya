import { Domain } from "@shared/schema";

export interface OrchestratorWeights {
  medical: number;
  business: number;
  sanskrit: number;
  chanakya: number;
}

export interface OrchestratorConfig {
  weights?: OrchestratorWeights;
  appId?: string;
  language?: string;
}

export type OrchestratorMode = 'single' | 'dual' | 'four_pillar';

export interface RoutingDecision {
  primaryDomain: Domain;
  secondaryDomain?: Domain;
  mode: OrchestratorMode;
  weights: OrchestratorWeights;
  reasoning: string;
}

export class Orchestrator {
  private weights: OrchestratorWeights = {
    medical: 0.25,
    business: 0.25,
    sanskrit: 0.25,
    chanakya: 0.25
  };

  constructor(config?: OrchestratorConfig) {
    if (config?.weights) {
      this.weights = { ...config.weights };
    }
    
    if (config?.appId) {
      this.applyAppBoost(config.appId);
    }

    if (config?.language && (config.language === 'sa' || config.language === 'hi')) {
      this.weights.sanskrit += 0.15;
    }
  }

  route(query: string, language: string = 'en'): RoutingDecision {
    const lowerQuery = query.toLowerCase();
    let adjustedWeights = { ...this.weights };
    let reasoning: string[] = [];

    if (this.hasDevanagari(query)) {
      adjustedWeights.sanskrit += 0.4;
      reasoning.push('Devanagari script detected — Sanskrit domain prioritized');
    }

    const sanskritScore = this.scoreSanskritRelevance(lowerQuery, query);
    if (sanskritScore > 0) {
      adjustedWeights.sanskrit += sanskritScore;
      reasoning.push(`Sanskrit/Vedic context detected (score: ${sanskritScore.toFixed(2)})`);
    }

    if (this.hasMedicalKeywords(lowerQuery)) {
      adjustedWeights.medical += 0.3;
      reasoning.push('Medical keywords detected');
    }

    if (this.hasBusinessKeywords(lowerQuery)) {
      adjustedWeights.business += 0.3;
      reasoning.push('Business strategy keywords detected');
    }

    if (this.hasChanakyaKeywords(lowerQuery)) {
      adjustedWeights.chanakya += 0.3;
      reasoning.push('Governance/leadership keywords detected');
    }

    if (this.hasAyurvedaMedicalCrossover(lowerQuery)) {
      adjustedWeights.sanskrit += 0.15;
      adjustedWeights.medical += 0.15;
      reasoning.push('Ayurveda-medicine crossover detected');
    }

    const total = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
    Object.keys(adjustedWeights).forEach(key => {
      adjustedWeights[key as Domain] = adjustedWeights[key as Domain] / total;
    });

    const sorted = Object.entries(adjustedWeights)
      .sort(([, a], [, b]) => b - a) as [Domain, number][];
    
    const primaryDomain = sorted[0][0];
    const secondaryDomain = sorted[1][1] > 0.15 ? sorted[1][0] : undefined;

    let mode: OrchestratorMode = 'single';
    if (secondaryDomain && sorted[1][1] > 0.2) {
      mode = 'dual';
    } else if (sorted[3][1] > 0.1) {
      mode = 'four_pillar';
    }

    return {
      primaryDomain,
      secondaryDomain,
      mode,
      weights: adjustedWeights,
      reasoning: reasoning.join('; ') || 'Default balanced routing'
    };
  }

  updateWeights(weights: Partial<OrchestratorWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  private applyAppBoost(appId: string): void {
    switch (appId) {
      case 'ermate':
      case 'erprana':
        this.weights.medical += 0.2;
        break;
      case 'nevarh':
        this.weights.sanskrit += 0.3;
        break;
      case 'varah_corp':
        this.weights.business += 0.2;
        this.weights.chanakya += 0.1;
        break;
    }
  }

  private scoreSanskritRelevance(lowerQuery: string, originalQuery: string): number {
    let score = 0;

    const vedaKeywords = [
      'veda', 'vedic', 'rigveda', 'yajurveda', 'samaveda', 'atharvaveda',
      'shruti', 'smriti', 'samhita', 'brahmana', 'aranyaka',
      'sukta', 'mantra', 'hymn', 'chant', 'stotra'
    ];

    const upanishadKeywords = [
      'upanishad', 'upanishadic', 'isha', 'kena', 'katha', 'mundaka',
      'chandogya', 'brihadaranyaka', 'taittiriya', 'mandukya', 'aitareya',
      'prashna', 'shvetashvatara', 'mahavakya',
      'tat tvam asi', 'aham brahmasmi', 'prajnanam brahma', 'ayam atma brahma'
    ];

    const gitaKeywords = [
      'gita', 'bhagavad', 'krishna', 'arjuna', 'kurukshetra',
      'karma yoga', 'bhakti yoga', 'jnana yoga', 'dhyana yoga',
      'vishvarupa', 'sthitaprajna', 'nishkama'
    ];

    const philosophyKeywords = [
      'brahman', 'atman', 'atma', 'maya', 'moksha', 'samsara', 'nirvana',
      'dharma', 'karma', 'purusha', 'prakriti', 'gunas', 'sattva', 'rajas', 'tamas',
      'vedanta', 'advaita', 'dvaita', 'samkhya', 'nyaya', 'vaisheshika', 'mimamsa',
      'darshana', 'tattva', 'jiva', 'ishvara', 'avidya', 'vidya',
      'neti neti', 'sat chit ananda', 'turiya', 'kaivalya',
      'shankaracharya', 'shankara', 'ramanuja', 'madhva', 'patanjali', 'kapila', 'panini'
    ];

    const yogaSpiritualKeywords = [
      'yoga', 'asana', 'pranayama', 'pratyahara', 'dharana', 'dhyana', 'samadhi',
      'kundalini', 'chakra', 'nadi', 'prana', 'apana', 'sushumna', 'ida', 'pingala',
      'mudra', 'bandha', 'kriya', 'hatha', 'raja', 'tantra',
      'meditation', 'spiritual', 'enlightenment', 'awakening', 'consciousness',
      'mantra', 'japa', 'kirtan', 'bhajan', 'shloka', 'sutra'
    ];

    const ayurvedaKeywords = [
      'ayurveda', 'ayurvedic', 'dosha', 'vata', 'pitta', 'kapha',
      'panchakarma', 'rasayana', 'charaka', 'sushruta', 'ashtanga hridayam',
      'dinacharya', 'ritucharya', 'agni', 'ama', 'ojas', 'dhatu', 'mala', 'srota',
      'prakriti', 'vikriti', 'nadi pariksha', 'marma'
    ];

    const sanskritLanguageKeywords = [
      'sanskrit', 'devanagari', 'shloka', 'subhashita', 'sandhi', 'samasa',
      'vibhakti', 'dhatu', 'pratyaya', 'ashtadhyayi', 'vyakarana', 'grammar'
    ];

    const culturalKeywords = [
      'purana', 'ramayana', 'mahabharata', 'itihasa',
      'temple', 'puja', 'yajna', 'homa', 'agnihotra', 'sandhyavandana',
      'ashrama', 'brahmacharya', 'grihastha', 'vanaprastha', 'sannyasa',
      'rishi', 'muni', 'sage', 'guru', 'acharya', 'swami',
      'ahimsa', 'satya', 'asteya', 'tapas', 'svadhyaya',
      'om', 'aum', 'gayatri', 'vasudhaiva kutumbakam', 'satyameva jayate'
    ];

    const keywordGroups = [
      { keywords: vedaKeywords, weight: 0.4 },
      { keywords: upanishadKeywords, weight: 0.4 },
      { keywords: gitaKeywords, weight: 0.35 },
      { keywords: philosophyKeywords, weight: 0.35 },
      { keywords: yogaSpiritualKeywords, weight: 0.3 },
      { keywords: ayurvedaKeywords, weight: 0.3 },
      { keywords: sanskritLanguageKeywords, weight: 0.35 },
      { keywords: culturalKeywords, weight: 0.25 },
    ];

    for (const group of keywordGroups) {
      const matches = group.keywords.filter(kw => lowerQuery.includes(kw));
      if (matches.length > 0) {
        score += group.weight * Math.min(matches.length, 3);
      }
    }

    return Math.min(score, 0.6);
  }

  private hasMedicalKeywords(query: string): boolean {
    const keywords = ['symptom', 'diagnosis', 'treatment', 'patient', 'doctor', 'medicine', 
                      'disease', 'pain', 'fever', 'blood', 'pressure', 'heart', 'hospital',
                      'protocol', 'clinical', 'vital', 'emergency', 'drug', 'dosage',
                      'surgery', 'icu', 'sepsis', 'stroke', 'cardiac'];
    return keywords.some(kw => query.includes(kw));
  }

  private hasBusinessKeywords(query: string): boolean {
    const keywords = ['strategy', 'market', 'growth', 'revenue', 'customer', 'business',
                      'competitor', 'sales', 'profit', 'pricing', 'acquisition', 'retention',
                      'startup', 'saas', 'okr', 'kpi', 'roi', 'product-market fit'];
    return keywords.some(kw => query.includes(kw));
  }

  private hasChanakyaKeywords(query: string): boolean {
    const keywords = ['chanakya', 'arthashastra', 'niti', 'governance', 'king', 'minister',
                      'politics', 'leadership', 'power', 'statecraft', 'diplomacy',
                      'mandala theory', 'saptanga', 'upaya', 'kautilya', 'spy network',
                      'raja dharma', 'danda', 'kosha', 'foreign policy'];
    return keywords.some(kw => query.includes(kw));
  }

  private hasAyurvedaMedicalCrossover(query: string): boolean {
    const crossoverKeywords = [
      'integrative medicine', 'holistic', 'alternative medicine',
      'herbal', 'natural remedy', 'mind body', 'stress reduction',
      'mindfulness', 'yoga therapy', 'traditional medicine'
    ];
    return crossoverKeywords.some(kw => query.includes(kw));
  }

  private hasDevanagari(text: string): boolean {
    return /[\u0900-\u097F]/.test(text);
  }
}
