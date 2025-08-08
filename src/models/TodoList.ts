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
 */
export interface TodoList {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input Validation Schemas
 */

// Schema for creating a new todo list
export const CreateTodoListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
});

// Schema for updating a todo list
export const UpdateTodoListSchema = z.object({
  id: z.string().uuid("Invalid TodoList ID"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
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
export function createTodoList(data: z.infer<typeof CreateTodoListSchema>): TodoList {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  };
}