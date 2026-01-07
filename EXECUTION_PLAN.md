# Agentic RAG System - Execution Plan

## Overview

This document provides a step-by-step execution plan for implementing the Agentic RAG System, organized into phases with clear tasks, dependencies, and industry best practices.

---

## Phase 1: Project Foundation & Infrastructure

### Task 1.1: Project Initialization
**Priority**: P0 (Critical)  
**Estimated Time**: 15 minutes  
**Dependencies**: None

**Actions**:
- [ ] Initialize Node.js project with `package.json`
- [ ] Install core dependencies
- [ ] Create project folder structure
- [ ] Initialize Git repository with `.gitignore`
- [ ] Create `.env.example` template

**Deliverables**:
```
✓ package.json with all dependencies
✓ Proper folder structure (src/, tests/)
✓ .gitignore configured
✓ .env.example template
```

**Commands**:
```bash
npm init -y
npm install @langchain/core @langchain/google-genai @langchain/langgraph weaviate-client dotenv
npm install --save-dev @types/node
```

---

### Task 1.2: Docker Infrastructure Setup
**Priority**: P0 (Critical)  
**Estimated Time**: 20 minutes  
**Dependencies**: Task 1.1

**Actions**:
- [ ] Create `docker-compose.yml` with Weaviate + Transformers
- [ ] Configure environment variables for containers
- [ ] Setup volumes and networks
- [ ] Start Docker services
- [ ] Verify Weaviate is running and healthy

**Deliverables**:
```
✓ docker-compose.yml
✓ Running Weaviate instance (port 8080)
✓ Running text2vec-transformers service
✓ Health check passes
```

**Verification Commands**:
```bash
docker-compose up -d
docker-compose ps
curl http://localhost:8080/v1/meta
curl http://localhost:8080/v1/.well-known/ready
```

**Success Criteria**:
- Both containers running
- Weaviate returns healthy status
- Transformers module detected

---

### Task 1.3: Configuration Management
**Priority**: P1 (High)  
**Estimated Time**: 10 minutes  
**Dependencies**: Task 1.1

**Actions**:
- [ ] Create `src/config.js` for centralized configuration
- [ ] Load environment variables using dotenv
- [ ] Validate required configurations
- [ ] Export configuration object

**Deliverables**:
```javascript
// src/config.js
module.exports = {
  llm: { apiKey, model, temperature },
  weaviate: { url, tenant },
  app: { logLevel, nodeEnv }
}
```

**Best Practices**:
- Fail fast if required env vars missing
- Provide sensible defaults where appropriate
- Use TypeScript types for config validation (optional)

---

## Phase 2: Weaviate Setup & Data Ingestion

### Task 2.1: Weaviate Service Layer
**Priority**: P0 (Critical)  
**Estimated Time**: 25 minutes  
**Dependencies**: Task 1.2, 1.3

**Actions**:
- [ ] Create `src/services/weaviate.js`
- [ ] Initialize Weaviate client with configuration
- [ ] Implement connection health check
- [ ] Create helper methods for common operations
- [ ] Add error handling and retry logic

**Deliverables**:
```javascript
// src/services/weaviate.js
class WeaviateService {
  async connect()
  async isHealthy()
  async createSchema(schema)
  async addTenant(className, tenantName)
  async insertObject(className, tenant, data)
  async vectorSearch(className, tenant, query, limit)
  async disconnect()
}
```

**Best Practices**:
- Singleton pattern for client instance
- Exponential backoff for retries (3 attempts)
- Graceful connection handling
- Logging for all operations

---

### Task 2.2: Schema Initialization
**Priority**: P0 (Critical)  
**Estimated Time**: 20 minutes  
**Dependencies**: Task 2.1

**Actions**:
- [ ] Create `src/setup/init-schema.js`
- [ ] Define KnowledgeBase class schema
- [ ] Configure multi-tenancy settings
- [ ] Configure text2vec-transformers for each property
- [ ] Create tenant (`tenant1`)
- [ ] Add schema verification logic

**Deliverables**:
```javascript
const schema = {
  class: 'KnowledgeBase',
  multiTenancyConfig: { enabled: true },
  vectorizer: 'text2vec-transformers',
  properties: [
    { name: 'fileId', skip: true, indexSearchable: false },
    { name: 'question', skip: false },
    { name: 'answer', skip: false }
  ]
}
```

