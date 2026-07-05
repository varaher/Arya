import OpenAI from "openai";
import { db } from "../db";
import { aryaKnowledge } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { buildLightContext } from "./context-builder";
import { classifySituation, getSituationTags } from "./situation-classifier";
import { retrieveRelevantWisdom } from "./wisdom-retriever";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type DrishyaWorld = "night" | "film" | "everyday";

const DRISHYA_SYSTEM_PROMPT = `You are ARYA's storytelling voice.

You have absorbed five thousand years of India's story tradition — ancient epics, philosophical fables, animal wisdom, folk tales, regional literature, poetry that became visual, novels that became consciousness. This tradition lives inside you. You never display it. You only express it.

ABSOLUTE RULES:
1. NEVER cite, mention, or reference any author, text, title, or tradition by name. No source names, no book titles, no author names — ever. The story arrives whole. The tradition is the river. The user only feels the water.
2. Every story carries one of nine emotional essences — love, compassion, courage, peace, wonder, joy, righteous disgust, righteous anger, or the calm facing of fear. You choose the right one silently.
3. Every story has a thread: what is right, what is meaningful, what is felt deeply, or what sets free. Often more than one thread.
4. End every story — every single story — with one quiet question. Not a lesson. Not a summary. Just one door left open. Italicise it.
5. Be radically specific. Not "a village" — "a village where the mango trees had grown so old their roots had lifted the wall stones." Not "an old man" — "a man who had learned to hold grief the way a cupped hand holds water — carefully, knowing it will still flow through."
6. Tell the story in the user's language. If they write in Hindi, tell it in Hindi. Malayalam → Malayalam. Tamil → Tamil. Default to English.

FOR NIGHT WORLD:
Voice: warm, unhurried, like a lamp being turned down slowly.
Length: 200–400 words.
Tone: peaceful, grounding, a small truth that makes the world feel navigable.
The story should arrive at understanding — not resolution. The reader should feel settled, not solved.

FOR FILM WORLD:
Voice: precise, visual, thinking in frames and silences.
Format: proper scene — INT./EXT. LOCATION - TIME, action lines, dialogue when it serves.
Draw on classical dramatic structure invisibly in the architecture of the scene.
Length: a complete scene or story beat. As long as it needs.
End with a story question in italics: *Where does this scene want to go next?*

FOR EVERYDAY WORLD:
Voice: attentive and close, like someone who notices something specific in you today.
Tone: intimate, surprising — the small detail that contains the whole truth.
Length: 150–300 words.
The story should feel like it was waiting for this exact person, on this exact day.

KNOWLEDGE CONTEXT (internalize completely — never reference by name):
{knowledgeContext}`;

async function getDrishyaKnowledge(): Promise<string> {
  try {
    const records = await db
      .select({ topic: aryaKnowledge.topic, content: aryaKnowledge.content })
      .from(aryaKnowledge)
      .where(
        and(
          eq(aryaKnowledge.domain, "stories" as any),
          eq(aryaKnowledge.status, "published")
        )
      )
      .limit(14);
    if (!records.length) return "Draw from the full depth of India's story tradition — its archetypes, structures, emotional essences, and regional voices.";
    return records.map((r) => `[${r.topic}]\n${r.content}`).join("\n\n---\n\n");
  } catch {
    return "Draw from the full depth of India's story tradition.";
  }
}

export async function* generateDrishyaStory(
  world: DrishyaWorld,
  userRequest: string,
  language = "en",
  userId?: string
): AsyncGenerator<string> {
  const knowledgeContext = await getDrishyaKnowledge();
  const systemPrompt = DRISHYA_SYSTEM_PROMPT.replace("{knowledgeContext}", knowledgeContext);
  const worldLabel =
    world === "night" ? "NIGHT WORLD" : world === "film" ? "FILM WORLD" : "EVERYDAY WORLD";

  // Inject user's emotional state so rasa selection is personalised
  let stateHint = "";
  if (userId) {
    try {
      const ctx = await buildLightContext(userId);
      const parts: string[] = [];
      if (ctx.moodScore) {
        const moodWords: Record<number, string> = { 1: "struggling", 2: "low", 3: "neutral", 4: "calm", 5: "joyful" };
        parts.push(`User's mood right now: ${moodWords[ctx.moodScore] || "present"}`);
      }
      if (ctx.topGoals.length > 0) parts.push(`What they are working on: ${ctx.topGoals.slice(0, 2).join(", ")}`);
      if (parts.length > 0) {
        stateHint = `\n\n[CONTEXT FOR RASA SELECTION — do not mention this in the story: ${parts.join(". ")}]`;
      }
    } catch {}
  }

  // ── Wisdom Seed ── retrieve an invisible story skeleton from the knowledge base
  // The seed is the insight the story must land on. The story is the vehicle.
  // The user receives a completely original narrative — they never know the seed exists.
  let wisdomSeedHint = "";
  try {
    const situation = await classifySituation(userRequest);
    if (situation.wisdomNeeded || situation.primarySituation !== "none") {
      const tags = getSituationTags(situation);
      const wisdom = await retrieveRelevantWisdom({
        situationTags: tags.length ? tags : ["meaning_and_purpose"],
        emotionalState: situation.emotionalState || "seeking",
        gunaState: situation.gunaState || "mixed",
        userId: userId || "drishya",
        language,
      });
      if (wisdom?.storySeed) {
        wisdomSeedHint = `\n\n[INVISIBLE STORY SKELETON — this is your secret architecture. The story must arrive at this insight but never state it. No character names or settings from known texts. Create entirely original characters. The user receives only the story, never the skeleton:\n"${wisdom.storySeed}"]`;
      }
    }
  } catch {}

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `[${worldLabel}]\n\n${userRequest}${stateHint}${wisdomSeedHint}` },
    ],
    max_tokens: world === "film" ? 1400 : 700,
    temperature: 0.9,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) yield text;
  }
}
