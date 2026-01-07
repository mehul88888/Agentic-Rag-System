/**
 * Weaviate Service
 * Wrapper around Weaviate client with connection management, retry logic, and helper methods
 */

const weaviate = require('weaviate-client');
const config = require('../config');
const logger = require('../utils/logger');

// Import weaviate for type reference
const { default: weaviateClient } = require('weaviate-client');

class WeaviateService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second base delay
  }

  /**
   * Initialize and connect to Weaviate
   */
  async connect() {
    if (this.connected) {
      logger.debug('Weaviate client already connected');
      return this.client;
    }

    try {
      logger.info('Connecting to Weaviate...');
      
      // Parse the URL to extract host and port
      const url = new URL(config.weaviate.url);
      const host = url.hostname; // Just the hostname without port
      const port = url.port || '8080'; // Port or default to 8080
      
      this.client = await weaviate.connectToLocal({
        host: host,
        port: parseInt(port),
        grpc: false // Disable gRPC, use REST/HTTP only
      });

      this.connected = true;
      logger.info(`Connected to Weaviate at ${config.weaviate.url}`);
      
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Weaviate:', error.message);
      throw error;
    }
  }

  /**
   * Check if Weaviate is healthy and ready
   */
  async isHealthy() {
    try {
      if (!this.client) {
        await this.connect();
      }

      const meta = await this.client.getMeta();
      logger.debug('Weaviate health check passed');
      return { healthy: true, meta };
    } catch (error) {
      logger.error('Weaviate health check failed:', error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Create or update a schema class
   * @param {Object} schema - Schema definition
   */
  async createSchema(schema) {
    try {
      if (!this.client) {
        await this.connect();
      }

      logger.info(`Creating schema for class: ${schema.class}`);

      // Check if class already exists using v3 API
      try {
        const collection = this.client.collections.get(schema.class);
        const exists = await collection.exists();
        
        if (exists) {
          logger.warn(`Class ${schema.class} already exists, skipping creation`);
          return { exists: true, class: schema.class };
        }
      } catch (e) {
        // Class doesn't exist, continue with creation
        logger.debug('Class does not exist, will create');
      }

      // Create the class using v3 API
      const collectionConfig = {
        name: schema.class,
        description: schema.description,
        properties: schema.properties.map(prop => ({
          name: prop.name,
          dataType: prop.dataType?.[0] || 'text',
          description: prop.description,
          skipVectorization: prop.moduleConfig?.['text2vec-transformers']?.skip || false,
          indexSearchable: prop.indexSearchable !== false,
          indexFilterable: prop.indexFilterable !== false
        })),
        vectorizers: weaviate.configure.vectorizer.text2VecTransformers(),
        multiTenancy: weaviate.configure.multiTenancy({ enabled: true })
      };
      
      await this.client.collections.create(collectionConfig);
      
      logger.info(`Successfully created schema class: ${schema.class}`);
      return { created: true, class: schema.class };
    } catch (error) {
      logger.error(`Failed to create schema: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a tenant to a class
   * @param {string} className - Name of the class
   * @param {string} tenantName - Name of the tenant
   */
  async addTenant(className, tenantName) {
    try {
      if (!this.client) {
        await this.connect();
      }

      logger.info(`Adding tenant '${tenantName}' to class '${className}'`);

      const collection = this.client.collections.get(className);
      await collection.tenants.create([{ name: tenantName }]);

      logger.info(`Successfully added tenant: ${tenantName}`);
      return { added: true, tenant: tenantName };
    } catch (error) {
      // Tenant might already exist
      if (error.message?.includes('already exists') || error.message?.includes('422')) {
        logger.warn(`Tenant '${tenantName}' already exists`);
        return { added: false, exists: true, tenant: tenantName };
      }
      
      logger.error(`Failed to add tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Insert an object into Weaviate
   * @param {string} className - Name of the class
   * @param {string} tenant - Tenant name
   * @param {Object} data - Data to insert
   */
  async insertObject(className, tenant, data) {
    try {
      if (!this.client) {
        await this.connect();
      }

      logger.debug(`Inserting object into ${className} (tenant: ${tenant})`);

      const collection = this.client.collections.get(className);
      const result = await collection.withTenant(tenant).data.insert(data);

      logger.debug(`Successfully inserted object with UUID: ${result}`);
      return { uuid: result, success: true };
    } catch (error) {
      logger.error(`Failed to insert object: ${error.message}`);
      throw error;
    }
  }

  /**
   * Insert multiple objects in batch
   * @param {string} className - Name of the class
   * @param {string} tenant - Tenant name
   * @param {Array} dataArray - Array of objects to insert
   */
  async insertBatch(className, tenant, dataArray) {
    try {
      if (!this.client) {
        await this.connect();
      }

      logger.info(`Batch inserting ${dataArray.length} objects into ${className}`);

      const collection = this.client.collections.get(className);
      const results = await collection.withTenant(tenant).data.insertMany(dataArray);

      const successCount = results.uuids.length;
      logger.info(`Successfully inserted ${successCount}/${dataArray.length} objects`);
      
      if (results.errors) {
        logger.warn(`Batch insert had ${Object.keys(results.errors).length} errors`);
      }

      return { 
        success: true, 
        inserted: successCount,
        total: dataArray.length,
        uuids: results.uuids,
        errors: results.errors 
      };
    } catch (error) {
      logger.error(`Failed to batch insert: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform vector similarity search using nearText
   * @param {string} className - Name of the class
   * @param {string} tenant - Tenant name
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of results
   */
  async vectorSearch(className, tenant, query, limit = 3) {
    return await this.retryOperation(async () => {
      if (!this.client) {
        await this.connect();
      }

      logger.debug(`Vector search in ${className} (tenant: ${tenant}): "${query}"`);

      const collection = this.client.collections.get(className);
      const result = await collection
        .withTenant(tenant)
        .query.nearText(query, {
          limit: limit,
          returnMetadata: ['distance', 'score']
        });

      logger.debug(`Found ${result.objects.length} results`);
      
      // Format results
      const formattedResults = result.objects.map(obj => ({
        uuid: obj.uuid,
        properties: obj.properties,
        distance: obj.metadata?.distance,
        score: obj.metadata?.score
      }));

      return formattedResults;
    });
  }

  /**
   * Fetch all objects from a class (with optional limit)
   * @param {string} className - Name of the class
   * @param {string} tenant - Tenant name
   * @param {number} limit - Maximum number of objects to fetch
   */
  async fetchObjects(className, tenant, limit = 100) {
    try {
      if (!this.client) {
        await this.connect();
      }

      logger.debug(`Fetching objects from ${className} (tenant: ${tenant})`);

      const collection = this.client.collections.get(className);
      const result = await collection.withTenant(tenant).query.fetchObjects({ limit });

      logger.debug(`Fetched ${result.objects.length} objects`);
      return result.objects.map(obj => ({
        uuid: obj.uuid,
        properties: obj.properties
      }));
    } catch (error) {
      logger.error(`Failed to fetch objects: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete all objects from a class/tenant (useful for testing)
   * @param {string} className - Name of the class
   * @param {string} tenant - Tenant name
   */
  async deleteAllObjects(className, tenant) {
    try {
      if (!this.client) {
        await this.connect();
      }

      logger.warn(`Deleting all objects from ${className} (tenant: ${tenant})`);

      const collection = this.client.collections.get(className);
      await collection.withTenant(tenant).data.deleteMany({});

      logger.info('All objects deleted');
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete objects: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retry an operation with exponential backoff
   * @param {Function} operation - Async operation to retry
   * @param {number} attempt - Current attempt number
   */
  async retryOperation(operation, attempt = 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryAttempts) {
        logger.error(`Operation failed after ${this.retryAttempts} attempts`);
        throw error;
      }

      const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(`Operation failed (attempt ${attempt}/${this.retryAttempts}), retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryOperation(operation, attempt + 1);
    }
  }

  /**
   * Get schema information for a class
   * @param {string} className - Name of the class
   */
  async getSchema(className) {
    try {
      if (!this.client) {
        await this.connect();
      }

      // Use v3 API to check if collection exists
      const collection = this.client.collections.get(className);
      const exists = await collection.exists();

      if (!exists) {
        return { exists: false, class: className };
      }

      // Get collection config
      const config = await collection.config.get();

      return { 
        exists: true, 
        schema: {
          class: className,
          properties: config.properties || [],
          multiTenancyConfig: config.multiTenancyConfig || { enabled: false }
        }
      };
    } catch (error) {
      logger.error(`Failed to get schema: ${error.message}`);
      return { exists: false, class: className };
    }
  }

  /**
   * Close the connection
   */
  async disconnect() {
    if (this.client) {
      logger.info('Disconnecting from Weaviate');
      this.connected = false;
      this.client = null;
    }
  }
}

// Create singleton instance
const weaviateService = new WeaviateService();

module.exports = weaviateService;

