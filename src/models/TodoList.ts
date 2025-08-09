/**
 * TodoList.ts
 * 
 * This file defines the data model for TodoList entities, which represent
 * collections of todos that can be managed independently by different clients.
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * TodoList Interface
 * 
 * Defines the structure of a TodoList entity that groups todos together.
 * Simplified to only include the essential id field.
 */
export interface TodoList {
  id: string;
}

/**
 * Input Validation Schemas
 */

// Schema for creating a new todo list - no additional fields needed, id will be generated
export const CreateTodoListSchema = z.object({});

// Schema for updating a todo list - no fields to update besides id
export const UpdateTodoListSchema = z.object({
  id: z.string().uuid("Invalid TodoList ID"),
});

// Schema for deleting a todo list
export const DeleteTodoListSchema = z.object({
  id: z.string().uuid("Invalid TodoList ID"),
});

/**
 * Factory Function: createTodoList
 * 
 * Creates a new TodoList with generated ID and timestamps.
 * 
 * @param data The validated input data
 * @returns A fully formed TodoList object
 */
export function createTodoList(_data: z.infer<typeof CreateTodoListSchema>): TodoList {
  return {
    id: uuidv4(),
  };
}