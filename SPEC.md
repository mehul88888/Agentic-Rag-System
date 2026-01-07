# Agentic RAG System - Technical Specification

## Project Overview

A Node.js CLI application that implements an intelligent agent orchestration system using LangGraph, capable of routing user queries to appropriate tools (RAG knowledge base, Chart generator, or direct LLM response).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Interface                         │
│                    (User Input/Output)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Delegating Agent (LangGraph)                    │
│  - Intent Analysis                                           │
│  - Path Selection                                            │
│  - Response Aggregation                                      │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌─────────────────┐
│   LLM    │   │  Chart   │   │   RAG Agent     │
│  Direct  │   │   Tool   │   │  - Query        │
│ Response │   │  (Mock)  │   │  - Rank         │
└──────────┘   └──────────┘   └────────┬────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │    Weaviate      │
                              │  (Multi-Tenant)  │
                              │  + Vectorization │
                              └──────────────────┘
```

---

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "@langchain/core": "^0.3.0",
    "@langchain/google-genai": "^0.1.0",
    "@langchain/langgraph": "^0.2.0",
    "weaviate-client": "^3.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Runtime Requirements
- **Node.js**: v18+ (v20 recommended)
- **Docker**: For Weaviate deployment
- **LLM**: Google Gemini (Free Tier)

---

## Component Specifications

### 1. Docker Infrastructure

#### 1.1 Weaviate Setup (docker-compose.yml)

```yaml
version: '3.8'

services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.26.1
    container_name: agentic-rag-weaviate
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      DEFAULT_VECTORIZER_MODULE: 'text2vec-transformers'
      ENABLE_MODULES: 'text2vec-transformers'
      TRANSFORMERS_INFERENCE_API: 'http://t2v-transformers:8080'
      CLUSTER_HOSTNAME: 'node1'
    volumes:
      - weaviate_data:/var/lib/weaviate
    restart: unless-stopped
    networks:
      - weaviate-network

  t2v-transformers:
    image: cr.weaviate.io/semitechnologies/transformers-inference:sentence-transformers-all-MiniLM-L6-v2
    container_name: agentic-rag-transformers
    environment:
      ENABLE_CUDA: '0'
    networks:
      - weaviate-network

volumes:
  weaviate_data:

networks:
  weaviate-network:
    driver: bridge
