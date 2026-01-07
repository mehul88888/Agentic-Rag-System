/**
 * Response Formatter Utility
 * Formats agent responses for CLI display and validates response contracts
 */

const logger = require('./logger');

/**
 * Formats the agent response for CLI display
 * @param {Object} response - Agent response object
 */
function formatResponse(response) {
  console.log('\n' + '━'.repeat(70));
  console.log('🤖 AGENT RESPONSE');
  console.log('━'.repeat(70));
  console.log();
  
  // Answer
  if (response.answer) {
    console.log('📝 Answer:');
    console.log(response.answer);
    console.log();
  }
  
  // References
  if (response.references) {
    console.log('📚 References Used:');
    console.log(`  • RAG (Knowledge Base): ${response.references.rag ? '✅ Yes' : '❌ No'}`);
    console.log(`  • Chart Tool: ${response.references.chart ? '✅ Yes' : '❌ No'}`);
    console.log();
  }
  
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
  
  console.log('━'.repeat(70));
}

/**
 * Validates that the response conforms to the contract
 * @param {Object} response - Agent response to validate
 * @returns {boolean} - True if valid, throws error if invalid
 */
function validateResponseContract(response) {
  const errors = [];
  
  // Required fields
  if (!response.answer || typeof response.answer !== 'string') {
    errors.push('Missing or invalid field: answer (must be string)');
  }
  
  if (!response.references || typeof response.references !== 'object') {
    errors.push('Missing or invalid field: references (must be object)');
  } else {
    if (typeof response.references.rag !== 'boolean') {
      errors.push('Invalid field: references.rag (must be boolean)');
    }
    if (typeof response.references.chart !== 'boolean') {
      errors.push('Invalid field: references.chart (must be boolean)');
    }
  }
  
  // Conditional fields - fileIds should only be present if RAG was used
  if (response.fileIds) {
    if (!Array.isArray(response.fileIds)) {
      errors.push('Invalid field: fileIds (must be array)');
    } else if (response.references && !response.references.rag) {
      errors.push('Contract violation: fileIds present but references.rag is false');
    }
  } else if (response.references && response.references.rag) {
    // It's okay to have RAG true with no fileIds (e.g., no results found)
    logger.warn('RAG was used but no fileIds returned (possibly no results found)');
  }
  
  // Conditional fields - chartConfig should only be present if chart was used
  if (response.chartConfig) {
    if (typeof response.chartConfig !== 'object') {
      errors.push('Invalid field: chartConfig (must be object)');
    } else if (response.references && !response.references.chart) {
      errors.push('Contract violation: chartConfig present but references.chart is false');
    }
  }
  
  // Check for unexpected fields
  const allowedFields = ['answer', 'references', 'fileIds', 'chartConfig'];
  const actualFields = Object.keys(response);
  const unexpectedFields = actualFields.filter(field => !allowedFields.includes(field));
  
  if (unexpectedFields.length > 0) {
    logger.warn(`Unexpected fields in response: ${unexpectedFields.join(', ')}`);
  }
  
  // Report validation errors
  if (errors.length > 0) {
    console.error('\n⚠️  Response Contract Validation Failed:');
    errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error();
    throw new Error('Response contract validation failed');
  }
  
  logger.debug('✅ Response contract validation passed');
  return true;
}

/**
 * Formats error messages for display
 * @param {Error} error - Error object
 */
function formatError(error) {
  console.log('\n' + '━'.repeat(70));
  console.log('❌ ERROR');
  console.log('━'.repeat(70));
  console.log();
  console.log(`Message: ${error.message}`);
  
  if (error.stack && process.env.NODE_ENV === 'development') {
    console.log('\nStack Trace:');
    console.log(error.stack);
  }
  
  console.log('\n' + '━'.repeat(70) + '\n');
}

/**
 * Formats JSON for pretty display
 * @param {Object} obj - Object to format
 * @returns {string} - Formatted JSON string
 */
function formatJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

module.exports = {
  formatResponse,
  validateResponseContract,
  formatError,
  formatJSON,
};

