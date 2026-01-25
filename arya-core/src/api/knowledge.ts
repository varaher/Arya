import { Router, Request, Response } from 'express';
import { KnowledgeRetriever } from '../knowledge/retriever.js';
import { Orchestrator } from '../engine/orchestrator.js';
import { QueryRequestSchema, QueryResponse } from '../knowledge/schemas.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const retriever = new KnowledgeRetriever();

/**
 * POST /v1/knowledge/query
 * Query the multi-domain knowledge engine
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated = QueryRequestSchema.parse(req.body);
    const traceId = uuidv4();
    
    // Initialize orchestrator with app-specific config
    const orchestrator = new Orchestrator({
      appId: validated.app_id,
      language: validated.language
    });
    
    // Route query to appropriate domain(s)
    const routing = orchestrator.route(validated.query, validated.language);
    
    console.log(`[${traceId}] Query routed to ${routing.primaryDomain} (mode: ${routing.mode})`);
    
    // Retrieve knowledge from primary domain
    const results = await retriever.retrieve(
      validated.tenant_id,
      validated.query,
      routing.primaryDomain,
      validated.language,
      validated.top_k
    );
    
    // Build response
    let answer = '';
    if (results.units.length > 0) {
      // Use top result as answer base
      answer = results.units[0].content;
    } else {
      answer = 'No relevant knowledge found for this query. Please refine your search or contact support.';
    }
    
    const response: QueryResponse = {
      answer,
      sources: results.units.map(unit => ({
        id: unit.id,
        title: unit.topic,
        relevance: 0.9 // TODO: Use actual relevance score from retriever
      })),
      confidence: results.units.length > 0 ? 0.85 : 0.0,
      domain_used: routing.primaryDomain,
      trace_id: traceId
    };
    
    res.json(response);
    
  } catch (error: any) {
    console.error('Knowledge query error:', error);
    res.status(400).json({
      error: 'Invalid request',
      message: error.message
    });
  }
});

export default router;
