/**
 * TodoService.ts
 * 
 * This service implements the core business logic for managing todos.
 * It acts as an intermediary between the data model and the data store,
 * handling all CRUD operations and search functionality.
 * 
 * WHY A SERVICE LAYER?
 * - Separates business logic from data storage operations
 * - Provides a clean API for the application to work with
 * - Makes it easier to change the storage implementation later
 * - Encapsulates complex operations into simple method calls
 */
import { Todo, createTodo, CreateTodoSchema, UpdateTodoSchema } from '../models/Todo.js';
import { z } from 'zod';
import { dataService } from './DataService.js';

/**
 * TodoService Class
 * 
 * This service follows the repository pattern to provide a clean
 * interface for working with todos. It encapsulates all database
 * operations and business logic in one place.
 */
class TodoService {
  /**
   * Create a new todo
   * 
   * This method:
   * 1. Uses the factory function to create a new Todo object
   * 2. Persists it to the data store
   * 3. Returns the created Todo
   * 
   * @param data Validated input data (listId, title and description)
   * @returns Promise resolving to the newly created Todo
   */
  async createTodo(data: z.infer<typeof CreateTodoSchema>): Promise<Todo> {
    // Use the factory function to create a Todo with proper defaults
    const todo = createTodo(data);
    
    // Get the data store instance
    const store = dataService.getStore();
    
    // Create the todo in the data store
    return await store.createTodo(todo);
  }

  /**
   * Get a todo by ID
   * 
   * @param id The UUID of the todo to retrieve
   * @returns Promise resolving to the Todo if found, undefined otherwise
   */
  async getTodo(id: string): Promise<Todo | undefined> {
    const store = dataService.getStore();
    return await store.getTodo(id);
  }

  /**
   * Get all todos
   * 
   * @returns Promise resolving to array of all Todos
   */
  async getAllTodos(): Promise<Todo[]> {
    const store = dataService.getStore();
    return await store.getAllTodos();
  }

  /**
   * Get all active (non-completed) todos
   * 
   * @returns Promise resolving to array of active Todos
   */
  async getActiveTodos(): Promise<Todo[]> {
    const store = dataService.getStore();
    return await store.getActiveTodos();
  }

  /**
   * Update a todo
   * 
   * @param data The update data (id required, title/description optional)
   * @returns Promise resolving to the updated Todo if found, undefined otherwise
   */
  async updateTodo(data: z.infer<typeof UpdateTodoSchema>): Promise<Todo | undefined> {
    const store = dataService.getStore();
    const updates: Partial<Omit<Todo, 'id' | 'createdAt'>> = {};
    
    if (data.title !== undefined) {
      updates.title = data.title;
    }
    if (data.description !== undefined) {
      updates.description = data.description;
    }
    
    return await store.updateTodo(data.id, updates);
  }

  /**
   * Mark a todo as completed
   * 
   * @param id The UUID of the todo to complete
   * @returns Promise resolving to the updated Todo if found, undefined otherwise
   */
  async completeTodo(id: string): Promise<Todo | undefined> {
    const store = dataService.getStore();
    return await store.completeTodo(id);
  }

  /**
   * Delete a todo
   * 
   * @param id The UUID of the todo to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  async deleteTodo(id: string): Promise<boolean> {
    const store = dataService.getStore();
    return await store.deleteTodo(id);
  }

  /**
   * Search todos by title
   * 
   * @param title The search term to look for in titles
   * @returns Promise resolving to array of matching Todos
   */
  async searchByTitle(title: string): Promise<Todo[]> {
    const store = dataService.getStore();
    return await store.searchTodosByTitle(title);
  }

  /**
   * Search todos by date
   * 
   * @param dateStr The date to search for in YYYY-MM-DD format
   * @returns Promise resolving to array of matching Todos
   */
  async searchByDate(dateStr: string): Promise<Todo[]> {
    const store = dataService.getStore();
    return await store.searchTodosByDate(dateStr);
  }

  /**
   * Get todos by list ID
   * 
   * @param listId The UUID of the todo list
   * @returns Promise resolving to array of todos for the specified list
   */
  async getTodosByListId(listId: string): Promise<Todo[]> {
    const store = dataService.getStore();
    return await store.getTodosByListId(listId);
  }

  /**
   * Get active todos by list ID
   * 
   * @param listId The UUID of the todo list
   * @returns Promise resolving to array of active todos for the specified list
   */
  async getActiveTodosByListId(listId: string): Promise<Todo[]> {
    const store = dataService.getStore();
    return await store.getActiveTodosByListId(listId);
  }

  /**
   * Generate a summary of active todos
   * 
   * @returns Promise resolving to markdown-formatted summary string
   */
  async summarizeActiveTodos(): Promise<string> {
    const activeTodos = await this.getActiveTodos();
    
    if (activeTodos.length === 0) {
      return "No active todos found.";
    }
    
    const summary = activeTodos.map(todo => `- ${todo.title}`).join('\n');
    return `# Active Todos Summary\n\nThere are ${activeTodos.length} active todos:\n\n${summary}`;
  }

  /**
   * Generate a summary of active todos for a specific list
   * 
   * @param listId The UUID of the todo list
   * @returns Promise resolving to markdown-formatted summary string
   */
  async summarizeActiveTodosByListId(listId: string): Promise<string> {
    const activeTodos = await this.getActiveTodosByListId(listId);
    
    if (activeTodos.length === 0) {
      return "No active todos found for this list.";
    }
    
    const summary = activeTodos.map(todo => `- ${todo.title}`).join('\n');
    return `# Active Todos Summary\n\nThere are ${activeTodos.length} active todos in this list:\n\n${summary}`;
  }
  
}

// Create a singleton instance for use throughout the application
export const todoService = new TodoService(); 