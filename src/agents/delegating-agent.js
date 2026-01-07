/**
 * Delegating Agent
 * Root orchestrator using LangGraph to route requests to appropriate tools
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { Annotation } = require('@langchain/langgraph');
const ragAgent = require('./rag-agent');
const chartTool = require('../tools/chart-tool');
const llmService = require('../services/llm');
const logger = require('../utils/logger');

/**
 * Intent Classification Prompt - Industry Best Practice
 */
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

/**
 * Define the agent state schema using LangGraph Annotation
 */
const AgentState = Annotation.Root({
  input: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),
  intent: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),
  confidence: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),
  ragResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null
  }),
  chartConfig: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null
  }),
  answer: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),
  references: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({ rag: false, chart: false })
  }),
  fileIds: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
  errors: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => []
  })
});

/**
 * Delegating Agent Class
 */
class DelegatingAgent {
  constructor() {
    this.ragAgent = ragAgent;
    this.chartTool = chartTool;
    this.llmService = llmService;
    this.confidenceThreshold = 0.7;
    this.graph = null;
  }

  /**
   * Initialize the agent (builds the LangGraph)
   */
  async initialize() {
    if (this.graph) {
      logger.debug('Delegating Agent already initialized');
      return;
    }

    try {
      logger.info('Initializing Delegating Agent...');
      
      // Initialize LLM service
      this.llmService.initialize();
      
      // Build the state graph
      this.graph = await this.buildGraph();
      
      logger.info('✅ Delegating Agent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Delegating Agent:', error.message);
      throw error;
    }
  }

  /**
   * Build the LangGraph state machine
   */
  async buildGraph() {
    logger.debug('Building state graph...');

    const workflow = new StateGraph(AgentState);

    // Add all nodes
    workflow.addNode('analyzeIntent', this.analyzeIntent.bind(this));
    workflow.addNode('ragAgentNode', this.ragAgentNode.bind(this));
    workflow.addNode('chartToolNode', this.chartToolNode.bind(this));
    workflow.addNode('ragAndChartNode', this.ragAndChartNode.bind(this));
    workflow.addNode('directResponseNode', this.directResponseNode.bind(this));
    workflow.addNode('formatResponse', this.formatResponseNode.bind(this));

    // Set entry point
    workflow.setEntryPoint('analyzeIntent');

    // Add conditional routing from analyzeIntent
    workflow.addConditionalEdges(
      'analyzeIntent',
      this.routeByIntent.bind(this)
    );

    // All tool nodes lead to formatResponse
    workflow.addEdge('ragAgentNode', 'formatResponse');
    workflow.addEdge('chartToolNode', 'formatResponse');
    workflow.addEdge('ragAndChartNode', 'formatResponse');
    workflow.addEdge('directResponseNode', 'formatResponse');

    // formatResponse is the end
    workflow.addEdge('formatResponse', END);

    // Compile the graph
    const compiledGraph = workflow.compile();
    
    logger.debug('State graph compiled successfully');
    
    return compiledGraph;
  }

  /**
   * Node 1: Analyze Intent
   * Classifies the user's query into intent categories
   */
  async analyzeIntent(state) {
    try {
      logger.agent('Analyzing user intent...');
      logger.debug(`Query: "${state.input}"`);

      const prompt = INTENT_CLASSIFICATION_PROMPT.replace('{query}', state.input);
      const classification = await this.llmService.invokeJSON(prompt);

      logger.agent(`Intent: ${classification.intent} (confidence: ${classification.confidence})`);
      logger.debug(`Reasoning: ${classification.reasoning}`);

      return {
        intent: classification.intent,
        confidence: classification.confidence
      };
    } catch (error) {
      logger.error('Intent classification failed:', error.message);
      
      // Fallback: Simple keyword-based classification
      const fallbackIntent = this.fallbackIntentClassification(state.input);
      logger.warn(`Using fallback classification: ${fallbackIntent.intent}`);
      
      return fallbackIntent;
    }
  }

  /**
   * Fallback intent classification using keywords
   */
  fallbackIntentClassification(query) {
    const queryLower = query.toLowerCase();

    // Check for chart keywords
    const chartKeywords = ['chart', 'graph', 'visualize', 'plot', 'show me', 'display'];
    const hasChart = chartKeywords.some(kw => queryLower.includes(kw));

    // Check for knowledge base keywords
    const ragKeywords = ['policy', 'procedure', 'how do i', 'what is', 'tell me about', 'explain'];
    const hasRAG = ragKeywords.some(kw => queryLower.includes(kw));

    if (hasRAG && hasChart) {
      return { intent: 'both', confidence: 0.6 };
    } else if (hasChart) {
      return { intent: 'chart', confidence: 0.6 };
    } else if (hasRAG) {
      return { intent: 'rag', confidence: 0.6 };
    } else {
      return { intent: 'direct', confidence: 0.5 };
    }
  }

  /**
   * Routing function based on intent
   */
  routeByIntent(state) {
    const { intent, confidence } = state;

    logger.agent(`Routing to: ${intent} (confidence: ${confidence})`);

    // Fallback to direct response if confidence is too low
    if (confidence < this.confidenceThreshold) {
      logger.warn(`Low confidence (${confidence}), routing to direct response`);
      return 'directResponseNode';
    }

    // Route based on intent
    const routeMap = {
      'rag': 'ragAgentNode',
      'chart': 'chartToolNode',
      'both': 'ragAndChartNode',
      'direct': 'directResponseNode'
    };

    return routeMap[intent] || 'directResponseNode';
  }

