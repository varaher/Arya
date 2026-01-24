// Mock Data for Prototype

export type KnowledgeDomain = 'medical' | 'business' | 'sanskrit' | 'chanakya';

export interface KnowledgeUnit {
  id: string;
  domain: KnowledgeDomain;
  title: string;
  content: string;
  tags: string[];
  relevance: number;
}

export const mockKnowledgeBase: KnowledgeUnit[] = [
  {
    id: "med-001",
    domain: "medical",
    title: "Acute Coronary Syndrome Protocol",
    content: "Initial management includes aspirin 325mg chewed, nitroglycerin SL every 5 min x3, and oxygen if SpO2 < 90%.",
    tags: ["cardiology", "emergency", "ACS"],
    relevance: 0.95
  },
  {
    id: "med-002",
    domain: "medical",
    title: "Pediatric Fever Management",
    content: "Acetaminophen 15mg/kg q4-6h. Ibuprofen 10mg/kg q6-8h for age > 6 months. Avoid aspirin due to Reye syndrome risk.",
    tags: ["pediatrics", "fever", "pharmacology"],
    relevance: 0.88
  },
  {
    id: "bus-001",
    domain: "business",
    title: "Market Penetration Strategy",
    content: "Focus on increasing sales of existing products to existing markets. Key tactics: aggressive pricing, increased promotion, and competitive positioning.",
    tags: ["strategy", "growth", "marketing"],
    relevance: 0.75
  },
  {
    id: "san-001",
    domain: "sanskrit",
    title: "Ayurvedic Dosha Balance",
    content: "Vata, Pitta, and Kapha govern physiological functions. Balance is achieved through diet, lifestyle, and seasonal routines (Ritucharya).",
    tags: ["ayurveda", "health", "philosophy"],
    relevance: 0.82
  },
  {
    id: "cha-001",
    domain: "chanakya",
    title: "Arthashastra: The Seven Limbs of State",
    content: "Swami (King), Amatya (Minister), Janapada (Territory), Durga (Fort), Kosha (Treasury), Danda (Army), and Mitra (Ally).",
    tags: ["governance", "politics", "leadership"],
    relevance: 0.91
  },
  {
    id: "med-003",
    domain: "medical",
    title: "Sepsis Bundle (1 Hour)",
    content: "Measure lactate, obtain blood cultures before antibiotics, administer broad-spectrum antibiotics, fluid resuscitation 30ml/kg for hypotension.",
    tags: ["critical-care", "sepsis", "emergency"],
    relevance: 0.98
  }
];

export const mockTranscript = `
Patient is a 45-year-old male presenting with chest tightness for the last 2 hours. 
He describes the pain as a pressure sensation radiating to his left arm. 
Rated 7/10. Associated with some nausea and diaphoresis. 
History of hypertension and hyperlipidemia. 
Currently on Lisinopril 10mg and Atorvastatin 20mg.
No known drug allergies.
Vitals: BP 150/90, HR 98, SpO2 97% on RA.
`;

export const mockStructuredData = {
  chief_complaint: "Chest tightness x 2 hours",
  hpi: "45M presenting with pressure-like chest pain radiating to left arm. Rated 7/10. Associated nausea and diaphoresis.",
  pmh: ["Hypertension", "Hyperlipidemia"],
  medications: ["Lisinopril 10mg", "Atorvastatin 20mg"],
  allergies: ["NKDA"],
  exam: "BP 150/90, HR 98, SpO2 97% RA. Diaphoretic.",
  ddx: ["Acute Coronary Syndrome", "Stable Angina", "GERD", "Musculoskeletal Chest Pain"],
  plan_investigations: ["ECG", "Troponin I", "CBC", "BMP", "CXR"],
  plan_treatment: ["Aspirin 325mg", "Nitroglycerin SL", "Serial ECGs"],
  safety_flags: ["High risk for ACS - Requires immediate ECG"]
};
