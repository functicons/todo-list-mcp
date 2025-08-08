/**
 * test_framework.ts
 * 
 * Integration test framework for testing data store implementations
 * with comprehensive assertions and error handling.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DataStore } from '../src/interfaces/DataStore.js';
import { JsonFileDataStore } from '../src/stores/JsonFileDataStore.js';
import { SqliteDataStore } from '../src/stores/SqliteDataStore.js';
import { createTodoList } from '../src/models/TodoList.js';
import { createTodo, CreateTodoSchema } from '../src/models/Todo.js';
import { z } from 'zod';

/**
 * Test utilities for creating and managing test data stores
 */
export class TestUtils {
  private static testCounter = 0;

  /**
   * Create a unique temporary file path for testing
   */
  static getTempPath(extension: string): string {
    return join(tmpdir(), `todo-test-${Date.now()}-${++this.testCounter}${extension}`);
  }

  /**
   * Create and initialize a JSON data store for testing
   */
  static async createJsonStore(): Promise<JsonFileDataStore> {
    const path = this.getTempPath('.json');
    const store = new JsonFileDataStore(path);
    await store.initialize();
    return store;
  }

  /**
   * Create and initialize a SQLite data store for testing
   */
  static async createSqliteStore(): Promise<SqliteDataStore> {
    const path = this.getTempPath('.sqlite');
    const store = new SqliteDataStore(path);
    await store.initialize();
    return store;
  }

  /**
   * Clean up a data store and its files
   */
  static async cleanup(store: DataStore, filePath?: string): Promise<void> {
    try {
      await store.close();
      if (filePath) {
        await fs.unlink(filePath).catch(() => {}); // Ignore errors if file doesn't exist
      }
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  }

  /**
   * Create sample todo list data
   */
  static createSampleTodoList(overrides: Partial<Parameters<typeof createTodoList>[0]> = {}) {
    return createTodoList({
      name: 'Test List',
      description: 'A test todo list',
      ...overrides
    });
  }

  /**
   * Create sample todo data
   */
  static createSampleTodo(listId: string, seqno: number, overrides: Partial<Omit<z.infer<typeof CreateTodoSchema>, 'listId'> > = {}) {
    return createTodo({
      listId,
      title: 'Test Todo',
      description: 'A test todo item',
      ...overrides
    }, seqno);
  }
}

/**
 * Custom assertions for todo-specific testing
 */
export class TodoAssertions {
  /**
   * Assert that a todo list has the expected properties
   */
  static assertTodoList(actual: any, expected: Partial<any>) {
    assert.ok(actual, 'TodoList should exist');
    assert.equal(typeof actual.id, 'string', 'TodoList should have string id');
    assert.ok(actual.id.length > 0, 'TodoList id should not be empty');
    
    if (expected.name) {
      assert.equal(actual.name, expected.name, 'TodoList name should match');
    }
    if (expected.description) {
      assert.equal(actual.description, expected.description, 'TodoList description should match');
    }
    
    assert.equal(typeof actual.createdAt, 'string', 'TodoList should have createdAt timestamp');
    assert.equal(typeof actual.updatedAt, 'string', 'TodoList should have updatedAt timestamp');
    assert.ok(new Date(actual.createdAt).getTime() > 0, 'TodoList createdAt should be valid date');
    assert.ok(new Date(actual.updatedAt).getTime() > 0, 'TodoList updatedAt should be valid date');
  }