```

**Key Features:**
- Multi-tenancy enabled by default
- Automatic vectorization using sentence-transformers
- Anonymous access for POC simplicity
- Persistent data storage
- Separate vectorization service

---

### 2. Weaviate Schema

#### 2.1 KnowledgeBase Class Definition

```javascript
{
  class: 'KnowledgeBase',
  description: 'Stores Q&A pairs for RAG retrieval',
  multiTenancyConfig: {
    enabled: true
  },
  vectorizer: 'text2vec-transformers',
  properties: [
    {
      name: 'fileId',
      dataType: ['text'],
      description: 'Reference to source document',
      moduleConfig: {
        'text2vec-transformers': {
          skip: true,              // Not vectorized
          vectorizePropertyName: false
        }
      },
      indexSearchable: false       // Not searchable
    },
    {
      name: 'question',
      dataType: ['text'],
      description: 'Question text',
      moduleConfig: {
        'text2vec-transformers': {
          skip: false,             // Vectorized
          vectorizePropertyName: false
        }
      }
    },
    {
      name: 'answer',
      dataType: ['text'],
      description: 'Answer text',
      moduleConfig: {
        'text2vec-transformers': {
          skip: false,             // Vectorized
          vectorizePropertyName: false
        }
      }
    }
  ]
}
```

#### 2.2 Tenant Configuration

- **Tenant ID**: `tenant1`
- **Purpose**: Isolate data for POC testing
- **Operations**: All CRUD operations scoped to tenant

---

### 3. Sample Data

#### 3.1 Seed Data (Minimum 3 Records)

```javascript
const seedData = [
  {
    fileId: 'HR-001',
    question: 'What is the company leave policy?',
    answer: 'Employees are entitled to 20 days of paid annual leave per year. Leave must be requested at least 2 weeks in advance through the HR portal. Unused leave can be carried forward up to 5 days to the next year.'
  },
  {
    fileId: 'HR-002',
    question: 'What is the remote work policy?',
    answer: 'Employees can work remotely up to 3 days per week after completing their probation period. Remote work requests must be approved by the direct manager and logged in the attendance system.'
  },
  {
    fileId: 'HR-003',
    question: 'What is the dress code policy?',
    answer: 'The company follows a smart casual dress code. Jeans are acceptable Monday through Thursday. Business formal attire is required for client meetings and Fridays are casual dress days.'
  },
  {
    fileId: 'IT-001',
    question: 'How do I reset my company password?',
    answer: 'Visit the IT self-service portal at it.company.com and click "Reset Password". You will receive a verification code via email. Passwords must be at least 12 characters with uppercase, lowercase, numbers, and symbols.'
  },
  {
    fileId: 'HR-004',
    question: 'What are the employee wellness benefits?',
    answer: 'All employees have access to gym membership reimbursement up to $50/month, mental health counseling (8 sessions/year), and annual health checkups. Wellness days can be used for medical appointments without deducting leave.'
  }
];
```

---

### 4. Agent Architecture

#### 4.1 Delegating Agent (Root Agent)

**Purpose**: Orchestrate user requests and route to appropriate tools

**Capabilities**:
- Intent classification
- Multi-tool coordination
- Response aggregation
- Error handling

**Decision Logic**:

| User Intent Pattern | Action | Tools Used |
|---------------------|--------|------------|
| Questions about policies, procedures, HR | RAG Query | RAG Agent |
| Chart/graph/visualization request | Generate Mock Chart | Chart Tool |
| Both information + visualization | Combined | RAG + Chart |
| General questions, math, casual chat | Direct Response | LLM Only |

**Implementation**: LangGraph StateGraph with conditional edges

---

#### 4.2 RAG Agent

**Purpose**: Query knowledge base and retrieve relevant information

**Workflow**:
1. Receive query from delegating agent
2. Perform vector similarity search in Weaviate
3. Retrieve top-k relevant entries (k=3)
4. Extract answers and fileIds
5. Return structured results

**Query Method**:
```javascript
// Primary: Vector search with nearText
client.graphql
  .get()
  .withClassName('KnowledgeBase')
  .withTenant('tenant1')
  .withNearText({ concepts: [query] })
  .withLimit(3)
  .withFields('question answer fileId')
  .do()
```

**Fallback**: If vectorization unavailable, use BM25 search or fetch all objects

---

#### 4.3 Chart Tool (Mock)

**Purpose**: Generate Chart.js configuration objects

**Input Schema**:
```javascript
{
  chartType: 'bar' | 'line' | 'pie' | 'doughnut',
  title: string,
  context?: string  // Optional user context
}
```

**Output Schema**:
```javascript
{
  type: string,
  data: {
    labels: string[],
    datasets: Array<{
      label: string,
      data: number[],
      backgroundColor?: string[],
      borderColor?: string
    }>
  },
  options?: {
    responsive: boolean,
    plugins?: object
  }
}
```

**Predefined Templates**:
- Employee Attendance Chart
- Leave Balance Chart
- Department Distribution Chart
- Performance Metrics Chart

---

### 5. Response Contract

#### 5.1 Strict Output Schema

```typescript
interface DelegatingAgentResponse {
  answer: string;                    // Main response text
  references: {
    rag: boolean;                    // True if RAG was used
    chart: boolean;                  // True if Chart was generated
  };
  fileIds?: string[];                // Present only if RAG used
  chartConfig?: ChartConfiguration;  // Present only if Chart used
}
```

#### 5.2 Response Examples

**Example 1: RAG Only**
```json
{
  "answer": "Employees are entitled to 20 days of paid annual leave per year...",
  "references": {
    "rag": true,
    "chart": false
  },
  "fileIds": ["HR-001"]
}
```

**Example 2: Chart Only**
```json
{
  "answer": "Here is the attendance chart for Q1-Q3:",
  "references": {
    "rag": false,
    "chart": true
  },
  "chartConfig": {
    "type": "bar",
    "data": { ... }
  }
}
```

**Example 3: Combined**
```json
{
  "answer": "Based on our leave policy... Here's a visualization:",
  "references": {
    "rag": true,
    "chart": true
  },
  "fileIds": ["HR-001"],
  "chartConfig": { ... }
}
```

**Example 4: Direct LLM**
```json
{
  "answer": "5 × 7 equals 35",
  "references": {
    "rag": false,
    "chart": false
  }
}
```

---

### 6. LangGraph State Machine

#### 6.1 State Definition

```typescript
interface AgentState {
  input: string;                    // User query
  intent: string;                   // Classified intent
  ragResults?: any[];               // RAG query results
  chartConfig?: object;             // Chart configuration
  answer: string;                   // Final answer
  references: {
    rag: boolean;
    chart: boolean;
  };
  fileIds?: string[];
}
```

#### 6.2 Node Structure

```
START
  ↓
