/**
 * DataStoreFactory.ts
 * 
 * This file provides a factory for creating data store instances based on
 * configuration. It encapsulates the logic for selecting and initializing
 * the appropriate storage implementation.
 */
import { DataStore } from '../interfaces/DataStore.js';
import { JsonFileDataStore } from './JsonFileDataStore.js';
import { SqliteDataStore } from './SqliteDataStore.js';

/**
 * Supported data store types
 */
export type DataStoreType = 'json' | 'sqlite';

/**
 * Configuration for data store creation
 */
export interface DataStoreConfig {
  type: DataStoreType;
  path: string;
}

/**
 * DataStoreFactory Class
 * 
 * Factory for creating and initializing data store instances.
 * Provides a centralized way to switch between storage implementations.
 */
export class DataStoreFactory {
  /**
   * Create a data store instance based on configuration
   * 
   * @param config Configuration specifying the store type and path
   * @returns Initialized DataStore instance
   */
  static async create(config: DataStoreConfig): Promise<DataStore> {
    let store: DataStore;

    switch (config.type) {
      case 'json':
        store = new JsonFileDataStore(config.path);
        break;
      case 'sqlite':
        store = new SqliteDataStore(config.path);
        break;
      default:
        throw new Error(`Unsupported data store type: ${config.type}`);
    }

    // Initialize the store
    await store.initialize();
    
    return store;
  }

  /**
   * Get the default file extension for a data store type
   * 
   * @param type The data store type
   * @returns The appropriate file extension
   */
  static getDefaultExtension(type: DataStoreType): string {
    switch (type) {
      case 'json':
        return '.json';
      case 'sqlite':
        return '.sqlite';
      default:
        throw new Error(`Unsupported data store type: ${type}`);
    }
  }

  /**
   * Validate that a data store type is supported
   * 
   * @param type The type to validate
   * @returns true if supported, false otherwise
   */
  static isSupported(type: string): type is DataStoreType {
    return ['json', 'sqlite'].includes(type);
  }
}