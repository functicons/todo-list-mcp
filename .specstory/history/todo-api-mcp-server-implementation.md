## SpecStory

## Todo API MCP Server Implementation (3/5/2025, 2:31:48 PM)

_**User**_

Build an MCP server that:
- Works as a todo api
- Has tools to create, complete, modify and delete todos
- Has tools to search for todos by date or title
- All todos must have a title and description in markdown format
- Exposes a tool to summarize all the active non-completed todos

@llms_mcp.md 
@typescript_mcp_readme.md 

---

_**Assistant**_

<think>This request is asking me to build an MCP (Model Context Protocol) server that functions as a Todo API. Let me summarize the requirements:

1. The server should have tools for:
   - Creating todos
   - Completing todos
   - Modifying todos
   - Deleting todos
   - Searching todos by date or title
   - Summarizing active (non-completed) todos

2. Todo items must have:
   - A title
   - A description in markdown format

3. The user has attached the MCP documentation and a TypeScript MCP SDK README, so it's clear they want a TypeScript-based implementation.

Let me approach this by:
1. Setting up the basic MCP server structure
2. Creating a data model for todos
3. Implementing the required tools
4. Adding search functionality
5. Implementing the summary tool
6. Setting up the transport layer for the server

I'll implement this using the TypeScript SDK for MCP.</think>I'll create a Todo MCP server for you, Sir. This will implement all the functionality you've requested using the TypeScript SDK.

Let me first set up the project structure and implement the server.

## Project Setup

Let's first create a new project and install the necessary dependencies:

---

_****_



---

_****_

Now let's initialize the project and install the required dependencies:

---

_****_



---

_****_



---

_**User**_

we are already in the right folder "todo-list-mcp", no need to enter the folder again

---

_**Assistant**_

<think>The user is right. We don't need to `cd` again into the folder since we're already in the correct directory. Let me adjust the command accordingly.</think>You're absolutely right, Sir. Thank you for the correction. Let's initialize the project without changing directories:

---

_****_



---

_****_

Now, let's install the necessary dependencies:

---

_****_



---

_****_

Let's also install the type definitions for UUID and other dev dependencies:

---

_****_



---

_****_

Let's create a TypeScript configuration file:

---

_****_



---

_****_

Now, let's update the package.json to include scripts for building and running our server:

---

_****_



---

_****_

Now let's create our Todo model and data store. First, let's create the models:

---

_****_



---

_****_

Now, let's create our data store to manage todos:

---

_****_



---

_****_

Now, let's create utility functions for formatting our responses:

---

_****_



---

_****_

Now, let's create our MCP server with the todo tools:

---

_****_



---

_****_

Finally, let's create a simple React component that could be used to display the Todo items in a UI:

---

_****_



---

_****_

Now let's create a README for the project:

---

_****_



---

_****_

Now, let's build the project:

---

_****_



---

_****_

Looks like we have some TypeScript errors related to our React component and some type issues with our MCP server responses. Let's fix them one by one:

First, let's delete the React component since it's optional and not really necessary for the MCP server to function:

---

_****_



---

_****_

Now, let's fix the type issues in our MCP server responses. The current version of the MCP SDK requires explicit type property with specific values:

---

_****_



---

_****_

Let's try building again:

---

_****_



---

_****_

Great! The build was successful. Now, let's make sure our package.json has the correct scripts to run the project. Let's add a 'start' script:

---

_****_



---

_****_

Perfect! The server started successfully. Now let's create a simple client script to test our Todo MCP server:

---

_****_



---

_****_

Now let's update the package.json to include a script for running our test client:

---

_****_



---

_****_

Let's build and run the test script:

---

_****_



---

_****_

It seems the package.json didn't update correctly. Let's try again:

---

_****_



---

_****_

Great! Now let's build and run the test script:

---

_****_



---

_****_

We need to fix the type issues in our client code:

---

_****_



---

_****_

Let's try running the test again:

---

_****_



---

_****_

Perfect! Our Todo MCP server is working correctly. Let's recap what we've built and provide a summary:

1. A fully functional TypeScript-based MCP server for managing todos
2. Features built into the server:
   - Create, read, update, and delete (CRUD) operations for todos
   - Marking todos as complete
   - Searching todos by title or date
   - Summarizing active todos
3. A test client that demonstrates all the functionality

## Summary of What We've Built

We've created a Todo List MCP Server that exposes the following tools:

1. `create-todo` - Create a new todo item with title and description in markdown format
2. `list-todos` - List all todos
3. `get-todo` - Get a specific todo by ID
4. `update-todo` - Update a todo's title or description
5. `complete-todo` - Mark a todo as completed
6. `delete-todo` - Delete a todo
7. `search-todos-by-title` - Search todos by title (case insensitive partial match)
8. `search-todos-by-date` - Search todos by creation date (format: YYYY-MM-DD)
9. `list-active-todos` - List all non-completed todos
10. `summarize-active-todos` - Generate a summary of all active (non-completed) todos

The server uses an in-memory data store for simplicity, but you could easily extend it to use a database or file system for persistence.

## How to Use with Claude

To use this server with Claude for Desktop, you would:

1. Update your `claude_desktop_config.json` file:
```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["/absolute/path/to/todo-list-mcp/dist/index.js"]
    }
  }
}
```

2. Restart Claude for Desktop
3. Interact with your todos through natural language, like:
   - "Create a todo for my upcoming meeting"
   - "List all my active todos"
   - "Mark the meeting todo as completed"
   - "Summarize what I need to work on today"

## Next Steps

If you want to enhance the server, consider:

1. Adding persistence through a database or file system
2. Adding more search options (by completion status, date ranges, etc.)
3. Adding tags or categories to todos
4. Implementing user authentication
5. Adding reminder functionality
6. Creating a simple web UI to interact with the MCP server

This completes the implementation of your Todo MCP server, Mr. RegiByte. The server provides all the functionality you requested and works as expected. Let me know if you'd like any enhancements or have any questions!

---

_**User**_

Summarize what this project is, how it is structured, and how an LLM may continue the work from here, including the next steps that you mentioned

We will use this summary to quickly start new tasks in the future

---

_**Assistant**_

<think>Let me review the provided files to understand the project structure, purpose, and implementation details:

1. **Project Overview**: This is a Todo List MCP (Model Context Protocol) server implemented in TypeScript. It provides tools for managing todo items through the MCP protocol, which allows clients like Claude for Desktop to interact with it.

2. **Project Structure**:
   - `src/models/Todo.ts`: Defines the Todo interface and schema for validation
   - `src/services/TodoService.ts`: Implements the core business logic for managing todos
   - `src/utils/formatters.ts`: Contains utility functions for formatting responses
   - `src/index.ts`: Main server entry point that sets up the MCP server and tools
   - `src/client.ts`: A simple client for testing the server
   - Configuration files like `tsconfig.json` and `package.json`

3. **Key Functionalities**:
   - Creating todos with title and markdown description
   - Getting todos by ID
   - Listing all todos
   - Filtering active (non-completed) todos
   - Updating todo information
   - Completing todos
   - Deleting todos
   - Searching todos by title or date
   - Summarizing active todos

4. **Implementation Details**:
   - The server uses the MCP TypeScript SDK (@modelcontextprotocol/sdk)
   - It exposes multiple tools that can be called by an LLM or client
   - Data persistence is handled in-memory using a Map in TodoService
   - Zod is used for schema validation
   - UUID is used for generating unique IDs

From what I can see, the implementation appears to be complete with all the requested features. The code is well-organized and includes error handling with proper response formatting.

Next steps that could be mentioned:
1. Adding persistent storage (e.g., using a database instead of in-memory Map)
2. Implementing user authentication
3. Adding categories or tags to todos
4. Implementing due dates and reminders
5. Creating a web interface for the todo list
6. Adding support for attachments or links in todos
7. Implementing priority levels
8. Adding recurring todo functionality
9. Implementing notification systems</think># Todo List MCP Server - Project Summary

## Project Overview
This project is a fully functional Todo List server built using the Model Context Protocol (MCP). It provides a comprehensive set of tools for managing todo items that can be accessed by LLMs like Claude through the MCP interface.

## Project Structure
- **src/models/Todo.ts**: Defines the Todo data model and validation schemas
- **src/services/TodoService.ts**: Core business logic for managing todos (CRUD operations)
- **src/utils/formatters.ts**: Utility functions for formatting responses and todo data
- **src/index.ts**: Main server entry point that sets up MCP tools and connections
- **src/client.ts**: Simple test client for local testing

## Key Features
The server implements these MCP tools:
1. Creating new todos with markdown descriptions
2. Retrieving todos by ID
3. Listing all or active (non-completed) todos
4. Updating todo information
5. Completing todos
6. Deleting todos
7. Searching todos by title
8. Searching todos by creation date
9. Summarizing active todos

## Technical Implementation
- Built with TypeScript using the MCP SDK
- Uses in-memory storage with a Map for todos
- Implements proper error handling and response formatting
- Includes Zod schema validation
- Uses UUID for unique identifiers

## Current Status
The implementation is complete with all requested functionality and includes:
- Type-safe code with interfaces and schemas
- Well-structured modular design
- Clean error handling with appropriate responses
- Proper formatting for todos with markdown support

## How an LLM Can Continue Development
An LLM can help improve this project in several ways:

### Immediate Next Steps
1. **Add persistence**: Implement database storage (e.g., SQLite, MongoDB) instead of in-memory storage
2. **Enhance search capabilities**: Add more advanced search options like full-text search
3. **Add categories/tags**: Implement categorization for better organization
4. **Add due dates**: Implement date-based scheduling and priority

### Future Enhancements
1. **User authentication**: Add multi-user support with authentication
2. **Web interface**: Develop a simple web UI for the todo list
3. **Recurring todos**: Add support for repeating tasks
4. **Attachments**: Allow files or links to be attached to todos
5. **Notifications**: Implement reminder functionality

### Testing Improvements
1. **Unit tests**: Add comprehensive test coverage
2. **Integration tests**: Test with actual MCP clients
3. **Load testing**: Ensure performance with many todos

## Usage
The server can be used with Claude for Desktop by configuring it in the `claude_desktop_config.json` file, allowing natural language interaction with your todo list.

---



---

