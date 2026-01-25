/**
 * ARYA SDK - Client wrapper for ARYA Core API
 * Simplifies integration for ERmate, ErPrana, NÉVARH, and other VARAH products
 */

import { QueryRequest, QueryResponse } from '../knowledge/schemas.js';

export interface AryaConfig {
  baseUrl: string;
  tenantId: string;
  appId?: string;
  userRole?: string;
  apiKey?: string; // Optional: for future authentication
}

export class AryaClient {
  private config: AryaConfig;

  constructor(config: AryaConfig) {
    this.config = config;
  }

  /**
   * Query the knowledge engine
   */
  async queryKnowledge(params: {
    query: string;
    domain?: 'medical' | 'business' | 'sanskrit' | 'chanakya';
    language?: string;
    topK?: number;
  }): Promise<QueryResponse> {
    const payload: QueryRequest = {
      tenant_id: this.config.tenantId,
      app_id: this.config.appId as any,
      user_role: this.config.userRole as any,
      query: params.query,
      domain: params.domain,
      language: params.language || 'en',
      top_k: params.topK || 5
    };

    const response = await this.post('/v1/knowledge/query', payload);
    return response;
  }

  /**
   * ERmate: Auto-fill clinical data from transcript
   */
  async ermateAutoFill(params: {
    transcript: string;
    language?: string;
  }): Promise<any> {
    const payload = {
      tenant_id: this.config.tenantId,
      transcript: params.transcript,
      language: params.language || 'en'
    };

    const response = await this.post('/v1/ermate/auto_fill', payload);
    return response;
  }

  /**
   * ErPrana: Risk assessment from symptoms and vitals
   */
  async erpranaRiskAssess(params: {
    symptomsText: string;
    wearable?: {
      hr?: number;
      spo2?: number;
      bp?: string;
      temp?: number;
    };
  }): Promise<any> {
    const payload = {
      tenant_id: this.config.tenantId,
      symptoms_text: params.symptomsText,
      wearable: params.wearable
    };

    const response = await this.post('/v1/erprana/risk_assess', payload);
    return response;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/v1/health`);
    return response.json();
  }

  // Private helper methods
  private async post(endpoint: string, body: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }
}

// Example usage:
/*
const arya = new AryaClient({
  baseUrl: 'http://localhost:3000',
  tenantId: 'varah',
  appId: 'ermate',
  userRole: 'doctor'
});

// Query knowledge
const result = await arya.queryKnowledge({
  query: 'What is the protocol for acute coronary syndrome?',
  domain: 'medical'
});

// Auto-fill clinical data
const structured = await arya.ermateAutoFill({
  transcript: 'Patient presents with chest pain...'
});

// Risk assessment
const risk = await arya.erpranaRiskAssess({
  symptomsText: 'Chest pain and shortness of breath',
  wearable: { hr: 110, spo2: 92, bp: '150/95' }
});
*/
