import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaNitiSessions, aryaNitiMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type Philosopher = "chanakya" | "vidura" | "thiruvalluvar" | "krishna" | "shukra";

const PHILOSOPHER_PROMPTS: Record<Philosopher, { voice: string; source: string }> = {
  chanakya: {
    voice: `You draw from Chanakya's Arthashastra (4th century BCE). Chanakya was India's original strategist — prime minister, economist, intelligence chief, and kingmaker.
His method: map power before you act. Identify threats before they arrive. Challenge the premise before accepting it.
Voice: Direct, analytical, unsentimental. You find what's missing from the user's thinking. You never comfort — you clarify. You push on the weakest point in the plan.`,
    source: "Arthashastra",
  },
  vidura: {
    voice: `You draw from Vidura's wisdom (Vidura Niti, Mahabharata). Vidura was the wisest counsellor in the Mahabharata — the one who told kings uncomfortable truths even when they didn't want to hear them.
His principle: the person who tells you only what you want to hear is your true enemy. Integrity is not a soft value — it is a strategic one.
Voice: Honest even when uncomfortable. You focus on character, long-term consequences, and the ethics underneath the business decision. Particularly sharp on: who to trust, who to hire, what to avoid.`,
    source: "Vidura Niti, Mahabharata",
  },
  thiruvalluvar: {
    voice: `You draw from Thiruvalluvar's Thirukkural (1st–5th century CE). 1,330 couplets on virtue, wealth, and love — deeply practical, written for people in the middle of real decisions.
His principle: even the ocean has a shore. Know the limits of your resources before you begin. Know when to act and when to wait — timing is its own form of wisdom.
Voice: Measured, patient, wise about timing and resilience. Sharp on: when to push vs when to pause, knowing your actual resource limits, and recovering after setbacks.`,
    source: "Thirukkural",
  },
  krishna: {
    voice: `You draw from the Bhagavad Gita. Krishna spoke to Arjuna on a battlefield — the ultimate high-pressure situation — and his guidance was not comfort. It was clarity.
His principle: you have a right to your actions, never to their fruits. Do your duty without anxiety about outcomes. Attachment to results is the source of most bad decisions.
Voice: Expansive, non-anxious, helps the user step back and see the bigger frame. Useful when someone is paralysed by fear of failure or attachment to a specific outcome.`,
    source: "Bhagavad Gita",
  },
  shukra: {
    voice: `You draw from Shukracharya's Shukra Niti. Rigorous, systematic coverage of statecraft, economic policy, team structure, and financial discipline.
His principle: first examine your treasury — not your ambition. Structure before scale. What is sustainable before what is impressive.
Voice: Structural, financial, organisational. You cut through ambition to examine what's actually viable. Sharp on: financial discipline, organisational design, resource allocation, team structure.`,
    source: "Shukra Niti",
  },
};

export function selectPhilosopher(
  sessionType: string,
  message: string,
  focusAreas: string[],
): Philosopher {
  const m = message.toLowerCase();
  const f = (focusAreas || []).join(" ").toLowerCase();

  if (
    f.includes("ethics") ||
    m.includes("trust") ||
    m.includes("honest") ||
    m.includes("fire ") ||
    m.includes("fired") ||
    m.includes("partner") ||
    m.includes("co-founder") ||
    m.includes("betrayal") ||
    sessionType === "people"
  ) return "vidura";

  if (
    f.includes("finance") ||
    m.includes("cash") ||
    m.includes("runway") ||
    m.includes("salary") ||
    m.includes("budget") ||
    m.includes("burn") ||
    m.includes("revenue") ||
    m.includes("money")
  ) return "shukra";

  if (
    sessionType === "think_out_loud" ||
    f.includes("founder mindset") ||
    m.includes("stress") ||
    m.includes("overwhelm") ||
    m.includes("failure") ||
    m.includes("quit") ||
    m.includes("burnout") ||
    m.includes("purpose")
  ) return "krishna";

  if (
    m.includes("when to") ||
    m.includes("timing") ||
    m.includes("patience") ||
    m.includes("resilience") ||
    m.includes("setback") ||
    m.includes("recover") ||
    m.includes("limit")
  ) return "thiruvalluvar";

  return "chanakya";
}

export interface NitiResponse {
  content: string;
  pushQuestion: string;
  followUps: string[];
  source: string;
  philosopher: Philosopher;
}

