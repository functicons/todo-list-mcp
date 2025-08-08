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
import {
  Todo,
  createTodo,
  CreateTodoSchema,
  UpdateTodoSchema,
  DeleteTodoSchema
} from '../models/Todo.js';
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
   * 1. Determines the next sequence number for the given list
   * 2. Uses the factory function to create a new Todo object
   * 3. Persists it to the data store
   * 4. Returns the created Todo
   * 
   * @param data Validated input data (listId, title and description)
   * @returns Promise resolving to the newly created Todo
   */
  async createTodo(data: z.infer<typeof CreateTodoSchema>): Promise<Todo> {
    const store = dataService.getStore();
    
    // Get the latest seqno for this list
    const todos = await store.getTodosByListId(data.listId);
    const maxSeqno = todos.reduce((max, todo) => Math.max(max, todo.seqno), 0);
    const newSeqno = maxSeqno + 1;

    // Use the factory function to create a Todo with proper defaults
    const todo = createTodo(data, newSeqno);
    
    // Create the todo in the data store
    return await store.createTodo(todo);
  }

  /**
   * Get a todo by its composite key (listId, seqno)
   * 
   * @param listId The UUID of the list
   * @param seqno The sequence number of the todo
   * @returns Promise resolving to the Todo if found, undefined otherwise
   */
  async getTodo(listId: string, seqno: number): Promise<Todo | undefined> {
    const store = dataService.getStore();
    return await store.getTodo(listId, seqno);
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
    const allTodos = await store.getAllTodos();
    return allTodos.filter(todo => todo.status === 'pending');
  }

  /**
   * Update a todo
   * 
   * @param data The update data (listId, seqno required, title/description optional)
   * @returns Promise resolving to the updated Todo if found, undefined otherwise
   */
  async updateTodo(data: z.infer<typeof UpdateTodoSchema>): Promise<Todo | undefined> {
    const store = dataService.getStore();
    const { listId, seqno, status } = data;
    
    return await store.updateTodo(listId, seqno, { status });
  }

  

  /**
   * Delete a todo
   * 
   * @param data The deletion data (listId, seqno)
   * @returns Promise resolving to true if deleted, false if not found
   */
  async deleteTodo(data: z.infer<typeof DeleteTodoSchema>): Promise<boolean> {
    const store = dataService.getStore();
    return await store.deleteTodo(data.listId, data.seqno);
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
    const todos = await store.getTodosByListId(listId);
    return todos.filter(todo => todo.status === 'pending');
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
    
    const summary = activeTodos.map(todo => `- [${todo.seqno}] ${todo.title}`).join('\n');
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
    
    const summary = activeTodos.map(todo => `- [${todo.seqno}] ${todo.title}`).join('\n');
    return `# Active Todos Summary\n\nThere are ${activeTodos.length} active todos in this list:\n\n${summary}`;
  }
  
}

// Create a singleton instance for use throughout the application
export const todoService = new TodoService();
 