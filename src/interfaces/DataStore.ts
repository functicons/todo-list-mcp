/**
 * DataStore.ts
 * 
 * This file defines the abstraction interface for data persistence.
 * It allows different storage implementations (JSON, SQLite, etc.)
 * to be used interchangeably without changing business logic.
 */
import { Todo } from '../models/Todo.js';
import { TodoList } from '../models/TodoList.js';

/**
 * DataStore Interface
 * 
 * Defines all the operations that any data store implementation must support.
 * This abstraction allows the application to work with different storage backends.
 */
export interface DataStore {
  // Initialization and cleanup
  initialize(): Promise<void>;
  close(): Promise<void>;

  // TodoList operations
  createTodoList(todoList: TodoList): Promise<TodoList>;
  getTodoList(id: string): Promise<TodoList | undefined>;
  getAllTodoLists(): Promise<TodoList[]>;
  updateTodoList(id: string, updates: Partial<Omit<TodoList, 'id' | 'createdAt'>>): Promise<TodoList | undefined>;
  deleteTodoList(id: string): Promise<boolean>;

  // Todo operations
  createTodo(todo: Todo): Promise<Todo>;
  getTodo(id: string): Promise<Todo | undefined>;
  getAllTodos(): Promise<Todo[]>;
  getTodosByListId(listId: string): Promise<Todo[]>;
  getActiveTodos(): Promise<Todo[]>;
  getActiveTodosByListId(listId: string): Promise<Todo[]>;
  updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>): Promise<Todo | undefined>;
  completeTodo(id: string): Promise<Todo | undefined>;
  deleteTodo(id: string): Promise<boolean>;
  
  // Search operations
  searchTodosByTitle(title: string): Promise<Todo[]>;
  searchTodosByDate(dateStr: string): Promise<Todo[]>;
}