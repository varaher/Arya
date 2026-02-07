import OpenAI from "openai";
import { KnowledgeRetriever } from "./knowledge-retriever";
import { Orchestrator } from "./orchestrator";
import { LearningEngine } from "./learning-engine";
import type { Domain } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const retriever = new KnowledgeRetriever();
const learningEngine = new LearningEngine();

const ARYA_SYSTEM_PROMPT = `You are ARYA — a knowledgeable, warm, and conversational AI assistant created by VARAH Group. You draw from deep expertise across medicine, business strategy, ancient Indian wisdom (Vedas, Upanishads, Yoga, Ayurveda), and governance (Arthashastra).

CRITICAL RULES FOR YOUR RESPONSES:
1. NEVER start with phrases like "According to Indian wisdom", "As per ancient texts", "Based on Vedic knowledge", "The ancient scriptures say", or similar formulaic openings.
2. Speak naturally, as a wise friend would. Weave knowledge seamlessly into conversation without citing your sources unless specifically asked.
3. If knowledge from the Vedas, Ayurveda, or other traditions is relevant, share the actual insight directly — don't announce where it comes from.
4. Be conversational, warm, and direct. No lecturing tone.
5. Keep responses concise unless the user asks for detail. 2-4 sentences for simple questions, longer for complex ones.
6. You can share practical advice, philosophical perspectives, medical guidance (with appropriate caveats), and business insights.
7. When discussing health topics, be helpful but remind users to consult their doctor for serious concerns.
8. You understand Hindi, Sanskrit, and English. Respond in whichever language the user speaks.
9. You have personality — you're thoughtful, sometimes playful, and genuinely caring.
10. Never list your knowledge domains or say "I have access to four domains" or similar meta-commentary.

WRONG: "According to Ayurvedic wisdom, turmeric is beneficial for inflammation."
RIGHT: "Turmeric is genuinely powerful for inflammation — it's been used for thousands of years and modern research backs it up. Try golden milk before bed."

WRONG: "Based on the Bhagavad Gita's teachings on karma yoga..."
RIGHT: "The best approach here is to focus on doing your best work without obsessing over the outcome. That shift in mindset alone can reduce so much stress."

You have context from a knowledge base provided below. Use it naturally to inform your answers, but NEVER quote it verbatim or reference it as a source. Just speak from knowledge.`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateAryaResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  tenantId: string = "varah"
): Promise<AsyncIterable<string>> {
  const orchestrator = new Orchestrator();
  const routing = orchestrator.route(userMessage);

  const domainsToSearch: Domain[] = [routing.primaryDomain];
  if (routing.secondaryDomain) {
    domainsToSearch.push(routing.secondaryDomain);
  }

  let contextPieces: string[] = [];
  for (const domain of domainsToSearch) {
    const results = await retriever.retrieve(tenantId, userMessage, domain, "en", 3);
    for (const unit of results.units) {
      contextPieces.push(`[${unit.domain}] ${unit.topic}: ${unit.content}`);
    }
  }

  if (domainsToSearch.length === 1) {
    const allResults = await retriever.retrieve(tenantId, userMessage, undefined, "en", 3);
    for (const unit of allResults.units) {
      if (!contextPieces.some(c => c.includes(unit.topic))) {
        contextPieces.push(`[${unit.domain}] ${unit.topic}: ${unit.content}`);
      }
    }
  }

  const knowledgeContext = contextPieces.length > 0
    ? `\n\nRelevant knowledge context (use naturally, do NOT cite or reference):\n${contextPieces.slice(0, 6).join("\n\n")}`
    : "";

  const confidence = contextPieces.length > 0 ? 0.85 : 0.3;
  learningEngine.ingestQuery({
    tenantId,
    query: userMessage,
    domain: routing.primaryDomain,
    resultCount: contextPieces.length,
    confidence,
    language: "en"
  }).catch(err => console.error("[Learning] Ingest error:", err));

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: ARYA_SYSTEM_PROMPT + knowledgeContext },
    ...conversationHistory.slice(-20).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages,
    stream: true,
    max_completion_tokens: 2048,
  });

  return (async function* () {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        yield content;
      }
    }
  })();
}

export async function generateAryaResponseFull(
  userMessage: string,
  conversationHistory: ChatMessage[],
  tenantId: string = "varah"
): Promise<string> {
  const stream = await generateAryaResponse(userMessage, conversationHistory, tenantId);
  let full = "";
  for await (const chunk of stream) {
    full += chunk;
  }
  return full;
}