**Verification**:
- Schema created successfully
- Tenant added to class
- Vector indexing enabled
- Properties configured correctly

---

### Task 2.3: Data Seeding
**Priority**: P0 (Critical)  
**Estimated Time**: 20 minutes  
**Dependencies**: Task 2.2

**Actions**:
- [ ] Create `src/setup/seed-data.js`
- [ ] Define 5 Q&A seed records (HR + IT domains)
- [ ] Batch insert records with tenant scope
- [ ] Verify embeddings are generated
- [ ] Add verification query

**Deliverables**:
```javascript
const seedData = [
  { fileId: 'HR-001', question: '...', answer: '...' },
  // ... 4 more records
]
```

**Best Practices**:
- Use batch insertion for efficiency
- Wait for vector indexing to complete
- Verify with simple nearText query
- Log insertion success/failure

**Verification Query**:
```javascript
// Test that vectors are generated
const result = await client.graphql
  .get()
  .withClassName('KnowledgeBase')
  .withTenant('tenant1')
  .withNearText({ concepts: ['leave policy'] })
  .withLimit(1)
  .do();
```

---

## Phase 3: LLM & Core Services

### Task 3.1: LLM Service Setup
**Priority**: P0 (Critical)  
**Estimated Time**: 15 minutes  
**Dependencies**: Task 1.3

**Actions**:
- [ ] Create `src/services/llm.js`
- [ ] Initialize Google Gemini with LangChain
- [ ] Configure model parameters (temperature, etc.)
- [ ] Test basic LLM invocation
- [ ] Add error handling for API failures

**Deliverables**:
```javascript
// src/services/llm.js
class LLMService {
  constructor(config)
  async invoke(prompt, systemMessage)
  async invokeWithSchema(prompt, schema)
}
```

**Best Practices**:
- Use structured output when needed
- Implement rate limiting awareness
- Cache model instance
- Handle API key errors gracefully

---

### Task 3.2: Utility Functions
**Priority**: P2 (Medium)  
**Estimated Time**: 15 minutes  
**Dependencies**: Task 1.1

**Actions**:
- [ ] Create `src/utils/logger.js` for consistent logging
- [ ] Create `src/utils/formatter.js` for response formatting
- [ ] Implement CLI output beautification
- [ ] Add JSON validation utilities

**Deliverables**:
```javascript
// logger.js
logger.info(), logger.error(), logger.debug()

// formatter.js
formatResponse(agentResponse)
validateResponseContract(response)
```

---

## Phase 4: Tools Implementation

### Task 4.1: Chart Tool (Mock)
**Priority**: P1 (High)  
**Estimated Time**: 25 minutes  
**Dependencies**: Task 3.1

**Actions**:
- [ ] Create `src/tools/chart-tool.js`
- [ ] Define input schema for tool
- [ ] Create 4-5 predefined chart templates
- [ ] Implement intelligent chart selection logic
- [ ] Return valid Chart.js configuration objects

**Deliverables**:
```javascript
// src/tools/chart-tool.js
class ChartTool {
  async generateChart(input) {
    // input: { chartType, title, context }
    // Returns Chart.js config object
  }
}
```

**Chart Templates**:
1. Employee Attendance (bar chart)
2. Leave Balance (line chart)
3. Department Distribution (pie chart)
4. Performance Metrics (bar chart)
5. Wellness Usage (doughnut chart)

**Best Practices**:
- Use LLM to extract chart type from context
- Provide realistic mock data
- Include Chart.js options for responsiveness
- Add descriptive labels and legends

---

### Task 4.2: RAG Agent
**Priority**: P0 (Critical)  
**Estimated Time**: 35 minutes  
**Dependencies**: Task 2.3, 3.1

**Actions**:
- [ ] Create `src/agents/rag-agent.js`
- [ ] Implement vector similarity search
- [ ] Extract and rank results
- [ ] Return structured output with fileIds
- [ ] Implement fallback for no results
- [ ] Add context window management

**Deliverables**:
```javascript
// src/agents/rag-agent.js
class RAGAgent {
  async query(userQuery) {
    // Returns: { answer, fileIds, confidence }
  }
}
```

