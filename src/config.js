/**
 * Centralized Configuration Management
 * Loads and validates environment variables
 */

require('dotenv').config();

/**
 * Validates that required environment variables are present
 * @param {string} varName - Environment variable name
 * @param {boolean} required - Whether the variable is required
 * @returns {string|undefined} - Variable value or undefined
 */
function getEnvVar(varName, required = true, defaultValue = undefined) {
  const value = process.env[varName];
  
  if (!value && required) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    console.error(`   Please set it in your .env file`);
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  
  return value || defaultValue;
}

/**
 * Application Configuration
 */
const config = {
  // LLM Configuration
  llm: {
    apiKey: getEnvVar('GOOGLE_API_KEY', true),
    model: getEnvVar('LLM_MODEL', false, 'gemini-1.5-flash'),
    temperature: parseFloat(getEnvVar('LLM_TEMPERATURE', false, '0.7')),
  },
  
  // Weaviate Configuration
  weaviate: {
    url: getEnvVar('WEAVIATE_URL', false, 'http://localhost:8080'),
    tenant: getEnvVar('WEAVIATE_TENANT', false, 'tenant1'),
    className: 'KnowledgeBase',
  },
  
  // Application Settings
  app: {
    logLevel: getEnvVar('LOG_LEVEL', false, 'info'),
    nodeEnv: getEnvVar('NODE_ENV', false, 'development'),
    ragMaxResults: parseInt(getEnvVar('RAG_MAX_RESULTS', false, '3')),
    debugAgent: getEnvVar('DEBUG_AGENT', false, 'false') === 'true',
  },
};

/**
 * Validates the configuration
 */
function validateConfig() {
  // Validate temperature range
  if (config.llm.temperature < 0 || config.llm.temperature > 1) {
    throw new Error('LLM_TEMPERATURE must be between 0 and 1');
  }
  
  // Validate RAG max results
  if (config.app.ragMaxResults < 1 || config.app.ragMaxResults > 10) {
    throw new Error('RAG_MAX_RESULTS must be between 1 and 10');
  }
  
  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.app.logLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }
  
  return true;
}

/**
 * Logs the current configuration (safely, without sensitive data)
 */
function logConfig() {
  console.log('📋 Configuration Loaded:');
  console.log(`   LLM Model: ${config.llm.model}`);
  console.log(`   LLM Temperature: ${config.llm.temperature}`);
  console.log(`   Weaviate URL: ${config.weaviate.url}`);
  console.log(`   Weaviate Tenant: ${config.weaviate.tenant}`);
  console.log(`   Log Level: ${config.app.logLevel}`);
  console.log(`   Environment: ${config.app.nodeEnv}`);
  console.log(`   RAG Max Results: ${config.app.ragMaxResults}`);
  console.log(`   Debug Mode: ${config.app.debugAgent ? 'Enabled' : 'Disabled'}`);
}

// Validate configuration on load
try {
  validateConfig();
  if (config.app.nodeEnv === 'development' && config.app.logLevel === 'debug') {
    logConfig();
  }
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}

module.exports = config;

