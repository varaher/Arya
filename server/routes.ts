import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { KnowledgeRetriever } from "./arya/knowledge-retriever";
import { Orchestrator } from "./arya/orchestrator";
import { MedicalEngine } from "./arya/medical-engine";
import { QueryRequestSchema } from "@shared/schema";

const retriever = new KnowledgeRetriever();
const medicalEngine = new MedicalEngine();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check
  app.get("/api/health", async (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0-alpha"
    });
  });

  // ARYA Knowledge Query
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
      if (results.units.length > 0) {
        answer = results.units[0].content;
      } else {
        answer = 'No relevant knowledge found for this query. Please refine your search.';
      }
      
      res.json({
        answer,
        sources: results.units.map(unit => ({
          id: unit.id,
          title: unit.topic,
          relevance: 0.9
        })),
        confidence: results.units.length > 0 ? 0.85 : 0.0,
        domain_used: routing.primaryDomain,
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

  // Get all knowledge by domain (for frontend Knowledge page)
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

  return httpServer;
}
