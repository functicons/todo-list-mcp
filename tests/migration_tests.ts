/**
 * migration_tests.ts
 * 
 * Tests for data migration from old SQLite schema to new schema
 * and compatibility between different storage formats.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'path';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import Database from 'better-sqlite3';
import { SqliteDataStore } from '../src/stores/SqliteDataStore.js';
import { TodoAssertions } from './test_framework.js';

/**
 * Migration test utilities
 */
class MigrationTestUtils {
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
    return join(tmpdir(), `migration-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.sqlite`);
  }
}

/**
 * Run migration tests
 */
export async function runMigrationTests(): Promise<void> {
  describe('Data Migration Tests', () => {
    test('SQLite: Migrate from old schema to new schema', async () => {
      const dbPath = MigrationTestUtils.getTempDbPath();
      
      try {
        // Create old schema database with data
        await MigrationTestUtils.createOldSchemaDatabase(dbPath);
        
        // Initialize new SqliteDataStore (should trigger migration)
        const store = new SqliteDataStore(dbPath);
        await store.initialize();
        
        try {
          // Verify that migration created default todo list
          const todoLists = await store.getAllTodoLists();
          TodoAssertions.assertArrayLength(todoLists, 1, 'Should have 1 default todo list after migration');
          
          const defaultList = todoLists[0];
          assert.equal(defaultList.name, 'Default List', 'Should have default list name');
          assert.equal(defaultList.description, 'Migrated from single list', 'Should have migration description');
          
          // Verify that old todos were migrated with listId
          const todos = await store.getAllTodos();
          TodoAssertions.assertArrayLength(todos, 3, 'Should have 3 migrated todos');
          
          todos.forEach(todo => {
            assert.equal(todo.listId, defaultList.id, 'Migrated todo should have default list ID');
            TodoAssertions.assertTodo(todo, { listId: defaultList.id });
          });
          
          // Verify specific migrated data
          const todo1 = todos.find(t => t.title === 'Old Todo 1');
          const todo2 = todos.find(t => t.title === 'Old Todo 2');
          const todo3 = todos.find(t => t.title === 'Old Todo 3');
          
          assert.ok(todo1, 'Should find migrated todo 1');
          assert.ok(todo2, 'Should find migrated todo 2');
          assert.ok(todo3, 'Should find migrated todo 3');
          
          // Check completion status is preserved
          TodoAssertions.assertTodoNotCompleted(todo1!);
          TodoAssertions.assertTodoCompleted(todo2!);
          TodoAssertions.assertTodoNotCompleted(todo3!);
          
          // Verify new operations work after migration
          const newTodo = await store.createTodo({
            id: 'new-todo-1',
            listId: defaultList.id,
            title: 'New Todo After Migration',
            description: 'This todo was created after migration',
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          TodoAssertions.assertTodo(newTodo, { 
            title: 'New Todo After Migration',
            listId: defaultList.id 
          });
          
        } finally {
          await store.close();
        }
        
      } finally {
        // Cleanup
        try {
          await fs.unlink(dbPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    test('SQLite: Migration is idempotent', async () => {
      const dbPath = MigrationTestUtils.getTempDbPath();
      
      try {
        // Create old schema
        await MigrationTestUtils.createOldSchemaDatabase(dbPath);
        
        // Run migration first time
        const store1 = new SqliteDataStore(dbPath);
        await store1.initialize();
        const todosAfterFirstMigration = await store1.getAllTodos();
        const listsAfterFirstMigration = await store1.getAllTodoLists();
        await store1.close();
        
        // Run migration second time (should be no-op)
        const store2 = new SqliteDataStore(dbPath);
        await store2.initialize();
        const todosAfterSecondMigration = await store2.getAllTodos();
        const listsAfterSecondMigration = await store2.getAllTodoLists();
        await store2.close();
        
        // Should have same data
        assert.equal(todosAfterFirstMigration.length, todosAfterSecondMigration.length, 
          'Todo count should be same after repeated migration');
        assert.equal(listsAfterFirstMigration.length, listsAfterSecondMigration.length, 
          'TodoList count should be same after repeated migration');
        
        // Verify specific data matches
        assert.equal(listsAfterFirstMigration[0].id, listsAfterSecondMigration[0].id, 
          'Default list ID should be same');
        
      } finally {
        try {
          await fs.unlink(dbPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    test('SQLite: No migration needed for new database', async () => {
      const dbPath = MigrationTestUtils.getTempDbPath();
      
      try {
        // Initialize new database (no migration needed)
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
            id: 'test-list-1',
            name: 'Test List',
            description: 'Test description',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          TodoAssertions.assertTodoList(todoList, { name: 'Test List' });
          
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

// Run migration tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrationTests().catch(error => {
    console.error('❌ Migration tests failed:', error);
    process.exit(1);
  });
}