# ARYA Core

**Multi-Tenant AI Agent Platform for VARAH Group**

ARYA (Augmented Reasoning & Yielding Analytics) is an independent AI orchestration engine that powers multiple VARAH products: ERmate (clinical documentation), ErPrana (patient monitoring), NÉVARH (Vedic wellness), and corporate applications.

---

## 🏗️ Architecture

### Four-Domain Knowledge Engine

1. **Medical** - Healthcare protocols, diagnostics, treatment guidelines
2. **Business** - Strategy frameworks, market intelligence, growth tactics
3. **Sanskrit** - Vedic knowledge, Ayurveda, philosophical wisdom
4. **Chanakya** - Governance, leadership, Arthashastra principles

### Balanced Orchestrator

Intelligent query routing with dynamic weight adjustment based on:
- App context (ERmate → medical boost)
- Language detection (Devanagari → Sanskrit boost)
- Keyword analysis (strategy → business boost)
- Multi-engine fusion for complex queries

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
cd arya-core
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/arya_core
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5000
```

**Optional (for future integrations):**
```env
SARVAM_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### Database Setup

```bash
# The migrations will run automatically on server start
# Or run manually:
npm run migrate
```

### Seed Knowledge Base

Insert 23 initial knowledge units across all domains:

```bash
npm run seed
```

### Start Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

Server will start on `http://localhost:3000`

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/v1
```

### Authentication

All API requests (except `/health`) require multi-tenant headers:

```bash
X-Tenant-ID: varah
X-App-ID: ermate
X-User-Role: doctor
```

Or include in request body:
```json
{
  "tenant_id": "varah",
  "app_id": "ermate",
  "user_role": "doctor"
}
```

---

### Endpoints

#### 1. Health Check

```bash
GET /v1/health
```

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-01-25T10:30:00.000Z",
  "database": "connected",
  "version": "1.0.0-alpha"
}
```

---

#### 2. Knowledge Query

```bash
POST /v1/knowledge/query
```

**Request:**
```json
{
  "tenant_id": "varah",
  "app_id": "ermate",
  "domain": "medical",
  "query": "What is the protocol for acute coronary syndrome?",
  "language": "en",
  "top_k": 5
}
```

**Response:**
```json
{
  "answer": "Initial management of ACS includes: (1) Aspirin 325mg chewed...",
  "sources": [
    {
      "id": "uuid",
      "title": "Acute Coronary Syndrome - Initial Management",
      "relevance": 0.95
    }
  ],
  "confidence": 0.89,
  "domain_used": "medical",
  "trace_id": "uuid"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/v1/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "varah",
    "query": "What is dharma?",
    "domain": "sanskrit"
  }'
```

---

#### 3. ERmate Auto-Fill

```bash
POST /v1/ermate/auto_fill
```

**Request:**
```json
{
  "tenant_id": "varah",
  "transcript": "45-year-old male with chest pain for 2 hours. Pain radiates to left arm. History of hypertension. Currently on Lisinopril 10mg. BP 150/90, HR 98.",
  "language": "en"
}
```

**Response:**
```json
{
  "chief_complaint": "Chest pain",
  "hpi": "45-year-old male with chest pain for 2 hours...",
  "pmh": ["Hypertension"],
  "medications": ["Lisinopril"],
  "allergies": ["NKDA"],
  "exam": "BP 150/90, HR 98",
  "ddx": ["Acute Coronary Syndrome", "GERD", "Musculoskeletal Pain"],
  "plan_investigations": ["ECG", "Troponin", "CXR"],
  "plan_treatment": ["Aspirin 325mg", "Nitroglycerin SL PRN"],
  "safety_flags": ["High risk for ACS - Requires immediate ECG"]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/v1/ermate/auto_fill \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "varah",
    "transcript": "Patient presents with fever and cough..."
  }'
```

---

#### 4. ErPrana Risk Assessment

```bash
POST /v1/erprana/risk_assess
```

**Request:**
```json
{
  "tenant_id": "varah",
  "symptoms_text": "Chest pain and shortness of breath",
  "wearable": {
    "hr": 125,
    "spo2": 88,
    "bp": "165/95",
    "temp": 37.2
  }
}
```

**Response:**
```json
{
  "risk_level": "high",
  "risk_score": 90,
  "red_flags": [
    "Cardiac symptoms present",
    "Respiratory distress",
    "Abnormal heart rate",
    "Hypoxemia detected"
  ],
  "next_steps": [
    "Immediate emergency department evaluation required",
    "Call emergency services if symptoms worsen"
  ],
  "disclaimer": "This is not a substitute for professional medical advice..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/v1/erprana/risk_assess \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "varah",
    "symptoms_text": "Mild headache",
    "wearable": {"hr": 72, "spo2": 98}
  }'
```

---

#### 5. Voice Streaming Gateway (WebSocket)

```
ws://localhost:3000/v1/voice/stream
```

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:3000/v1/voice/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'start' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Transcript:', data);
};

// Send audio chunks
ws.send(audioChunkBuffer);

// Stop transcription
ws.send(JSON.stringify({ type: 'stop' }));
```

**Events:**
- `connected` - Session established
- `partial` - Interim transcript
- `final` - Completed transcript
- `error` - Error occurred

**Note:** Voice transcription requires `SARVAM_API_KEY` in environment. Without it, gateway runs in simulation mode.

---

## 🔧 ARYA SDK (Client Integration)

For easy integration into ERmate, ErPrana, or other apps:

```typescript
import { AryaClient } from '@arya/sdk';

