import { Router, Request, Response } from 'express';
import { MedicalEngine } from '../engine/medical.engine.js';
import { z } from 'zod';

const router = Router();
const medicalEngine = new MedicalEngine();

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

/**
 * POST /v1/erprana/risk_assess
 * Calculate patient risk score from symptoms and wearable data
 */
router.post('/risk_assess', async (req: Request, res: Response) => {
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

export default router;
