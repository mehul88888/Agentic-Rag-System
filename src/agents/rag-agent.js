/**
 * RAG Agent
 * Handles knowledge base queries using vector search and LLM synthesis
 */

const weaviateService = require('../services/weaviate');
const llmService = require('../services/llm');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * RAG Synthesis Prompt - Industry Best Practice
 */
const RAG_SYNTHESIS_PROMPT = `You are a helpful assistant synthesizing information from a company knowledge base.

Your task is to provide a clear, accurate, and concise answer based on the retrieved sources.

Retrieved Sources:
{sources}

User Question: {query}

Instructions:
1. Use ONLY the information from the sources provided above
2. Combine information from multiple sources if relevant
3. Provide a comprehensive but concise answer
4. If sources conflict, mention both perspectives
5. If the sources don't fully answer the question, say "Based on the available information..." and provide what you can
6. Do NOT make up information not present in the sources
7. Keep your answer focused and relevant to the question

Answer:`;

/**
 * No Results Prompt
 */
const NO_RESULTS_PROMPT = `The user asked: "{query}"

Unfortunately, I couldn't find specific information about this in our knowledge base.

Provide a helpful response that:
1. Acknowledges you don't have this specific information
2. Suggests they contact HR or IT support depending on the topic
3. Keep it brief and professional

Response:`;

class RAGAgent {
  constructor() {
    this.maxResults = config.app.ragMaxResults || 3;
    this.confidenceThreshold = 0.5; // Minimum distance threshold
  }

  /**
   * Query the knowledge base and return synthesized answer
   * @param {string} userQuery - User's question
   * @returns {Object} { answer, fileIds, sources, confidence }
   */
  async query(userQuery) {
    try {
      logger.info('RAG Agent: Processing query...');
      logger.debug(`Query: "${userQuery}"`);

      // Step 1: Perform vector search
      const searchResults = await this.vectorSearch(userQuery);

      if (!searchResults || searchResults.length === 0) {
        logger.warn('RAG Agent: No results found in knowledge base');
        return await this.handleNoResults(userQuery);
      }

      logger.info(`RAG Agent: Found ${searchResults.length} relevant results`);

      // Step 2: Extract and format sources
      const sources = this.extractSources(searchResults);
      const fileIds = this.extractFileIds(searchResults);

      // Step 3: Calculate confidence based on distance scores
      const confidence = this.calculateConfidence(searchResults);

      logger.debug(`RAG Agent: Confidence score: ${confidence.toFixed(2)}`);

      // Step 4: Synthesize answer using LLM
      const answer = await this.synthesizeAnswer(userQuery, sources);

      logger.info('RAG Agent: Answer synthesized successfully');

      return {
        answer,
        fileIds,
        sources: searchResults,
        confidence,
        resultCount: searchResults.length
      };

    } catch (error) {
      logger.error('RAG Agent: Query failed:', error.message);
      throw error;
    }
  }

  /**
   * Perform vector similarity search
   * @param {string} query - Search query
   * @returns {Array} Search results
   */
  async vectorSearch(query) {
    try {
      const results = await weaviateService.vectorSearch(
        config.weaviate.className,
        config.weaviate.tenant,
        query,
        this.maxResults
      );

      logger.debug(`Vector search returned ${results.length} results`);
      
      return results;

    } catch (error) {
      logger.error('RAG Agent: Vector search failed:', error.message);
      
      // Fallback: Try to fetch all objects and do simple matching
      logger.warn('RAG Agent: Attempting fallback search...');
      return await this.fallbackSearch(query);
    }
  }