const arya = new AryaClient({
  baseUrl: 'http://localhost:3000',
  tenantId: 'varah',
  appId: 'ermate',
  userRole: 'doctor'
});

// Query knowledge
const result = await arya.queryKnowledge({
  query: 'ACS protocol',
  domain: 'medical'
});

// Auto-fill clinical data
const structured = await arya.ermateAutoFill({
  transcript: 'Patient presents with...'
});

// Risk assessment
const risk = await arya.erpranaRiskAssess({
  symptomsText: 'Chest pain',
  wearable: { hr: 110, spo2: 92 }
});
```

---

## 🗄️ Database Schema

### Tables

1. **arya_knowledge** - Published knowledge base
2. **arya_knowledge_drafts** - AI self-learning drafts (requires review)
3. **arya_audit_logs** - Audit trail for all interactions

### Multi-Tenancy

All tables include `tenant_id` for data isolation. Middleware enforces tenant validation on every request.

### Future: Vector Search

Schema includes commented-out `pgvector` support for semantic search:

```sql
-- Uncomment when pgvector extension is available
-- embedding vector(1536)
-- CREATE INDEX idx_knowledge_embedding ON arya_knowledge 
--   USING ivfflat (embedding vector_cosine_ops);
```

---

## 🧪 Testing

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3000/v1/health

# Test knowledge query
curl -X POST http://localhost:3000/v1/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"varah","query":"What is dharma?"}'

# Test ERmate
curl -X POST http://localhost:3000/v1/ermate/auto_fill \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"varah","transcript":"Patient with chest pain"}'

# Test ErPrana
curl -X POST http://localhost:3000/v1/erprana/risk_assess \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"varah","symptoms_text":"fever","wearable":{"hr":88}}'
```

### WebSocket Testing

Use a WebSocket client like `wscat`:

```bash
npm install -g wscat
wscat -c ws://localhost:3000/v1/voice/stream
```

---

## 📂 Project Structure

```
arya-core/
├── src/
│   ├── api/              # REST API route handlers
│   │   ├── knowledge.ts  # Knowledge engine endpoint
│   │   ├── ermate.ts     # Clinical auto-fill endpoint
│   │   ├── erprana.ts    # Risk assessment endpoint
│   │   └── voice.ts      # WebSocket voice gateway
│   ├── engine/           # Domain-specific engines
│   │   ├── orchestrator.ts    # Balanced routing logic
│   │   ├── medical.engine.ts  # Medical knowledge + ERmate/ErPrana
│   │   ├── business.engine.ts # Business strategy
│   │   ├── sanskrit.engine.ts # Vedic knowledge
│   │   └── chanakya.engine.ts # Governance wisdom
│   ├── knowledge/        # Knowledge management
│   │   ├── schemas.ts    # Zod validation schemas
│   │   ├── retriever.ts  # Knowledge retrieval (keyword → vector)
│   │   ├── learner.ts    # TODO: Self-learning AI module
│   │   └── validator.ts  # TODO: Human-in-the-loop validation
│   ├── db/               # Database layer
│   │   ├── postgres.ts   # Connection pool and helpers
│   │   ├── migrations.sql # Schema definitions
│   │   └── seed.ts       # Initial knowledge data
│   ├── middleware/       # Express middleware
│   │   └── tenant.ts     # Multi-tenant validation + audit
│   ├── sdk/              # Client SDK
│   │   └── arya-sdk.ts   # TypeScript client wrapper
│   └── index.ts          # Main server entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🛣️ Roadmap

### Phase 1 (Current - MVP)
- ✅ Multi-domain knowledge engine
- ✅ Balanced orchestrator
- ✅ ERmate auto-fill (deterministic)
- ✅ ErPrana risk assessment
- ✅ WebSocket voice gateway (stub)
- ✅ Multi-tenant architecture
- ✅ Audit logging

### Phase 2 (Next Sprint)
- [ ] LLM integration (OpenAI/Claude) for ERmate
- [ ] Sarvam.ai voice transcription integration
- [ ] pgvector semantic search
- [ ] Self-learning knowledge drafts
- [ ] Human-in-the-loop validation workflow

### Phase 3 (Future)
- [ ] Real-time collaboration (multiple doctors)
- [ ] Advanced analytics dashboard
- [ ] Mobile SDK (Swift, Kotlin)
- [ ] Edge deployment for offline mode
- [ ] Fine-tuned medical LLM

---

## 🔐 Security Notes

1. **Never commit `.env` file** - Contains database credentials
2. **Multi-tenant isolation** - All queries filtered by `tenant_id`
3. **Audit logs** - All actions logged with trace IDs
4. **Input validation** - Zod schemas validate all inputs
5. **Rate limiting** - TODO: Add in Phase 2

---

## 📞 Support

For integration questions or issues:
- Technical Lead: VARAH Group Engineering Team
- Slack: #arya-core-dev
- Documentation: https://docs.varahgroup.com/arya

---

## 📄 License

MIT License - VARAH Group © 2026

---

**Built with ❤️ for VARAH Group's mission: Bridging ancient wisdom with modern technology.**
