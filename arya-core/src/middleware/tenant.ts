import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/postgres.js';

/**
 * Multi-tenant validation middleware
 * Ensures every request includes tenant_id and logs trace information
 */

export interface TenantRequest extends Request {
  tenant_id?: string;
  app_id?: string;
  user_role?: string;
  trace_id?: string;
}

export function validateTenant(req: TenantRequest, res: Response, next: NextFunction): void {
  const traceId = uuidv4();
  req.trace_id = traceId;
  
  // Extract tenant information from request body or headers
  const tenantId = req.body?.tenant_id || req.headers['x-tenant-id'];
  const appId = req.body?.app_id || req.headers['x-app-id'];
  const userRole = req.body?.user_role || req.headers['x-user-role'];
  
  if (!tenantId) {
    res.status(400).json({
      error: 'Missing tenant_id',
      message: 'tenant_id is required in request body or X-Tenant-ID header',
      trace_id: traceId
    });
    return;
  }
  
  // Attach to request for downstream use
  req.tenant_id = tenantId as string;
  req.app_id = appId as string;
  req.user_role = userRole as string;
  
  console.log(`[${traceId}] Request from tenant: ${tenantId}, app: ${appId}, role: ${userRole}`);
  
  next();
}

/**
 * Audit logging middleware
 * Logs all API interactions to audit table
 */
export async function auditLog(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();
  
  // Capture response
  const originalSend = res.send;
  let responseBody: any;
  
  res.send = function(body: any): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };
  
  // Log after response is sent
  res.on('finish', async () => {
    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO arya_audit_logs 
         (tenant_id, app_id, user_role, action, endpoint, request_payload, response_payload, trace_id, status_code, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          req.tenant_id || null,
          req.app_id || null,
          req.user_role || null,
          req.method,
          req.path,
          req.body,
          responseBody ? JSON.parse(responseBody) : null,
          req.trace_id,
          res.statusCode,
          req.ip,
          req.headers['user-agent']
        ]
      );
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${req.trace_id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
}
