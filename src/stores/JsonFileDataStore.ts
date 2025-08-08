/**
 * JsonFileDataStore.ts
 * 
 * This file implements the DataStore interface using JSON file storage.
 * It provides a simple, human-readable storage format that doesn't
 * require external dependencies.
 */
import { promises as fs } from 'fs';
import { dirname } from 'path';
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
 * Implements data persistence using JSON files.
 * Provides atomic writes and handles file creation/migration.
 */
export class JsonFileDataStore implements DataStore {
  private filePath: string;
  private data: JsonData;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = {
      todoLists: [],
      todos: [],
      version: '2.0.0' // New version with seqno
    };
  }

  /**
   * Initialize the JSON file data store
   * Creates the file and directory structure if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      // Ensure the directory exists
      const dir = dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Try to load existing data
      try {
        const fileContent = await fs.readFile(this.filePath, 'utf-8');
        
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
          await this.saveData();
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
  }

  /**
   * Close the data store (saves any pending changes)
   */
  async close(): Promise<void> {
    await this.saveData();
  }

  /**
   * Save data to JSON file atomically
   */
  private async saveData(): Promise<void> {
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

  // TodoList operations

  async createTodoList(todoList: TodoList): Promise<TodoList> {
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
  }

  async getTodoList(id: string): Promise<TodoList | undefined> {
    return this.data.todoLists.find(list => list.id === id);
  }

  async getAllTodoLists(): Promise<TodoList[]> {
    return [...this.data.todoLists].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateTodoList(id: string, updates: Partial<Omit<TodoList, 'id' | 'createdAt'>>): Promise<TodoList | undefined> {
    const index = this.data.todoLists.findIndex(list => list.id === id);
    if (index === -1) return undefined;

    const existing = this.data.todoLists[index];
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.data.todoLists[index] = updated;
    await this.saveData();
    return updated;
  }

  async deleteTodoList(id: string): Promise<boolean> {
    const initialLength = this.data.todoLists.length;
    this.data.todoLists = this.data.todoLists.filter(list => list.id !== id);
    
    // Also delete all todos in this list
    this.data.todos = this.data.todos.filter(todo => todo.listId !== id);
    
    const wasDeleted = this.data.todoLists.length < initialLength;
    if (wasDeleted) {
      await this.saveData();
    }
    return wasDeleted;
  }

  // Todo operations

  async createTodo(todo: Todo): Promise<Todo> {
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
  }

  async getTodo(listId: string, seqno: number): Promise<Todo | undefined> {
    return this.data.todos.find(todo => todo.listId === listId && todo.seqno === seqno);
  }

  async getAllTodos(): Promise<Todo[]> {
    return [...this.data.todos].sort((a, b) => {
      if (a.listId < b.listId) return -1;
      if (a.listId > b.listId) return 1;
      return a.seqno - b.seqno;
    });
  }

  async getTodosByListId(listId: string): Promise<Todo[]> {
    return this.data.todos
      .filter(todo => todo.listId === listId)
      .sort((a, b) => a.seqno - b.seqno);
  }

  async getActiveTodos(): Promise<Todo[]> {
    return this.data.todos
      .filter(todo => todo.completedAt === null)
      .sort((a, b) => {
        if (a.listId < b.listId) return -1;
        if (a.listId > b.listId) return 1;
        return a.seqno - b.seqno;
      });
  }

  async getActiveTodosByListId(listId: string): Promise<Todo[]> {
    return this.data.todos
      .filter(todo => todo.listId === listId && todo.completedAt === null)
      .sort((a, b) => a.seqno - b.seqno);
  }

  async updateTodo(listId: string, seqno: number, updates: Partial<Omit<Todo, 'listId' | 'seqno' | 'createdAt'>>): Promise<Todo | undefined> {
    const index = this.data.todos.findIndex(todo => todo.listId === listId && todo.seqno === seqno);
    if (index === -1) return undefined;

    const existing = this.data.todos[index];
    const updated = {
      ...existing,
      ...updates,
      listId: existing.listId,
      seqno: existing.seqno,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      completed: updates.completedAt !== undefined ? updates.completedAt !== null : existing.completed
    };

    this.data.todos[index] = updated;
    await this.saveData();
    return updated;
  }

  async completeTodo(listId: string, seqno: number): Promise<Todo | undefined> {
    const now = new Date().toISOString();
    return this.updateTodo(listId, seqno, { completedAt: now });
  }

  async deleteTodo(listId: string, seqno: number): Promise<boolean> {
    const initialLength = this.data.todos.length;
    this.data.todos = this.data.todos.filter(todo => !(todo.listId === listId && todo.seqno === seqno));
    
    const wasDeleted = this.data.todos.length < initialLength;
    if (wasDeleted) {
      await this.saveData();
    }
    return wasDeleted;
  }

  // Search operations

  async searchTodosByTitle(title: string): Promise<Todo[]> {
    const searchTerm = title.toLowerCase();
    return this.data.todos
      .filter(todo => todo.title.toLowerCase().includes(searchTerm))
      .sort((a, b) => {
        if (a.listId < b.listId) return -1;
        if (a.listId > b.listId) return 1;
        return a.seqno - b.seqno;
      });
  }

  async searchTodosByDate(dateStr: string): Promise<Todo[]> {
    return this.data.todos
      .filter(todo => todo.createdAt.startsWith(dateStr))
      .sort((a, b) => {
        if (a.listId < b.listId) return -1;
        if (a.listId > b.listId) return 1;
        return a.seqno - b.seqno;
      });
  }
}
