# Todo List MCP Server

A Model Context Protocol (MCP) server that provides todo list management with multiple lists and session isolation.

## Features

- **Multiple Todo Lists**: Create and manage separate todo lists
- **Session Isolation**: Each AI client gets its own private todo lists
- **Flexible Storage**: Choose between JSON files or SQLite database
- **Streamlined Todo Management**: Create, update, complete, and organize tasks with a simplified data model

## Installation

### Option 1: Using npx (Recommended)

```bash
# Run directly from GitHub repository
npx github:functicons/todo-list-mcp
```

### Option 2: Local Installation

```bash
# Clone the repository
git clone https://github.com/functicons/todo-list-mcp.git
cd todo-list-mcp

# Build the project (automatically installs dependencies if needed)
npm run build
```

## Configuration

### Claude Code & Gemini CLI

Add this configuration to your settings file:
- **Claude Code**: `~/.claude/settings.json`
- **Gemini CLI**: `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "todo-list": {
      "command": "npx",
      "args": ["github:functicons/todo-list-mcp"]
    }
  }
}
```

**Alternative (local installation):**
```json
{
  "mcpServers": {
    "todo-list": {
      "command": "node",
      "args": ["/absolute/path/to/todo-list-mcp/dist/src/index.js"]
    }
  }
}
```

### Storage Options

The server supports two storage backends:

**JSON File Storage (Default):**
- **Location**: `~/.todo-list-mcp/todos.json`
- **Format**: Human-readable JSON format

```json
{
  "mcpServers": {
    "todo-list": {
      "command": "npx",
      "args": ["github:functicons/todo-list-mcp"],
      "env": {
        "TODO_DATA_STORE": "json"
      }
    }
  }
}
```

**SQLite Database Storage:**
- **Location**: `~/.todo-list-mcp/todos.sqlite`
- **Format**: Binary SQLite database

```json
{
  "mcpServers": {
    "todo-list": {
      "command": "npx",
      "args": ["github:functicons/todo-list-mcp"],
      "env": {
        "TODO_DATA_STORE": "sqlite"
      }
    }
  }
}
```

*Note: JSON is the default, so you can omit the `env` section entirely for JSON storage.*

## Usage Examples

Once configured with your AI client, try these commands:

### Getting Started
- "Create a new todo list"
- "Add a todo: prepare quarterly presentation" 
- "List all my todos"

### Managing Tasks
- "Show me all todos in a specific list"
- "Update the presentation todo to 'completed'"
- "Create a todo for the client meeting tomorrow"
- "List all todos across my lists"

### Multiple Lists
- "Create a personal todo list"
- "Move my gym todo from work list to personal list" (by recreating)
- "Delete my old project list and all its todos"

## Available Tools

The server provides these tools for AI clients:

**Todo Management:**
- Create, update, and delete todos
- List todos with streamlined data structure

**List Management:**
- Create and delete todo lists
- Organize todos across multiple lists

## API Specification

### Todo Operations

#### `create-todo`
**Description**: Create a new todo item in a specific list  
**Parameters**:
- `listId` (string, required): UUID of the todo list
- `title` (string, required): Todo title (minimum 1 character)

#### `get-todos`
**Description**: List all todos across all todo lists, or filter by specific list
**Parameters**:
- `listId` (string, optional): UUID of specific todo list to filter by

#### `update-todo`
**Description**: Update a todo's status  
**Parameters**:
- `listId` (string, required): UUID of the todo list
- `seqno` (number, required): Sequence number of the todo in the list
- `status` (string, required): New status (`pending`, `completed`, or `canceled`)


### Todo List Operations

#### `create-todo-list`
**Description**: Create a new todo list  
**Parameters**: None (ID is generated automatically)

#### `delete-todo-list`
**Description**: Delete a todo list and all its todos  
**Parameters**:
- `id` (string, required): UUID of the todo list


### Response Format

All tools return structured responses with:
- **Success**: Formatted text with todo/list information
- **Error**: Clear error message explaining what went wrong

All UUIDs are validated, and required fields are enforced. The server uses TypeScript with Zod schemas for runtime validation.

## Data Storage

Your todo data is stored locally:

- **JSON format**: `~/.todo-list-mcp/todos.json` (human-readable)
- **SQLite format**: `~/.todo-list-mcp/todos.sqlite` (better for large datasets)

## Privacy & Security

- **Local storage only**: All data stays on your machine
- **Session isolation**: Each AI client sees only its own todo lists
- **No network communication**: Server runs entirely offline

## Troubleshooting

### Server won't start
- Ensure Node.js is installed and accessible
- Verify the absolute path in your configuration
- Check that the build completed successfully (`npm run build`)

### Can't see todos in AI client
- Restart your AI client after configuration changes
- Verify the MCP server appears in your client's server list
- Create a new todo list first - the server starts empty

### Performance with many todos
- Consider switching to SQLite storage for better performance
- Use specific list queries instead of listing all todos

## Development

For developers wanting to extend, contribute, or understand the internal architecture, see the [Developer Guide](docs/developer_guide.md).

The developer guide includes:
- **Project Structure**: Detailed codebase organization
- **Internal Architecture**: How the system works internally
- **Testing Strategy**: Comprehensive testing approach
- **Development Workflow**: Setup, debugging, and extension patterns
- **Performance Considerations**: Storage backend comparisons
- **Extension Points**: How to add new features

## License

MIT