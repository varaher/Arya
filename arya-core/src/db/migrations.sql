-- ARYA Core Database Schema
-- Multi-tenant AI Knowledge Platform for VARAH Group

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for future semantic search (optional - comment out if not supported)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Published Knowledge Base (production-ready knowledge units)
CREATE TABLE IF NOT EXISTS arya_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('medical', 'business', 'sanskrit', 'chanakya')),
    topic VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'en',
    source_type VARCHAR(100) NOT NULL,
    source_title VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    version INTEGER DEFAULT 1,
    rules JSONB,
    -- Future: vector embedding for semantic search
    -- embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft Knowledge (self-learning AI-generated knowledge awaiting review)
CREATE TABLE IF NOT EXISTS arya_knowledge_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('medical', 'business', 'sanskrit', 'chanakya')),
    topic VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'en',
    source_type VARCHAR(100) NOT NULL,
    source_title VARCHAR(500) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    learned_from_query TEXT,
    rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100)
);

-- Audit Log (track all interactions for compliance and debugging)
CREATE TABLE IF NOT EXISTS arya_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL,
    app_id VARCHAR(50),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200),
    request_payload JSONB,
    response_payload JSONB,
    trace_id VARCHAR(100),
    status_code INTEGER,
    error_message TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_tenant_domain ON arya_knowledge(tenant_id, domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON arya_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON arya_knowledge(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON arya_knowledge(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drafts_tenant_domain ON arya_knowledge_drafts(tenant_id, domain);
CREATE INDEX IF NOT EXISTS idx_drafts_reviewed ON arya_knowledge_drafts(reviewed_at);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON arya_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON arya_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trace ON arya_audit_logs(trace_id);

-- Future: Vector similarity search index (uncomment when pgvector is enabled)
-- CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON arya_knowledge USING ivfflat (embedding vector_cosine_ops);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knowledge_updated_at BEFORE UPDATE ON arya_knowledge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