  /**
   * Node 2: RAG Agent
   * Queries the knowledge base
   */
  async ragAgentNode(state) {
    try {
      logger.agent('Executing RAG Agent...');

      const results = await this.ragAgent.query(state.input);

      logger.info(`RAG Agent found ${results.resultCount} results`);

      return {
        ragResults: results,
        answer: results.answer,
        references: { rag: true, chart: false },
        fileIds: results.fileIds || []
      };
    } catch (error) {
      logger.error('RAG Agent node failed:', error.message);
      
      return {
        ragResults: null,
        answer: 'I encountered an error querying the knowledge base. Please try again.',
        references: { rag: false, chart: false },
        fileIds: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Node 3: Chart Tool
   * Generates chart configuration
   */
  async chartToolNode(state) {
    try {
      logger.agent('Executing Chart Tool...');

      const chartConfig = await this.chartTool.generateChart({
        context: state.input
      });

      logger.info('Chart configuration generated');

      return {
        chartConfig,
        answer: 'I\'ve generated a chart for you based on your request.',
        references: { rag: false, chart: true }
      };
    } catch (error) {
      logger.error('Chart Tool node failed:', error.message);
      
      return {
        chartConfig: null,
        answer: 'I encountered an error generating the chart. Please try again.',
        references: { rag: false, chart: false },
        errors: [error.message]
      };
    }
  }

  /**
   * Node 4: RAG + Chart (Parallel Execution)
   * Executes both RAG and Chart in parallel
   */
  async ragAndChartNode(state) {
    try {
      logger.agent('Executing RAG + Chart in parallel...');

      // Execute both operations in parallel
      const [ragResults, chartConfig] = await Promise.all([
        this.ragAgent.query(state.input),
        this.chartTool.generateChart({ context: state.input })
      ]);

      logger.info(`Combined execution: RAG (${ragResults.resultCount} results) + Chart`);

      // Combine the answer
      const combinedAnswer = `${ragResults.answer}\n\nI've also generated a visualization for you.`;

      return {
        ragResults,
        chartConfig,
        answer: combinedAnswer,
        references: { rag: true, chart: true },
        fileIds: ragResults.fileIds || []
      };
    } catch (error) {
      logger.error('RAG + Chart node failed:', error.message);
      
      // Fallback: Try just RAG
      try {
        logger.warn('Falling back to RAG only...');
        const ragResults = await this.ragAgent.query(state.input);
        
        return {
          ragResults,
          chartConfig: null,
          answer: ragResults.answer,
          references: { rag: true, chart: false },
          fileIds: ragResults.fileIds || [],
          errors: ['Chart generation failed']
        };
      } catch (ragError) {
        return {
          ragResults: null,
          chartConfig: null,
          answer: 'I encountered an error processing your request. Please try again.',
          references: { rag: false, chart: false },
          errors: [error.message, ragError.message]
        };
      }
    }
  }

  /**
   * Node 5: Direct Response
   * Get direct LLM response without tools
   */
  async directResponseNode(state) {
    try {
      logger.agent('Generating direct LLM response...');

      const prompt = `Answer the following question directly and concisely:\n\n${state.input}`;
      const answer = await this.llmService.invoke(prompt);

      logger.info('Direct response generated');

      return {
        answer,
        references: { rag: false, chart: false }
      };
    } catch (error) {
      logger.error('Direct Response node failed:', error.message);
      
      return {
        answer: 'I\'m sorry, I encountered an error. Please try again.',
        references: { rag: false, chart: false },
        errors: [error.message]
      };
    }
  }

  /**
   * Node 6: Format Response
   * Builds final response conforming to contract
   */
  async formatResponseNode(state) {
    try {
      logger.agent('Formatting final response...');

      // Build response object conforming to contract
      const response = {
        answer: state.answer || 'No answer generated.',
        references: state.references || { rag: false, chart: false }
      };

      // Add fileIds if RAG was used and we have results
      if (state.references?.rag && state.fileIds && state.fileIds.length > 0) {
        response.fileIds = state.fileIds;
      }

      // Add chartConfig if chart was generated
      if (state.references?.chart && state.chartConfig) {
        response.chartConfig = state.chartConfig;
      }

      logger.info('Response formatted successfully');
      logger.debug(`RAG used: ${response.references.rag}, Chart used: ${response.references.chart}`);

      return response;
    } catch (error) {
      logger.error('Format Response node failed:', error.message);
      
      // Return minimal valid response
      return {
        answer: state.answer || 'An error occurred while formatting the response.',
        references: { rag: false, chart: false }
      };
    }
  }

  /**
   * Process a user query through the agent
   * @param {string} userQuery - User's question
   * @returns {Object} Formatted response
   */
  async process(userQuery) {
    try {
      // Ensure agent is initialized
      if (!this.graph) {
        await this.initialize();
      }

      logger.info('Processing user query...');
      logger.debug(`Query: "${userQuery}"`);

      // Create initial state
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

      // Execute the graph
      const result = await this.graph.invoke(initialState);

      logger.info('✅ Query processed successfully');

      return result;

    } catch (error) {
      logger.error('Agent processing failed:', error.message);
      
      // Return error response conforming to contract
      return {
        answer: `I apologize, but I encountered an error processing your request: ${error.message}`,
        references: { rag: false, chart: false }
      };
    }
  }

  /**
   * Get agent configuration
   */
  getConfig() {
    return {
      initialized: this.graph !== null,
      confidenceThreshold: this.confidenceThreshold,
      tools: {
        rag: this.ragAgent.getConfig(),
        chart: this.chartTool.getAvailableTemplates()
      }
    };
  }
}

// Create singleton instance
const delegatingAgent = new DelegatingAgent();

module.exports = delegatingAgent;

