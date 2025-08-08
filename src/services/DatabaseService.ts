/**
 * DatabaseService.ts
 * 
 * This file implements a lightweight SQLite database service for the Todo application.
 * 
 * WHY SQLITE?
 * - SQLite is perfect for small to medium applications like this one
 * - Requires no separate database server (file-based)
 * - ACID compliant and reliable
 * - Minimal configuration required
 * - Easy to install with minimal dependencies
 */
import Database from 'better-sqlite3';
import { config, ensureDataFolder } from '../config.js';

/**
 * DatabaseService Class
 * 
 * This service manages the SQLite database connection and schema.
 * It follows the singleton pattern to ensure only one database connection exists.
 * 
 * WHY SINGLETON PATTERN?
 * - Prevents multiple database connections which could lead to conflicts
 * - Provides a central access point to the database throughout the application
 * - Makes it easier to manage connection lifecycle (open/close)
 */
class DatabaseService {
  private db: Database.Database;

  constructor() {
    // Ensure the database folder exists before trying to create the database
    ensureDataFolder();
    
    // Initialize the database with the configured path  
    this.db = new Database(config.dataStore.path);
    
    /**
     * Set pragmas for performance and safety:
     * - WAL (Write-Ahead Logging): Improves concurrent access performance
     * - foreign_keys: Ensures referential integrity (useful for future expansion)
     */
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Initialize the database schema when service is created
    this.initSchema();
  }

  /**
   * Initialize the database schema
   * 
   * This creates the todo_lists and todos tables if they don't already exist.
   * The schema design incorporates:
   * - TEXT primary key for UUID compatibility
   * - Foreign key relationship between todos and todo_lists
   * - NULL completedAt to represent incomplete todos
   * - Timestamp fields for tracking creation and updates
   */
  private initSchema(): void {
    // Check if we need to migrate from the old schema
    this.migrateSchema();

    // Create todo_lists table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todo_lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create todos table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        listId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        completedAt TEXT NULL, -- ISO timestamp, NULL if not completed
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (listId) REFERENCES todo_lists (id) ON DELETE CASCADE
      )
    `);

    // Create index on listId for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_listId ON todos(listId)
    `);
  }

  /**
   * Migrate from old schema to new schema
   * 
   * This handles the transition from single todo list to multiple todo lists.
   * If the old todos table exists without listId, we'll migrate the data.
   */
  private migrateSchema(): void {
    try {
      // Check if the old schema exists (todos table without listId column)
      const tableInfo = this.db.prepare("PRAGMA table_info(todos)").all() as any[];
      
      if (tableInfo.length > 0) {
        // Check if listId column exists
        const hasListId = tableInfo.some((column: any) => column.name === 'listId');
        
        if (!hasListId) {
          console.error('Migrating from old schema to new schema...');
          
          // Create a default todo list for existing todos
          const defaultListId = 'default-list-' + new Date().getTime();
          const now = new Date().toISOString();
          
          // Create todo_lists table first
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS todo_lists (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT NOT NULL,
              createdAt TEXT NOT NULL,
              updatedAt TEXT NOT NULL
            )
          `);
          
          // Insert default todo list
          const insertDefaultList = this.db.prepare(`
            INSERT INTO todo_lists (id, name, description, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertDefaultList.run(defaultListId, 'Default List', 'Migrated from single list', now, now);
          
          // Rename old todos table
          this.db.exec('ALTER TABLE todos RENAME TO todos_old');
          
          // Create new todos table with listId
          this.db.exec(`
            CREATE TABLE todos (
              id TEXT PRIMARY KEY,
              listId TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              completedAt TEXT NULL,
              createdAt TEXT NOT NULL,
              updatedAt TEXT NOT NULL,
              FOREIGN KEY (listId) REFERENCES todo_lists (id) ON DELETE CASCADE
            )
          `);
          
          // Migrate data from old table to new table
          this.db.exec(`
            INSERT INTO todos (id, listId, title, description, completedAt, createdAt, updatedAt)
            SELECT id, '${defaultListId}', title, description, completedAt, createdAt, updatedAt
            FROM todos_old
          `);
          
          // Drop old table
          this.db.exec('DROP TABLE todos_old');
          
          console.error(`Migration completed. Created default list with ID: ${defaultListId}`);
        }
      }
    } catch (error) {
      // If there's any error during migration, it's likely that the tables don't exist yet
      // which is fine for new installations
    }
  }

  /**
   * Get the database instance
   * 
   * This allows other services to access the database for operations.
   * 
   * @returns The SQLite database instance
   */
  getDb(): Database.Database {
    return this.db;
  }

  /**
   * Close the database connection
   * 
   * This should be called when shutting down the application to ensure
   * all data is properly saved and resources are released.
   */
  close(): void {
    this.db.close();
  }
}

// Create a singleton instance that will be used throughout the application
export const databaseService = new DatabaseService(); 