  /**
   * Assert that a todo has the expected properties
   */
  static assertTodo(actual: any, expected: Partial<any>) {
    assert.ok(actual, 'Todo should exist');
    assert.equal(typeof actual.listId, 'string', 'Todo should have string listId');
    assert.ok(actual.listId.length > 0, 'Todo listId should not be empty');
    assert.equal(typeof actual.seqno, 'number', 'Todo should have number seqno');
    assert.ok(actual.seqno > 0, 'Todo seqno should be a positive integer');

    if (expected.title) {
      assert.equal(actual.title, expected.title, 'Todo title should match');
    }
    if (expected.description) {
      assert.equal(actual.description, expected.description, 'Todo description should match');
    }
    if (expected.listId) {
      assert.equal(actual.listId, expected.listId, 'Todo listId should match');
    }
    if (expected.seqno) {
      assert.equal(actual.seqno, expected.seqno, 'Todo seqno should match');
    }
    
    assert.equal(typeof actual.completed, 'boolean', 'Todo should have boolean completed');
    assert.ok(actual.completedAt === null || typeof actual.completedAt === 'string', 'Todo completedAt should be null or string');
    assert.equal(actual.completed, actual.completedAt !== null, 'Todo completed should match completedAt state');
    
    assert.equal(typeof actual.createdAt, 'string', 'Todo should have createdAt timestamp');
    assert.equal(typeof actual.updatedAt, 'string', 'Todo should have updatedAt timestamp');
    assert.ok(new Date(actual.createdAt).getTime() > 0, 'Todo createdAt should be valid date');
    assert.ok(new Date(actual.updatedAt).getTime() > 0, 'Todo updatedAt should be valid date');
  }

  /**
   * Assert that an array contains the expected number of items
   */
  static assertArrayLength(actual: any[], expectedLength: number, message?: string) {
    assert.equal(Array.isArray(actual), true, 'Should be an array');
    assert.equal(actual.length, expectedLength, message || `Array should have ${expectedLength} items`);
  }

  /**
   * Assert that a todo is completed
   */
  static assertTodoCompleted(todo: any) {
    assert.equal(todo.completed, true, 'Todo should be completed');
    assert.ok(todo.completedAt, 'Todo should have completedAt timestamp');
    assert.equal(typeof todo.completedAt, 'string', 'Todo completedAt should be string');
    assert.ok(new Date(todo.completedAt).getTime() > 0, 'Todo completedAt should be valid date');
  }

