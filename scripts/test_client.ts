/**
 * client.ts
 * 
 * This file implements a test client for the Todo MCP server.
 * It demonstrates how to connect to the server, call various tools,
 * and handle the responses.
 * 
 * WHY HAVE A TEST CLIENT?
 * - Validates that the server works correctly
 * - Provides a working example of how to use the MCP client SDK
 * - Makes it easy to test changes without needing an LLM
 * - Serves as documentation for how to interact with the server
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Response content type definition
 * 
 * The MCP protocol returns content as an array of typed objects.
 * This interface defines the structure of text content items.
 */
interface ContentText {
  type: "text";
  text: string;
}

/**
 * Main function that runs the test client
 * 
 * This function:
 * 1. Connects to the Todo MCP server
 * 2. Demonstrates all the available tools
 * 3. Creates, updates, completes, and deletes a test todo
 */
async function main() {
  console.log("Starting Todo MCP Test Client...");

  try {
    /**
     * Create a client transport to the server
     * 
     * The StdioClientTransport launches the server as a child process
     * and communicates with it via standard input/output.
     * 
     * WHY STDIO TRANSPORT?
     * - Simple to set up and use
     * - Works well for local testing
     * - Doesn't require network configuration
     * - Similar to how Claude Desktop launches MCP servers
     */
    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/src/index.js"],
    });

    /**
     * Create and connect the client
     * 
     * We configure the client with basic identity information
     * and the capabilities it needs (tools in this case).
     */
    const client = new Client(
      {
        name: "todo-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Connect to the server through the transport
    await client.connect(transport);
    console.log("Connected to Todo MCP Server");

    /**
     * List available tools
     * 
     * This demonstrates how to query what tools the server provides,
     * which is useful for discovery and documentation.
     */
    const toolsResult = await client.listTools();
    console.log("\nAvailable tools:", toolsResult.tools.map(tool => tool.name));

    /**
     * Create a test todo list first
     * 
     * Since the new version supports multiple todo lists, we need to
     * create a list first before adding todos to it.
     */
    console.log("\nCreating a test todo list...");
    const createListResult = await client.callTool({
      name: "create-todo-list",
      arguments: {}
    });
    
    const createListContent = createListResult.content as ContentText[];
    console.log(createListContent[0].text);

    // Extract the list ID from the JSON response
    let listId: string | null = null;
    try {
      const responseData = JSON.parse(createListContent[0].text);
      if (responseData.success && responseData.data && responseData.data.id) {
        listId = responseData.data.id;
      }
    } catch (parseError) {
      console.error("Failed to parse create list response:", parseError);
    }

    if (!listId) {
      throw new Error("Failed to extract list ID from response");
    }

    /**
     * Create multiple test todos
     * 
     * This demonstrates creating multiple todos in the same list.
     */
    console.log("\nCreating multiple test todos...");
    
    const todoTitles = [
      "Learn about MCP",
      "Set up development environment", 
      "Write unit tests",
      "Deploy to production",
      "Document the API"
    ];
    
    const createdTodos: Array<{seqno: number, title: string}> = [];
    
    for (const title of todoTitles) {
      console.log(`\nCreating todo: "${title}"`);
      const createTodoResult = await client.callTool({
        name: "create-todo",
        arguments: {
          listId: listId,
          title: title
        }
      });
      
      const createContent = createTodoResult.content as ContentText[];
      console.log(createContent[0].text);
      
      // Extract the todo seqno from the JSON response
      try {
        const todoResponseData = JSON.parse(createContent[0].text);
        if (todoResponseData.success && todoResponseData.data && todoResponseData.data.seqno) {
          createdTodos.push({
            seqno: todoResponseData.data.seqno,
            title: title
          });
        }
      } catch (parseError) {
        console.error(`Failed to parse create todo response for "${title}":`, parseError);
      }
    }
    
    console.log(`\nCreated ${createdTodos.length} todos in the list`);
    
    // Use the first created todo for subsequent operations
    let todoSeqno: number | null = createdTodos.length > 0 ? createdTodos[0].seqno : null;

    // Only proceed if we successfully created a todo and extracted its seqno
    if (todoSeqno) {

      /**
       * Get todos in the list
       * 
       * This demonstrates the get-todos tool, which shows
       * todos for a specific list.
       */
      console.log("\nListing todos in the list...");
      const getTodosResult = await client.callTool({
        name: "get-todos",
        arguments: {
          listId: listId
        }
      });
      const getTodosContent = getTodosResult.content as ContentText[];
      console.log(getTodosContent[0].text);

      /**
       * Demonstrate different todo status updates
       * 
       * This shows how to update todos to different statuses:
       * - done: Mark a todo as completed
       * - canceled: Cancel a todo 
       * - pending: Mark as pending (default status)
       */
      
      if (createdTodos.length >= 3) {
        // Complete the first todo (mark as done)
        console.log(`\nCompleting todo: "${createdTodos[0].title}"`);
        const completeResult = await client.callTool({
          name: "update-todo",
          arguments: {
            listId: listId,
            seqno: createdTodos[0].seqno,
            status: "done"
          }
        });
        const completeContent = completeResult.content as ContentText[];
        console.log(completeContent[0].text);

        // Cancel the second todo
        console.log(`\nCanceling todo: "${createdTodos[1].title}"`);
        const cancelResult = await client.callTool({
          name: "update-todo",
          arguments: {
            listId: listId,
            seqno: createdTodos[1].seqno,
            status: "canceled"
          }
        });
        const cancelContent = cancelResult.content as ContentText[];
        console.log(cancelContent[0].text);

        // Reset the third todo back to pending status
        console.log(`\nResetting todo to pending: "${createdTodos[2].title}"`);
        const pendingResult = await client.callTool({
          name: "update-todo",
          arguments: {
            listId: listId,
            seqno: createdTodos[2].seqno,
            status: "pending"
          }
        });
        const pendingContent = pendingResult.content as ContentText[];
        console.log(pendingContent[0].text);
      } else {
        // Fallback to single todo update if we don't have enough todos
        console.log("\nUpdating todo status to 'done'...");
        const updateResult = await client.callTool({
          name: "update-todo",
          arguments: {
            listId: listId,
            seqno: todoSeqno,
            status: "done"
          }
        });
        const updateContent = updateResult.content as ContentText[];
        console.log(updateContent[0].text);
      }

      /**
       * Get all todos to see the final state with different statuses
       */
      console.log("\nFinal state - listing all todos with their statuses...");
      const getFinalTodosResult = await client.callTool({
        name: "get-todos",
        arguments: {
          listId: listId
        }
      });
      const getFinalContent = getFinalTodosResult.content as ContentText[];
      console.log(getFinalContent[0].text);
    }

    // Close the client connection
    await client.close();
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error in test client:", error);
    process.exit(1);
  }
}

// Start the test client
main();
 