import { Domain } from "@shared/arya-schema";

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
  }

  route(query: string, language: string = 'en'): RoutingDecision {
    const lowerQuery = query.toLowerCase();
    let adjustedWeights = { ...this.weights };
    let reasoning: string[] = [];

    if (this.hasMedicalKeywords(lowerQuery)) {
      adjustedWeights.medical += 0.3;
      reasoning.push('Medical keywords detected');
    }

    if (this.hasSanskritKeywords(lowerQuery) || this.hasDevanagari(query)) {
      adjustedWeights.sanskrit += 0.3;
      reasoning.push('Sanskrit/philosophical context detected');
    }

    if (this.hasBusinessKeywords(lowerQuery)) {
      adjustedWeights.business += 0.3;
      reasoning.push('Business strategy keywords detected');
    }

    if (this.hasChanakyaKeywords(lowerQuery)) {
      adjustedWeights.chanakya += 0.3;
      reasoning.push('Governance/leadership keywords detected');
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
        this.weights.sanskrit += 0.2;
        break;
      case 'varah_corp':
        this.weights.business += 0.2;
        this.weights.chanakya += 0.1;
        break;
    }
  }

  private hasMedicalKeywords(query: string): boolean {
    const keywords = ['symptom', 'diagnosis', 'treatment', 'patient', 'doctor', 'medicine', 
                      'disease', 'pain', 'fever', 'blood', 'pressure', 'heart', 'hospital',
                      'protocol', 'clinical', 'vital', 'emergency'];
    return keywords.some(kw => query.includes(kw));
  }

  private hasBusinessKeywords(query: string): boolean {
    const keywords = ['strategy', 'market', 'growth', 'revenue', 'customer', 'business',
                      'competitor', 'sales', 'profit', 'pricing', 'acquisition', 'retention'];
    return keywords.some(kw => query.includes(kw));
  }

  private hasSanskritKeywords(query: string): boolean {
    const keywords = ['dharma', 'yoga', 'veda', 'mantra', 'sanskrit', 'ayurveda', 'dosha',
                      'karma', 'moksha', 'prana', 'chakra', 'meditation', 'spiritual'];
    return keywords.some(kw => query.includes(kw));
  }

  private hasChanakyaKeywords(query: string): boolean {
    const keywords = ['chanakya', 'arthashastra', 'niti', 'governance', 'king', 'minister',
                      'politics', 'leadership', 'power', 'statecraft'];
    return keywords.some(kw => query.includes(kw));
  }

  private hasDevanagari(text: string): boolean {
    return /[\u0900-\u097F]/.test(text);
  }
}
