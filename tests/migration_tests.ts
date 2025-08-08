/**
 * migration_tests.ts
 * 
 * Tests for schema validation and error handling when encountering
 * incompatible database schemas.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'path';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import Database from 'better-sqlite3';
import { SqliteDataStore } from '../src/stores/SqliteDataStore.js';
import { TodoAssertions } from './test_framework.js';
import { IncompatibleSchemaException } from '../src/exceptions/DataStoreExceptions.js';

/**
 * Schema validation test utilities
 */
class SchemaTestUtils {
  /**
   * Create a database with old schema (without listId)
   */
  static async createOldSchemaDatabase(path: string): Promise<void> {
    const db = new Database(path);
    
    // Create old schema without listId
    db.exec(`
      CREATE TABLE todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        completedAt TEXT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
    
    // Insert some test data
    const stmt = db.prepare(`
      INSERT INTO todos (id, title, description, completedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    stmt.run('todo-1', 'Old Todo 1', 'Description 1', null, now, now);
    stmt.run('todo-2', 'Old Todo 2', 'Description 2', now, now, now); // completed
    stmt.run('todo-3', 'Old Todo 3', 'Description 3', null, now, now);
    
    db.close();
  }
  
  /**
   * Get a unique temporary database path
   */
  static getTempDbPath(): string {
    return join(tmpdir(), `schema-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.sqlite`);
  }
}

/**
 * Run schema validation tests
 */
export async function runMigrationTests(): Promise<void> {
  describe('Schema Validation Tests', () => {
    test('SQLite: Error on incompatible schema', async () => {
      const dbPath = SchemaTestUtils.getTempDbPath();
      
      try {
        // Create old schema database with data
        await SchemaTestUtils.createOldSchemaDatabase(dbPath);
        
        // Initialize new SqliteDataStore (should throw error due to incompatible schema)
        const store = new SqliteDataStore(dbPath);
        
        await assert.rejects(
          async () => {
            await store.initialize();
          },
          {
            name: 'IncompatibleSchemaException',
            message: /Incompatible database schema detected/
          },
          'Should throw IncompatibleSchemaException for incompatible schema'
        );
        
      } finally {
        // Cleanup
        try {
          await fs.unlink(dbPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    test('SQLite: Error message provides helpful guidance', async () => {
      const dbPath = SchemaTestUtils.getTempDbPath();
      
      try {
        // Create old schema
        await SchemaTestUtils.createOldSchemaDatabase(dbPath);
        
        // Try to initialize with incompatible schema
        const store = new SqliteDataStore(dbPath);
        
        try {
          await store.initialize();
          assert.fail('Should have thrown an IncompatibleSchemaException');
        } catch (error) {
          assert.ok(error instanceof IncompatibleSchemaException, 'Should throw an IncompatibleSchemaException');
          assert.ok(
            error.message.includes('Incompatible database schema detected'),
            'Error message should mention incompatible schema'
          );
          assert.ok(
            error.message.includes('listId'),
            'Error message should mention the missing listId column'
          );
          assert.ok(
            error.message.includes('new database file'),
            'Error message should suggest using a new database file'
          );
          
          // Test custom exception properties
          assert.equal(error.code, 'INCOMPATIBLE_SCHEMA', 'Should have correct error code');
          assert.equal(error.expectedSchema, 'todos table with listId column', 'Should have expected schema info');
          assert.ok(error.actualSchema?.includes('todos table with columns:'), 'Should have actual schema info');
        }
        
      } finally {
        try {
          await fs.unlink(dbPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    test('SQLite: No validation error for new database', async () => {
      const dbPath = SchemaTestUtils.getTempDbPath();
      
      try {
        // Initialize new database (no validation error expected)
        const store = new SqliteDataStore(dbPath);
        await store.initialize();
        
        try {
          // Should start with empty database
          const todoLists = await store.getAllTodoLists();
          const todos = await store.getAllTodos();
          
          TodoAssertions.assertArrayLength(todoLists, 0, 'New database should have no todo lists');
          TodoAssertions.assertArrayLength(todos, 0, 'New database should have no todos');
          
          // Should be able to create data normally
          const todoList = await store.createTodoList({
            id: 'test-list-1'
          });
          
          TodoAssertions.assertTodoList(todoList, {});
          
        } finally {
          await store.close();
        }
        
      } finally {
        try {
          await fs.unlink(dbPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
}

// Run schema validation tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrationTests().catch(error => {
    console.error('❌ Schema validation tests failed:', error);
    process.exit(1);
  });
}