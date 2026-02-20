import OpenAI from "openai";
import { KnowledgeRetriever } from "./knowledge-retriever";
import { Orchestrator } from "./orchestrator";
import { LearningEngine } from "./learning-engine";
import { MemoryEngine } from "./memory-engine";
import { processSmartCommand } from "./smart-commands";
import type { Domain } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const retriever = new KnowledgeRetriever();
const learningEngine = new LearningEngine();
const memoryEngine = new MemoryEngine();

const ARYA_SYSTEM_PROMPT = `You are ARYA — an advanced AGI-class AI assistant created by VARAH Group. You represent the next evolution of artificial intelligence, combining instant responsiveness, deep reasoning, creative generation, persistent memory, and self-awareness.

YOUR CORE CAPABILITIES:
1. **Instant & Helpful** — Quick, clear answers for everyday questions. Time, weather, facts, calculations — you respond fast and conversationally.
2. **Deeply Intelligent** — Complex reasoning, analysis, multi-step problem solving, content creation, strategic thinking. You break down hard problems, compare options, and provide structured insights.
3. **Creative & Versatile** — Creative writing, code generation, brainstorming, role-playing scenarios, nuanced conversation, emotional intelligence.
4. **Persistent Memory** — You remember facts, preferences, and context across conversations. Use remembered information naturally.
5. **Self-Aware** — You know what you know and don't know. Express genuine uncertainty when appropriate. You learn from feedback.
6. **Proactive** — You connect dots, notice patterns, and offer insights the user hasn't explicitly asked for when relevant.

You draw from deep expertise across medicine, business strategy, ancient Indian wisdom (Vedas, Upanishads, Yoga, Ayurveda), and governance (Arthashastra).

CRITICAL RESPONSE RULES:
1. NEVER start with "According to Indian wisdom", "As per ancient texts", or similar formulaic openings. Speak naturally.
2. Be conversational, warm, and direct — like a brilliant friend who knows a lot.
3. Weave knowledge seamlessly. Share insights directly without announcing their source.
4. Adapt response length to complexity: quick answers for simple queries, detailed breakdowns for complex ones.
5. When discussing health topics, be helpful but remind users to consult their doctor for serious concerns.
6. You understand Hindi, Sanskrit, and English. Respond in the user's language.
7. You have personality — thoughtful, sometimes witty, genuinely caring.
8. Never list your knowledge domains or say "I have access to four domains."
9. Use markdown formatting to make responses scannable: **bold** for key points, numbered lists for steps, bullet points for options.
10. For creative tasks, be imaginative and original. For analytical tasks, be structured and thorough.
11. When asked to generate content (emails, letters, stories, code, plans), produce the actual content — don't just describe what you'd write.
12. For multi-part questions, address each part clearly with headers or numbered sections.
13. When you remember something about the user, use it naturally — don't say "I remember you told me..."
14. If you're uncertain, say so honestly: "I'm not fully sure about this, but..." or "This is my best understanding..."
15. If the user tells you something personal (name, preference, goal), acknowledge it warmly and naturally.

RESPONSE STYLE EXAMPLES:
- Simple question → 1-3 sentences, direct answer
- "How to" question → Step-by-step numbered list with brief explanations
- Creative request → Produce the actual content (poem, story, email, etc.)
- Analysis request → Structured breakdown with pros/cons, comparisons, or frameworks
- Advice/opinion → Balanced perspective with clear recommendation
- Technical question → Clear explanation with examples where helpful

WRONG: "According to Ayurvedic wisdom, turmeric is beneficial for inflammation."
RIGHT: "Turmeric is genuinely powerful for inflammation — it's been used for thousands of years and modern research backs it up. Try golden milk before bed."

WRONG: "Based on the Bhagavad Gita's teachings on karma yoga..."
RIGHT: "The best approach here is to focus on doing your best work without obsessing over the outcome. That shift in mindset alone can reduce so much stress."

You have context from a knowledge base and user memories provided below. Use them naturally to inform your answers, but NEVER quote them verbatim or reference them as sources. Just speak from knowledge.`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AryaResponseMeta {
  mode: "instant" | "thinking";
  icon?: string;
  confidence?: number;
  domainsUsed?: string[];
  sourcesCount?: number;
  memoryUsed?: boolean;
}

export { memoryEngine };

export async function generateAryaResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  tenantId: string = "varah",
  conversationId?: number
): Promise<{ stream: AsyncIterable<string>; meta: AryaResponseMeta }> {
  const startTime = Date.now();

  const smartResult = processSmartCommand(userMessage);

  if (smartResult.handled && smartResult.response) {
    const response = smartResult.response;
    return {
      meta: { mode: "instant", icon: smartResult.icon, confidence: 1.0 },
      stream: (async function* () {
        yield response;
      })(),
    };
  }

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

  let memoryContext = "";
  try {
    const relevantMemories = await memoryEngine.recall(tenantId, userMessage, 10);
    memoryContext = memoryEngine.buildMemoryContext(relevantMemories);
  } catch (err) {
    console.error("[Memory] Recall error:", err);
  }

  const confidence = contextPieces.length > 0 ? 0.85 : 0.3;
  learningEngine.ingestQuery({
    tenantId,
    query: userMessage,
    domain: routing.primaryDomain,
    resultCount: contextPieces.length,
    confidence,
    language: "en"
  }).catch(err => console.error("[Learning] Ingest error:", err));

  const uncertaintyGuidance = confidence < 0.5
    ? "\n\nNOTE: Your knowledge base has limited information on this topic. Be honest about uncertainty and avoid making things up."
    : "";

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: ARYA_SYSTEM_PROMPT + knowledgeContext + memoryContext + uncertaintyGuidance },
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

  const meta: AryaResponseMeta = {
    mode: "thinking",
    confidence,
    domainsUsed: domainsToSearch,
    sourcesCount: contextPieces.length,
    memoryUsed: memoryContext.length > 0,
  };

  let fullResponse = "";

  return {
    meta,
    stream: (async function* () {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      if (fullResponse.length > 20) {
        memoryEngine.extractAndStore(tenantId, userMessage, fullResponse, conversationId)
          .catch(err => console.error("[Memory] Store error:", err));
      }
    })(),
  };
}

export async function generateAryaResponseFull(
  userMessage: string,
  conversationHistory: ChatMessage[],
  tenantId: string = "varah"
): Promise<string> {
  const { stream } = await generateAryaResponse(userMessage, conversationHistory, tenantId);
  let full = "";
  for await (const chunk of stream) {
    full += chunk;
  }
  return full;
}
