/**
 * Medical Engine - Healthcare & Clinical Knowledge
 * Handles medical protocols, diagnostics, treatment guidelines
 */

export interface ERmateInput {
  transcript: string;
  language?: string;
}

export interface ERmateOutput {
  chief_complaint: string;
  hpi: string;
  pmh: string[];
  medications: string[];
  allergies: string[];
  exam: string;
  ddx: string[];
  plan_investigations: string[];
  plan_treatment: string[];
  safety_flags: string[];
}

export interface ErPranaInput {
  symptoms_text: string;
  wearable?: {
    hr?: number;
    spo2?: number;
    bp?: string;
    temp?: number;
  };
}

export interface ErPranaOutput {
  risk_level: 'low' | 'moderate' | 'high';
  risk_score: number;
  red_flags: string[];
  next_steps: string[];
  disclaimer: string;
}

export class MedicalEngine {
  
  /**
   * ERmate Auto-fill: Parse clinical transcript into structured data
   * Phase 1: Deterministic parsing with TODO hooks for LLM integration
   */
  async autoFill(input: ERmateInput): Promise<ERmateOutput> {
    const text = input.transcript.toLowerCase();
    
    // TODO: Replace with LLM-based extraction (OpenAI/Claude)
    // For now, use simple pattern matching
    
    const output: ERmateOutput = {
      chief_complaint: this.extractChiefComplaint(text),
      hpi: this.extractHPI(text),
      pmh: this.extractPMH(text),
      medications: this.extractMedications(text),
      allergies: this.extractAllergies(text),
      exam: this.extractExam(text),
      ddx: this.generateDDx(text),
      plan_investigations: this.suggestInvestigations(text),
      plan_treatment: this.suggestTreatment(text),
      safety_flags: this.detectSafetyFlags(text)
    };
    
    return output;
  }
  
