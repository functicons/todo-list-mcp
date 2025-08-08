/**
 * integration_tests.ts
 * 
 * Main integration test runner that tests both JSON and SQLite data stores
 * with comprehensive assertions and edge cases.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TestUtils, TodoAssertions, runDataStoreTests } from './test_framework.js';

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
        const todoList = TestUtils.createSampleTodoList({ 
          name: 'Compatibility Test',
          description: 'Testing cross-store compatibility'
        });
        
        const jsonCreated = await jsonStore.createTodoList(todoList);
        const sqliteCreated = await sqliteStore.createTodoList(todoList);
        
        // Both should have same structure (except timestamps might differ slightly)
        assert.equal(jsonCreated.id, sqliteCreated.id);
        assert.equal(jsonCreated.name, sqliteCreated.name);
        assert.equal(jsonCreated.description, sqliteCreated.description);
        
        // Test todo operations
        const todo = TestUtils.createSampleTodo(todoList.id, {
          title: 'Cross-store todo',
          description: 'Testing cross-store todo compatibility'
        });
        
        const jsonTodo = await jsonStore.createTodo(todo);
        const sqliteTodo = await sqliteStore.createTodo(todo);
        
        assert.equal(jsonTodo.id, sqliteTodo.id);
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
        const updated = await store.updateTodoList('non-existent-id', { name: 'New Name' });
        assert.equal(updated, undefined);
        
        // Try to delete non-existent todo list
        const deleted = await store.deleteTodoList('non-existent-id');
        assert.equal(deleted, false);
        
        // Try to get non-existent todo
        const todo = await store.getTodo('non-existent-id');
        assert.equal(todo, undefined);
        
        // Try to complete non-existent todo
        const completed = await store.completeTodo('non-existent-id');
        assert.equal(completed, undefined);
        
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
          const todo = TestUtils.createSampleTodo(todoList.id, { 
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
            listId: todoList.id 
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

  describe('Data Integrity Tests', () => {
    test('Timestamps are properly maintained', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        const created = await store.createTodoList(todoList);
        
        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const updated = await store.updateTodoList(created.id, { 
          description: 'Updated description' 
        });
        
        assert.ok(updated);
        assert.equal(updated.createdAt, created.createdAt, 'CreatedAt should not change on update');
        assert.notEqual(updated.updatedAt, created.updatedAt, 'UpdatedAt should change on update');
        
        const updatedTime = new Date(updated.updatedAt).getTime();
        const createdTime = new Date(created.createdAt).getTime();
        assert.ok(updatedTime >= createdTime, 'UpdatedAt should be >= createdAt');
        
      } finally {
        await store.close();
      }
    });

    test('Todo completion properly sets timestamps', async () => {
      const store = await TestUtils.createJsonStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const todo = TestUtils.createSampleTodo(todoList.id);
        const created = await store.createTodo(todo);
        
        TodoAssertions.assertTodoNotCompleted(created);
        
        const completed = await store.completeTodo(created.id);
        assert.ok(completed);
        
        TodoAssertions.assertTodoCompleted(completed);
        
        // CompletedAt should be after createdAt
        const completedTime = new Date(completed.completedAt!).getTime();
        const createdTime = new Date(completed.createdAt).getTime();
        assert.ok(completedTime >= createdTime, 'CompletedAt should be >= createdAt');
        
      } finally {
        await store.close();
      }
    });

    test('Search operations are case-insensitive and partial match', async () => {
      const store = await TestUtils.createSqliteStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, { 
          title: 'Learn TypeScript Programming' 
        }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, { 
          title: 'typescript tutorial' 
        }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, { 
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