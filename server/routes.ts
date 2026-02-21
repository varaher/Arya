import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { KnowledgeRetriever } from "./arya/knowledge-retriever";
import { Orchestrator } from "./arya/orchestrator";
import { MedicalEngine } from "./arya/medical-engine";
import { LearningEngine } from "./arya/learning-engine";
import { NeuralLinkEngine } from "./arya/neural-link-engine";
import { generateAryaResponse, memoryEngine, type ChatMessage } from "./arya/chat-engine";
import { GoalsEngine } from "./arya/goals-engine";
import { FeedbackEngine } from "./arya/feedback-engine";
import { InsightsEngine } from "./arya/insights-engine";
import { chatStorage } from "./replit_integrations/chat/storage";
import { ensureCompatibleFormat, speechToText } from "./replit_integrations/audio/client";
import {
  sarvamSpeechToText,
  sarvamTranslate,
  sarvamTextToSpeech,
  sarvamSpeechToTextTranslate,
  isIndianLanguage,
  getSpeakerForLanguage,
  SUPPORTED_LANGUAGES,
  type SarvamLanguageCode,
} from "./arya/sarvam-service";
import { QueryRequestSchema, DomainSchema, aryaKnowledge, aryaClinicalRecords } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  getApiKeyUsage,
  getUsageStats,
  apiKeyAuth,
} from "./arya/api-key-service";

const retriever = new KnowledgeRetriever();
const medicalEngine = new MedicalEngine();
const learningEngine = new LearningEngine();
const neuralLinkEngine = new NeuralLinkEngine();
const goalsEngine = new GoalsEngine();
const feedbackEngine = new FeedbackEngine();
const insightsEngine = new InsightsEngine();