**Query Strategy**:
```javascript
// 1. Vector search with nearText
const results = await weaviate.vectorSearch(
  'KnowledgeBase',
  'tenant1',
  userQuery,
  3 // top-k
);

// 2. Extract and format
const answers = results.map(r => r.answer);
const fileIds = [...new Set(results.map(r => r.fileId))];

// 3. Synthesize with LLM
const synthesized = await llm.invoke(
  `Based on these sources: ${answers.join('\n\n')}
   Answer the question: ${userQuery}`
);
```

**Best Practices**:
- Always scope to tenant
- Limit results to top-3 for performance
- Use LLM to synthesize multiple results
- Include confidence scores if available
- Handle empty results gracefully

---

## Phase 5: Agent Orchestration (LangGraph)

### Task 5.1: Intent Classification System
**Priority**: P0 (Critical)  
**Estimated Time**: 30 minutes  
**Dependencies**: Task 3.1

**Actions**:
- [ ] Design intent classification prompt
- [ ] Define intent types: `rag`, `chart`, `both`, `direct`
- [ ] Implement LLM-based classifier
- [ ] Add confidence scoring
- [ ] Test with various query types

**Intent Classification Prompt** (Industry Best Practice):
```javascript
const INTENT_CLASSIFICATION_PROMPT = `You are an intent classification system for a knowledge assistant.

Analyze the user's query and classify it into ONE of these categories:

1. **rag** - User is asking about company policies, procedures, HR guidelines, IT support, or any information that might be in the knowledge base
   Examples: "What is the leave policy?", "How do I reset my password?", "Tell me about remote work"

2. **chart** - User wants a visualization, graph, or chart
   Examples: "Show me a chart", "Create a graph of attendance", "Visualize department distribution"

3. **both** - User wants information AND a visualization
   Examples: "Explain the leave policy and show a chart", "What's the remote work policy? Show me the stats"

4. **direct** - General questions, math, casual conversation, or queries unrelated to company knowledge
   Examples: "What is 5 × 7?", "Hello", "Tell me a joke", "What's the weather?"

User Query: "{query}"

