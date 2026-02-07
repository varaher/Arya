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
import { generateAryaResponse, type ChatMessage } from "./arya/chat-engine";
import { chatStorage } from "./replit_integrations/chat/storage";
import { ensureCompatibleFormat, speechToText } from "./replit_integrations/audio/client";
import { QueryRequestSchema, DomainSchema } from "@shared/schema";

const retriever = new KnowledgeRetriever();
const medicalEngine = new MedicalEngine();
const learningEngine = new LearningEngine();
const neuralLinkEngine = new NeuralLinkEngine();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
      
      res.json(result);
      
    } catch (error: any) {
      console.error('ERmate auto-fill error:', error);
      res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
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

      const stream = await generateAryaResponse(content, history, tenant_id || "varah");
      let fullResponse = "";

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
  app.post("/api/arya/conversations/:id/voice", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { audio, tenant_id } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);
      const userTranscript = await speechToText(audioBuffer, inputFormat);

      await chatStorage.createMessage(conversationId, "user", userTranscript);

      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const history: ChatMessage[] = existingMessages.slice(0, -1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "user_transcript", content: userTranscript })}\n\n`);

      const stream = await generateAryaResponse(userTranscript, history, tenant_id || "varah");
      let fullResponse = "";

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: "assistant", content: chunk })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

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

  return httpServer;
}
