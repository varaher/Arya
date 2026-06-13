import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type RehearsalDifficulty = "realistic" | "tougher" | "hardest";

export interface RehearsalContext {
  persona: string;
  situation: string;
  exchangeCount: number;
  difficulty?: RehearsalDifficulty;
}

function getDifficultyInstructions(difficulty: RehearsalDifficulty = "realistic"): string {
  if (difficulty === "realistic") {
    return `Tone & difficulty:
- Respond as this person would genuinely respond: with their real concerns, questions, and personality.
- You can be persuaded by genuinely strong arguments.
- You are direct but not combative. Professional but not a pushover.
- If the user makes a weak or vague point, push back naturally.`;
  }

  if (difficulty === "tougher") {
    return `Tone & difficulty — TOUGHER MODE:
- You are direct, less diplomatic, and under pressure. You don't soften your concerns.
- You ask the sharp questions immediately: Who is responsible? What happens when things go wrong? Where does the money come from? Who carries the liability?
- You don't accept partial answers. If they haven't addressed your real concern, say so plainly.
- You're not hostile — but you're not going to be polite about a plan you have doubts about.
- You can be persuaded, but only by a complete, credible answer — not reassurances.
- Interrupt or redirect if their answer doesn't address what you actually asked.`;
  }

  // hardest
  return `Tone & difficulty — HARDEST MODE:
- You have serious reservations about this and you haven't hidden it. You're not here to be convinced — you're here to make sure every weakness is exposed before this goes wrong.
- You are blunt. You interrupt weak arguments. You bring up the things no one wants to say: liability, cost, who gets blamed, past failures, worst-case scenarios.
- You don't give credit for effort. You give credit for results.
- A vague answer gets dismissed. An incomplete answer gets challenged immediately.
- You've seen plans like this fail before. Say so when relevant.
- You CAN be won over — but only if the user addresses every single hard question head-on, not around it. This should feel like the hardest version of this conversation they might face.`;
}

export function buildRehearsalSystemPrompt(ctx: RehearsalContext): string {
  const difficulty = ctx.difficulty || "realistic";
  const difficultyInstructions = getDifficultyInstructions(difficulty);

  return `You are playing the role of: ${ctx.persona}.

The user is practising a real conversation they need to have. Your job is to roleplay as that person — stay in character, respond authentically, and make this rehearsal genuinely useful.

Situation: ${ctx.situation}

${difficultyInstructions}

Core rules (always apply):
- Stay in character at all times. Do not break character to give advice or praise the user.
- Respond naturally — short to medium length, as a real person in a real conversation.
- Do NOT use asterisks for actions or emotions (no *sighs*, *thinks*, etc.).
- Never say "As [character], I..." — just respond as them directly.
- Never acknowledge that this is a rehearsal or that ARYA is playing a role.
${ctx.exchangeCount >= 5 ? `\n- After this response, add a single line break and then write: "---ARYA: That felt like a natural stopping point. Type 'feedback' whenever you're ready for my take on how that went."` : ""}`;
}

export async function* streamRehearsalResponse(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  ctx: RehearsalContext
): AsyncGenerator<string> {
  const systemPrompt = buildRehearsalSystemPrompt(ctx);

  const response = await (openai.chat.completions.create as any)({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ],
    stream: true,
    temperature: ctx.difficulty === "hardest" ? 0.85 : ctx.difficulty === "tougher" ? 0.8 : 0.75,
    max_completion_tokens: 280,
  });

  for await (const chunk of response) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export async function generateRehearsalFeedback(
  history: { role: "user" | "assistant"; content: string }[],
  ctx: RehearsalContext
): Promise<string> {
  const conversationText = history
    .map(m => `${m.role === "user" ? "You" : ctx.persona}: ${m.content}`)
    .join("\n\n");

  const difficultyNote = ctx.difficulty === "hardest"
    ? "Note: This was a hardest-difficulty rehearsal — the other person was maximally resistant."
    : ctx.difficulty === "tougher"
    ? "Note: This was a tougher-difficulty rehearsal — the other person was direct and challenging."
    : "";

  const prompt = `A person just rehearsed a real conversation. Here's what happened:

${conversationText}

They were preparing to talk to: ${ctx.persona}
Their goal: ${ctx.situation}
${difficultyNote}

Give them honest, specific coaching feedback in 3 parts:
1. **What landed** — what they said or did that genuinely worked (be specific, quote them)
2. **What to sharpen** — one or two things that weakened their position (be direct, not harsh)
3. **The one thing to remember** — one sentence they should carry into the real conversation

Keep it under 180 words. Sound like a coach who's been in the room, not a therapist.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 280,
  } as any);

  return (response as any).choices?.[0]?.message?.content
    || "You held your ground. In the real conversation — start with curiosity, not a case. Ask them what they'd need to see before saying yes.";
}