Respond with ONLY a JSON object:
{
  "intent": "rag" | "chart" | "both" | "direct",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
```

**Best Practices**:
- Use structured output (JSON mode)
- Include examples in prompt (few-shot learning)
- Add confidence threshold (< 0.7 = fallback to direct)
- Log classifications for debugging

---

### Task 5.2: Delegating Agent - State Definition
**Priority**: P0 (Critical)  
**Estimated Time**: 20 minutes  
**Dependencies**: Task 5.1

**Actions**:
- [ ] Define AgentState interface
- [ ] Create state reducer functions
- [ ] Setup initial state factory
- [ ] Add state validation

**State Definition**:
```javascript
// src/agents/delegating-agent.js

class AgentState {
  constructor() {
    this.input = '';              // User query
    this.intent = '';             // Classified intent
    this.confidence = 0;          // Classification confidence
    this.ragResults = null;       // RAG query results
    this.chartConfig = null;      // Chart configuration
    this.answer = '';             // Final answer text
    this.references = {           // Tool usage tracking
      rag: false,
      chart: false
    };
    this.fileIds = [];            // Source file references
    this.errors = [];             // Error tracking
  }
}
```

---

### Task 5.3: LangGraph Nodes Implementation
**Priority**: P0 (Critical)  
**Estimated Time**: 45 minutes  
**Dependencies**: Task 5.2, 4.1, 4.2

**Actions**:
- [ ] Implement `analyzeIntent` node
- [ ] Implement `ragAgent` node
- [ ] Implement `chartTool` node
- [ ] Implement `ragAndChart` node (parallel execution)
- [ ] Implement `directResponse` node
- [ ] Implement `formatResponse` node

**Node Implementations**:

```javascript
// Node 1: Analyze Intent
async function analyzeIntent(state) {
  const classification = await llmService.invoke(
    INTENT_CLASSIFICATION_PROMPT.replace('{query}', state.input)
  );
  
  return {
    ...state,
    intent: classification.intent,
    confidence: classification.confidence
  };
}

// Node 2: RAG Agent
async function ragAgent(state) {
  const results = await ragService.query(state.input);
  
  return {
    ...state,
    ragResults: results,
    references: { ...state.references, rag: true },
    fileIds: results.fileIds
  };
}

// Node 3: Chart Tool
async function chartTool(state) {
  const chartConfig = await chartService.generateChart({
    context: state.input,
    ragContext: state.ragResults?.answer // If available
  });
  
  return {
    ...state,
    chartConfig,
    references: { ...state.references, chart: true }
  };
}

// Node 4: RAG + Chart (Parallel)
async function ragAndChart(state) {
  const [ragResults, chartConfig] = await Promise.all([
    ragService.query(state.input),
    chartService.generateChart({ context: state.input })
  ]);
  
  return {
    ...state,
    ragResults,
    chartConfig,
    references: { rag: true, chart: true },
    fileIds: ragResults.fileIds
  };
}

// Node 5: Direct Response
async function directResponse(state) {
  const answer = await llmService.invoke(
    `Answer the following question directly and concisely:\n\n${state.input}`
  );
  
  return {
    ...state,
    answer,
    references: { rag: false, chart: false }
  };
}

// Node 6: Format Response
async function formatResponse(state) {
  // Synthesize final answer if needed
  if (state.ragResults && !state.answer) {
    const synthesisPrompt = `Based on the following information from our knowledge base:

${state.ragResults.answers.join('\n\n')}

Answer this question: ${state.input}

Provide a clear, concise answer that directly addresses the question.`;
    
    state.answer = await llmService.invoke(synthesisPrompt);
  }
  
  // Add chart context if present
  if (state.chartConfig && state.answer) {
    state.answer += '\n\nI\'ve also generated a visualization for you (see chartConfig).';
  }
  
  // Build final response conforming to contract
  const response = {
    answer: state.answer,
    references: state.references
  };
  
  if (state.references.rag && state.fileIds.length > 0) {
    response.fileIds = state.fileIds;
  }
  
  if (state.references.chart && state.chartConfig) {
    response.chartConfig = state.chartConfig;
  }
  
  return response;
}
```

**Best Practices**:
- Keep nodes pure and testable
- Handle errors within nodes
- Log state transitions
- Use async/await consistently
- Validate outputs before returning

---

### Task 5.4: LangGraph State Machine Assembly
**Priority**: P0 (Critical)  
**Estimated Time**: 35 minutes  
**Dependencies**: Task 5.3

**Actions**:
- [ ] Create StateGraph instance
- [ ] Add all nodes to graph
- [ ] Define conditional edges for routing
- [ ] Set entry and exit points
- [ ] Compile graph
- [ ] Test graph execution

**Graph Assembly**:
```javascript
import { StateGraph, END } from "@langchain/langgraph";

class DelegatingAgent {
  constructor(ragService, chartService, llmService) {
    this.ragService = ragService;
    this.chartService = chartService;
    this.llmService = llmService;
    this.graph = this.buildGraph();
  }
  
  buildGraph() {
    const workflow = new StateGraph({
      channels: {
        input: null,
        intent: null,
        confidence: null,
        ragResults: null,
        chartConfig: null,
        answer: null,
        references: null,
        fileIds: null,
        errors: null
      }
    });
    
    // Add nodes
    workflow.addNode('analyzeIntent', this.analyzeIntent.bind(this));
    workflow.addNode('ragAgent', this.ragAgent.bind(this));
    workflow.addNode('chartTool', this.chartTool.bind(this));
    workflow.addNode('ragAndChart', this.ragAndChart.bind(this));
    workflow.addNode('directResponse', this.directResponse.bind(this));
    workflow.addNode('formatResponse', this.formatResponse.bind(this));
    
    // Set entry point
    workflow.setEntryPoint('analyzeIntent');
    
    // Add conditional routing
    workflow.addConditionalEdges(
      'analyzeIntent',
      this.routeByIntent.bind(this),
      {
        rag: 'ragAgent',
        chart: 'chartTool',
        both: 'ragAndChart',
        direct: 'directResponse'
      }
    );
    
    // All paths lead to formatResponse
    workflow.addEdge('ragAgent', 'formatResponse');
    workflow.addEdge('chartTool', 'formatResponse');
    workflow.addEdge('ragAndChart', 'formatResponse');
    workflow.addEdge('directResponse', 'formatResponse');
    
    // formatResponse leads to END
    workflow.addEdge('formatResponse', END);
    
    return workflow.compile();
  }
  
  routeByIntent(state) {
    // Route based on classified intent
    const { intent, confidence } = state;
    
    // Fallback to direct if low confidence
    if (confidence < 0.7) {
      console.log(`Low confidence (${confidence}), routing to direct response`);
      return 'direct';
    }
    
    return intent;
  }
  
  async process(userQuery) {
    const initialState = {
      input: userQuery,
      intent: '',
      confidence: 0,
      ragResults: null,
      chartConfig: null,
      answer: '',
      references: { rag: false, chart: false },
      fileIds: [],
      errors: []
    };
    
    try {
      const result = await this.graph.invoke(initialState);
      return result;
    } catch (error) {
      console.error('Agent execution error:', error);
      throw error;
    }
  }
}
```

**Best Practices**:
- Clear node naming convention
- Explicit edge definitions
- Logging at each transition
- Error boundaries for each node
- State immutability

---

## Phase 6: CLI Application

### Task 6.1: CLI Interface Implementation
**Priority**: P1 (High)  
**Estimated Time**: 30 minutes  
**Dependencies**: Task 5.4

**Actions**:
- [ ] Create `src/cli.js` entry point
- [ ] Setup readline interface for user input
- [ ] Display welcome message and instructions
- [ ] Implement main interaction loop
- [ ] Add exit commands support
- [ ] Format and display agent responses

**CLI Implementation**:
```javascript
// src/cli.js
const readline = require('readline');
const { DelegatingAgent } = require('./agents/delegating-agent');
const { formatResponse } = require('./utils/formatter');

class AgenticCLI {
  constructor(agent) {
    this.agent = agent;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n💬 You: '
    });
  }
  
  displayWelcome() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         🤖 Agentic RAG System - POC                       ║
