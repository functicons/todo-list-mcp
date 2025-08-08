/**
 * TodoListService.ts
 * 
 * This service implements the core business logic for managing todo lists.
 * It acts as an intermediary between the TodoList model and the database,
 * handling all CRUD operations for todo lists.
 */
import { TodoList, createTodoList, CreateTodoListSchema, UpdateTodoListSchema } from '../models/TodoList.js';
import { z } from 'zod';
import { databaseService } from './DatabaseService.js';

/**
 * TodoListService Class
 * 
 * This service provides a clean interface for working with todo lists.
 * It encapsulates all database operations and business logic in one place.
 */
class TodoListService {
  /**
   * Create a new todo list
   * 
   * @param data Validated input data (name and description)
   * @returns The newly created TodoList
   */
  createTodoList(data: z.infer<typeof CreateTodoListSchema>): TodoList {
    const todoList = createTodoList(data);
    
    const db = databaseService.getDb();
    
    const stmt = db.prepare(`
      INSERT INTO todo_lists (id, name, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      todoList.id,
      todoList.name,
      todoList.description,
      todoList.createdAt,
      todoList.updatedAt
    );
    
    return todoList;
  }

  /**
   * Get a todo list by ID
   * 
   * @param id The UUID of the todo list to retrieve
   * @returns The TodoList if found, undefined otherwise
   */
  getTodoList(id: string): TodoList | undefined {
    const db = databaseService.getDb();
    
    const stmt = db.prepare('SELECT * FROM todo_lists WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;
    
    return this.rowToTodoList(row);
  }

  /**
   * Get all todo lists
   * 
   * @returns Array of all TodoLists
   */
  getAllTodoLists(): TodoList[] {
    const db = databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM todo_lists ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => this.rowToTodoList(row));
  }

  /**
   * Update a todo list
   * 
   * @param data The update data (id required, name/description optional)
   * @returns The updated TodoList if found, undefined otherwise
   */
  updateTodoList(data: z.infer<typeof UpdateTodoListSchema>): TodoList | undefined {
    const todoList = this.getTodoList(data.id);
    if (!todoList) return undefined;

    const updatedAt = new Date().toISOString();
    
    const db = databaseService.getDb();
    const stmt = db.prepare(`
      UPDATE todo_lists
      SET name = ?, description = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    stmt.run(
      data.name || todoList.name,
      data.description || todoList.description,
      updatedAt,
      todoList.id
    );
    
    return this.getTodoList(todoList.id);
  }

  /**
   * Delete a todo list and all its associated todos
   * 
   * @param id The UUID of the todo list to delete
   * @returns true if deleted, false if not found or not deleted
   */
  deleteTodoList(id: string): boolean {
    const db = databaseService.getDb();
    const stmt = db.prepare('DELETE FROM todo_lists WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  /**
   * Helper to convert a database row to a TodoList object
   * 
   * @param row The database row data
   * @returns A properly formatted TodoList object
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
}

// Create a singleton instance for use throughout the application
export const todoListService = new TodoListService();