[Analyze Intent]
  ↓
[Router] ──→ [Direct LLM] ──→ [Format Response] → END
  ├────────→ [RAG Agent] ──→ [Format Response] → END
  ├────────→ [Chart Tool] ─→ [Format Response] → END
  └────────→ [RAG + Chart] → [Format Response] → END
```

**Nodes**:
1. **analyzeIntent**: Classify user query using LLM
2. **ragAgent**: Query Weaviate and retrieve knowledge
3. **chartTool**: Generate chart configuration
4. **directResponse**: Get LLM response without tools
5. **formatResponse**: Build final response conforming to contract

---

### 7. CLI Application

#### 7.1 Interface

**Command**: `npm start` or `node src/cli.js`

**Behavior**:
- Display welcome message
- Enter interactive loop
- Accept user input (readline)
- Process query through delegating agent
- Display formatted response
- Support exit command (`exit`, `quit`, `q`)

**Output Format**:
```
🤖 Agent Response:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Answer text here...]

📚 References Used:
  • RAG: Yes/No
  • Chart: Yes/No

📄 Source Files: HR-001, HR-002 (if applicable)

📊 Chart Config: [JSON if applicable]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 8. Project Structure

```
agentic-rag-system/
├── docker-compose.yml          # Weaviate + Vectorizer setup
├── .env.example                # Environment variables template
├── .env                        # Local environment config (gitignored)
├── package.json
├── tsconfig.json               # TypeScript configuration
├── README.md                   # Setup and usage instructions
├── SPEC.md                     # This specification file
├── requirement.md              # Original requirements
│
├── src/
│   ├── cli.js                  # CLI entry point
│   ├── config.js               # Configuration loader
│   │
│   ├── agents/
│   │   ├── delegating-agent.js # Root orchestrator (LangGraph)
│   │   └── rag-agent.js        # RAG query logic
│   │
│   ├── tools/
│   │   └── chart-tool.js       # Mock Chart.js generator
│   │
│   ├── services/
│   │   ├── weaviate.js         # Weaviate client wrapper
│   │   └── llm.js              # LangChain LLM setup
│   │
│   ├── utils/
│   │   ├── logger.js           # Logging utility
│   │   └── formatter.js        # Response formatting
│   │
│   └── setup/
│       ├── init-schema.js      # Create Weaviate schema
│       └── seed-data.js        # Insert sample data
│
└── tests/                      # Optional test files
    ├── agent.test.js
    └── rag.test.js
```

---

### 9. Environment Configuration

#### 9.1 .env File

```bash
# LLM Configuration
GOOGLE_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0.7

# Weaviate Configuration
WEAVIATE_URL=http://localhost:8080
WEAVIATE_TENANT=tenant1

# Application Settings
LOG_LEVEL=info
NODE_ENV=development
```

---

### 10. Setup & Deployment Steps

#### 10.1 Initial Setup

```bash
# 1. Clone/Create project
cd agentic-rag-system

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env and add GOOGLE_API_KEY

# 4. Start Weaviate
docker-compose up -d

# 5. Wait for services to be ready (30-60 seconds)
# Verify: curl http://localhost:8080/v1/meta

# 6. Initialize schema and seed data
npm run setup

# 7. Start CLI application
npm start
```

#### 10.2 NPM Scripts

```json
{
  "scripts": {
    "start": "node src/cli.js",
    "setup": "node src/setup/init-schema.js && node src/setup/seed-data.js",
    "reset": "docker-compose down -v && docker-compose up -d",
    "dev": "node --watch src/cli.js",
    "test": "node --test tests/*.test.js"
  }
}
```

---

### 11. Testing Scenarios

#### 11.1 Test Cases

| Test Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| RAG Query | "What is the leave policy?" | RAG agent retrieves from KB, returns answer + fileIds |
| Chart Request | "Show me employee attendance chart" | Chart tool generates config |
| Combined | "Explain leave policy and show chart" | Both RAG + Chart executed |
| Direct | "What is 25 + 17?" | LLM direct response |
| Ambiguous | "Tell me about employees" | Agent decides best path |
| No Match | "What is the weather?" | Direct LLM response (no RAG match) |