  /**
   * Assert that a todo is not completed
   */
  static assertTodoNotCompleted(todo: any) {
    assert.equal(todo.completed, false, 'Todo should not be completed');
    assert.equal(todo.completedAt, null, 'Todo should not have completedAt timestamp');
  }
}

/**
 * Run tests on a specific data store implementation
 */
export async function runDataStoreTests(storeName: string, createStore: () => Promise<DataStore>): Promise<void> {
  describe(`${storeName} Data Store Integration Tests`, () => {
    // TodoList CRUD Tests
    test(`${storeName}: Create TodoList`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList({ name: 'Integration Test List' });
        const created = await store.createTodoList(todoList);
        
        TodoAssertions.assertTodoList(created, { name: 'Integration Test List' });
        assert.equal(created.id, todoList.id, 'Created TodoList should have same id');
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Get TodoList`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList({ name: 'Get Test List' });
        await store.createTodoList(todoList);
        
        const retrieved = await store.getTodoList(todoList.id);
        TodoAssertions.assertTodoList(retrieved!, { name: 'Get Test List' });
        assert.equal(retrieved!.id, todoList.id);
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Get non-existent TodoList`, async () => {
      const store = await createStore();
      try {
        const result = await store.getTodoList('non-existent-id');
        assert.equal(result, undefined, 'Should return undefined for non-existent TodoList');
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Update TodoList`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList({ name: 'Original Name' });
        await store.createTodoList(todoList);
        
        const updated = await store.updateTodoList(todoList.id, {
          name: 'Updated Name',
          description: 'Updated description'
        });
        
        TodoAssertions.assertTodoList(updated!, { name: 'Updated Name', description: 'Updated description' });
        assert.notEqual(updated!.updatedAt, todoList.updatedAt, 'UpdatedAt should change');
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Delete TodoList`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const deleted = await store.deleteTodoList(todoList.id);
        assert.equal(deleted, true, 'Should return true when TodoList is deleted');
        
        const retrieved = await store.getTodoList(todoList.id);
        assert.equal(retrieved, undefined, 'Deleted TodoList should not be retrievable');
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Delete TodoList cascades to Todos`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const todo = TestUtils.createSampleTodo(todoList.id, 1);
        await store.createTodo(todo);
        
        await store.deleteTodoList(todoList.id);
        
        const retrievedTodo = await store.getTodo(todo.listId, todo.seqno);
        assert.equal(retrievedTodo, undefined, 'Todo should be deleted when TodoList is deleted');
      } finally {
        await store.close();
      }
    });

    // Todo CRUD Tests
    test(`${storeName}: Create Todo`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const todo = TestUtils.createSampleTodo(todoList.id, 1, { title: 'Integration Test Todo' });
        const created = await store.createTodo(todo);
        
        TodoAssertions.assertTodo(created, { title: 'Integration Test Todo', listId: todoList.id, seqno: 1 });
        TodoAssertions.assertTodoNotCompleted(created);
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Complete Todo`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const todo = TestUtils.createSampleTodo(todoList.id, 1);
        await store.createTodo(todo);
        
        const completed = await store.completeTodo(todo.listId, todo.seqno);
        TodoAssertions.assertTodo(completed!, { listId: todoList.id, seqno: 1 });
        TodoAssertions.assertTodoCompleted(completed!);
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Search Todos by Title`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 1, { title: 'Learn TypeScript' }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 2, { title: 'Learn JavaScript' }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 3, { title: 'Practice Piano' }));
        
        const results = await store.searchTodosByTitle('Learn');
        TodoAssertions.assertArrayLength(results, 2, 'Should find 2 todos containing "Learn"');
        
        results.forEach(todo => {
          assert.ok(todo.title.includes('Learn'), 'Each result should contain "Learn"');
        });
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Get Todos by List ID`, async () => {
      const store = await createStore();
      try {
        const todoList1 = TestUtils.createSampleTodoList({ name: 'List 1' });
        const todoList2 = TestUtils.createSampleTodoList({ name: 'List 2' });
        await store.createTodoList(todoList1);
        await store.createTodoList(todoList2);
        
        await store.createTodo(TestUtils.createSampleTodo(todoList1.id, 1, { title: 'Todo 1' }));
        await store.createTodo(TestUtils.createSampleTodo(todoList1.id, 2, { title: 'Todo 2' }));
        await store.createTodo(TestUtils.createSampleTodo(todoList2.id, 1, { title: 'Todo 3' }));
        
        const list1Todos = await store.getTodosByListId(todoList1.id);
        const list2Todos = await store.getTodosByListId(todoList2.id);
        
        TodoAssertions.assertArrayLength(list1Todos, 2, 'List 1 should have 2 todos');
        TodoAssertions.assertArrayLength(list2Todos, 1, 'List 2 should have 1 todo');
        
        list1Todos.forEach(todo => {
          assert.equal(todo.listId, todoList1.id, 'Todo should belong to List 1');
        });
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Get Todos by List ID should return todos ordered by seqno`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        // Create todos with seqno in non-sequential order
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 3, { title: 'Todo 3' }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 1, { title: 'Todo 1' }));
        await store.createTodo(TestUtils.createSampleTodo(todoList.id, 2, { title: 'Todo 2' }));
        
        const todos = await store.getTodosByListId(todoList.id);
        
        TodoAssertions.assertArrayLength(todos, 3, 'Should have 3 todos');
        assert.equal(todos[0].seqno, 1, 'First todo should have seqno 1');
        assert.equal(todos[1].seqno, 2, 'Second todo should have seqno 2');
        assert.equal(todos[2].seqno, 3, 'Third todo should have seqno 3');
      } finally {
        await store.close();
      }
    });

    test(`${storeName}: Get Active Todos`, async () => {
      const store = await createStore();
      try {
        const todoList = TestUtils.createSampleTodoList();
        await store.createTodoList(todoList);
        
        const todo1 = TestUtils.createSampleTodo(todoList.id, 1, { title: 'Active Todo' });
        const todo2 = TestUtils.createSampleTodo(todoList.id, 2, { title: 'Completed Todo' });
        
        await store.createTodo(todo1);
        await store.createTodo(todo2);
        await store.completeTodo(todo2.listId, todo2.seqno); // Complete one todo
        
        const activeTodos = await store.getActiveTodos();
        TodoAssertions.assertArrayLength(activeTodos, 1, 'Should have 1 active todo');
        assert.equal(activeTodos[0].title, 'Active Todo');
        TodoAssertions.assertTodoNotCompleted(activeTodos[0]);
      } finally {
        await store.close();
      }
    });
  });
}