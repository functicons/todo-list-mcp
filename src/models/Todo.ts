/**
 * Todo.ts
 * 
 * This file defines the core data model for our Todo application, along with validation
 * schemas and a factory function for creating new Todo instances.
 * 
 * WHY USE ZOD?
 * - Zod provides runtime type validation, ensuring our data meets specific requirements
 * - Using schemas creates a clear contract for each operation's input requirements
 * - Error messages are automatically generated with clear validation feedback
 * - TypeScript integration gives us both compile-time and runtime type safety
 * - Schemas can be converted to JSON Schema, which is useful for MCP clients
 */
import { z } from 'zod';

/**
 * TodoStatus Enum
 * 
 * This defines the possible statuses for a Todo item.
 */
export const TodoStatus = z.enum(['pending', 'completed', 'canceled']);
export type TodoStatus = z.infer<typeof TodoStatus>;

/**
 * Todo Interface
 * 
 * This defines the structure of a Todo item in our application.
 * Simplified to only include essential fields:
 * - listId + seqno together form the composite primary key (id)
 * - title is the todo content
 * - status tracks the current state of the todo item
 */
export interface Todo {
  listId: string; // ID of the TodoList this todo belongs to
  seqno: number; // Sequence number per list, starting from 1
  title: string;
  status: TodoStatus;
}

/**
 * Input Validation Schemas
 * 
 * These schemas define the requirements for different operations.
 * Each schema serves as both documentation and runtime validation.
 * 
 * WHY SEPARATE SCHEMAS?
 * - Different operations have different validation requirements
 * - Keeps validation focused on only what's needed for each operation
 * - Makes the API more intuitive by clearly defining what each operation expects
 */

// Schema for creating a new todo - requires listId and title
export const CreateTodoSchema = z.object({
  listId: z.string().uuid("Invalid TodoList ID"),
  title: z.string().min(1, "Title is required"),
});

// Schema for updating a todo - requires listId, seqno and status.
export const UpdateTodoSchema = z.object({
  listId: z.string().uuid("Invalid TodoList ID"),
  seqno: z.number().int().positive("seqno must be a positive integer"),
  status: TodoStatus,
});

// Schema for deleting a todo - requires listId and seqno
export const DeleteTodoSchema = z.object({
  listId: z.string().uuid("Invalid TodoList ID"),
  seqno: z.number().int().positive("seqno must be a positive integer"),
});

// Schema for listing todos by list ID
export const ListTodosByListIdSchema = z.object({
  listId: z.string().uuid("Invalid TodoList ID"),
});

// Schema for listing active todos by list ID
export const ListActiveTodosByListIdSchema = z.object({
  listId: z.string().uuid("Invalid TodoList ID"),
});

/**
 * Factory Function: createTodo
 * 
 * WHY USE A FACTORY FUNCTION?
 * - Centralizes the creation logic in one place
 * - Ensures all required fields are set with proper default values
 * - Guarantees all todos have the same structure
 * - Makes it easy to change the implementation without affecting code that creates todos
 * 
 * @param data The validated input data
 * @param seqno The sequence number for the new todo
 * @returns A fully formed Todo object
 */
export function createTodo(data: z.infer<typeof CreateTodoSchema>, seqno: number): Todo {
  return {
    listId: data.listId,
    seqno: seqno,
    title: data.title,
    status: 'pending',
  };
}