#!/usr/bin/env node

/**
 * CLI Application
 * Interactive terminal interface for the Agentic RAG System
 */

const readline = require('readline');
const delegatingAgent = require('./agents/delegating-agent');
const weaviateService = require('./services/weaviate');
const { formatResponse, formatError, validateResponseContract } = require('./utils/formatter');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * CLI Class
 */
class AgenticCLI {
  constructor(agent) {
    this.agent = agent;
    this.rl = null;
    this.isRunning = false;
  }

  /**
   * Display welcome message and instructions
   */
  displayWelcome() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║        🤖  AGENTIC RAG SYSTEM - Terminal Interface                ║
║                                                                    ║
║        Intelligent Agent Orchestration System                     ║
║        Powered by LangGraph + Weaviate + Google Gemini            ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

📚 ASK QUESTIONS ABOUT:
   • Company Policies (leave, remote work, dress code, wellness)
   • IT Procedures (password reset, technical support)
   • Request Charts & Visualizations
   • General Queries

💡 EXAMPLE QUERIES:
   • "What is the company leave policy?"
   • "Show me an employee attendance chart"
   • "Explain remote work policy and show me stats"
   • "What is 5 × 7?"

⌨️  COMMANDS:
   • Type your question and press Enter
   • 'exit', 'quit', or 'q' to exit
   • 'help' for assistance
   • 'stats' for system information

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  }

  /**
   * Display help message
   */
  displayHelp() {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 HELP - HOW TO USE THIS SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 QUERY TYPES:

1. **Knowledge Base Questions** (RAG)
   Ask about company policies, procedures, or guidelines
   Examples:
   • "What is the leave policy?"
   • "How do I reset my password?"
   • "Tell me about wellness benefits"

2. **Chart Requests**
   Request visualizations or charts
   Examples:
   • "Show me an attendance chart"
   • "Visualize department distribution"
   • "Create a performance metrics graph"

3. **Combined Queries**
   Ask for information AND a chart
   Examples:
   • "Explain leave policy and show a chart"
   • "What's the remote work policy? Show me trends"

4. **General Questions**
   Math, casual chat, or general queries
   Examples:
   • "What is 25 + 17?"
   • "Hello!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 AGENT BEHAVIOR:

The system intelligently routes your query to:
• RAG Agent (Knowledge Base Search)
• Chart Tool (Visualization Generator)
• Direct LLM (General Questions)
• Combined (RAG + Chart in parallel)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  }

  /**
   * Display system statistics
   */
  displayStats() {
    const agentConfig = this.agent.getConfig();
    
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SYSTEM STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Agent Configuration:
   Status: ${agentConfig.initialized ? '✅ Initialized' : '❌ Not Initialized'}
   Confidence Threshold: ${agentConfig.confidenceThreshold}

📚 RAG Agent:
   Max Results: ${agentConfig.tools.rag.maxResults}
   Weaviate Class: ${agentConfig.tools.rag.className}
   Tenant: ${agentConfig.tools.rag.tenant}

📊 Chart Tool:
   Available Templates: ${agentConfig.tools.chart.length}
   Templates: ${agentConfig.tools.chart.join(', ')}

⚙️  Configuration:
   LLM Model: ${config.llm.model}
   Temperature: ${config.llm.temperature}
   Log Level: ${config.app.logLevel}
   Environment: ${config.app.nodeEnv}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  }

  /**
   * Handle user input
   */
  async handleInput(input) {
    const query = input.trim();

    // Handle empty input
    if (!query) {
      this.rl.prompt();
      return;
    }

    // Handle commands
    if (['exit', 'quit', 'q'].includes(query.toLowerCase())) {
      await this.shutdown();
      return;
    }

    if (query.toLowerCase() === 'help') {
      this.displayHelp();
      this.rl.prompt();
      return;
    }

    if (query.toLowerCase() === 'stats') {
      this.displayStats();
      this.rl.prompt();
      return;
    }

    // Process query through agent
    try {
      console.log('\n⏳ Processing your query...\n');

      const response = await this.agent.process(query);

      // Validate response contract
      try {
        validateResponseContract(response);
      } catch (validationError) {
        logger.warn('Response contract validation failed:', validationError.message);
      }

      // Format and display response
      formatResponse(response);

    } catch (error) {
      formatError(error);
      logger.error('Query processing error:', error);
    }

    this.rl.prompt();
  }

  /**
   * Initialize services and start the CLI
   */
  async start() {
    try {
      console.log('\n🔄 Starting Agentic RAG System...\n');

      // Step 1: Check Weaviate connection
      logger.info('Checking Weaviate connection...');
      await weaviateService.connect();
      const health = await weaviateService.isHealthy();
      
      if (!health.healthy) {
        throw new Error('Weaviate is not healthy. Please check if Docker containers are running.');
      }
      
      console.log('✅ Weaviate connected');

      // Step 2: Initialize the delegating agent
      logger.info('Initializing Delegating Agent...');
      await this.agent.initialize();
      console.log('✅ Agent initialized');

      // Step 3: Setup readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\n💬 You: '
      });

      // Handle input
      this.rl.on('line', async (input) => {
        await this.handleInput(input);
      });

      // Handle close event
      this.rl.on('close', async () => {
        await this.shutdown();
      });

      // Display welcome message
      this.displayWelcome();

      // Set running flag
      this.isRunning = true;

      // Start prompt
      this.rl.prompt();

      logger.info('CLI started successfully');

    } catch (error) {
      console.error('\n❌ Failed to start application:', error.message);
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('  1. Ensure Docker containers are running:');
      console.error('     docker-compose ps');
      console.error('  2. Check Weaviate health:');
      console.error('     curl http://localhost:8080/v1/meta');
      console.error('  3. Verify .env file has GOOGLE_API_KEY set');
      console.error('  4. Run setup if not done:');
      console.error('     npm run setup');
      console.error('  5. Check logs:');
      console.error('     docker-compose logs weaviate\n');
      
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (!this.isRunning) {
      return;
    }

    console.log('\n\n👋 Thank you for using the Agentic RAG System!');
    console.log('   Goodbye!\n');

    this.isRunning = false;

    // Close readline
    if (this.rl) {
      this.rl.close();
    }

    // Disconnect from Weaviate
    try {
      await weaviateService.disconnect();
    } catch (error) {
      logger.debug('Weaviate disconnect error:', error.message);
    }

    process.exit(0);
  }
}

/**
 * Bootstrap the application
 */
async function main() {
  // Create CLI instance
  const cli = new AgenticCLI(delegatingAgent);

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    console.error('\n❌ Fatal error occurred. Please restart the application.\n');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
    console.error('\n❌ Unexpected error. Please restart the application.\n');
    process.exit(1);
  });

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Received interrupt signal (Ctrl+C)');
    await cli.shutdown();
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n⚠️  Received termination signal');
    await cli.shutdown();
  });

  // Start the CLI
  await cli.start();
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Application failed to start:', error);
    process.exit(1);
  });
}

module.exports = { AgenticCLI };

