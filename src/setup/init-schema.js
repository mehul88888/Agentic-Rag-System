/**
 * Schema Initialization Script
 * Creates the KnowledgeBase class in Weaviate with multi-tenancy support
 */

const weaviateService = require('../services/weaviate');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * KnowledgeBase schema definition
 */
const knowledgeBaseSchema = {
  class: 'KnowledgeBase',
  description: 'Stores Q&A pairs for RAG retrieval with source file references',
  
  // Enable multi-tenancy
  multiTenancyConfig: {
    enabled: true
  },
  
  // Use text2vec-transformers for vectorization
  vectorizer: 'text2vec-transformers',
  
  // Module configuration
  moduleConfig: {
    'text2vec-transformers': {
      poolingStrategy: 'masked_mean',
      vectorizeClassName: false
    }
  },
  
  // Properties
  properties: [
    {
      name: 'fileId',
      dataType: ['text'],
      description: 'Reference to source document (e.g., HR-001, IT-001)',
      moduleConfig: {
        'text2vec-transformers': {
          skip: true,                    // Do NOT vectorize
          vectorizePropertyName: false
        }
      },
      indexSearchable: false,            // Not searchable
      indexFilterable: true              // But filterable
    },
    {
      name: 'question',
      dataType: ['text'],
      description: 'Question text to be vectorized',
      moduleConfig: {
        'text2vec-transformers': {
          skip: false,                   // DO vectorize
          vectorizePropertyName: false
        }
      },
      indexSearchable: true,
      indexFilterable: true
    },
    {
      name: 'answer',
      dataType: ['text'],
      description: 'Answer text to be vectorized',
      moduleConfig: {
        'text2vec-transformers': {
          skip: false,                   // DO vectorize
          vectorizePropertyName: false
        }
      },
      indexSearchable: true,
      indexFilterable: true
    }
  ]
};

/**
 * Initialize schema and tenant
 */
async function initializeSchema() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 INITIALIZING WEAVIATE SCHEMA');
    console.log('='.repeat(70) + '\n');

    // Step 1: Connect to Weaviate
    logger.info('Step 1: Connecting to Weaviate...');
    await weaviateService.connect();
    
    // Step 2: Check health
    logger.info('Step 2: Checking Weaviate health...');
    const health = await weaviateService.isHealthy();
    
    if (!health.healthy) {
      throw new Error('Weaviate is not healthy. Please check if Docker containers are running.');
    }
    
    logger.info(`✅ Weaviate is healthy (Version: ${health.meta?.version || 'unknown'})`);
    
    // Step 3: Check if schema already exists
    logger.info('Step 3: Checking existing schema...');
    const existingSchema = await weaviateService.getSchema(knowledgeBaseSchema.class);
    
    if (existingSchema.exists) {
      console.log('\n⚠️  Schema already exists!');
      console.log('   Class: KnowledgeBase');
      console.log('   Properties:', existingSchema.schema.properties.map(p => p.name).join(', '));
      console.log('\n   Skipping schema creation...\n');
    } else {
      // Step 4: Create schema
      logger.info('Step 4: Creating KnowledgeBase schema...');
      const result = await weaviateService.createSchema(knowledgeBaseSchema);
      
      if (result.created) {
        logger.info('✅ Schema created successfully');
        console.log('   Class: KnowledgeBase');
        console.log('   Properties: fileId, question, answer');
        console.log('   Vectorizer: text2vec-transformers');
        console.log('   Multi-tenancy: Enabled');
      }
    }
    
    // Step 5: Add tenant
    logger.info(`Step 5: Adding tenant '${config.weaviate.tenant}'...`);
    const tenantResult = await weaviateService.addTenant(
      knowledgeBaseSchema.class,
      config.weaviate.tenant
    );
    
    if (tenantResult.added) {
      logger.info(`✅ Tenant '${config.weaviate.tenant}' added successfully`);
    } else if (tenantResult.exists) {
      logger.info(`✅ Tenant '${config.weaviate.tenant}' already exists`);
    }
    
    // Step 6: Verify schema
    logger.info('Step 6: Verifying schema...');
    const verifiedSchema = await weaviateService.getSchema(knowledgeBaseSchema.class);
    
    if (verifiedSchema.exists) {
      const properties = verifiedSchema.schema.properties;
      const hasFileId = properties.some(p => p.name === 'fileId');
      const hasQuestion = properties.some(p => p.name === 'question');
      const hasAnswer = properties.some(p => p.name === 'answer');
      const multiTenancyEnabled = verifiedSchema.schema.multiTenancyConfig?.enabled;
      
      if (hasFileId && hasQuestion && hasAnswer && multiTenancyEnabled) {
        logger.info('✅ Schema verification passed');
        console.log('\n📋 Schema Summary:');
        console.log('   ✅ Class: KnowledgeBase');
        console.log('   ✅ Properties: fileId, question, answer');
        console.log('   ✅ Vectorization: Enabled (question, answer)');
        console.log('   ✅ Multi-tenancy: Enabled');
        console.log(`   ✅ Tenant: ${config.weaviate.tenant}`);
      } else {
        logger.warn('⚠️  Schema verification found issues');
        console.log('   Missing properties or incorrect configuration');
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ SCHEMA INITIALIZATION COMPLETE');
    console.log('='.repeat(70) + '\n');
    
    console.log('Next steps:');
    console.log('  1. Run: npm run seed-data (or node src/setup/seed-data.js)');
    console.log('  2. This will insert sample Q&A records into the knowledge base\n');
    
    return { success: true };
    
  } catch (error) {
    console.error('\n❌ Schema initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure Docker containers are running: docker-compose ps');
    console.error('  2. Check Weaviate logs: docker-compose logs weaviate');
    console.error('  3. Verify Weaviate URL in .env: WEAVIATE_URL=http://localhost:8080');
    console.error('  4. Wait 30-60 seconds after starting Docker for services to be ready\n');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeSchema()
    .then(() => {
      logger.info('Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeSchema,
  knowledgeBaseSchema
};

