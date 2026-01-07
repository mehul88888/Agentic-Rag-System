/**
 * Data Seeding Script
 * Inserts sample Q&A records into Weaviate KnowledgeBase
 */

const weaviateService = require('../services/weaviate');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Sample Q&A data for knowledge base
 * Domains: HR policies, IT procedures, Employee guidelines
 */
const seedData = [
  {
    fileId: 'HR-001',
    question: 'What is the company leave policy?',
    answer: 'Employees are entitled to 20 days of paid annual leave per year. Leave must be requested at least 2 weeks in advance through the HR portal. Unused leave can be carried forward up to 5 days to the next year. Additional leave types include sick leave (10 days), personal leave (3 days), and parental leave (up to 3 months).'
  },
  {
    fileId: 'HR-002',
    question: 'What is the remote work policy?',
    answer: 'Employees can work remotely up to 3 days per week after completing their probation period. Remote work requests must be approved by the direct manager and logged in the attendance system. Employees must maintain core working hours (10 AM - 3 PM in their timezone) and be available for video calls. A home office setup allowance of $500 is provided annually.'
  },
  {
    fileId: 'HR-003',
    question: 'What is the dress code policy?',
    answer: 'The company follows a smart casual dress code. Jeans are acceptable Monday through Thursday. Business formal attire is required for client meetings and presentations. Fridays are casual dress days where company t-shirts and comfortable clothing are encouraged. Offensive or inappropriate clothing is not permitted.'
  },
  {
    fileId: 'IT-001',
    question: 'How do I reset my company password?',
    answer: 'Visit the IT self-service portal at it.company.com and click "Reset Password". You will receive a verification code via email and SMS. Passwords must be at least 12 characters with uppercase, lowercase, numbers, and symbols. Passwords expire every 90 days. For issues, contact IT support at ext. 4357 or support@company.com.'
  },
  {
    fileId: 'HR-004',
    question: 'What are the employee wellness benefits?',
    answer: 'All employees have access to gym membership reimbursement up to $50/month, mental health counseling (8 sessions/year covered 100%), and annual health checkups. We offer yoga classes every Tuesday and Thursday at 5 PM. Wellness days can be used for medical appointments without deducting leave. The company also provides ergonomic assessments for workstations.'
  }
];

/**
 * Seed the knowledge base with sample data
 */
async function seedKnowledgeBase() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🌱 SEEDING KNOWLEDGE BASE');
    console.log('='.repeat(70) + '\n');

    // Step 1: Connect to Weaviate
    logger.info('Step 1: Connecting to Weaviate...');
    await weaviateService.connect();
    
    // Step 2: Verify health
    logger.info('Step 2: Checking Weaviate health...');
    const health = await weaviateService.isHealthy();
    
    if (!health.healthy) {
      throw new Error('Weaviate is not healthy. Please run: npm run setup (schema initialization)');
    }
    
    logger.info('✅ Weaviate is healthy');
    
    // Step 3: Verify schema exists
    logger.info('Step 3: Verifying schema...');
    const schema = await weaviateService.getSchema(config.weaviate.className);
    
    if (!schema.exists) {
      throw new Error(`Schema '${config.weaviate.className}' does not exist. Please run: npm run init-schema`);
    }
    
    logger.info(`✅ Schema '${config.weaviate.className}' exists`);
    
    // Step 4: Check existing data
    logger.info('Step 4: Checking for existing data...');
    try {
      const existing = await weaviateService.fetchObjects(
        config.weaviate.className,
        config.weaviate.tenant,
        10
      );
      
      if (existing.length > 0) {
        console.log(`\n⚠️  Found ${existing.length} existing records in the knowledge base`);
        console.log('   This will add new records without removing existing ones.');
        console.log('   To reset, run: docker-compose down -v && docker-compose up -d && npm run setup\n');
      }
    } catch (error) {
      logger.debug('No existing data found (this is normal for first run)');
    }
    
    // Step 5: Insert seed data
    logger.info(`Step 5: Inserting ${seedData.length} records...`);
    console.log('\n📝 Records to insert:');
    seedData.forEach((record, index) => {
      console.log(`   ${index + 1}. [${record.fileId}] ${record.question.substring(0, 50)}...`);
    });
    console.log();
    
    const result = await weaviateService.insertBatch(
      config.weaviate.className,
      config.weaviate.tenant,
      seedData
    );
    
    if (result.success) {
      logger.info(`✅ Successfully inserted ${result.inserted}/${result.total} records`);
      
      if (result.errors && Object.keys(result.errors).length > 0) {
        logger.warn(`⚠️  ${Object.keys(result.errors).length} records had errors`);
        console.log('\nErrors:', result.errors);
      }
    }
    
    // Step 6: Wait for vectorization
    logger.info('Step 6: Waiting for vectorization to complete...');
    console.log('   (This may take 10-30 seconds for text2vec-transformers)\n');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    // Step 7: Verify with a test query
    logger.info('Step 7: Verifying data with test query...');
    console.log('   Query: "leave policy"\n');
    
    const testResults = await weaviateService.vectorSearch(
      config.weaviate.className,
      config.weaviate.tenant,
      'leave policy',
      2
    );
    
    if (testResults.length > 0) {
      logger.info(`✅ Vector search working! Found ${testResults.length} results`);
      console.log('\n📊 Test Query Results:');
      testResults.forEach((result, index) => {
        console.log(`\n   Result ${index + 1}:`);
        console.log(`   File: ${result.properties.fileId}`);
        console.log(`   Question: ${result.properties.question}`);
        console.log(`   Answer: ${result.properties.answer.substring(0, 100)}...`);
        if (result.distance) {
          console.log(`   Distance: ${result.distance.toFixed(4)}`);
        }
      });
    } else {
      logger.warn('⚠️  No results found. Vectorization may still be processing.');
      console.log('   Wait 30 seconds and try querying again.');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ DATA SEEDING COMPLETE');
    console.log('='.repeat(70) + '\n');
    
    console.log('📚 Knowledge Base Summary:');
    console.log(`   Records: ${result.inserted}`);
    console.log(`   Tenant: ${config.weaviate.tenant}`);
    console.log(`   Class: ${config.weaviate.className}`);
    console.log('   Vectorization: text2vec-transformers (384-dim)\n');
    
    console.log('Next steps:');
    console.log('  1. Wait 30 seconds for full vectorization');
    console.log('  2. Test queries with: npm start');
    console.log('  3. Try: "What is the leave policy?"\n');
    
    return { success: true, inserted: result.inserted };
    
  } catch (error) {
    console.error('\n❌ Data seeding failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure schema is initialized: npm run init-schema');
    console.error('  2. Check Docker containers: docker-compose ps');
    console.error('  3. Verify transformers service is running');
    console.error('  4. Check logs: docker-compose logs t2v-transformers\n');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedKnowledgeBase()
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
  seedKnowledgeBase,
  seedData
};

