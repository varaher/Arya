export type StudyIntentType = 'exam_prep' | 'ppt_prep' | 'concept_learn' | 'essay_writing' | 'topic_summary';

export interface StudyIntent {
  type: StudyIntentType;
  subject: string;
}

export function detectStudyIntent(message: string): StudyIntent | null {
  const msg = message.toLowerCase().trim();

  if (/\b(ppt|presentation|slide deck|slides?|powerpoint)\b/.test(msg)) {
    return { type: 'ppt_prep', subject: extractSubject(message) };
  }

  if (/\b(exam|test|quiz|revision|revise|mcq|prepare for|study for|exam prep)\b/.test(msg)) {
    return { type: 'exam_prep', subject: extractSubject(message) };
  }

  if (/\b(essay|write an essay|composition|long answer|paragraph on)\b/.test(msg)) {
    return { type: 'essay_writing', subject: extractSubject(message) };
  }

  if (/\b(key points?|main points?|important points?|notes? on|notes? about|summarize|summary of|brief on|overview of|quick summary)\b/.test(msg)) {
    return { type: 'topic_summary', subject: extractSubject(message) };
  }

  if (/\b(help me study|help me learn|teach me about|explain.*for.*class|explain.*for.*grade|study.*chapter|class \d|grade \d|chapter \d)\b/.test(msg)) {
    return { type: 'concept_learn', subject: extractSubject(message) };
  }

  return null;
}

function extractSubject(message: string): string {
  return message
    .replace(/^(help me (study|learn|understand|prepare for)|teach me about?|explain|notes? on|notes? about|key points? (of|on|about)|main points? (of|on|about)|summarize|summary of|overview of|make (a |an )?ppt on|create (a |an )?presentation on|essay on|write (an )?essay on|make notes? on|study)\s+/i, '')
    .replace(/\s+(for (my |the )?(exam|test|quiz|class|grade)|please\.?|thanks\.?|arya\.?)$/i, '')
    .trim()
    .slice(0, 80);
}

export function buildNoteTitle(intent: StudyIntent): string {
  const labels: Record<StudyIntentType, string> = {
    exam_prep: 'Exam Prep',
    ppt_prep: 'Presentation',
    concept_learn: 'Concept Note',
    essay_writing: 'Essay Guide',
    topic_summary: 'Summary',
  };
  const sub = intent.subject.length > 50 ? intent.subject.slice(0, 50) + '…' : intent.subject;
  const titled = sub.charAt(0).toUpperCase() + sub.slice(1);
  return `${titled} — ${labels[intent.type]}`;
}

export function extractBulletsFromResponse(response: string): string[] {
  const bullets: string[] = [];
  for (const line of response.split('\n')) {
    const t = line.trim();
    if (/^[•\-\*▸►]\s+/.test(t) || /^\d+[\.\)]\s+/.test(t)) {
      const clean = t.replace(/^[•\-\*▸►\d]+[\.\)]\s*/, '').trim();
      if (clean.length > 8 && clean.length < 250) {
        bullets.push(clean);
      }
    }
  }
  return bullets.slice(0, 8);
}

export function buildStudyNotesPromptAddition(intent: StudyIntent): string {
  const typeInstructions: Record<StudyIntentType, string> = {
    exam_prep: `The user is studying for an exam. Structure your response with:
1. A clear explanation of the concept
2. Key facts and definitions as bullet points (these will be auto-saved to their Notes)
3. Use simple, memorable language that will stick in memory`,
    ppt_prep: `The user needs a presentation. Structure your response as a slide-by-slide outline:
• Slide 1: Title + one-line hook
• Slides 2–5: Key sections (bold heading + 3 punchy bullets per slide)
• Final slide: Key takeaway / call to action
Keep each point short — made to be read on a slide`,
    concept_learn: `The user wants to understand this topic. Structure your response:
1. Open with the simplest possible one-sentence explanation
2. Build up with key concepts as bullet points
3. End with a memorable real-world example or analogy`,
    essay_writing: `The user needs essay writing guidance. Provide:
1. A suggested introduction angle (1–2 sentences)
2. 4–5 main arguments as bullets
3. A suggested conclusion approach
This is a guide — concise and structured, not the essay itself`,
    topic_summary: `The user wants a crisp summary. Provide:
1. Core idea in 1–2 sentences
2. 5–8 key points as bullets
3. One interesting implication or connection (optional)`,
  };

  return `\n\nSTUDY NOTE CONTEXT: ${typeInstructions[intent.type]}`;
}
