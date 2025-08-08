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
  CompleteTodoSchema,
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
 * 1. Validates the input (title and description)
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
    description: z.string().min(1, "Description is required"),
  },
  async ({ listId, title, description }) => {
    const result = await safeExecute(async () => {
      const validatedData = CreateTodoSchema.parse({ listId, title, description });
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
 * Tool 2: List all todos
 * 
 * This tool:
 * 1. Retrieves all todos from the service
 * 2. Formats them as a list
 * 3. Returns the formatted list
 */
server.tool(
  "list-todos",
  "List all todos",
  {},
  async () => {
    const result = await safeExecute(async () => {
      const todos = await todoService.getAllTodos();
      return formatTodoList(todos);
    }, "Failed to list todos");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(result);
  }
);

/**
 * Tool 3: Get a specific todo by ID
 * 
 * This tool:
 * 1. Validates the input ID
 * 2. Retrieves the specific todo
 * 3. Returns the formatted todo
 */
server.tool(
  "get-todo",
  "Get a specific todo by its list ID and sequence number",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
    seqno: z.number().int().positive("Sequence number must be a positive integer"),
  },
  async ({ listId, seqno }) => {
    const result = await safeExecute(async () => {
      const todo = await todoService.getTodo(listId, seqno);
      if (!todo) {
        throw new Error(`Todo with seqno ${seqno} in list ${listId} not found`);
      }
      return formatTodo(todo);
    }, "Failed to get todo");

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
 * 1. Validates the input (id required, title/description optional)
 * 2. Ensures at least one field is being updated
 * 3. Updates the todo using the service
 * 4. Returns the formatted updated todo
 */
server.tool(
  "update-todo",
  "Update a todo title or description",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
    seqno: z.number().int().positive("Sequence number must be a positive integer"),
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
  },
  async ({ listId, seqno, title, description }) => {
    const result = await safeExecute(async () => {
      const validatedData = UpdateTodoSchema.parse({ listId, seqno, title, description });
      
      // Ensure at least one field is being updated
      if (!title && !description) {
        throw new Error("At least one field (title or description) must be provided");
      }

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
 * Tool 5: Complete a todo
 * 
 * This tool:
 * 1. Validates the todo ID
 * 2. Marks the todo as completed using the service
 * 3. Returns the formatted completed todo
 * 
 * WHY SEPARATE FROM UPDATE?
 * - Provides a dedicated semantic action for completion
 * - Simplifies the client interaction model
 * - It's easier for the LLM to match the user intent with the completion action
 * - Makes it clear in the UI that the todo is done
 */
server.tool(
  "complete-todo",
  "Mark a todo as completed",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
    seqno: z.number().int().positive("Sequence number must be a positive integer"),
  },
  async ({ listId, seqno }) => {
    const result = await safeExecute(async () => {
      const validatedData = CompleteTodoSchema.parse({ listId, seqno });
      const completedTodo = await todoService.completeTodo(validatedData);
      
      if (!completedTodo) {
        throw new Error(`Todo with seqno ${seqno} in list ${listId} not found`);
      }

      return formatTodo(completedTodo);
    }, "Failed to complete todo");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(`✅ Todo Completed:\n\n${result}`);
  }
);

/**
 * Tool 6: Delete a todo
 * 
 * This tool:
 * 1. Validates the todo ID
 * 2. Retrieves the todo to be deleted (for the response)
 * 3. Deletes the todo using the service
 * 4. Returns a success message with the deleted todo's title
 */
server.tool(
  "delete-todo",
  "Delete a todo",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
    seqno: z.number().int().positive("Sequence number must be a positive integer"),
  },
  async ({ listId, seqno }) => {
    const result = await safeExecute(async () => {
      const validatedData = DeleteTodoSchema.parse({ listId, seqno });
      const todo = await todoService.getTodo(validatedData.listId, validatedData.seqno);
      
      if (!todo) {
        throw new Error(`Todo with seqno ${seqno} in list ${listId} not found`);
      }
      
      const success = await todoService.deleteTodo(validatedData);
      
      if (!success) {
        throw new Error(`Failed to delete todo with seqno ${seqno} in list ${listId}`);
      }
      
      return todo.title;
    }, "Failed to delete todo");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(`✅ Todo Deleted: "${result}"`);
  }
);

/**
 * Tool 7: List active todos
 * 
 * This tool:
 * 1. Retrieves all non-completed todos
 * 2. Returns a formatted list of active todos
 * 
 * WHY SEPARATE FROM LIST ALL?
 * - Active todos are typically what users most often want to see
 * - Reduces noise by filtering out completed items
 * - Provides a clearer view of outstanding work
 */
server.tool(
  "list-active-todos",
  "List all non-completed todos",
  {},
  async () => {
    const result = await safeExecute(async () => {
      const todos = await todoService.getActiveTodos();
      return formatTodoList(todos);
    }, "Failed to list active todos");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(result);
  }
);

/**
 * Tool 8: Summarize active todos
 * 
 * This tool:
 * 1. Generates a summary of all active todos
 * 2. Returns a formatted markdown summary
 * 
 * WHY HAVE A SUMMARY?
 * - Provides a quick overview without details
 * - Perfect for a quick status check
 * - Easier to read than a full list when there are many todos
 * - Particularly useful for LLM interfaces where conciseness matters
 */
server.tool(
  "summarize-active-todos",
  "Generate a summary of all active (non-completed) todos",
  {},
  async () => {
    const result = await safeExecute(async () => {
      return await todoService.summarizeActiveTodos();
    }, "Failed to summarize active todos");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(result);
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
  {
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
  },
  async ({ name, description }) => {
    const result = await safeExecute(async () => {
      const validatedData = CreateTodoListSchema.parse({ name, description });
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
 * Tool: Delete a todo list
 */
server.tool(
  "delete-todo-list",
  "Delete a todo list and all its todos",
  {
    id: z.string().uuid("Invalid TodoList ID"),
  },
  async ({ id }) => {
    const result = await safeExecute(async () => {
      const validatedData = DeleteTodoListSchema.parse({ id });
      const todoList = await todoListService.getTodoList(validatedData.id);
      
      if (!todoList) {
        throw new Error(`Todo list with ID ${id} not found`);
      }
      
      const success = await todoListService.deleteTodoList(validatedData.id);
      
      if (!success) {
        throw new Error(`Failed to delete todo list with ID ${id}`);
      }
      
      return todoList.name;
    }, "Failed to delete todo list");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(`✅ Todo List Deleted: "${result}" (and all its todos)`);
  }
);

/**
 * Tool: List todos by list ID
 */
server.tool(
  "list-todos-by-list",
  "List all todos in a specific todo list",
  {
    listId: z.string().uuid("Invalid TodoList ID"),
  },
  async ({ listId }) => {
    const result = await safeExecute(async () => {
      const validatedData = ListTodosByListIdSchema.parse({ listId });
      const todos = await todoService.getTodosByListId(validatedData.listId);
      return formatTodoList(todos);
    }, "Failed to list todos by list");

    if (result instanceof Error) {
      return createErrorResponse(result.message);
    }

    return createSuccessResponse(result);
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