import { Router, Request, Response } from 'express';
import { MedicalEngine } from '../engine/medical.engine.js';
import { z } from 'zod';

const router = Router();
const medicalEngine = new MedicalEngine();

const ERmateRequestSchema = z.object({
  tenant_id: z.string(),
  transcript: z.string().min(10),
  language: z.string().default('en')
});

/**
 * POST /v1/ermate/auto_fill
 * Parse clinical transcript into structured medical data
 */
router.post('/auto_fill', async (req: Request, res: Response) => {
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

export default router;
