#!/usr/bin/env node
/**
 * index.ts
 * 
 * This is the main entry point for the Todo MCP server.
 * It defines all the tools provided by the server and handles
 * connecting to clients.
 * 
 * WHAT IS MCP?
 * The Model Context Protocol (MCP) allows AI models like Claude
 * to interact with external tools and services. This server implements
 * the MCP specification to provide a Todo list functionality that
 * Claude can use.
 * 
 * HOW THE SERVER WORKS:
 * 1. It creates an MCP server instance with identity information
 * 2. It defines a set of tools for managing todos
 * 3. It connects to a transport (stdio in this case)
 * 4. It handles incoming tool calls from clients (like Claude)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Import models and schemas
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  DeleteTodoSchema,
  ListTodosByListIdSchema
} from "./models/Todo.js";

import {
  CreateTodoListSchema,
  DeleteTodoListSchema
} from "./models/TodoList.js";

// Import services
import { todoService } from "./services/TodoService.js";
import { todoListService } from "./services/TodoListService.js";
import { dataService } from "./services/DataService.js";

// Import utilities
import { createSuccessResponse, createErrorResponse, formatTodo, formatTodoList, formatTodoListInfo } from "./utils/formatters.js";
import { config } from "./config.js";

/**
 * Create the MCP server
 * 
 * We initialize with identity information that helps clients
 * understand what they're connecting to.
 */
const server = new McpServer({
  name: "Todo-MCP-Server",
  version: "1.0.0",
});

/**
 * Helper function to safely execute operations
 * 
 * This function:
 * 1. Attempts to execute an operation
 * 2. Catches any errors
 * 3. Returns either the result or an Error object
 * 
 * WHY USE THIS PATTERN?
 * - Centralizes error handling
 * - Prevents crashes from uncaught exceptions
 * - Makes error reporting consistent across all tools
 * - Simplifies the tool implementations
 * 
 * @param operation The function to execute
 * @param errorMessage The message to include if an error occurs
 * @returns Either the operation result or an Error
 */
async function safeExecute<T>(operation: () => T | Promise<T>, errorMessage: string): Promise<T | Error> {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    console.error(errorMessage, error);
    if (error instanceof Error) {
      return new Error(`${errorMessage}: ${error.message}`);
    }
    return new Error(errorMessage);
  }
}

/**
 * Tool 1: Create a new todo
 * 
 * This tool:
 * 1. Validates the input (title)
 * 2. Creates a new todo using the service
 * 3. Returns the formatted todo
 * 
 * PATTERN FOR ALL TOOLS:
 * - Register with server.tool()
 * - Define name, description, and parameter schema
 * - Implement the async handler function
 * - Use safeExecute for error handling
 * - Return properly formatted response
 */
server.tool(
  "create-todo",
  "Create a new todo item",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
    title: z.string().min(1, "Title is required"),
  },
  async ({ listId, title }) => {
    const result = await safeExecute(async () => {
      const validatedData = CreateTodoSchema.parse({ listId, title });
      const newTodo = await todoService.createTodo(validatedData);
      return formatTodo(newTodo);
    }, "Failed to create todo");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(`✅ Todo Created:\n\n${result}`);
  }
);

/**
 * Get todos in a list with optional filters
 * 
 * This tool:
 * 1. Gets all todos in a list, or a specific todo if seqno is provided
 * 2. Optionally filters by status
 * 3. Returns formatted results
 */
server.tool(
  "get-todos",
  "Get todos in a list with optional filters for specific todo (seqno) or status",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
    seqno: z.number().int().positive("Sequence number must be a positive integer").optional(),
    status: z.enum(['pending', 'done', 'canceled']).optional(),
  },
  async ({ listId, seqno, status }) => {
    const result = await safeExecute(async () => {
      // If seqno is provided, get a specific todo
      if (seqno !== undefined) {
        const todo = await todoService.getTodo(listId, seqno);
        if (!todo) {
          throw new Error(`Todo with seqno ${seqno} in list ${listId} not found`);
        }
        // If status filter is provided, check if todo matches
        if (status !== undefined && todo.status !== status) {
          return "No todos found matching the specified criteria.";
        }
        return formatTodo(todo);
      }

      // Get all todos in the list
      let todos = await todoService.getTodosByListId(listId);
      
      // Filter by status if provided
      if (status !== undefined) {
        todos = todos.filter(todo => todo.status === status);
      }

      if (todos.length === 0) {
        return "No todos found matching the specified criteria.";
      }

      return formatTodoList(todos);
    }, "Failed to get todos in list");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(result);
  }
);

/**
 * Tool 4: Update a todo
 * 
 * This tool:
 * 1. Validates the input (id required)
 * 2. Ensures at least one field is being updated
 * 3. Updates the todo using the service
 * 4. Returns the formatted updated todo
 */
server.tool(
  "update-todo",
  "Update a todo's status",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
    seqno: z.number().int().positive("Sequence number must be a positive integer"),
    status: z.enum(['pending', 'done', 'canceled']),
  },
  async ({ listId, seqno, status }) => {
    const result = await safeExecute(async () => {
      const validatedData = UpdateTodoSchema.parse({ listId, seqno, status });
      
      const updatedTodo = await todoService.updateTodo(validatedData);
      if (!updatedTodo) {
        throw new Error(`Todo with seqno ${seqno} in list ${listId} not found`);
      }

      return formatTodo(updatedTodo);
    }, "Failed to update todo");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(`✅ Todo Updated:\n\n${result}`);
  }
);




/**
 * TodoList Management Tools
 */

/**
 * Tool: Create a new todo list
 */
server.tool(
  "create-todo-list",
  "Create a new todo list",
  {},
  async () => {
    const result = await safeExecute(async () => {
      const validatedData = CreateTodoListSchema.parse({});
      const newTodoList = await todoListService.createTodoList(validatedData);
      return formatTodoListInfo(newTodoList);
    }, "Failed to create todo list");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(`✅ Todo List Created:\n\n${result}`);
  }
);






/**
 * Main function to start the server
 * 
 * This function:
 * 1. Initializes the server
 * 2. Sets up graceful shutdown handlers
 * 3. Connects to the transport
 * 
 * WHY USE STDIO TRANSPORT?
 * - Works well with the MCP protocol
 * - Simple to integrate with LLM platforms like Claude Desktop
 * - No network configuration required
 * - Easy to debug and test
 */
async function main() {
  console.error("Starting Todo MCP Server...");
  console.error(`Data store: ${config.dataStore.type} at ${config.dataStore.path}`);
  
  try {
    // Initialize the data service
    await dataService.initialize();
    
    /**
     * Set up graceful shutdown to close the data store
     * 
     * This ensures data is properly saved when the server is stopped.
     * Both SIGINT (Ctrl+C) and SIGTERM (kill command) are handled.
     */
    process.on('SIGINT', async () => {
      console.error('Shutting down...');
      await dataService.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.error('Shutting down...');
      await dataService.close();
      process.exit(0);
    });
    
    /**
     * Connect to stdio transport
     * 
     * The StdioServerTransport uses standard input/output for communication,
     * which is how Claude Desktop and other MCP clients connect to the server.
     */
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error("Todo MCP Server running on stdio transport");
  } catch (error) {
    console.error("Failed to start Todo MCP Server:", error);
    await dataService.close();
    process.exit(1);
  }
}

// Start the server
main(); 