const adminSessions = new Map<string, { createdAt: number }>();
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000;

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of adminSessions) {
    if (now - session.createdAt > ADMIN_SESSION_TTL) {
      adminSessions.delete(token);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        return res.status(500).json({ error: "Admin password not configured" });
      }
      if (password !== adminPassword) {
        return res.status(401).json({ error: "Invalid password" });
      }
      cleanExpiredSessions();
      const token = uuidv4();
      adminSessions.set(token, { createdAt: Date.now() });
      res.json({ token, expiresIn: ADMIN_SESSION_TTL });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/admin/verify", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ valid: false });
    }
    const token = authHeader.slice(7);
    cleanExpiredSessions();
    const session = adminSessions.get(token);
    if (!session) {
      return res.status(401).json({ valid: false });
    }
    res.json({ valid: true });
  });

  app.post("/api/admin/logout", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      adminSessions.delete(authHeader.slice(7));
    }
    res.json({ success: true });
  });
  
  // Health check
  app.get("/api/health", async (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0-alpha",
      features: ["knowledge", "ermate", "erprana", "self_learning", "neural_link"]
    });
  });

  // ARYA Knowledge Query (now with self-learning integration)
  app.post("/api/knowledge/query", async (req: Request, res: Response) => {
    try {
      const validated = QueryRequestSchema.parse(req.body);
      const traceId = uuidv4();
      
      const orchestrator = new Orchestrator({
        appId: validated.app_id,
        language: validated.language
      });
      
      const routing = orchestrator.route(validated.query, validated.language);
      
      console.log(`[${traceId}] Query routed to ${routing.primaryDomain} (mode: ${routing.mode})`);
      
      const results = await retriever.retrieve(
        validated.tenant_id,
        validated.query,
        routing.primaryDomain,
        validated.language,
        validated.top_k
      );
      
      let answer = '';
      let confidence = 0;
      if (results.units.length > 0) {
        answer = results.units[0].content;
        confidence = 0.85;
      } else {
        answer = 'No relevant knowledge found for this query. Please refine your search.';
        confidence = 0;
      }

      learningEngine.ingestQuery({
        tenantId: validated.tenant_id,
        query: validated.query,
        domain: routing.primaryDomain,
        resultCount: results.total,
        confidence,
        language: validated.language
      }).catch(err => console.error('[Learning] Ingest error:', err));
      
      res.json({
        answer,
        sources: results.units.map(unit => ({
          id: unit.id,
          title: unit.topic,
          relevance: 0.9
        })),
        confidence,
        domain_used: routing.primaryDomain,
        routing: {
          mode: routing.mode,
          weights: routing.weights,
          reasoning: routing.reasoning
        },
        trace_id: traceId
      });
      
    } catch (error: any) {
      console.error('Knowledge query error:', error);
      res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    }
  });

  // ERmate Auto-fill
  const ERmateRequestSchema = z.object({
    tenant_id: z.string(),
    transcript: z.string().min(10),
    language: z.string().default('en')
  });

  app.post("/api/ermate/auto_fill", async (req: Request, res: Response) => {
    try {
      const validated = ERmateRequestSchema.parse(req.body);
      
      console.log(`[ERmate] Processing transcript for tenant: ${validated.tenant_id}`);
      
      const result = await medicalEngine.autoFill({
        transcript: validated.transcript,
        language: validated.language
      });

      const knowledgeContent = [
        `Chief Complaint: ${result.chief_complaint}`,
        `HPI: ${result.hpi}`,
        result.pmh.length > 0 ? `PMH: ${result.pmh.join(', ')}` : null,
        result.medications.length > 0 ? `Medications: ${result.medications.join(', ')}` : null,
        result.ddx.length > 0 ? `Differential Diagnoses: ${result.ddx.join(', ')}` : null,
        result.plan_investigations.length > 0 ? `Investigations: ${result.plan_investigations.join(', ')}` : null,
        result.plan_treatment.length > 0 ? `Treatment: ${result.plan_treatment.join(', ')}` : null,
        result.safety_flags.length > 0 ? `Safety Flags: ${result.safety_flags.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      const tags = [
        result.chief_complaint.toLowerCase(),
        ...result.ddx.map(d => d.toLowerCase()),
        ...result.medications.filter(m => m !== 'None reported').map(m => m.toLowerCase()),
        'clinical-record', 'ermate',
      ];

      try {
        const [knowledgeUnit] = await db.insert(aryaKnowledge).values({
          tenantId: validated.tenant_id,
          domain: 'medical' as const,
          topic: `Clinical Record: ${result.chief_complaint}`,
          content: knowledgeContent,
          tags,
          language: validated.language || 'en',
          sourceType: 'ermate_clinical',
          sourceTitle: `ERmate Auto-fill: ${result.chief_complaint}`,
          status: 'published',
          version: 1,
        }).returning();

        await db.insert(aryaClinicalRecords).values({
          tenantId: validated.tenant_id,
          sourceApp: 'ermate',
          chiefComplaint: result.chief_complaint,
          hpi: result.hpi,
          pmh: result.pmh,
          medications: result.medications,
          allergies: result.allergies,
          exam: result.exam,
          ddx: result.ddx,
          investigations: result.plan_investigations,
          treatment: result.plan_treatment,
          safetyFlags: result.safety_flags,
          originalTranscript: validated.transcript,
          language: validated.language || 'en',
          knowledgeUnitId: knowledgeUnit.id,
        });

        console.log(`[ERmate→ARYA] Saved clinical record & knowledge unit: ${knowledgeUnit.id}`);
        
        res.json({
          ...result,
          _arya: {
            knowledge_unit_id: knowledgeUnit.id,
            synced: true,
          }
        });
      } catch (dbError: any) {
        console.error('[ERmate→ARYA] Failed to sync to knowledge base:', dbError.message);
        res.json(result);
      }
      
    } catch (error: any) {
      console.error('ERmate auto-fill error:', error);
      res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    }
  });

  // Clinical Records API (ERmate data synced to ARYA)
  app.get("/api/clinical-records", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const limit = parseInt((req.query.limit as string) || "50");
      const records = await db
        .select()
        .from(aryaClinicalRecords)
        .where(eq(aryaClinicalRecords.tenantId, tenantId))
        .orderBy(desc(aryaClinicalRecords.createdAt))
        .limit(limit);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(aryaClinicalRecords)
        .where(eq(aryaClinicalRecords.tenantId, tenantId));

      res.json({
        records,
        total: Number(totalResult[0]?.count || 0),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clinical-records/stats", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(aryaClinicalRecords)
        .where(eq(aryaClinicalRecords.tenantId, tenantId));

      const ermateSynced = await db
        .select({ count: sql<number>`count(*)` })
        .from(aryaKnowledge)
        .where(and(
          eq(aryaKnowledge.tenantId, tenantId),
          eq(aryaKnowledge.sourceType, 'ermate_clinical')
        ));

      res.json({
        totalRecords: Number(totalResult[0]?.count || 0),
        knowledgeUnitsSynced: Number(ermateSynced[0]?.count || 0),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ErPrana Risk Assessment
  const ErPranaRequestSchema = z.object({
    tenant_id: z.string(),
    symptoms_text: z.string(),
    wearable: z.object({
      hr: z.number().optional(),
      spo2: z.number().optional(),
      bp: z.string().optional(),
      temp: z.number().optional()
    }).optional()
  });

  app.post("/api/erprana/risk_assess", async (req: Request, res: Response) => {
    try {
      const validated = ErPranaRequestSchema.parse(req.body);
      
      console.log(`[ErPrana] Risk assessment for tenant: ${validated.tenant_id}`);
      
      const result = await medicalEngine.assessRisk({
        symptoms_text: validated.symptoms_text,
        wearable: validated.wearable
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error('ErPrana risk assessment error:', error);
      res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    }
  });

  // Get all knowledge by domain
  app.get("/api/knowledge/domain/:domain", async (req: Request, res: Response) => {
    try {
      const domain = req.params.domain as any;
      const tenantId = req.query.tenant_id as string || 'varah';
      
      const units = await retriever.getByDomain(tenantId, domain, 50);
      
      res.json({
        domain,
        units,
        total: units.length
      });
      
    } catch (error: any) {
      console.error('Get by domain error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // =============================================
  // SELF-LEARNING API ROUTES
  // =============================================

  // Get learning stats
  app.get("/api/learning/stats", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const stats = await learningEngine.getLearningStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      console.error('Learning stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get knowledge drafts
  app.get("/api/learning/drafts", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const status = req.query.status as string | undefined;
      const drafts = await learningEngine.getDrafts(tenantId, status);
      res.json({ drafts, total: drafts.length });
    } catch (error: any) {
      console.error('Get drafts error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Approve a draft (promote to published knowledge)
  app.post("/api/learning/drafts/:id/approve", async (req: Request, res: Response) => {
    try {
      const draftId = req.params.id as string;
      const reviewedBy = (req.body.reviewed_by as string) || 'admin';
      const success = await learningEngine.approveDraft(draftId, reviewedBy);
      
      if (success) {
        res.json({ message: 'Draft approved and promoted to knowledge base', id: draftId });
      } else {
        res.status(404).json({ error: 'Draft not found' });
      }
    } catch (error: any) {
      console.error('Approve draft error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reject a draft
  app.post("/api/learning/drafts/:id/reject", async (req: Request, res: Response) => {
    try {
      const draftId = req.params.id as string;
      const reviewedBy = (req.body.reviewed_by as string) || 'admin';
      await learningEngine.rejectDraft(draftId, reviewedBy);
      res.json({ message: 'Draft rejected', id: draftId });
    } catch (error: any) {
      console.error('Reject draft error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get query patterns (what users are asking)
  app.get("/api/learning/patterns", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const gapsOnly = req.query.gaps_only === 'true';
      const patterns = await learningEngine.getQueryPatterns(tenantId, gapsOnly);
      res.json({ patterns, total: patterns.length });
    } catch (error: any) {
      console.error('Get patterns error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // NEURAL LINK API ROUTES
  // =============================================

  // Compute neural links (admin action)
  app.post("/api/neural-link/compute", async (req: Request, res: Response) => {
    try {
      const tenantId = req.body.tenant_id || 'varah';
      console.log(`[NeuralLink] Computing cross-domain links for tenant: ${tenantId}`);
      const count = await neuralLinkEngine.computeLinks(tenantId);
      res.json({ message: `Neural links computed successfully`, links_created: count });
    } catch (error: any) {
      console.error('Compute links error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get network graph data
  app.get("/api/neural-link/graph", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const graph = await neuralLinkEngine.getNetworkGraph(tenantId);
      res.json(graph);
    } catch (error: any) {
      console.error('Get graph error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get links for a specific knowledge unit
  app.get("/api/neural-link/unit/:unitId", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const links = await neuralLinkEngine.getLinksForUnit(tenantId, req.params.unitId as string);
      res.json({
        unitId: req.params.unitId,
        connections: links.map(l => ({
          linkId: l.link.id,
          connectedUnit: {
            id: l.connectedUnit.id,
            topic: l.connectedUnit.topic,
            domain: l.connectedUnit.domain
          },
          score: l.link.linkScore,
          type: l.link.linkType,
          evidence: l.link.evidence
        })),
        total: links.length
      });
    } catch (error: any) {
      console.error('Get unit links error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Synthesize cross-domain response
  app.post("/api/neural-link/synthesize", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenant_id: z.string(),
        query: z.string().min(1),
        domains: z.array(DomainSchema).min(2)
      });
      const validated = schema.parse(req.body);
      
      const result = await neuralLinkEngine.synthesize(
        validated.tenant_id,
        validated.query,
        validated.domains
      );
      res.json(result);
    } catch (error: any) {
      console.error('Synthesize error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // =============================================
  // ARYA CHAT API ROUTES (Conversational AI)
  // =============================================

  app.get("/api/arya/conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/arya/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/arya/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/arya/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Text chat: send message, get streaming AI response with knowledge context
  app.post("/api/arya/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, tenant_id } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      await chatStorage.createMessage(conversationId, "user", content);

      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const history: ChatMessage[] = existingMessages.slice(0, -1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const { stream, meta } = await generateAryaResponse(content, history, tenant_id || "varah", conversationId);
      let fullResponse = "";

      res.write(`data: ${JSON.stringify({ type: "meta", mode: meta.mode, icon: meta.icon, confidence: meta.confidence, sourcesCount: meta.sourcesCount, memoryUsed: meta.memoryUsed })}\n\n`);

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("ARYA chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Voice chat: send audio, get text response (transcribe → ARYA → stream text)
  // Supports multilingual via Sarvam AI: Indian language audio → transcribe → translate to English → ARYA → translate back → TTS
  app.post("/api/arya/conversations/:id/voice", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { audio, tenant_id, language } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);

      let userTranscript = "";
      let detectedLanguage = language || "en-IN";
      let queryForArya = "";

      const useSarvam = language && language !== "en-IN" && process.env.SARVAM_API_KEY;

      if (useSarvam) {
        console.log(`[Voice] Using Sarvam AI for language: ${language}`);
        const sttResult = await sarvamSpeechToText(audioBuffer, language as SarvamLanguageCode);
        userTranscript = sttResult.transcript;
        detectedLanguage = sttResult.languageCode || language;

        if (isIndianLanguage(detectedLanguage)) {
          const translation = await sarvamTranslate(userTranscript, detectedLanguage, "en-IN");
          queryForArya = translation.translatedText;
          console.log(`[Voice] Translated "${userTranscript}" → "${queryForArya}"`);
        } else {
          queryForArya = userTranscript;
        }
      } else {
        userTranscript = await speechToText(audioBuffer, inputFormat);
        queryForArya = userTranscript;
        detectedLanguage = "en-IN";
      }

      await chatStorage.createMessage(conversationId, "user", userTranscript);

      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const history: ChatMessage[] = existingMessages.slice(0, -1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "user_transcript", content: userTranscript, language: detectedLanguage })}\n\n`);

      const { stream, meta } = await generateAryaResponse(queryForArya, history, tenant_id || "varah");
      let fullResponse = "";

      res.write(`data: ${JSON.stringify({ type: "meta", mode: meta.mode, icon: meta.icon })}\n\n`);

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: "assistant", content: chunk })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      if (isIndianLanguage(detectedLanguage) && process.env.SARVAM_API_KEY) {
        try {
          const translatedResponse = await sarvamTranslate(fullResponse, "en-IN", detectedLanguage);
          const ttsResult = await sarvamTextToSpeech(
            translatedResponse.translatedText,
            detectedLanguage as SarvamLanguageCode,
            getSpeakerForLanguage(detectedLanguage)
          );
          res.write(`data: ${JSON.stringify({
            type: "translated_response",
            content: translatedResponse.translatedText,
            language: detectedLanguage,
          })}\n\n`);
          res.write(`data: ${JSON.stringify({
            type: "audio_response",
            audio: ttsResult.audioBase64,
            format: ttsResult.format,
            language: detectedLanguage,
          })}\n\n`);
        } catch (ttsError: any) {
          console.error("[Voice] TTS/translation error:", ttsError.message);
        }
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("ARYA voice error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.get("/api/arya/languages", (_req: Request, res: Response) => {
    res.json({ languages: SUPPORTED_LANGUAGES });
  });

  app.post("/api/arya/tts", async (req: Request, res: Response) => {
    try {
      const { text, language, speaker } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });
      const langCode = (language || "hi-IN") as SarvamLanguageCode;
      const ttsResult = await sarvamTextToSpeech(
        text,
        langCode,
        speaker || getSpeakerForLanguage(langCode)
      );
      res.json(ttsResult);
    } catch (error: any) {
      console.error("TTS error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/arya/translate", async (req: Request, res: Response) => {
    try {
      const { text, source_language, target_language } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });
      const result = await sarvamTranslate(
        text,
        source_language || "en-IN",
        target_language || "hi-IN"
      );
      res.json(result);
    } catch (error: any) {
      console.error("Translate error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // API KEY MANAGEMENT ROUTES (Developer Portal)
  // =============================================

  app.post("/api/keys", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenant_id: z.string().default("varah"),
        name: z.string().min(1).max(200),
        app_id: z.string().min(1).max(50),
        permissions: z.array(z.string()).optional(),
        rate_limit: z.number().int().min(1).max(10000).optional(),
        expires_in_days: z.number().int().min(1).max(365).optional(),
      });
      const validated = schema.parse(req.body);
      const result = await createApiKey({
        tenantId: validated.tenant_id,
        name: validated.name,
        appId: validated.app_id,
        permissions: validated.permissions,
        rateLimit: validated.rate_limit,
        expiresInDays: validated.expires_in_days,
      });
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Create API key error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/keys", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const keys = await listApiKeys(tenantId);
      res.json({ keys, total: keys.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/keys/:id/revoke", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.body.tenant_id as string) || "varah";
      const success = await revokeApiKey(req.params.id, tenantId);
      if (success) {
        res.json({ message: "API key revoked" });
      } else {
        res.status(404).json({ error: "Key not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/keys/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const success = await deleteApiKey(req.params.id, tenantId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Key not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/keys/:id/usage", async (req: Request, res: Response) => {
    try {
      const days = parseInt((req.query.days as string) || "7");
      const usage = await getApiKeyUsage(req.params.id, days);
      res.json({ usage, total: usage.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/keys/stats/overview", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const stats = await getUsageStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // EXTERNAL API (Secured with API Key auth)
  // These are the endpoints ERmate, ErPrana, etc. use
  // =============================================

  app.post("/api/v1/knowledge/query", apiKeyAuth("knowledge:read"), async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const appId = (req as any).appId;

      const validated = QueryRequestSchema.parse({
        ...req.body,
        tenant_id: tenantId,
        app_id: appId,
      });
      const traceId = uuidv4();

      const orchestrator = new Orchestrator({ appId: validated.app_id, language: validated.language });
      const routing = orchestrator.route(validated.query, validated.language);

      const results = await retriever.retrieve(tenantId, validated.query, routing.primaryDomain, validated.language, validated.top_k);

      let answer = "";
      let confidence = 0;
      if (results.units.length > 0) {
        answer = results.units[0].content;
        confidence = 0.85;
      } else {
        answer = "No relevant knowledge found for this query.";
        confidence = 0;
      }

      learningEngine.ingestQuery({
        tenantId,
        query: validated.query,
        domain: routing.primaryDomain,
        resultCount: results.total,
        confidence,
        language: validated.language,
      }).catch((err) => console.error("[Learning] Ingest error:", err));

      res.json({
        answer,
        sources: results.units.map((unit) => ({ id: unit.id, title: unit.topic, relevance: 0.9 })),
        confidence,
        domain_used: routing.primaryDomain,
        routing: { mode: routing.mode, weights: routing.weights },
        trace_id: traceId,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/v1/chat", apiKeyAuth("chat:write"), async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { message, history } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      const chatHistory: ChatMessage[] = (history || []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const { stream, meta } = await generateAryaResponse(message, chatHistory, tenantId);
      let fullResponse = "";

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true, full_response: fullResponse })}\n\n`);
      res.end();
    } catch (error: any) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/v1/ermate/auto_fill", apiKeyAuth("ermate:write"), async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { transcript, language } = req.body;
      if (!transcript || transcript.length < 10) {
        return res.status(400).json({ error: "Transcript must be at least 10 characters" });
      }
      const result = await medicalEngine.autoFill({ transcript, language: language || "en" });

      const knowledgeContent = [
        `Chief Complaint: ${result.chief_complaint}`,
        `HPI: ${result.hpi}`,
        result.pmh.length > 0 ? `PMH: ${result.pmh.join(', ')}` : null,
        result.medications.length > 0 ? `Medications: ${result.medications.join(', ')}` : null,
        result.ddx.length > 0 ? `Differential Diagnoses: ${result.ddx.join(', ')}` : null,
        result.plan_treatment.length > 0 ? `Treatment: ${result.plan_treatment.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      const tags = [
        result.chief_complaint.toLowerCase(),
        ...result.ddx.map((d: string) => d.toLowerCase()),
        'clinical-record', 'ermate',
      ];

      try {
        const [knowledgeUnit] = await db.insert(aryaKnowledge).values({
          tenantId,
          domain: 'medical' as const,
          topic: `Clinical Record: ${result.chief_complaint}`,
          content: knowledgeContent,
          tags,
          language: language || 'en',
          sourceType: 'ermate_clinical',
          sourceTitle: `ERmate Auto-fill: ${result.chief_complaint}`,
          status: 'published',
          version: 1,
        }).returning();

        await db.insert(aryaClinicalRecords).values({
          tenantId,
          sourceApp: 'ermate',
          chiefComplaint: result.chief_complaint,
          hpi: result.hpi,
          pmh: result.pmh,
          medications: result.medications,
          allergies: result.allergies,
          exam: result.exam,
          ddx: result.ddx,
          investigations: result.plan_investigations,
          treatment: result.plan_treatment,
          safetyFlags: result.safety_flags,
          originalTranscript: transcript,
          language: language || 'en',
          knowledgeUnitId: knowledgeUnit.id,
        });

        console.log(`[ERmate→ARYA v1] Synced clinical record: ${knowledgeUnit.id}`);
        res.json({ ...result, _arya: { knowledge_unit_id: knowledgeUnit.id, synced: true } });
      } catch (dbError: any) {
        console.error('[ERmate→ARYA v1] Sync failed:', dbError.message);
        res.json(result);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/v1/erprana/risk_assess", apiKeyAuth("erprana:write"), async (req: Request, res: Response) => {
    try {
      const { symptoms_text, wearable } = req.body;
      if (!symptoms_text) {
        return res.status(400).json({ error: "symptoms_text is required" });
      }
      const result = await medicalEngine.assessRisk({ symptoms_text, wearable });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // =============================================
  // AGI CAPABILITY ROUTES
  // =============================================

  // Memory API
  app.get("/api/arya/memory", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const memories = await memoryEngine.getAll(tenantId);
      res.json({ memories, total: memories.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/arya/memory/:id", async (req: Request, res: Response) => {
    try {
      await memoryEngine.deleteMemory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/arya/memory", async (req: Request, res: Response) => {
    try {
      const { tenant_id, category, key, value } = req.body;
      await memoryEngine.addExplicitMemory(tenant_id || 'varah', category, key, value);
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Goals API
  app.get("/api/arya/goals", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const status = req.query.status as string | undefined;
      const goals = await goalsEngine.getGoals(tenantId, status);
      res.json({ goals, total: goals.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/arya/goals", async (req: Request, res: Response) => {
    try {
      const { tenant_id, title, description, steps, priority } = req.body;
      const goal = await goalsEngine.createGoal(tenant_id || 'varah', title, description, steps, priority);
      res.status(201).json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/arya/goals/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const success = await goalsEngine.updateGoalStatus(req.params.id, status);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/arya/goals/steps/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const success = await goalsEngine.updateStepStatus(req.params.id, status);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/arya/goals/:id", async (req: Request, res: Response) => {
    try {
      await goalsEngine.deleteGoal(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Feedback API
  app.post("/api/arya/feedback", async (req: Request, res: Response) => {
    try {
      const { message_id, conversation_id, tenant_id, rating, correction_text, category } = req.body;
      const feedback = await feedbackEngine.submitFeedback(
        message_id, conversation_id, tenant_id || 'varah', rating, correction_text, category
      );
      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/arya/feedback/stats", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const stats = await feedbackEngine.getFeedbackStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Insights API
  app.get("/api/arya/insights", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const insights = await insightsEngine.getActiveInsights(tenantId);
      res.json({ insights, total: insights.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/arya/insights/generate", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.body.tenant_id as string) || 'varah';
      const insights = await insightsEngine.generateInsights(tenantId);
      res.json({ generated: insights.length, insights });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/arya/insights/:id/dismiss", async (req: Request, res: Response) => {
    try {
      await insightsEngine.dismissInsight(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
