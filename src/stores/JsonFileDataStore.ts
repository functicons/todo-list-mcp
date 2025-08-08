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
      version: '1.0.0'
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
        this.data = JSON.parse(fileContent);
        
        // Handle migration if needed
        if (!this.data.version) {
          this.data.version = '1.0.0';
        }
        
        // Ensure required arrays exist
        if (!this.data.todoLists) {
          this.data.todoLists = [];
        }
        if (!this.data.todos) {
          this.data.todos = [];
        }
      } catch (error) {
        // File doesn't exist or is invalid, start with empty data
        await this.saveData();
      }
    } catch (error) {
      throw new Error(`Failed to initialize JSON file data store: ${error}`);
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
      throw new Error(`Failed to save data: ${error}`);
    }
  }

  // TodoList operations

  async createTodoList(todoList: TodoList): Promise<TodoList> {
    this.data.todoLists.push(todoList);
    await this.saveData();
    return todoList;
  }

  async getTodoList(id: string): Promise<TodoList | undefined> {
    return this.data.todoLists.find(list => list.id === id);
  }

  async getAllTodoLists(): Promise<TodoList[]> {
    return [...this.data.todoLists];
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
    this.data.todos.push(todo);
    await this.saveData();
    return todo;
  }

  async getTodo(id: string): Promise<Todo | undefined> {
    return this.data.todos.find(todo => todo.id === id);
  }

  async getAllTodos(): Promise<Todo[]> {
    return [...this.data.todos];
  }

  async getTodosByListId(listId: string): Promise<Todo[]> {
    return this.data.todos.filter(todo => todo.listId === listId);
  }

  async getActiveTodos(): Promise<Todo[]> {
    return this.data.todos.filter(todo => todo.completedAt === null);
  }

  async getActiveTodosByListId(listId: string): Promise<Todo[]> {
    return this.data.todos.filter(todo => todo.listId === listId && todo.completedAt === null);
  }

  async updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>): Promise<Todo | undefined> {
    const index = this.data.todos.findIndex(todo => todo.id === id);
    if (index === -1) return undefined;

    const existing = this.data.todos[index];
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      completed: updates.completedAt !== undefined ? updates.completedAt !== null : existing.completed
    };

    this.data.todos[index] = updated;
    await this.saveData();
    return updated;
  }

  async completeTodo(id: string): Promise<Todo | undefined> {
    const now = new Date().toISOString();
    return this.updateTodo(id, { completedAt: now, updatedAt: now });
  }

  async deleteTodo(id: string): Promise<boolean> {
    const initialLength = this.data.todos.length;
    this.data.todos = this.data.todos.filter(todo => todo.id !== id);
    
    const wasDeleted = this.data.todos.length < initialLength;
    if (wasDeleted) {
      await this.saveData();
    }
    return wasDeleted;
  }

  // Search operations

  async searchTodosByTitle(title: string): Promise<Todo[]> {
    const searchTerm = title.toLowerCase();
    return this.data.todos.filter(todo => 
      todo.title.toLowerCase().includes(searchTerm)
    );
  }

  async searchTodosByDate(dateStr: string): Promise<Todo[]> {
    return this.data.todos.filter(todo => 
      todo.createdAt.startsWith(dateStr)
    );
  }
}