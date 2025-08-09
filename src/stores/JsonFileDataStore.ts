/**
 * JsonFileDataStore.ts
 * 
 * This file implements the DataStore interface using JSON file storage.
 * It provides a simple, human-readable storage format with proper
 * concurrency control to prevent race conditions.
 */
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import * as path from 'path';
import { Mutex } from 'async-mutex';
import lockfile from 'proper-lockfile';
import { Todo } from '../models/Todo.js';
import { TodoList } from '../models/TodoList.js';
import { DataStore } from '../interfaces/DataStore.js';
import {
  DataStoreInitializationException,
  FileOperationException,
  DataValidationException,
  ConstraintViolationException
} from '../exceptions/DataStoreExceptions.js';

/**
 * Data structure for individual todo list JSON file
 */
interface TodoListData {
  todoList: TodoList;
  todos: Todo[];
  version: string;
}

/**
 * JsonFileDataStore Class
 * 
 * Implements data persistence using JSON files with proper concurrency control.
 * Uses file locking and operation-level mutexes to prevent race conditions.
 */
export class JsonFileDataStore implements DataStore {
  private basePath: string;
  private jsonDir: string;
  private operationMutex: Mutex;
  private todoListCache: Map<string, TodoList>;

  constructor(filePath: string) {
    // filePath points to the old single JSON file location
    // We'll use its directory as the base path
    this.basePath = dirname(filePath);
    this.jsonDir = path.join(this.basePath, 'data', 'json');
    this.operationMutex = new Mutex();
    this.todoListCache = new Map();
  }

