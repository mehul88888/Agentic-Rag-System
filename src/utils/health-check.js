/**
 * Health Check Utility
 * Verifies Weaviate and other services are ready
 */

async function checkWeaviateHealth(url = 'http://localhost:8080') {
  try {
    const response = await fetch(`${url}/v1/.well-known/ready`);
    if (response.ok) {
      console.log('✅ Weaviate is healthy and ready');
      return true;
    } else {
      console.log('❌ Weaviate is not ready');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to Weaviate:', error.message);
    return false;
  }
}

async function checkWeaviateMeta(url = 'http://localhost:8080') {
  try {
    const response = await fetch(`${url}/v1/meta`);
    if (response.ok) {
      const meta = await response.json();
      console.log('📊 Weaviate Meta:');
      console.log(`   Version: ${meta.version}`);
      console.log(`   Modules: ${meta.modules ? Object.keys(meta.modules).join(', ') : 'None'}`);
      return meta;
    }
  } catch (error) {
    console.log('❌ Cannot fetch Weaviate meta:', error.message);
    return null;
  }
}

async function runHealthChecks() {
  console.log('\n🔍 Running Health Checks...\n');
  
  const weaviateUrl = process.env.WEAVIATE_URL || 'http://localhost:8080';
  
  const isHealthy = await checkWeaviateHealth(weaviateUrl);
  if (isHealthy) {
    await checkWeaviateMeta(weaviateUrl);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  if (!isHealthy) {
    console.log('⚠️  Some services are not ready. Please check:');
    console.log('   1. Run: docker-compose ps');
    console.log('   2. Check logs: docker-compose logs -f weaviate');
    console.log('   3. Wait 30-60 seconds for services to start');
    process.exit(1);
  }
  
  console.log('✅ All services are healthy!\n');
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  runHealthChecks();
}

module.exports = {
  checkWeaviateHealth,
  checkWeaviateMeta,
  runHealthChecks
};