  /**
   * ErPrana Risk Assessment: Calculate patient risk from symptoms + wearables
   */
  async assessRisk(input: ErPranaInput): Promise<ErPranaOutput> {
    const symptoms = input.symptoms_text.toLowerCase();
    const vitals = input.wearable;
    
    let riskScore = 0;
    const redFlags: string[] = [];
    const nextSteps: string[] = [];
    
    // Symptom-based risk scoring
    if (symptoms.includes('chest pain') || symptoms.includes('chest pressure')) {
      riskScore += 40;
      redFlags.push('Cardiac symptoms present');
    }
    if (symptoms.includes('shortness of breath') || symptoms.includes('difficulty breathing')) {
      riskScore += 30;
      redFlags.push('Respiratory distress');
    }
    if (symptoms.includes('confusion') || symptoms.includes('altered mental status')) {
      riskScore += 35;
      redFlags.push('Neurological symptoms');
    }
    
    // Vital signs assessment
    if (vitals) {
      if (vitals.hr && (vitals.hr > 120 || vitals.hr < 50)) {
        riskScore += 20;
        redFlags.push('Abnormal heart rate');
      }
      if (vitals.spo2 && vitals.spo2 < 90) {
        riskScore += 30;
        redFlags.push('Hypoxemia detected');
      }
      if (vitals.bp) {
        const [sys] = vitals.bp.split('/').map(Number);
        if (sys > 180 || sys < 90) {
          riskScore += 25;
          redFlags.push('Blood pressure abnormality');
        }
      }
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'moderate' | 'high' = 'low';
    if (riskScore >= 70) {
      riskLevel = 'high';
      nextSteps.push('Immediate emergency department evaluation required');
      nextSteps.push('Call emergency services if symptoms worsen');
    } else if (riskScore >= 40) {
      riskLevel = 'moderate';
      nextSteps.push('Seek medical attention within 24 hours');
      nextSteps.push('Monitor symptoms closely');
    } else {
      nextSteps.push('Continue routine monitoring');
      nextSteps.push('Contact doctor if symptoms persist');
    }
    
    return {
      risk_level: riskLevel,
      risk_score: Math.min(riskScore, 100),
      red_flags: redFlags,
      next_steps: nextSteps,
      disclaimer: 'This is not a substitute for professional medical advice. Consult a healthcare provider for diagnosis and treatment.'
    };
  }
  
  // Helper methods for ERmate parsing
  private extractChiefComplaint(text: string): string {
    // Simple pattern: Look for presenting symptoms
    if (text.includes('chest pain')) return 'Chest pain';
    if (text.includes('fever')) return 'Fever';
    if (text.includes('headache')) return 'Headache';
    if (text.includes('abdominal pain')) return 'Abdominal pain';
    return 'General consultation';
  }
  
  private extractHPI(text: string): string {
    // Extract duration and quality
    const sentences = text.split('.').slice(0, 3);
    return sentences.join('. ').trim() || 'Patient presents with symptoms as described.';
  }
  
  private extractPMH(text: string): string[] {
    const pmh: string[] = [];
    if (text.includes('hypertension') || text.includes('htn')) pmh.push('Hypertension');
    if (text.includes('diabetes') || text.includes('dm')) pmh.push('Diabetes Mellitus');
    if (text.includes('asthma')) pmh.push('Asthma');
    if (text.includes('hyperlipidemia')) pmh.push('Hyperlipidemia');
    return pmh.length > 0 ? pmh : ['No significant PMH'];
  }
  
  private extractMedications(text: string): string[] {
    const meds: string[] = [];
    if (text.includes('lisinopril')) meds.push('Lisinopril');
    if (text.includes('metformin')) meds.push('Metformin');
    if (text.includes('atorvastatin')) meds.push('Atorvastatin');
    if (text.includes('aspirin')) meds.push('Aspirin');
    return meds.length > 0 ? meds : ['None reported'];
  }
  
  private extractAllergies(text: string): string[] {
    if (text.includes('nkda') || text.includes('no known drug allergies')) {
      return ['NKDA'];
    }
    if (text.includes('penicillin')) return ['Penicillin'];
    return ['NKDA'];
  }
  
  private extractExam(text: string): string {
    // Extract vital signs if present
    const vitals: string[] = [];
    const bpMatch = text.match(/bp[:\s]+(\d{2,3}\/\d{2,3})/i);
    const hrMatch = text.match(/hr[:\s]+(\d{2,3})/i);
    const spo2Match = text.match(/spo2[:\s]+(\d{2,3})/i);
    
    if (bpMatch) vitals.push(`BP ${bpMatch[1]}`);
    if (hrMatch) vitals.push(`HR ${hrMatch[1]}`);
    if (spo2Match) vitals.push(`SpO2 ${spo2Match[1]}%`);
    
    return vitals.length > 0 ? vitals.join(', ') : 'Vitals within normal limits';
  }
  
  private generateDDx(text: string): string[] {
    // TODO: Use knowledge engine + LLM for sophisticated differential
    if (text.includes('chest pain')) {
      return ['Acute Coronary Syndrome', 'GERD', 'Musculoskeletal Pain', 'Anxiety'];
    }
    if (text.includes('fever')) {
      return ['Viral Infection', 'Bacterial Infection', 'COVID-19'];
    }
    return ['Requires further evaluation'];
  }
  
  private suggestInvestigations(text: string): string[] {
    const investigations: string[] = [];
    if (text.includes('chest pain')) {
      investigations.push('ECG', 'Troponin', 'CXR');
    }
    if (text.includes('fever')) {
      investigations.push('CBC', 'CRP', 'Blood Culture');
    }
    investigations.push('Basic Metabolic Panel');
    return investigations;
  }
  
  private suggestTreatment(text: string): string[] {
    const treatment: string[] = [];
    if (text.includes('chest pain')) {
      treatment.push('Aspirin 325mg', 'Nitroglycerin SL PRN');
    }
    if (text.includes('fever')) {
      treatment.push('Acetaminophen 500mg q6h');
    }
    treatment.push('Supportive care');
    return treatment;
  }
  
  private detectSafetyFlags(text: string): string[] {
    const flags: string[] = [];
    if (text.includes('chest pain')) {
      flags.push('High risk for ACS - Requires immediate ECG');
    }
    if (text.includes('confusion') || text.includes('altered')) {
      flags.push('Altered mental status - Rule out acute causes');
    }
    return flags;
  }
}