║                                                            ║
║  Ask questions about:                                      ║
║    • Company policies (leave, remote work, dress code)    ║
║    • IT procedures (password reset, support)              ║
║    • Request charts and visualizations                    ║
║    • General queries                                       ║
║                                                            ║
║  Commands: 'exit', 'quit', 'q' to quit                    ║
╚════════════════════════════════════════════════════════════╝
    `);
  }
  
  async start() {
    this.displayWelcome();
    this.rl.prompt();
    
    this.rl.on('line', async (input) => {
      const query = input.trim();
      
      // Handle exit commands
      if (['exit', 'quit', 'q'].includes(query.toLowerCase())) {
        console.log('\n👋 Goodbye!\n');
        this.rl.close();
        process.exit(0);
      }
      
      // Skip empty input
      if (!query) {
        this.rl.prompt();
        return;
      }
      
      try {
        console.log('\n⏳ Processing your query...\n');
        
        // Process through agent
        const response = await this.agent.process(query);
        
        // Format and display
        formatResponse(response);
        
      } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('Please try again or check if services are running.\n');
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log('\n👋 Session ended.\n');
      process.exit(0);
    });
  }
}

// Bootstrap
async function main() {
  try {
    // Initialize services
    const config = require('./config');
    const weaviateService = require('./services/weaviate');
    const llmService = require('./services/llm');
    const ragAgent = require('./agents/rag-agent');
    const chartTool = require('./tools/chart-tool');
    
    // Health checks
    console.log('🔍 Checking services...');
    await weaviateService.isHealthy();
    console.log('✅ Weaviate connected');
    
    // Create delegating agent
    const agent = new DelegatingAgent(ragAgent, chartTool, llmService);
    console.log('✅ Agent initialized');
    
    // Start CLI
    const cli = new AgenticCLI(agent);
    await cli.start();
    
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Ensure Docker containers are running: docker-compose ps');
    console.log('  2. Check Weaviate health: curl http://localhost:8080/v1/meta');
    console.log('  3. Verify .env file has GOOGLE_API_KEY set');
    process.exit(1);
  }
}

main();
```

**Best Practices**:
- Graceful error handling
- Clear user feedback (loading indicators)
- Health checks before starting
- Helpful error messages
- Clean exit handling

---

### Task 6.2: Response Formatter
**Priority**: P1 (High)  
**Estimated Time**: 20 minutes  
**Dependencies**: Task 6.1

**Actions**:
- [ ] Implement pretty-printing for responses
- [ ] Add color coding (optional)
- [ ] Format JSON for readability
- [ ] Validate response contract
- [ ] Add visual separators