  /**
   * Fallback search when vector search fails
   * @param {string} query - Search query
   * @returns {Array} Search results
   */
  async fallbackSearch(query) {
    try {
      // Fetch all objects
      const allObjects = await weaviateService.fetchObjects(
        config.weaviate.className,
        config.weaviate.tenant,
        100
      );

      // Simple keyword matching
      const queryLower = query.toLowerCase();
      const matches = allObjects.filter(obj => {
        const questionMatch = obj.properties.question?.toLowerCase().includes(queryLower);
        const answerMatch = obj.properties.answer?.toLowerCase().includes(queryLower);
        return questionMatch || answerMatch;
      });

      logger.info(`Fallback search found ${matches.length} matches`);
      
      return matches.slice(0, this.maxResults);

    } catch (error) {
      logger.error('RAG Agent: Fallback search also failed:', error.message);
      return [];
    }
  }

  /**
   * Extract source texts from search results
   * @param {Array} results - Search results
   * @returns {Array} Array of source objects
   */
  extractSources(results) {
    return results.map((result, index) => {
      const props = result.properties;
      return {
        index: index + 1,
        fileId: props.fileId,
        question: props.question,
        answer: props.answer,
        distance: result.distance || 0
      };
    });
  }

  /**
   * Extract unique file IDs from results
   * @param {Array} results - Search results
   * @returns {Array} Array of unique file IDs
   */
  extractFileIds(results) {
    const fileIds = results
      .map(r => r.properties.fileId)
      .filter(id => id); // Remove null/undefined

    // Return unique file IDs
    return [...new Set(fileIds)];
  }

  /**
   * Calculate confidence score based on distance metrics
   * @param {Array} results - Search results with distance scores
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(results) {
    if (!results || results.length === 0) {
      return 0;
    }

    // Use the closest result's distance (lower is better)
    const bestDistance = results[0].distance || 0;

    // Convert distance to confidence (inverse relationship)
    // Distance typically ranges from 0 (perfect match) to 2 (very different)
    // We'll map this to confidence 1.0 to 0.0
    const confidence = Math.max(0, Math.min(1, 1 - (bestDistance / 2)));

    return confidence;
  }

  /**
   * Synthesize answer from multiple sources using LLM
   * @param {string} query - Original user query
   * @param {Array} sources - Array of source objects
   * @returns {string} Synthesized answer
   */
  async synthesizeAnswer(query, sources) {
    try {
      // Format sources for the prompt
      const formattedSources = sources.map(source => {
        return `Source ${source.index} [${source.fileId}]:
Question: ${source.question}
Answer: ${source.answer}`;
      }).join('\n\n');

      // Create synthesis prompt
      const prompt = RAG_SYNTHESIS_PROMPT
        .replace('{sources}', formattedSources)
        .replace('{query}', query);

      // Get LLM response
      const answer = await llmService.invoke(prompt);

      return answer;

    } catch (error) {
      logger.error('RAG Agent: Answer synthesis failed:', error.message);
      
      // Fallback: Return the most relevant source answer directly
      if (sources.length > 0) {
        logger.warn('RAG Agent: Using direct answer from top source');
        return sources[0].answer;
      }

      throw error;
    }
  }

  /**
   * Handle case when no results are found
   * @param {string} query - Original query
   * @returns {Object} Response object
   */
  async handleNoResults(query) {
    try {
      // Generate a helpful "not found" message
      const prompt = NO_RESULTS_PROMPT.replace('{query}', query);
      const answer = await llmService.invoke(prompt);

      return {
        answer,
        fileIds: [],
        sources: [],
        confidence: 0,
        resultCount: 0
      };

    } catch (error) {
      logger.error('RAG Agent: Failed to generate no-results message:', error.message);
      
      // Ultimate fallback
      return {
        answer: "I couldn't find specific information about that in our knowledge base. Please contact HR or IT support for assistance.",
        fileIds: [],
        sources: [],
        confidence: 0,
        resultCount: 0
      };
    }
  }

  /**
   * Get RAG agent statistics
   * @returns {Object} Agent configuration
   */
  getConfig() {
    return {
      maxResults: this.maxResults,
      confidenceThreshold: this.confidenceThreshold,
      className: config.weaviate.className,
      tenant: config.weaviate.tenant
    };
  }
}

// Create singleton instance
const ragAgent = new RAGAgent();

module.exports = ragAgent;

