/**
 * formatters.ts
 * 
 * This file contains utility functions for formatting data in the application.
 * These utilities handle the transformation of internal data structures into
 * human-readable formats appropriate for display to LLMs and users.
 * 
 * WHY SEPARATE FORMATTERS?
 * - Keeps formatting logic separate from business logic
 * - Allows consistent formatting across the application
 * - Makes it easier to change display formats without affecting core functionality
 * - Centralizes presentation concerns in one place
 */
import { Todo } from "../models/Todo.js";
import { TodoList } from "../models/TodoList.js";

/**
 * Format a todo item to JSON representation
 * 
 * This formatter converts a Todo object into a structured JSON object
 * for API responses.
 * 
 * @param todo The Todo object to format
 * @returns A JSON object representation
 */
export function formatTodo(todo: Todo): object {
  return {
    listId: todo.listId,
    seqno: todo.seqno,
    title: todo.title,
    status: todo.status
  };
}

/**
 * Format a list of todos to JSON representation
 * 
 * This formatter takes an array of Todo objects and creates a structured
 * JSON response.
 * 
 * @param todos Array of Todo objects to format
 * @returns A JSON object with the todo list
 */
export function formatTodoList(todos: Todo[]): object {
  if (todos.length === 0) {
    return { todos: [], count: 0 };
  }

  const listId = todos[0].listId;
  return {
    listId,
    todos: todos.map(todo => ({
      seqno: todo.seqno,
      title: todo.title,
      status: todo.status
    })),
    count: todos.length
  };
}

/**
 * Create success response for MCP tool calls with JSON data
 * 
 * This utility formats successful responses according to the MCP protocol
 * but returns JSON data instead of text messages.
 * 
 * @param data The JSON data to include
 * @param message Optional success message
 * @returns A properly formatted MCP response object
 */
export function createSuccessResponse(data: unknown, message?: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: message || "Operation completed successfully",
          data: data
        }, null, 2),
      },
    ],
  };
}

/**
 * Create error response for MCP tool calls with JSON format
 * 
 * This utility formats error responses according to the MCP protocol
 * with structured JSON error information.
 * 
 * @param message The error message to include
 * @returns A properly formatted MCP error response object
 */
export function createErrorResponse(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: false,
          error: message
        }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Format a todo list to JSON representation
 * 
 * @param todoList The TodoList object to format
 * @returns A JSON object representation
 */
export function formatTodoListInfo(todoList: TodoList): object {
  return {
    id: todoList.id
  };
}

/**
 * Format a list of todo lists to JSON representation
 * 
 * @param todoLists Array of TodoList objects to format
 * @returns A JSON object with the todo lists
 */
export function formatTodoListCollection(todoLists: TodoList[]): object {
  return {
    todoLists: todoLists.map(todoList => ({ id: todoList.id })),
    count: todoLists.length
  };
} 