**Formatter Implementation**:
```javascript
// src/utils/formatter.js

function formatResponse(response) {
  console.log('━'.repeat(60));
  console.log('🤖 AGENT RESPONSE');
  console.log('━'.repeat(60));
  console.log();
  
  // Answer
  console.log('📝 Answer:');
  console.log(response.answer);
  console.log();
  
  // References
  console.log('📚 References Used:');
  console.log(`  • RAG (Knowledge Base): ${response.references.rag ? '✅ Yes' : '❌ No'}`);
  console.log(`  • Chart Tool: ${response.references.chart ? '✅ Yes' : '❌ No'}`);
  console.log();
  
  // File IDs (if present)
  if (response.fileIds && response.fileIds.length > 0) {
    console.log('📄 Source Documents:');
    response.fileIds.forEach(id => console.log(`  • ${id}`));
    console.log();
  }
  
  // Chart Config (if present)
  if (response.chartConfig) {
    console.log('📊 Chart Configuration:');
    console.log(JSON.stringify(response.chartConfig, null, 2));
    console.log();
  }
  
  console.log('━'.repeat(60));
}

function validateResponseContract(response) {
  const errors = [];
  
  if (!response.answer) errors.push('Missing: answer');
  if (!response.references) errors.push('Missing: references');
  if (response.references && typeof response.references.rag !== 'boolean') {
    errors.push('Invalid: references.rag must be boolean');
  }
  if (response.references && typeof response.references.chart !== 'boolean') {
    errors.push('Invalid: references.chart must be boolean');
  }
  
  // fileIds should only be present if RAG was used
  if (response.fileIds && !response.references?.rag) {
    errors.push('Contract violation: fileIds present but references.rag is false');
  }
  
  // chartConfig should only be present if chart was used
  if (response.chartConfig && !response.references?.chart) {
    errors.push('Contract violation: chartConfig present but references.chart is false');
  }
  
  if (errors.length > 0) {
    console.error('⚠️  Response contract validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
  }
  
  return errors.length === 0;
}

module.exports = { formatResponse, validateResponseContract };
```

---

## Phase 7: Testing & Validation

### Task 7.1: Integration Testing
**Priority**: P1 (High)  
**Estimated Time**: 30 minutes  
**Dependencies**: Task 6.2

**Actions**:
- [ ] Create test suite with 6 test scenarios
- [ ] Test RAG-only queries
- [ ] Test chart-only queries
- [ ] Test combined queries
- [ ] Test direct LLM queries
- [ ] Validate all response contracts
- [ ] Test error handling

**Test Scenarios**:
```javascript
const testScenarios = [
  {
    name: 'RAG Query - Leave Policy',
    input: 'What is the company leave policy?',
    expectedIntent: 'rag',
    expectedReferences: { rag: true, chart: false },
    shouldHaveFileIds: true
  },
  {
    name: 'Chart Query - Attendance',
    input: 'Show me an employee attendance chart',
    expectedIntent: 'chart',
    expectedReferences: { rag: false, chart: true },
    shouldHaveChartConfig: true
  },
  {
    name: 'Combined Query',
    input: 'Explain the remote work policy and show me a chart',
    expectedIntent: 'both',
    expectedReferences: { rag: true, chart: true },
    shouldHaveFileIds: true,
    shouldHaveChartConfig: true
  },
  {
    name: 'Direct Query - Math',
    input: 'What is 25 + 17?',
    expectedIntent: 'direct',
    expectedReferences: { rag: false, chart: false }
  },
  {
    name: 'Ambiguous Query',
    input: 'Tell me about employees',
    shouldExecute: true // Agent decides best path
  },
  {
    name: 'No Match Query',
    input: 'What is the weather today?',
    expectedIntent: 'direct',
    expectedReferences: { rag: false, chart: false }
  }
];
```

---

### Task 7.2: Error Handling Validation
**Priority**: P2 (Medium)  
**Estimated Time**: 20 minutes  
**Dependencies**: Task 7.1

**Actions**:
- [ ] Test Weaviate connection failure
- [ ] Test LLM API failure
- [ ] Test empty RAG results
- [ ] Test malformed user input
- [ ] Verify graceful degradation

**Error Scenarios**:
```javascript
// 1. Weaviate down -> Fallback to direct LLM
// 2. No RAG results -> Return empty fileIds
// 3. LLM timeout -> Retry with backoff
// 4. Invalid intent -> Default to direct
```

---

