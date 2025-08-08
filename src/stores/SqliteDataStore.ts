/**
 * SqliteDataStore.ts
 * 
 * This file implements the DataStore interface using SQLite database storage.
 * It provides ACID compliance, better performance for large datasets, and
 * supports complex queries and relationships.
 */
import Database from 'better-sqlite3';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import { Todo } from '../models/Todo.js';
import { TodoList } from '../models/TodoList.js';
import { DataStore } from '../interfaces/DataStore.js';
import {
  DataStoreInitializationException,
  IncompatibleSchemaException,
  DatabaseOperationException,
  ConstraintViolationException
} from '../exceptions/DataStoreExceptions.js';

/**
 * SqliteDataStore Class
 * 
 * Implements data persistence using SQLite database.
 * Provides ACID transactions and optimized queries.
 */
export class SqliteDataStore implements DataStore {
  private db!: Database.Database; // Using definite assignment assertion since it's initialized in initialize()
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize the SQLite database
   * Creates tables and handles migration from old schema
   */
  async initialize(): Promise<void> {
    try {
      // Ensure the directory exists
      const dir = dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      // Initialize the database
      this.db = new Database(this.dbPath);
      
      // Set pragmas for performance and safety
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      
      // Initialize the database schema
      this.initSchema();
    } catch (error) {
      if (error instanceof IncompatibleSchemaException) {
        throw error; // Re-throw schema exceptions as-is
      }
      throw new DataStoreInitializationException(
        `Failed to initialize SQLite data store: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }

  /**
   * Initialize the database schema
   */
  private initSchema(): void {
    // Check if database has incompatible schema
    this.validateSchema();

    // Create todo_lists table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todo_lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create todos table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        listId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        completedAt TEXT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (listId) REFERENCES todo_lists (id) ON DELETE CASCADE
      )
    `);

    // Create index on listId for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_listId ON todos(listId)
    `);
  }

  /**
   * Validate that the existing database schema is compatible
   * Throws IncompatibleSchemaException if the schema doesn't match expectations
   */
  private validateSchema(): void {
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(todos)").all() as any[];
      
      if (tableInfo.length > 0) {
        const hasListId = tableInfo.some((column: any) => column.name === 'listId');
        
        if (!hasListId) {
          const currentColumns = tableInfo.map((col: any) => col.name).join(', ');
          throw new IncompatibleSchemaException(
            'Incompatible database schema detected. The existing todos table does not have the required "listId" column. ' +
            'Please use a new database file or manually migrate your data to the new schema.',
            'todos table with listId column',
            `todos table with columns: ${currentColumns}`
          );
        }
      }
    } catch (error) {
      if (error instanceof IncompatibleSchemaException) {
        throw error;
      }
      // If there's any other error, it's likely that the tables don't exist yet, which is fine
    }
  }

  /**
   * Helper to convert database row to TodoList object
   */
  private rowToTodoList(row: any): TodoList {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Helper to convert database row to Todo object
   */
  private rowToTodo(row: any): Todo {
    return {
      id: row.id,
      listId: row.listId,
      title: row.title,
      description: row.description,
      completedAt: row.completedAt,
      completed: row.completedAt !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  // TodoList operations

  async createTodoList(todoList: TodoList): Promise<TodoList> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO todo_lists (id, name, description, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(todoList.id, todoList.name, todoList.description, todoList.createdAt, todoList.updatedAt);
      return todoList;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new ConstraintViolationException(
          `TodoList with ID '${todoList.id}' already exists`,
          'UNIQUE',
          'PRIMARY KEY'
        );
      }
      throw new DatabaseOperationException(
        `Failed to create TodoList: ${error.message}`,
        'INSERT',
        error
      );
    }
  }

  async getTodoList(id: string): Promise<TodoList | undefined> {
    const stmt = this.db.prepare('SELECT * FROM todo_lists WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToTodoList(row) : undefined;
  }

  async getAllTodoLists(): Promise<TodoList[]> {
    const stmt = this.db.prepare('SELECT * FROM todo_lists ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTodoList(row));
  }

  async updateTodoList(id: string, updates: Partial<Omit<TodoList, 'id' | 'createdAt'>>): Promise<TodoList | undefined> {
    const existing = await this.getTodoList(id);
    if (!existing) return undefined;

    const updatedAt = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE todo_lists
      SET name = ?, description = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.name || existing.name,
      updates.description || existing.description,
      updatedAt,
      id
    );
    
    return await this.getTodoList(id);
  }

  async deleteTodoList(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM todo_lists WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Todo operations

  async createTodo(todo: Todo): Promise<Todo> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO todos (id, listId, title, description, completedAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(todo.id, todo.listId, todo.title, todo.description, todo.completedAt, todo.createdAt, todo.updatedAt);
      return todo;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new ConstraintViolationException(
          `Todo with ID '${todo.id}' already exists`,
          'UNIQUE',
          'PRIMARY KEY'
        );
      }
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        throw new ConstraintViolationException(
          `TodoList with ID '${todo.listId}' does not exist`,
          'FOREIGN_KEY',
          'listId'
        );
      }
      throw new DatabaseOperationException(
        `Failed to create Todo: ${error.message}`,
        'INSERT',
        error
      );
    }
  }

  async getTodo(id: string): Promise<Todo | undefined> {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToTodo(row) : undefined;
  }

  async getAllTodos(): Promise<Todo[]> {
    const stmt = this.db.prepare('SELECT * FROM todos');
    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTodo(row));
  }

  async getTodosByListId(listId: string): Promise<Todo[]> {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE listId = ?');
    const rows = stmt.all(listId) as any[];
    return rows.map(row => this.rowToTodo(row));
  }

  async getActiveTodos(): Promise<Todo[]> {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE completedAt IS NULL');
    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTodo(row));
  }

  async getActiveTodosByListId(listId: string): Promise<Todo[]> {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE listId = ? AND completedAt IS NULL');
    const rows = stmt.all(listId) as any[];
    return rows.map(row => this.rowToTodo(row));
  }

  async updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>): Promise<Todo | undefined> {
    const existing = await this.getTodo(id);
    if (!existing) return undefined;

    const updatedAt = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE todos
      SET title = ?, description = ?, completedAt = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.title || existing.title,
      updates.description || existing.description,
      updates.completedAt !== undefined ? updates.completedAt : existing.completedAt,
      updatedAt,
      id
    );
    
    return await this.getTodo(id);
  }

  async completeTodo(id: string): Promise<Todo | undefined> {
    const now = new Date().toISOString();
    return this.updateTodo(id, { completedAt: now });
  }

  async deleteTodo(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM todos WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Search operations

  async searchTodosByTitle(title: string): Promise<Todo[]> {
    const searchTerm = `%${title}%`;
    const stmt = this.db.prepare('SELECT * FROM todos WHERE title LIKE ? COLLATE NOCASE');
    const rows = stmt.all(searchTerm) as any[];
    return rows.map(row => this.rowToTodo(row));
  }

  async searchTodosByDate(dateStr: string): Promise<Todo[]> {
    const datePattern = `${dateStr}%`;
    const stmt = this.db.prepare('SELECT * FROM todos WHERE createdAt LIKE ?');
    const rows = stmt.all(datePattern) as any[];
    return rows.map(row => this.rowToTodo(row));
  }
}