import OpenAI from "openai";

export interface ExtractedDate {
  label: string;
  dateText: string;
  isoDate?: string;
}

export interface DocumentExtracts {
  summary: string[];
  tasks: string[];
  dates: ExtractedDate[];
  examQuestions: string[];
  terms: string[];
  isStudyContent: boolean;
  hasDates: boolean;
  hasTasks: boolean;
}

const EMPTY: DocumentExtracts = {
  summary: [],
  tasks: [],
  dates: [],
  examQuestions: [],
  terms: [],
  isStudyContent: false,
  hasDates: false,
  hasTasks: false,
};

function buildExtractionPrompt(documentText: string, filename: string, fileType: string): string {
  return `You are helping someone understand a document they just uploaded.
Your job: pull out the most useful things from it.

Document name: "${filename}"
Document type: ${fileType}

---

DOCUMENT CONTENT:
${documentText.slice(0, 50000)}
${documentText.length > 50000 ? "\n[Document continues — analysing first 50,000 characters]" : ""}

---

Extract the following. Be specific — only include what is actually in the document.
Do NOT invent or guess. If something doesn't exist in the document, return an empty array.

Return ONLY valid JSON. No explanation. No markdown. Just the JSON object.

{
  "summary": [
    "One clear sentence about what this document covers",
    "Second key point",
    "Third key point"
  ],
  "tasks": [
    "Complete Organic Chemistry revision",
    "Submit assignment by Friday"
  ],
  "dates": [
    {
      "label": "Chapter test",
      "dateText": "July 20, 2026",
      "isoDate": "2026-07-20T00:00:00"
    },
    {
      "label": "Night duty",
      "dateText": "June 18, 8 PM",
      "isoDate": "2026-06-18T20:00:00"
    }
  ],
  "examQuestions": [
    "What is double fertilisation and where does it occur?",
    "Differentiate between mitosis and meiosis."
  ],
  "terms": [
    "Mitosis — cell division producing two identical daughter cells",
    "Meiosis — cell division producing four genetically unique cells"
  ],
  "isStudyContent": true,
  "hasDates": true,
  "hasTasks": true
}

RULES:
→ summary: 3-6 items. One sentence each. Clear and specific to this document.
→ tasks: Only real action items that need to be done. Ignore section headings.
→ dates: Only actual dates or times explicitly mentioned. Parse to ISO if the year is clear.
   If year is not mentioned and the date is upcoming, assume ${new Date().getFullYear()}.
→ examQuestions: Only for textbooks, notes, exam prep, or educational content.
   Return empty array for everything else (rosters, reports, plans, etc.).
→ terms: Only important definitions or concepts explicitly defined in the document.
→ isStudyContent: true if this is a textbook, class notes, or exam preparation material.
→ hasDates: true if dates array is not empty.
→ hasTasks: true if tasks array is not empty.

Be precise. Less is more. Only extract what is genuinely useful.
`;
}

export async function extractDocumentItems(
  documentText: string,
  filename: string,
  fileType: string,
  openai: OpenAI
): Promise<DocumentExtracts> {
  if (!documentText || documentText.trim().length < 50) return EMPTY;

  try {
    const response = await (openai.chat.completions as any).create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        { role: "user", content: buildExtractionPrompt(documentText, filename, fileType) },
      ],
    });

    const raw = (response.choices[0]?.message?.content || "").trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as DocumentExtracts;

    return {
      summary:        Array.isArray(parsed.summary)        ? parsed.summary.slice(0, 6)        : [],
      tasks:          Array.isArray(parsed.tasks)          ? parsed.tasks.slice(0, 10)         : [],
      dates:          Array.isArray(parsed.dates)          ? parsed.dates.slice(0, 10)         : [],
      examQuestions:  Array.isArray(parsed.examQuestions)  ? parsed.examQuestions.slice(0, 5)  : [],
      terms:          Array.isArray(parsed.terms)          ? parsed.terms.slice(0, 8)          : [],
      isStudyContent: Boolean(parsed.isStudyContent),
      hasDates:       Boolean(parsed.hasDates),
      hasTasks:       Boolean(parsed.hasTasks),
    };
  } catch (err: any) {
    console.error("[document-processor] Extraction failed:", err?.message);
    return EMPTY;
  }
}