### Task 7.3: Response Contract Validation
**Priority**: P1 (High)  
**Estimated Time**: 15 minutes  
**Dependencies**: Task 7.1

**Actions**:
- [ ] Run all test queries
- [ ] Validate every response against schema
- [ ] Check conditional field presence
- [ ] Verify no extra fields
- [ ] Document any violations

**Validation Checklist**:
```javascript
✓ All responses have 'answer' field
✓ All responses have 'references' object
✓ references.rag is always boolean
✓ references.chart is always boolean
✓ fileIds present ONLY when references.rag === true
✓ chartConfig present ONLY when references.chart === true
✓ No unexpected additional fields
```

---

## Phase 8: Documentation & Polish

### Task 8.1: README Documentation
**Priority**: P1 (High)  
**Estimated Time**: 30 minutes  
**Dependencies**: All previous tasks

**Actions**:
- [ ] Create comprehensive README.md
- [ ] Document prerequisites
- [ ] Provide step-by-step setup guide
- [ ] Include troubleshooting section
- [ ] Add example queries
- [ ] Document architecture decisions

**README Sections**:
1. Project Overview
2. Prerequisites
3. Installation & Setup
4. Running the Application
5. Usage Examples
6. Architecture Overview
7. Troubleshooting
8. Project Structure
9. Technology Stack
10. Future Enhancements

---

### Task 8.2: Code Quality & Comments
**Priority**: P2 (Medium)  
**Estimated Time**: 20 minutes  
**Dependencies**: All previous tasks

**Actions**:
- [ ] Add JSDoc comments to all functions
- [ ] Document complex logic
- [ ] Add inline comments for clarity
- [ ] Ensure consistent code style
- [ ] Remove debug console.logs

---

### Task 8.3: Final Testing & Verification
**Priority**: P0 (Critical)  
**Estimated Time**: 30 minutes  
**Dependencies**: Task 8.2

**Actions**:
- [ ] Fresh installation test (clean environment)
- [ ] Run through all test scenarios
- [ ] Verify Docker setup from scratch
- [ ] Test on different user queries
- [ ] Performance check (response times)
- [ ] Memory usage check

---

## Phase 9: Advanced Features (Optional)

### Task 9.1: Enhanced Error Messages
**Priority**: P3 (Low)  
**Estimated Time**: 15 minutes

**Actions**:
- [ ] User-friendly error messages
- [ ] Suggestions for common issues
- [ ] Retry prompts

---

### Task 9.2: Logging System
**Priority**: P3 (Low)  
**Estimated Time**: 20 minutes

**Actions**:
- [ ] Structured logging with levels
- [ ] Log rotation
- [ ] Debug mode with verbose output
- [ ] Trace agent decision paths

---

## Industry Best Practices Applied

### 🎯 LLM Prompting Best Practices

#### 1. **Structured Prompts with Clear Instructions**
```javascript
// ✅ Good: Clear structure, examples, output format
const prompt = `
Role: You are a [specific role]

Task: [Clear task description]

Context: [Relevant context]

Instructions:
1. [Step 1]
2. [Step 2]

Examples:
Input: [example input]
Output: [example output]

User Input: {user_input}

Output Format: [expected format]
`;

// ❌ Bad: Vague, no structure
const prompt = "Answer this: " + user_input;
```

#### 2. **Few-Shot Learning for Intent Classification**
- Include 2-3 examples per intent category
- Use diverse examples
- Show edge cases

#### 3. **JSON Mode for Structured Outputs**
```javascript
// Request structured JSON responses
const response = await llm.invoke(prompt, {
  response_format: { type: "json_object" }
});
```

#### 4. **Context Window Management**
- Keep prompts concise (< 2000 tokens for classification)
- Summarize long RAG results before synthesis
- Truncate if needed with "..." indicator

#### 5. **Temperature Settings**
- Classification: 0.0-0.3 (deterministic)
- Answer synthesis: 0.5-0.7 (balanced)
- Creative tasks: 0.8-1.0 (not used in this POC)

---

### 🏗️ Architecture Best Practices

#### 1. **Separation of Concerns**
- Services layer (Weaviate, LLM)
- Agents layer (RAG, Delegating)
- Tools layer (Chart)
- Utils layer (formatting, logging)

#### 2. **Dependency Injection**
```javascript
// Pass dependencies explicitly
class DelegatingAgent {
  constructor(ragService, chartService, llmService) {
    this.ragService = ragService;
    this.chartService = chartService;
    this.llmService = llmService;
  }
}
```

