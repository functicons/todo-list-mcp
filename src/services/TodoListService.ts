/**
 * TodoListService.ts
 * 
 * This service implements the core business logic for managing todo lists.
 * It acts as an intermediary between the TodoList model and the data store,
 * handling all CRUD operations for todo lists.
 */
import { TodoList, createTodoList, CreateTodoListSchema, UpdateTodoListSchema } from '../models/TodoList.js';
import { z } from 'zod';
import { dataService } from './DataService.js';

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
   * @returns Promise resolving to the newly created TodoList
   */
  async createTodoList(data: z.infer<typeof CreateTodoListSchema>): Promise<TodoList> {
    const todoList = createTodoList(data);
    const store = dataService.getStore();
    return await store.createTodoList(todoList);
  }

  /**
   * Get a todo list by ID
   * 
   * @param id The UUID of the todo list to retrieve
   * @returns Promise resolving to the TodoList if found, undefined otherwise
   */
  async getTodoList(id: string): Promise<TodoList | undefined> {
    const store = dataService.getStore();
    return await store.getTodoList(id);
  }

  /**
   * Get all todo lists
   * 
   * @returns Promise resolving to array of all TodoLists
   */
  async getAllTodoLists(): Promise<TodoList[]> {
    const store = dataService.getStore();
    return await store.getAllTodoLists();
  }

  /**
   * Update a todo list
   * 
   * @param data The update data (id required, name/description optional)
   * @returns Promise resolving to the updated TodoList if found, undefined otherwise
   */
  async updateTodoList(data: z.infer<typeof UpdateTodoListSchema>): Promise<TodoList | undefined> {
    const store = dataService.getStore();
    const updates: Partial<Omit<TodoList, 'id' | 'createdAt'>> = {};
    
    if (data.description !== undefined) {
      updates.description = data.description;
    }
    
    return await store.updateTodoList(data.id, updates);
  }

  /**
   * Delete a todo list and all its associated todos
   * 
   * @param id The UUID of the todo list to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  async deleteTodoList(id: string): Promise<boolean> {
    const store = dataService.getStore();
    return await store.deleteTodoList(id);
  }

}

// Create a singleton instance for use throughout the application
export const todoListService = new TodoListService();