/**
 * config.ts
 * 
 * This file manages the application configuration settings.
 * It provides a centralized place for all configuration values,
 * making them easier to change and maintain.
 * 
 * WHY A SEPARATE CONFIG FILE?
 * - Single source of truth for configuration values
 * - Easy to update settings without searching through the codebase
 * - Allows for environment-specific overrides
 * - Makes configuration values available throughout the application
 */
import path from 'path';
import os from 'os';
import fs from 'fs';
import { DataStoreType, DataStoreFactory } from './stores/DataStoreFactory.js';

/**
 * Data store configuration defaults
 * 
 * We use the user's home directory for data storage by default,
 * which provides several advantages:
 * - Works across different operating systems
 * - Available without special permissions
 * - Persists across application restarts
 * - Doesn't get deleted when updating the application
 */
const DEFAULT_DATA_FOLDER = path.join(os.homedir(), '.todo-list-mcp');
const DEFAULT_STORE_TYPE: DataStoreType = 'json'; // JSON is default for simplicity

/**
 * Application configuration object
 * 
 * This object provides access to all configuration settings.
 * It uses environment variables when available, falling back to defaults.
 * 
 * WHY USE ENVIRONMENT VARIABLES?
 * - Allows configuration without changing code
 * - Follows the 12-factor app methodology for configuration
 * - Enables different settings per environment (dev, test, prod)
 * - Keeps sensitive information out of the code
 */
export const config = {
  dataStore: {
    // Allow overriding through environment variables
    type: (process.env.TODO_STORE_TYPE as DataStoreType) || DEFAULT_STORE_TYPE,
    folder: process.env.TODO_DATA_FOLDER || DEFAULT_DATA_FOLDER,
    
    /**
     * Full path to the data file
     * 
     * This getter computes the complete path dynamically,
     * including the appropriate file extension for the store type.
     */
    get path() {
      const extension = DataStoreFactory.getDefaultExtension(this.type);
      return path.join(this.folder, `todos${extension}`);
    }
  }
};

/**
 * Ensure the data folder exists
 * 
 * This utility function makes sure the folder for the data file exists,
 * creating it if necessary. This prevents errors when trying to open the
 * data file in a non-existent directory.
 */
export function ensureDataFolder() {
  if (!fs.existsSync(config.dataStore.folder)) {
    fs.mkdirSync(config.dataStore.folder, { recursive: true });
  }
}

/**
 * Validate configuration
 * 
 * Ensures that the configuration is valid and supported.
 */
export function validateConfig(): void {
  if (!DataStoreFactory.isSupported(config.dataStore.type)) {
    throw new Error(`Unsupported data store type: ${config.dataStore.type}. Supported types: json, sqlite`);
  }
} 