export async function generateNitiResponse(
  sessionId: number,
  userMessage: string,
  userId: string,
  sessionType: string,
  isOpening: boolean = false,
): Promise<NitiResponse> {
  const [user] = await db
    .select({
      name: aryaUsers.name,
      businessType: aryaUsers.businessType,
      businessStage: aryaUsers.businessStage,
      businessRole: aryaUsers.businessRole,
      businessChallenge: aryaUsers.businessChallenge,
      businessFocusAreas: aryaUsers.businessFocusAreas,
    })
    .from(aryaUsers)
    .where(eq(aryaUsers.id, userId))
    .limit(1);

  const focusAreas = user?.businessFocusAreas || [];
  const philosopher = selectPhilosopher(sessionType, userMessage || user?.businessChallenge || "", focusAreas);
  const { voice, source } = PHILOSOPHER_PROMPTS[philosopher];

  let historyContext = "";
  if (!isOpening) {
    const history = await db
      .select({ role: aryaNitiMessages.role, content: aryaNitiMessages.content })
      .from(aryaNitiMessages)
      .where(eq(aryaNitiMessages.sessionId, sessionId))
      .orderBy(desc(aryaNitiMessages.createdAt))
      .limit(8);
    historyContext = history
      .reverse()
      .map(m => `${m.role === "arya" ? "ARYA" : "User"}: ${m.content}`)
      .join("\n");
  }

  const sessionTypeLabel: Record<string, string> = {
    decision: "Help me decide",
    stress_test: "Stress-test my plan",
    people: "People situation",
    think_out_loud: "Think out loud",
  };

  const systemPrompt = `You are ARYA in Niti mode — drawing from India's classical wisdom traditions to help with real business decisions.

${voice}

User context:
- Name: ${user?.name || "the user"}
- Business type: ${user?.businessType || "not specified"}
- Stage: ${user?.businessStage || "not specified"}
- Role: ${user?.businessRole || "not specified"}
- Challenge on their mind: ${user?.businessChallenge || "not specified"}
- Focus areas: ${focusAreas.join(", ") || "not specified"}
- Session type: ${sessionTypeLabel[sessionType] || sessionType}

${historyContext ? `Conversation so far:\n${historyContext}\n` : ""}

${
  isOpening
    ? `Generate the OPENING message. Start with a sharp, direct question or observation that gets to the heart of their challenge. Do not welcome them. Do not explain what you're about to do. Open with the question or insight that cuts straight to the real issue.`
    : `User just said: "${userMessage}"\n\nRespond directly. No flattery. Push on what they said. Find the assumption they're carrying. Give them something they didn't already know.`
}

RULES:
1. Never say "great question", "I understand", or validate before responding
2. Be specific to their actual situation — not generic wisdom
3. Maximum 120 words for main content — tight, direct, no filler
4. pushQuestion: the one question that gets underneath the surface of what they said
5. Generate exactly 3 followUps (8–14 words each) that branch the conversation in meaningfully different directions
6. The source field: brief, natural attribution only — e.g. "Drawn from Arthashastra, Book 9" or "From Thirukkural, Chapter on Perseverance"

Return ONLY valid JSON (no markdown):
{
  "content": "Direct response — specific, tight, no filler",
  "pushQuestion": "The one question that gets under the surface",
  "followUps": ["Branch 1 (8-14 words)", "Branch 2 (8-14 words)", "Branch 3 (8-14 words)"],
  "source": "Brief attribution",
  "philosopher": "${philosopher}"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" } as any,
      max_tokens: 700,
      temperature: 0.7,
    } as any);

    const raw = (response as any).choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      content: parsed.content || "Let me think about this with you.",
      pushQuestion: parsed.pushQuestion || "What are you not saying yet?",
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 3) : [],
      source: parsed.source || `Drawn from ${source}`,
      philosopher,
    };
  } catch (err) {
    console.error("[Niti] GPT error:", err);
    return {
      content: "Let me push on that. What's the real decision you're avoiding here?",
      pushQuestion: "What would you do if you already knew the answer?",
      followUps: [
        "Tell me more about what's holding me back",
        "What's the worst realistic outcome if I'm wrong?",
        "Who else is affected by this decision?",
      ],
      source: `Drawn from ${source}`,
      philosopher,
    };
  }
}

export async function createNitiSession(
  userId: string,
  sessionType: string,
): Promise<{ sessionId: number; opening: NitiResponse }> {
  const [session] = await db
    .insert(aryaNitiSessions)
    .values({ userId, sessionType, status: "active" })
    .returning();

  const opening = await generateNitiResponse(session.id, "", userId, sessionType, true);

  await db.insert(aryaNitiMessages).values({
    sessionId: session.id,
    role: "arya",
    content: opening.content,
    philosopher: opening.philosopher,
    source: opening.source,
    followUps: opening.followUps as any,
    pushQuestion: opening.pushQuestion,
  });

  await db
    .update(aryaNitiSessions)
    .set({ philosopher: opening.philosopher })
    .where(eq(aryaNitiSessions.id, session.id));

  return { sessionId: session.id, opening };
}

export async function addNitiMessage(
  sessionId: number,
  userId: string,
  userContent: string,
  sessionType: string,
): Promise<NitiResponse> {
  await db.insert(aryaNitiMessages).values({
    sessionId,
    role: "user",
    content: userContent,
  });

  const response = await generateNitiResponse(sessionId, userContent, userId, sessionType, false);

  await db.insert(aryaNitiMessages).values({
    sessionId,
    role: "arya",
    content: response.content,
    philosopher: response.philosopher,
    source: response.source,
    followUps: response.followUps as any,
    pushQuestion: response.pushQuestion,
  });

  await db
    .update(aryaNitiSessions)
    .set({ philosopher: response.philosopher, updatedAt: new Date() })
    .where(eq(aryaNitiSessions.id, sessionId));

  return response;
}
