/**
 * LLM Service
 * Google Gemini integration using LangChain
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const config = require('../config');
const logger = require('../utils/logger');

class LLMService {
  constructor() {
    this.model = null;
    this.initialized = false;
  }

  /**
   * Initialize the LLM model
   */
  initialize() {
    if (this.initialized) {
      return this.model;
    }

    try {
      logger.info('Initializing Google Gemini LLM...');

      this.model = new ChatGoogleGenerativeAI({
        apiKey: config.llm.apiKey,
        model: config.llm.model,
        temperature: config.llm.temperature,
        maxRetries: 3,
      });

      this.initialized = true;
      logger.info(`LLM initialized: ${config.llm.model} (temp: ${config.llm.temperature})`);

      return this.model;
    } catch (error) {
      logger.error('Failed to initialize LLM:', error.message);
      throw error;
    }
  }

  /**
   * Invoke the LLM with a prompt
   * @param {string} prompt - The prompt to send to the LLM
   * @param {string} systemMessage - Optional system message for context
   * @returns {Promise<string>} - LLM response text
   */
  async invoke(prompt, systemMessage = null) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      logger.debug('Invoking LLM...');

      // Build messages array
      const messages = [];
      
      if (systemMessage) {
        messages.push({
          role: 'system',
          content: systemMessage
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      // Invoke the model
      const response = await this.model.invoke(messages);
      const content = response.content;

      logger.debug('LLM response received');

      return content;
    } catch (error) {
      logger.error('LLM invocation failed:', error.message);
      
      // Provide helpful error messages
      if (error.message?.includes('API key')) {
        throw new Error('Invalid Google API key. Please check your GOOGLE_API_KEY in .env file');
      }
      if (error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please check your Gemini API usage limits');
      }
      if (error.message?.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again');
      }
      
      throw error;
    }
  }

  /**
   * Invoke the LLM and expect a JSON response
   * @param {string} prompt - The prompt to send
   * @param {string} systemMessage - Optional system message
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async invokeJSON(prompt, systemMessage = null) {
    try {
      // Add JSON formatting instruction to prompt
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON, no other text.`;
      
      const response = await this.invoke(jsonPrompt, systemMessage);
      
      // Try to extract JSON from response
      let jsonContent = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }
      
      // Parse JSON
      const parsed = JSON.parse(jsonContent);
      logger.debug('Successfully parsed JSON response');
      
      return parsed;
    } catch (error) {
      logger.error('Failed to parse JSON response:', error.message);
      logger.debug('Raw response:', response);
      throw new Error('LLM did not return valid JSON: ' + error.message);
    }
  }

  /**
   * Invoke with structured output schema (for better JSON reliability)
   * @param {string} prompt - The prompt
   * @param {Object} schema - Expected JSON schema
   * @returns {Promise<Object>} - Structured response
   */
  async invokeWithSchema(prompt, schema) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      logger.debug('Invoking LLM with structured schema...');

      // Create a structured output model
      const structuredModel = this.model.withStructuredOutput(schema);
      
      const response = await structuredModel.invoke(prompt);
      
      logger.debug('Structured response received');
      return response;
    } catch (error) {
      logger.error('Structured invocation failed:', error.message);
      // Fallback to regular JSON parsing
      logger.warn('Falling back to regular JSON parsing...');
      return await this.invokeJSON(prompt);
    }
  }

  /**
   * Stream response from LLM (useful for longer responses)
   * @param {string} prompt - The prompt
   * @param {Function} onChunk - Callback for each chunk
   */
  async stream(prompt, onChunk) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      logger.debug('Streaming LLM response...');

      const stream = await this.model.stream(prompt);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.content;
        fullResponse += content;
        if (onChunk) {
          onChunk(content);
        }
      }

      logger.debug('Stream completed');
      return fullResponse;
    } catch (error) {
      logger.error('Streaming failed:', error.message);
      throw error;
    }
  }

  /**
   * Test the LLM connection
   * @returns {Promise<boolean>} - True if connection successful
   */
  async test() {
    try {
      logger.info('Testing LLM connection...');
      
      const response = await this.invoke('Say "Hello! I am working correctly." in exactly those words.');
      
      if (response && response.length > 0) {
        logger.info('✅ LLM test successful');
        logger.debug(`Test response: ${response}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ LLM test failed:', error.message);
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      model: config.llm.model,
      temperature: config.llm.temperature,
      initialized: this.initialized
    };
  }
}

// Create singleton instance
const llmService = new LLMService();

module.exports = llmService;

