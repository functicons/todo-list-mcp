/**
 * DataService.ts
 * 
 * This service provides a centralized interface to the data store.
 * It abstracts the underlying storage implementation and provides
 * a single point of access for all data operations.
 */
import { DataStore } from '../interfaces/DataStore.js';
import { DataStoreFactory } from '../stores/DataStoreFactory.js';
import { config, ensureDataFolder, validateConfig } from '../config.js';

/**
 * DataService Class
 * 
 * Singleton service that manages the data store instance and provides
 * access to data operations throughout the application.
 */
class DataService {
  private store: DataStore | null = null;

  /**
   * Initialize the data service
   * Creates and initializes the configured data store
   */
  async initialize(): Promise<void> {
    // Validate configuration first
    validateConfig();
    
    // Ensure data directory exists
    ensureDataFolder();

    // Create the appropriate data store
    this.store = await DataStoreFactory.create({
      type: config.dataStore.type,
      path: config.dataStore.path
    });

    console.error(`Data store initialized: ${config.dataStore.type} at ${config.dataStore.path}`);
  }

  /**
   * Get the data store instance
   * Ensures the service has been initialized before use
   */
  getStore(): DataStore {
    if (!this.store) {
      throw new Error('DataService not initialized. Call initialize() first.');
    }
    return this.store;
  }

  /**
   * Close the data service
   * Properly shuts down the data store
   */
  async close(): Promise<void> {
    if (this.store) {
      await this.store.close();
      this.store = null;
    }
  }
}

// Create a singleton instance
export const dataService = new DataService();