#### 3. **Error Handling Hierarchy**
- Try-catch at node level
- Fallback strategies for each tool
- Graceful degradation
- User-friendly error messages

#### 4. **Configuration Management**
- Centralized config file
- Environment-based settings
- Validation on startup
- Fail-fast for missing critical configs

#### 5. **State Management**
- Immutable state updates
- Clear state transitions
- State validation at boundaries
- Logging state changes

---

### 🔍 RAG Best Practices

#### 1. **Query Optimization**
- Use semantic search (nearText) as primary
- Fallback to keyword search (BM25) if needed
- Limit results to top-3 for speed
- Include similarity scores

#### 2. **Result Synthesis**
```javascript
// Synthesize multiple results into coherent answer
const synthesisPrompt = `
You are a helpful assistant synthesizing information from multiple sources.

Sources:
${results.map((r, i) => `Source ${i+1}: ${r.answer}`).join('\n\n')}

Question: ${userQuery}

Instructions:
1. Combine information from all relevant sources
2. Provide a comprehensive but concise answer
3. Ensure accuracy and consistency
4. If sources conflict, note the difference

Answer:
`;
```

#### 3. **Multi-Tenancy**
- Always scope queries to tenant
- Validate tenant exists
- Log tenant in operations

#### 4. **Embedding Quality**
- Use sentence-transformers for POC
- Preprocess text (lowercase, strip extra spaces)
- Consider chunking for long documents (not needed for Q&A pairs)

---

### ⚡ Performance Best Practices

#### 1. **Parallel Execution**
```javascript
// Execute independent operations in parallel
const [ragResults, chartConfig] = await Promise.all([
  ragService.query(input),
  chartService.generateChart(input)
]);
```

#### 2. **Connection Pooling**
- Reuse Weaviate client instance
- Keep LLM service warm
- Singleton pattern for services

#### 3. **Caching Strategies** (Optional Enhancement)
```javascript
// Cache common queries
const cache = new Map();
const cacheKey = query.toLowerCase().trim();

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

const result = await expensiveOperation();
cache.set(cacheKey, result);
return result;
```

#### 4. **Timeout Configuration**
```javascript
const TIMEOUTS = {
  weaviate: 5000,   // 5s for vector search
  llm: 30000,       // 30s for LLM generation
  total: 45000      // 45s total per query
};
```

---

## Execution Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| 1. Foundation | 1.1 - 1.3 | 45 min | P0 |
| 2. Weaviate | 2.1 - 2.3 | 65 min | P0 |
| 3. Services | 3.1 - 3.2 | 30 min | P0-P2 |
| 4. Tools | 4.1 - 4.2 | 60 min | P0-P1 |
| 5. Orchestration | 5.1 - 5.4 | 130 min | P0 |
| 6. CLI | 6.1 - 6.2 | 50 min | P1 |
| 7. Testing | 7.1 - 7.3 | 65 min | P1-P2 |
| 8. Documentation | 8.1 - 8.3 | 80 min | P0-P2 |
| **Total** | **26 tasks** | **~8.5 hours** | |

---

## Priority Legend

- **P0 (Critical)**: Must have, core functionality
- **P1 (High)**: Should have, important features
- **P2 (Medium)**: Nice to have, quality improvements
- **P3 (Low)**: Optional enhancements

---

## Success Checklist

Before considering the project complete:

- [ ] Docker containers running and healthy
- [ ] Weaviate schema created with multi-tenancy
- [ ] 5 Q&A records seeded and vectorized
- [ ] LLM service connected (Gemini)
- [ ] Intent classification working (4 intents)
- [ ] RAG agent returns results with fileIds
- [ ] Chart tool generates valid configs
- [ ] Delegating agent routes correctly
- [ ] All response contracts validated
- [ ] CLI accepts and processes queries
- [ ] 6 test scenarios pass
- [ ] Error handling works gracefully
- [ ] README complete with setup instructions
- [ ] Code is clean and commented

---

## Next Steps

1. **Start with Phase 1** - Foundation setup
2. **Work sequentially** through phases
3. **Test after each major phase**
4. **Document as you go**
5. **Iterate on prompts** based on results

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Total Tasks**: 26  
**Estimated Completion**: 8-10 hours

