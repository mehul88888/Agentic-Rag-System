# Agentic RAG System

A Node.js CLI application that implements an intelligent agent orchestration system using LangGraph, capable of routing user queries to appropriate tools (RAG knowledge base, Chart generator, or direct LLM response).

## 🎯 Project Overview

This is a **proof-of-concept (POC)** demonstrating:
- **Agent Orchestration** with LangGraph
- **Retrieval-Augmented Generation (RAG)** using Weaviate
- **Multi-tool Coordination** (RAG, Chart generation, Direct LLM)
- **Intelligent Intent Classification**
- **Structured Response Contract**

## 🏗️ Architecture

```
User (CLI)
   ↓
Delegating Agent (LangGraph)
   ├── Direct LLM Response
   ├── Chart.js Tool (Mock)
   └── RAG Agent
         └── Weaviate (Multi-Tenant + Vector Search)
```

## 📋 Prerequisites

- **Node.js** v18+ (v20 recommended)
- **Docker** & Docker Compose
- **Google Gemini API Key** (Free tier)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd agentic-rag-system
npm install
```

### 2. Setup Environment Variables

Create a `.env` file from the template:

```bash
cp ENV_TEMPLATE.txt .env
```

Edit `.env` and add your Google Gemini API key:

```bash
GOOGLE_API_KEY=your_actual_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

### 3. Start Weaviate (Docker)

```bash
npm run docker:up
```

Wait 30-60 seconds for services to start, then verify:

```bash
npm run health-check
```

You should see:
```
✅ Weaviate is healthy and ready
✅ All services are healthy!
```

### 4. Initialize Database Schema and Seed Data

```bash
npm run setup
```

This will:
- Create the `KnowledgeBase` schema in Weaviate
- Add multi-tenancy support
- Insert 5 sample Q&A records (HR policies, IT procedures)
- Generate vector embeddings automatically

### 5. Start the CLI Application

```bash
npm start
```

## 💬 Usage Examples

Once the CLI is running, try these queries:

### RAG Query (Knowledge Base)
```
You: What is the company leave policy?
```
Expected: RAG agent retrieves from knowledge base, returns answer with source fileIds

### Chart Request
```
You: Show me an employee attendance chart
```
Expected: Chart tool generates a Chart.js configuration

### Combined Query
```
You: Explain the remote work policy and show me a chart
```
Expected: Both RAG + Chart executed in parallel

### Direct Query
```
You: What is 25 + 17?
```
Expected: Direct LLM response without tools

## 📦 Project Structure

```
agentic-rag-system/
├── docker-compose.yml          # Weaviate + Vectorizer setup
├── package.json                # Dependencies and scripts
├── ENV_TEMPLATE.txt            # Environment variables template
├── .gitignore                  # Git ignore rules
│
├── src/
│   ├── cli.js                  # CLI entry point (TODO)
│   ├── config.js               # ✅ Configuration loader
│   │
│   ├── agents/
│   │   ├── delegating-agent.js # Root orchestrator (TODO)
│   │   └── rag-agent.js        # RAG query logic (TODO)
│   │
│   ├── tools/
│   │   └── chart-tool.js       # Mock Chart.js generator (TODO)
│   │
│   ├── services/
│   │   ├── weaviate.js         # ✅ Weaviate client wrapper
│   │   └── llm.js              # ✅ LangChain LLM setup
│   │
│   ├── utils/
│   │   ├── logger.js           # ✅ Logging utility
│   │   ├── formatter.js        # ✅ Response formatting
│   │   └── health-check.js     # ✅ Health check utility
│   │
│   └── setup/
│       ├── init-schema.js      # ✅ Create Weaviate schema
│       └── seed-data.js        # ✅ Insert sample data
│
└── tests/                      # Test files (TODO)
```

## 🎯 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the CLI application |
| `npm run setup` | Initialize schema and seed data (full setup) |
| `npm run init-schema` | Initialize Weaviate schema only |
| `npm run seed-data` | Seed data only (requires schema) |
| `npm run health-check` | Check if Weaviate is healthy |
| `npm run test-llm` | Test LLM connection |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run docker:logs` | View Docker logs |
| `npm run reset` | Reset Docker volumes and restart |

## 🔧 Technology Stack

- **Runtime**: Node.js v18+
- **Agent Framework**: LangGraph (JavaScript)
- **LLM**: Google Gemini 1.5 Flash (Free Tier)
- **Vector Database**: Weaviate (Docker)
- **Vectorization**: text2vec-transformers (sentence-transformers-all-MiniLM-L6-v2)
- **LLM Abstraction**: LangChain

## 📊 Response Contract

Every agent response follows this strict schema:

```typescript
{
  answer: string;                    // Main response text
  references: {
    rag: boolean;                    // True if RAG was used
    chart: boolean;                  // True if Chart was generated
  };
  fileIds?: string[];                // Present only if RAG used
  chartConfig?: ChartConfiguration;  // Present only if Chart used
}
```

## 🐛 Troubleshooting

### Weaviate won't start
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f weaviate

# Reset everything
npm run reset
```

### "Missing required environment variable: GOOGLE_API_KEY"
1. Ensure `.env` file exists in project root
2. Verify `GOOGLE_API_KEY=your_key_here` is set
3. Get API key from: https://makersuite.google.com/app/apikey

### Health check fails
Wait 30-60 seconds for services to fully start, then retry:
```bash
npm run health-check
```

## 📝 Current Progress

### ✅ Phase 1 Complete - Foundation & Infrastructure
- [x] Project initialization with package.json
- [x] Docker infrastructure (Weaviate + text2vec-transformers)
- [x] Configuration management (config.js)
- [x] Logging utility (logger.js)
- [x] Response formatter (formatter.js)
- [x] Health check utility

### ✅ Phase 2 Complete - Weaviate Setup & Data Ingestion
- [x] Weaviate service layer (weaviate.js)
- [x] Schema initialization (init-schema.js)
- [x] Data seeding with 5 Q&A records (seed-data.js)
- [x] Multi-tenancy configuration
- [x] Vector search implementation

### ✅ Phase 3 Complete - LLM & Core Services
- [x] LLM service setup (llm.js)
- [x] Google Gemini integration
- [x] JSON and structured output support
- [x] Utility functions (logger, formatter, health-check)

### 🚧 Next Steps - Phase 4: Tools Implementation
- [ ] Chart tool (mock Chart.js generator)
- [ ] RAG agent (query logic)

## 📚 Documentation

- [SPEC.md](./SPEC.md) - Complete technical specification
- [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) - Detailed implementation plan
- [requirement.md](./requirement.md) - Original requirements

## 🎓 Learning Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [Google Gemini API](https://ai.google.dev/)

## 📄 License

MIT

---

## 🎉 PROJECT STATUS: COMPLETE!

**All Phases Complete**: ✅ Foundation | ✅ Weaviate | ✅ LLM | ✅ Tools | ✅ Agents | ✅ CLI  
**Status**: Production-Ready POC  
**Ready for**: Testing & Demo  

See [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) for full details.

