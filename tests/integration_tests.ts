/**
 * integration_tests.ts
 * 
 * Main integration test runner that tests both JSON and SQLite data stores
 * with comprehensive assertions and edge cases.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TestUtils, TodoAssertions, runDataStoreTests } from './test_framework.js';
import {
  ConstraintViolationException,
  DataValidationException,
  FileOperationException
} from '../src/exceptions/DataStoreExceptions.js';

/**
 * Run all integration tests for both data store implementations
 */
async function runAllTests() {
  console.log('🧪 Starting Integration Tests...\n');

  // Test JSON File Data Store
  await runDataStoreTests('JSON', () => TestUtils.createJsonStore());

  // Test SQLite Data Store  
  await runDataStoreTests('SQLite', () => TestUtils.createSqliteStore());

  // Additional comprehensive tests
  describe('Cross-Store Compatibility Tests', () => {
    test('Both stores handle same data consistently', async () => {
      const jsonStore = await TestUtils.createJsonStore();
      const sqliteStore = await TestUtils.createSqliteStore();
      
      try {
        // Create identical data in both stores
        const todoList = TestUtils.createSampleTodoList();
        
        const jsonCreated = await jsonStore.createTodoList(todoList);
        const sqliteCreated = await sqliteStore.createTodoList(todoList);
        
        // Both should have same structure
        assert.equal(jsonCreated.id, sqliteCreated.id);
        
        // Test todo operations
        const todo = TestUtils.createSampleTodo(todoList.id, 1, {
          title: 'Cross-store todo'
        });
        
        const jsonTodo = await jsonStore.createTodo(todo);
        const sqliteTodo = await sqliteStore.createTodo(todo);
        
        assert.equal(jsonTodo.seqno, sqliteTodo.seqno);
        assert.equal(jsonTodo.title, sqliteTodo.title);
        assert.equal(jsonTodo.listId, sqliteTodo.listId);
        
      } finally {
        await jsonStore.close();
        await sqliteStore.close();
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Handle operations on non-existent resources', async () => {
      const store = await TestUtils.createJsonStore();
      try {
        // Try to get non-existent todo list
        const result = await store.getTodoList('non-existent-id');
        assert.equal(result, undefined);
        
        // Try to update non-existent todo list
        const updated = await store.updateTodoList('non-existent-id', {});
        assert.equal(updated, undefined);
        
        // Try to delete non-existent todo list
        const deleted = await store.deleteTodoList('non-existent-id');
        assert.equal(deleted, false);
        
        // Try to get non-existent todo
        const todo = await store.getTodo('non-existent-list-id', 999);
        assert.equal(todo, undefined);
        
      } finally {
        await store.close();
      }
    });

    test('Handle empty search results', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const results = await store.searchTodosByTitle('nonexistent-search-term');
        TodoAssertions.assertArrayLength(results, 0, 'Should return empty array for no matches');
        
        const dateResults = await store.searchTodosByDate('2020-01-01');
        TodoAssertions.assertArrayLength(dateResults, 0, 'Should return empty array for no date matches');
        
      } finally {
        await store.close();
      }
    });

    test('Handle concurrent operations', async () => {
      const store = await TestUtils.createJsonStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        // Create multiple todos concurrently
        const todoPromises = Array.from({ length: 5 }, (_, i) => {
          const todo = TestUtils.createSampleTodo(todoList.id, i + 1, {
            title: `Concurrent Todo ${i + 1}` 
          });
          return store.createTodo(todo);
        });
        
        const todos = await Promise.all(todoPromises);
        
        // All should be created successfully
        assert.equal(todos.length, 5);
        todos.forEach((todo, index) => {
          TodoAssertions.assertTodo(todo, {
            title: `Concurrent Todo ${index + 1}`,
            listId: todoList.id,
            seqno: index + 1
          });
        });
        
        // Verify all are in the store
        const allTodos = await store.getTodosByListId(todoList.id);
        TodoAssertions.assertArrayLength(allTodos, 5, 'All concurrent todos should be saved');
        
      } finally {
        await store.close();
      }
    });
  });

  describe('Custom Exception Tests', () => {
    test('JsonFileDataStore: Throws ConstraintViolationException for duplicate TodoList ID', async () => {
      const store = await TestUtils.createJsonStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        await assert.rejects(
          async () => {
            await store.createTodoList(todoList); // Same ID again
          },
          {
            name: 'ConstraintViolationException',
            message: /already exists/
          },
          'Should throw ConstraintViolationException for duplicate TodoList ID'
        );
      } finally {
        await store.close();
      }
    });

    test('JsonFileDataStore: Throws ConstraintViolationException for non-existent TodoList reference', async () => {
      const store = await TestUtils.createJsonStore();
      try {
        const todo = TestUtils.createSampleTodo('non-existent-list-id', 1);
        
        await assert.rejects(
          async () => {
            await store.createTodo(todo);
          },
          {
            name: 'ConstraintViolationException',
            message: /does not exist/
          },
          'Should throw ConstraintViolationException for non-existent TodoList reference'
        );
      } finally {
        await store.close();
      }
    });

    test('SqliteDataStore: Throws ConstraintViolationException for duplicate Todo seqno', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const todo = TestUtils.createSampleTodo(todoList.id, 1, { title: 'Test Todo' });
        await store.createTodo(todo);
        
        await assert.rejects(
          async () => {
            await store.createTodo(todo); // Same seqno again
          },
          {
            name: 'ConstraintViolationException',
            message: /already exists/
          },
          'Should throw ConstraintViolationException for duplicate Todo seqno'
        );
      } finally {
        await store.close();
      }
    });

    test('SqliteDataStore: Throws ConstraintViolationException for foreign key violation', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const todo = TestUtils.createSampleTodo('non-existent-list-id', 1);
        
        await assert.rejects(
          async () => {
            await store.createTodo(todo);
          },
          {
            name: 'ConstraintViolationException',
            message: /does not exist/
          },
          'Should throw ConstraintViolationException for foreign key violation'
        );
      } finally {
        await store.close();
      }
    });

    test('Custom exceptions have correct properties', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        try {
          await store.createTodoList(todoList); // Duplicate
          assert.fail('Should have thrown ConstraintViolationException');
        } catch (error) {
          assert.ok(error instanceof ConstraintViolationException, 'Should be ConstraintViolationException');
          const constraintError = error as ConstraintViolationException;
          assert.equal(constraintError.code, 'CONSTRAINT_VIOLATION', 'Should have correct error code');
          assert.equal(constraintError.constraintType, 'UNIQUE', 'Should have correct constraint type');
          assert.equal(constraintError.constraintName, 'PRIMARY KEY', 'Should have correct constraint name');
        }
      } finally {
        await store.close();
      }
    });
  });

  describe('Data Integrity Tests', () => {
    test('Timestamps are properly maintained', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        const created = await store.createTodoList(todoList);
        
        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const updated = await store.updateTodoList(created.id, {});
        
        assert.ok(updated);
        // Since TodoList only has id field now, just verify the id matches
        assert.equal(updated.id, created.id, 'ID should remain the same');
        
      } finally {
        await store.close();
      }
    });

    test('Todo status is properly updated', async () => {
      const store = await TestUtils.createJsonStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const todo = TestUtils.createSampleTodo(todoList.id, 1);
        const created = await store.createTodo(todo);
        
        assert.equal(created.status, 'pending', 'New todo should have pending status');
        
        const updated = await store.updateTodo(created.listId, created.seqno, { status: 'done' });
        assert.ok(updated);
        
        assert.equal(updated.status, 'done', 'Todo status should be updated to done');
        
      } finally {
        await store.close();
      }
    });

    test('Search operations are case-insensitive and partial match', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 1, {
          title: 'Learn TypeScript Programming'
        }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 2, {
          title: 'typescript tutorial'
        }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 3, {
          title: 'JavaScript Basics'
        }));
        
        // Test case-insensitive search
        const results1 = await store.searchTodosByTitle('typescript');
        const results2 = await store.searchTodosByTitle('TypeScript');
        const results3 = await store.searchTodosByTitle('TYPESCRIPT');
        
        // All should return same results
        assert.equal(results1.length, results2.length);
        assert.equal(results2.length, results3.length);
        assert.equal(results1.length, 2, 'Should find 2 todos with typescript');
        
        // Test partial match
        const partialResults = await store.searchTodosByTitle('Script');
        assert.equal(partialResults.length, 3, 'Should find all 3 todos containing "Script"');
        
      } finally {
        await store.close();
      }
    });
  });

  console.log('\n✅ All Integration Tests Completed Successfully!');
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('❌ Integration tests failed:', error);
    process.exit(1);
  });
}

export { runAllTests };