  /**
   * Initialize the JSON file data store with proper file locking
   * Creates the json directory structure if it doesn't exist
   */
  async initialize(): Promise<void> {
    return this.operationMutex.runExclusive(async () => {
      try {
        // Ensure the json directory exists
        await fs.mkdir(this.jsonDir, { recursive: true });
        
        // Load all existing todo lists
        await this.loadAllTodoLists();
      } catch (error) {
        throw new DataStoreInitializationException(
          `Failed to initialize JSON file data store: ${error instanceof Error ? error.message : error}`,
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  /**
   * Close the data store
   */
  async close(): Promise<void> {
    // Nothing to do for file-based storage
  }

  /**
   * Get the file path for a todo list
   */
  private getTodoListFilePath(listId: string): string {
    return path.join(this.jsonDir, `todo-list-${listId}.json`);
  }

  /**
   * Load all todo lists from the json directory
   */
  private async loadAllTodoLists(): Promise<void> {
    try {
      const files = await fs.readdir(this.jsonDir);
      const todoListFiles = files.filter(f => f.startsWith('todo-list-') && f.endsWith('.json'));
      
      for (const file of todoListFiles) {
        const listId = file.replace('todo-list-', '').replace('.json', '');
        const filePath = path.join(this.jsonDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data: TodoListData = JSON.parse(content);
          this.todoListCache.set(listId, data.todoList);
        } catch (error) {
          // Skip invalid files
          console.error(`Failed to load ${file}: ${error}`);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist yet, that's OK
    }
  }

  /**
   * Execute operation with file locking to prevent concurrent access
   */
  private async withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
    let release: (() => Promise<void>) | undefined;
    try {
      release = await lockfile.lock(filePath, {
        retries: {
          retries: 5,
          factor: 2,
          minTimeout: 100,
          maxTimeout: 1000
        }
      });
      return await operation();
    } catch (error) {
      throw new FileOperationException(
        `Failed to acquire file lock: ${error instanceof Error ? error.message : error}`,
        'LOCK',
        filePath,
        error instanceof Error ? error : undefined
      );
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Save a todo list and its todos to a separate JSON file
   */
  private async saveTodoListData(listId: string, todoList: TodoList, todos: Todo[]): Promise<void> {
    const filePath = this.getTodoListFilePath(listId);
    const data: TodoListData = {
      todoList,
      todos: todos.sort((a, b) => a.seqno - b.seqno),
      version: '2.0.0'
    };
    
    try {
      // Ensure the file exists for locking (create empty file if it doesn't exist)
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, '{}', 'utf-8');
      }
      
      await this.withFileLock(filePath, async () => {
        const tempPath = filePath + '.tmp';
        const dataString = JSON.stringify(data, null, 2);
        await fs.writeFile(tempPath, dataString, 'utf-8');
        await fs.rename(tempPath, filePath);
      });
    } catch (error) {
      throw new FileOperationException(
        `Failed to save todo list data: ${error instanceof Error ? error.message : error}`,
        'WRITE',
        filePath,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load todo list data from file
   */
  private async loadTodoListData(listId: string): Promise<TodoListData | undefined> {
    const filePath = this.getTodoListFilePath(listId);
    
    try {
      const content = await this.withFileLock(filePath, async () => {
        return await fs.readFile(filePath, 'utf-8');
      });
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  // TodoList operations

  async createTodoList(todoList: TodoList): Promise<TodoList> {
    return this.operationMutex.runExclusive(async () => {
      // Check for duplicate ID
      if (this.todoListCache.has(todoList.id)) {
        throw new ConstraintViolationException(
          `TodoList with ID '${todoList.id}' already exists`,
          'UNIQUE'
        );
      }
      
      // Save the new todo list with empty todos
      await this.saveTodoListData(todoList.id, todoList, []);
      this.todoListCache.set(todoList.id, todoList);
      return todoList;
    });
  }

  async getTodoList(id: string): Promise<TodoList | undefined> {
    return this.operationMutex.runExclusive(async () => {
      return this.todoListCache.get(id);
    });
  }

  async getAllTodoLists(): Promise<TodoList[]> {
    return this.operationMutex.runExclusive(async () => {
      return Array.from(this.todoListCache.values());
    });
  }

  async updateTodoList(id: string, updates: Partial<Omit<TodoList, 'id'>>): Promise<TodoList | undefined> {
    return this.operationMutex.runExclusive(async () => {
      // Since TodoList only has id field, just verify it exists and return it
      return this.todoListCache.get(id);
    });
  }

  async deleteTodoList(id: string): Promise<boolean> {
    return this.operationMutex.runExclusive(async () => {
      if (!this.todoListCache.has(id)) {
        return false;
      }
      
      // Delete the file
      const filePath = this.getTodoListFilePath(id);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
      
      // Remove from cache
      this.todoListCache.delete(id);
      return true;
    });
  }


  // Todo operations

  async createTodo(todo: Todo): Promise<Todo> {
    return this.operationMutex.runExclusive(async () => {
      // Check that the referenced TodoList exists
      if (!this.todoListCache.has(todo.listId)) {
        throw new ConstraintViolationException(
          `TodoList with ID '${todo.listId}' does not exist`,
          'FOREIGN_KEY'
        );
      }
      
      // Load existing todos for this list
      const data = await this.loadTodoListData(todo.listId);
      const todos = data?.todos || [];
      
      // Check for duplicate (listId, seqno)
      if (todos.some(t => t.seqno === todo.seqno)) {
        throw new ConstraintViolationException(
          `Todo with listId '${todo.listId}' and seqno '${todo.seqno}' already exists`,
          'UNIQUE'
        );
      }
      
      // Add the new todo and save
      todos.push(todo);
      await this.saveTodoListData(todo.listId, this.todoListCache.get(todo.listId)!, todos);
      return todo;
    });
  }

  async getTodo(listId: string, seqno: number): Promise<Todo | undefined> {
    return this.operationMutex.runExclusive(async () => {
      const data = await this.loadTodoListData(listId);
      return data?.todos.find(todo => todo.seqno === seqno);
    });
  }

  async getAllTodos(): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      const allTodos: Todo[] = [];
      
      for (const listId of this.todoListCache.keys()) {
        const data = await this.loadTodoListData(listId);
        if (data?.todos) {
          allTodos.push(...data.todos);
        }
      }
      
      return allTodos.sort((a, b) => {
        if (a.listId < b.listId) return -1;
        if (a.listId > b.listId) return 1;
        return a.seqno - b.seqno;
      });
    });
  }

  async getTodosByListId(listId: string): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      const data = await this.loadTodoListData(listId);
      return data?.todos.sort((a, b) => a.seqno - b.seqno) || [];
    });
  }

  async updateTodo(listId: string, seqno: number, updates: Partial<Omit<Todo, 'listId' | 'seqno'>>): Promise<Todo | undefined> {
    return this.operationMutex.runExclusive(async () => {
      const data = await this.loadTodoListData(listId);
      if (!data) return undefined;
      
      const index = data.todos.findIndex(todo => todo.seqno === seqno);
      if (index === -1) return undefined;

      const existing = data.todos[index];
      const updated = {
        ...existing,
        ...updates,
        listId: existing.listId,
        seqno: existing.seqno,
      };

      data.todos[index] = updated;
      await this.saveTodoListData(listId, this.todoListCache.get(listId)!, data.todos);
      return updated;
    });
  }

  async deleteTodo(listId: string, seqno: number): Promise<boolean> {
    return this.operationMutex.runExclusive(async () => {
      const data = await this.loadTodoListData(listId);
      if (!data) return false;
      
      const initialLength = data.todos.length;
      data.todos = data.todos.filter(todo => todo.seqno !== seqno);
      
      const wasDeleted = data.todos.length < initialLength;
      if (wasDeleted) {
        await this.saveTodoListData(listId, this.todoListCache.get(listId)!, data.todos);
      }
      return wasDeleted;
    });
  }

  // Search operations

  async searchTodosByTitle(title: string): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      const searchTerm = title.toLowerCase();
      const matchingTodos: Todo[] = [];
      
      for (const listId of this.todoListCache.keys()) {
        const data = await this.loadTodoListData(listId);
        if (data?.todos) {
          const matches = data.todos.filter(todo => 
            todo.title.toLowerCase().includes(searchTerm)
          );
          matchingTodos.push(...matches);
        }
      }
      
      return matchingTodos.sort((a, b) => {
        if (a.listId < b.listId) return -1;
        if (a.listId > b.listId) return 1;
        return a.seqno - b.seqno;
      });
    });
  }

  async searchTodosByDate(dateStr: string): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      // Since there are no timestamp fields anymore, return empty array
      return [];
    });
  }
}