#### 11.2 Validation Checklist

- [ ] All responses conform to schema
- [ ] `references` field always present
- [ ] `fileIds` only present when RAG used
- [ ] `chartConfig` only present when chart used
- [ ] Multi-tool requests execute all tools
- [ ] Error handling for Weaviate connection issues
- [ ] Graceful fallback when vectorization unavailable

---

### 12. Error Handling

#### 12.1 Error Scenarios

1. **Weaviate Connection Failure**
   - Retry 3 times with exponential backoff
   - Fall back to direct LLM response
   - Log error with context

2. **No RAG Results Found**
   - Return answer: "I couldn't find specific information..."
   - Set `references.rag = true` but `fileIds = []`
   - Optionally invoke LLM for general response

3. **LLM API Failure**
   - Retry with exponential backoff
   - Return error message to user
   - Log full error stack

4. **Invalid Intent Classification**
   - Default to direct LLM response
   - Log classification attempt

---

### 13. Performance Considerations

#### 13.1 Optimization Strategies

- **Vector Search**: Limit results to top-3 for speed
- **Parallel Tool Execution**: When possible, run RAG + Chart concurrently
- **Connection Pooling**: Reuse Weaviate client connections
- **Caching**: Cache schema and tenant info (optional enhancement)

#### 13.2 Resource Limits

- Weaviate heap size: Default (sufficient for POC)
- Vector dimensions: 384 (sentence-transformers default)
- Max query tokens: 512 for embeddings

---

### 14. Development Notes

#### 14.1 LangGraph Implementation Tips

```javascript
// Use conditional edges for routing
graph.addConditionalEdges(
  'analyzeIntent',
  (state) => {
    // Return node name based on intent
    if (state.intent === 'rag') return 'ragAgent';
    if (state.intent === 'chart') return 'chartTool';
    if (state.intent === 'both') return 'ragAndChart';
    return 'directResponse';
  }
);
```

#### 14.2 Weaviate Client Tips

```javascript
// Always scope to tenant
const result = await client.graphql
  .get()
  .withClassName('KnowledgeBase')
  .withTenant('tenant1')  // Critical!
  .withNearText({ concepts: [query] })
  .do();
```

#### 14.3 Response Formatting

- Use consistent JSON structure
- Pretty-print in CLI for readability
- Validate before returning
- Strip unnecessary LLM explanations

---

### 15. Success Metrics

The POC is successful when:

✅ CLI accepts and processes diverse queries  
✅ Delegating agent correctly routes to tools  
✅ RAG returns relevant answers with fileIds  
✅ Chart tool generates valid configurations  
✅ Combined requests execute both tools  
✅ All responses match the defined contract  
✅ System handles errors gracefully  
✅ Code is clean, commented, and maintainable  

---

### 16. Future Enhancements (Out of Scope)

- Real chart rendering with Puppeteer
- Multi-tenant user isolation
- Conversation history/memory
- Streaming responses
- Advanced RAG (reranking, hybrid search)
- Production-grade embeddings (OpenAI)
- Authentication layer
- REST API wrapper
- Frontend UI

---

## Appendix

### A. Useful Commands

```bash
# Docker management
docker-compose up -d              # Start services
docker-compose logs -f weaviate   # View logs
docker-compose down               # Stop services
docker-compose down -v            # Stop and remove volumes

# Weaviate health check
curl http://localhost:8080/v1/meta
curl http://localhost:8080/v1/.well-known/ready

# Debug vectorizer
curl http://localhost:8080/v1/modules/text2vec-transformers/meta

# Query schema
curl http://localhost:8080/v1/schema
```

### B. Key Dependencies Explained

- **@langchain/langgraph**: State machine for agent orchestration
- **@langchain/google-genai**: Gemini LLM integration
- **weaviate-client**: Official JS client for Weaviate
- **text2vec-transformers**: Sentence embedding model (384-dim vectors)

### C. Gemini API Setup

1. Visit https://makersuite.google.com/app/apikey
2. Create new API key
3. Add to `.env` as `GOOGLE_API_KEY`
4. Free tier: 60 requests/minute

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: AI Agent Specification Generator

