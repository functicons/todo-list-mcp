/**
 * JsonFileDataStore.ts
 * 
 * This file implements the DataStore interface using JSON file storage.
 * It provides a simple, human-readable storage format with proper
 * concurrency control to prevent race conditions.
 */
import { promises as fs } from 'fs';
import { dirname } from 'path';
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
 * Data structure for JSON file storage
 */
interface JsonData {
  todoLists: TodoList[];
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
  private filePath: string;
  private data: JsonData;
  private operationMutex: Mutex;
  private lockfilePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.lockfilePath = filePath + '.lock';
    this.operationMutex = new Mutex();
    this.data = {
      todoLists: [],
      todos: [],
      version: '2.0.0' // New version with seqno
    };
  }

  /**
   * Initialize the JSON file data store with proper file locking
   * Creates the file and directory structure if they don't exist
   */
  async initialize(): Promise<void> {
    return this.operationMutex.runExclusive(async () => {
      try {
        // Ensure the directory exists
        const dir = dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });

        // Try to acquire file lock and load existing data
        try {
          const fileContent = await this.withFileLock(async () => {
            return await fs.readFile(this.filePath, 'utf-8');
          });
          
          try {
            this.data = JSON.parse(fileContent);
          } catch (parseError) {
            throw new DataValidationException(
              `Invalid JSON format in data file: ${parseError instanceof Error ? parseError.message : parseError}`,
              'file_content',
              fileContent.substring(0, 100) + '...'
            );
          }
          
          // Handle migration if needed
          if (!this.data.version || this.data.version < '2.0.0') {
            if (this.data.todos && this.data.todos.length > 0 && 'id' in this.data.todos[0]) {
              throw new DataValidationException(
                'Incompatible data schema: todos have "id" field instead of "seqno". Manual migration required.',
                'todos schema v1',
                'todos schema v2'
              );
            }
            this.data.version = '2.0.0';
          }
          
          // Ensure required arrays exist
          if (!this.data.todoLists) {
            this.data.todoLists = [];
          }
          if (!this.data.todos) {
            this.data.todos = [];
          }
        } catch (error) {
          if (error instanceof DataValidationException) {
            throw error;
          }
          
          // File doesn't exist, start with empty data
          if ((error as any).code === 'ENOENT') {
            await this.saveDataInternal();
          } else {
            throw new FileOperationException(
              `Failed to read data file: ${error instanceof Error ? error.message : error}`,
              'READ',
              this.filePath,
              error instanceof Error ? error : undefined
            );
          }
        }
      } catch (error) {
        if (error instanceof DataValidationException || error instanceof FileOperationException) {
          throw error;
        }
        throw new DataStoreInitializationException(
          `Failed to initialize JSON file data store: ${error instanceof Error ? error.message : error}`,
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  /**
   * Close the data store (saves any pending changes)
   */
  async close(): Promise<void> {
    await this.saveData();
  }

  /**
   * Execute operation with file locking to prevent concurrent access
   */
  private async withFileLock<T>(operation: () => Promise<T>): Promise<T> {
    let release: (() => Promise<void>) | undefined;
    try {
      release = await lockfile.lock(this.filePath, {
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
        this.filePath,
        error instanceof Error ? error : undefined
      );
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Internal save method (assumes caller handles locking)
   */
  private async saveDataInternal(): Promise<void> {
    try {
      const tempPath = this.filePath + '.tmp';
      const dataString = JSON.stringify(this.data, null, 2);
      await fs.writeFile(tempPath, dataString, 'utf-8');
      await fs.rename(tempPath, this.filePath);
    } catch (error) {
      throw new FileOperationException(
        `Failed to save data: ${error instanceof Error ? error.message : error}`,
        'WRITE',
        this.filePath,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Save data to JSON file with proper locking
   */
  private async saveData(): Promise<void> {
    await this.withFileLock(async () => {
      await this.saveDataInternal();
    });
  }

  // TodoList operations

  async createTodoList(todoList: TodoList): Promise<TodoList> {
    return this.operationMutex.runExclusive(async () => {
      // Reload data to ensure we have the latest state
      await this.reloadData();
      
      // Check for duplicate ID
      if (this.data.todoLists.some(list => list.id === todoList.id)) {
        throw new ConstraintViolationException(
          `TodoList with ID '${todoList.id}' already exists`,
          'UNIQUE'
        );
      }
      
      this.data.todoLists.push(todoList);
      await this.saveData();
      return todoList;
    });
  }

  async getTodoList(id: string): Promise<TodoList | undefined> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      return this.data.todoLists.find(list => list.id === id);
    });
  }

  async getAllTodoLists(): Promise<TodoList[]> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      return [...this.data.todoLists];
    });
  }

  async updateTodoList(id: string, updates: Partial<Omit<TodoList, 'id'>>): Promise<TodoList | undefined> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      // Since TodoList only has id field, just verify it exists and return it
      return this.data.todoLists.find(list => list.id === id);
    });
  }

  async deleteTodoList(id: string): Promise<boolean> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      
      const initialLength = this.data.todoLists.length;
      this.data.todoLists = this.data.todoLists.filter(list => list.id !== id);
      
      // Also delete all todos in this list
      this.data.todos = this.data.todos.filter(todo => todo.listId !== id);
      
      const wasDeleted = this.data.todoLists.length < initialLength;
      if (wasDeleted) {
        await this.saveData();
      }
      return wasDeleted;
    });
  }

  /**
   * Reload data from file to ensure we have the latest state
   */
  private async reloadData(): Promise<void> {
    try {
      const fileContent = await this.withFileLock(async () => {
        return await fs.readFile(this.filePath, 'utf-8');
      });
      this.data = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist or can't be read, keep current data
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // Todo operations

  async createTodo(todo: Todo): Promise<Todo> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      
      // Check for duplicate (listId, seqno)
      if (this.data.todos.some(t => t.listId === todo.listId && t.seqno === todo.seqno)) {
        throw new ConstraintViolationException(
          `Todo with listId '${todo.listId}' and seqno '${todo.seqno}' already exists`,
          'UNIQUE'
        );
      }
      
      // Check that the referenced TodoList exists
      if (!this.data.todoLists.some(list => list.id === todo.listId)) {
        throw new ConstraintViolationException(
          `TodoList with ID '${todo.listId}' does not exist`,
          'FOREIGN_KEY'
        );
      }
      
      this.data.todos.push(todo);
      await this.saveData();
      return todo;
    });
  }

  async getTodo(listId: string, seqno: number): Promise<Todo | undefined> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      return this.data.todos.find(todo => todo.listId === listId && todo.seqno === seqno);
    });
  }

  async getAllTodos(): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      return [...this.data.todos].sort((a, b) => {
        if (a.listId < b.listId) return -1;
        if (a.listId > b.listId) return 1;
        return a.seqno - b.seqno;
      });
    });
  }

  async getTodosByListId(listId: string): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      return this.data.todos
        .filter(todo => todo.listId === listId)
        .sort((a, b) => a.seqno - b.seqno);
    });
  }

  async updateTodo(listId: string, seqno: number, updates: Partial<Omit<Todo, 'listId' | 'seqno'>>): Promise<Todo | undefined> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      
      const index = this.data.todos.findIndex(todo => todo.listId === listId && todo.seqno === seqno);
      if (index === -1) return undefined;

      const existing = this.data.todos[index];
      const updated = {
        ...existing,
        ...updates,
        listId: existing.listId,
        seqno: existing.seqno,
      };

      this.data.todos[index] = updated;
      await this.saveData();
      return updated;
    });
  }

  async deleteTodo(listId: string, seqno: number): Promise<boolean> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      
      const initialLength = this.data.todos.length;
      this.data.todos = this.data.todos.filter(todo => !(todo.listId === listId && todo.seqno === seqno));
      
      const wasDeleted = this.data.todos.length < initialLength;
      if (wasDeleted) {
        await this.saveData();
      }
      return wasDeleted;
    });
  }

  // Search operations

  async searchTodosByTitle(title: string): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      const searchTerm = title.toLowerCase();
      return this.data.todos
        .filter(todo => todo.title.toLowerCase().includes(searchTerm))
        .sort((a, b) => {
          if (a.listId < b.listId) return -1;
          if (a.listId > b.listId) return 1;
          return a.seqno - b.seqno;
        });
    });
  }

  async searchTodosByDate(dateStr: string): Promise<Todo[]> {
    return this.operationMutex.runExclusive(async () => {
      await this.reloadData();
      // Since there are no timestamp fields anymore, return empty array
      return [];
    });
  }
}
