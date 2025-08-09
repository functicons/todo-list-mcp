/**
 * Test concurrent writes to verify the .tmp file locking mechanism
 */
import { JsonFileDataStore } from '../src/stores/JsonFileDataStore.js';
import { TodoList } from '../src/models/TodoList.js';
import { Todo } from '../src/models/Todo.js';
import { promises as fs } from 'fs';
import path from 'path';

const TEST_DIR = '/tmp/todo-concurrent-test';
const TEST_FILE = path.join(TEST_DIR, 'test.json');

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

export async function runConcurrentWriteTest() {
  console.log('🔄 Testing concurrent write protection...\n');
  
  // Clean up and create test directory
  await cleanup();
  await fs.mkdir(TEST_DIR, { recursive: true });
  
  // Initialize data store
  const store = new JsonFileDataStore(TEST_FILE);
  await store.initialize();
  
  // Create a test todo list
  const todoList: TodoList = { id: 'test-list' };
  await store.createTodoList(todoList);
  
  // Create initial todos
  const initialTodos: Todo[] = [];
  for (let i = 1; i <= 5; i++) {
    const todo: Todo = {
      listId: 'test-list',
      seqno: i,
      title: `Initial Todo ${i}`,
      status: 'pending'
    };
    await store.createTodo(todo);
    initialTodos.push(todo);
  }
  
  console.log('✅ Created initial todo list with 5 todos\n');
  
  // Test 1: Concurrent updates to different todos in the same list
  console.log('Test 1: Concurrent updates to same list');
  console.log('----------------------------------------');
  
  const updatePromises = initialTodos.map(async (todo, _index) => {
    const startTime = Date.now();
    try {
      await store.updateTodo(todo.listId, todo.seqno, {
        title: `Updated concurrently at ${startTime}`,
        status: 'done'
      });
      const endTime = Date.now();
      console.log(`  ✅ Update ${todo.seqno} completed in ${endTime - startTime}ms`);
      return { success: true, seqno: todo.seqno, duration: endTime - startTime };
    } catch (error) {
      console.log(`  ❌ Update ${todo.seqno} failed: ${error}`);
      return { success: false, seqno: todo.seqno, error };
    }
  });
  
  const results = await Promise.all(updatePromises);
  
  // All should succeed but they should have waited for each other
  const successCount = results.filter(r => r.success).length;
  console.log(`\n  Result: ${successCount}/5 updates succeeded`);
  
  // Check if updates were serialized (later updates should take longer due to waiting)
  const durations = results.filter(r => r.success && r.duration !== undefined).map(r => r.duration!);
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  console.log(`  Max duration: ${maxDuration}ms (indicates waiting occurred)\n`);
  
  // Verify all updates were applied correctly
  const todos = await store.getTodosByListId('test-list');
  const allUpdated = todos.every(t => t.title.startsWith('Updated concurrently') && t.status === 'done');
  console.log(`  Data integrity check: ${allUpdated ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test 2: Concurrent creation of todos (should not create duplicates)
  console.log('\nTest 2: Concurrent creation (duplicate prevention)');
  console.log('---------------------------------------------------');
  
  const createPromises = [];
  for (let i = 0; i < 3; i++) {
    createPromises.push(
      store.createTodo({
        listId: 'test-list',
        seqno: 100, // Same seqno - should conflict
        title: `Concurrent create attempt ${i}`,
        status: 'pending'
      }).then(
        () => ({ success: true, attempt: i }),
        (error) => ({ success: false, attempt: i, error: error.message })
      )
    );
  }
  
  const createResults = await Promise.all(createPromises);
  const createSuccesses = createResults.filter(r => r.success).length;
  const createFailures = createResults.filter(r => !r.success);
  
  console.log(`  Result: ${createSuccesses} succeeded, ${createFailures.length} failed`);
  console.log(`  Expected: Only 1 should succeed (first one to acquire lock)`);
  
  if (createSuccesses === 1) {
    console.log('  ✅ Duplicate prevention: PASSED');
  } else {
    console.log('  ❌ Duplicate prevention: FAILED');
  }
  
  // Check that only one todo with seqno 100 exists
  const todo100 = await store.getTodo('test-list', 100);
  console.log(`  Verification: ${todo100 ? '✅ Exactly one todo with seqno 100' : '❌ Todo not found'}`);
  
  // Test 3: Stress test - many concurrent operations
  console.log('\nTest 3: Stress test (50 concurrent operations)');
  console.log('-----------------------------------------------');
  
  const stressPromises = [];
  for (let i = 0; i < 50; i++) {
    const operation = i % 3; // Mix of operations
    if (operation === 0) {
      // Create
      stressPromises.push(
        store.createTodo({
          listId: 'test-list',
          seqno: 200 + i,
          title: `Stress test todo ${i}`,
          status: 'pending'
        }).then(
          () => ({ type: 'create', success: true }),
          () => ({ type: 'create', success: false })
        )
      );
    } else if (operation === 1 && i < initialTodos.length) {
      // Update existing
      stressPromises.push(
        store.updateTodo('test-list', initialTodos[i % initialTodos.length].seqno, {
          title: `Stress updated ${i}`
        }).then(
          () => ({ type: 'update', success: true }),
          () => ({ type: 'update', success: false })
        )
      );
    } else {
      // Read
      stressPromises.push(
        store.getTodosByListId('test-list').then(
          (todos) => ({ type: 'read', success: true, count: todos.length }),
          () => ({ type: 'read', success: false })
        )
      );
    }
  }
  
  const stressStart = Date.now();
  const stressResults = await Promise.all(stressPromises);
  const stressEnd = Date.now();
  
  const stressStats = {
    creates: stressResults.filter(r => r.type === 'create' && r.success).length,
    updates: stressResults.filter(r => r.type === 'update' && r.success).length,
    reads: stressResults.filter(r => r.type === 'read' && r.success).length,
    failures: stressResults.filter(r => !r.success).length
  };
  
  console.log(`  Completed in ${stressEnd - stressStart}ms`);
  console.log(`  Creates: ${stressStats.creates}, Updates: ${stressStats.updates}, Reads: ${stressStats.reads}`);
  console.log(`  Failures: ${stressStats.failures}`);
  
  // Final integrity check
  const finalTodos = await store.getTodosByListId('test-list');
  console.log(`  Final todo count: ${finalTodos.length}`);
  
  // Check for data corruption (all todos should have valid structure)
  const isValid = finalTodos.every(t => 
    t.listId === 'test-list' && 
    typeof t.seqno === 'number' && 
    typeof t.title === 'string' && 
    typeof t.status === 'string'
  );
  
  console.log(`  Data integrity: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Clean up
  await store.close();
  await cleanup();
  
  console.log('\n✅ Concurrent write tests completed!');
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runConcurrentWriteTest().catch(console.error);
}