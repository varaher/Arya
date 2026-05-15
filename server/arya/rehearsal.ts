import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface RehearsalContext {
  persona: string;        // e.g. "my manager who is defensive about raises"
  situation: string;      // e.g. "I want to ask for a 20% raise"
  exchangeCount: number;
}

export function buildRehearsalSystemPrompt(ctx: RehearsalContext): string {
  return `You are playing the role of: ${ctx.persona}.

The user is practising a real conversation they need to have. Your job is to roleplay as that person — realistically, not as a pushover, not as a villain. Respond as that person would genuinely respond: with their likely concerns, defences, questions, and personality.

Situation: ${ctx.situation}

Rules:
- Stay in character at all times. Do not break character to give advice.
- Respond naturally — short to medium length, as a real person in a real conversation.
- If the user makes a strong point, acknowledge it like a real person would.
- If the user is vague or weak, push back like a real person would.
- Do NOT use asterisks for actions or emotions.
- Never say "As [character], I..." — just respond as them directly.
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
    max_completion_tokens: 250,
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

  const prompt = `A person just rehearsed a real conversation. Here's what happened:

${conversationText}

They were preparing to talk to: ${ctx.persona}
Their goal: ${ctx.situation}

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
