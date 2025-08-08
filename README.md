# Todo List MCP Server

A Model Context Protocol (MCP) server that provides todo list management with multiple lists and session isolation.

## Features

- **Multiple Todo Lists**: Create and manage separate todo lists
- **Session Isolation**: Each AI client gets its own private todo lists
- **Flexible Storage**: Choose between JSON files or SQLite database
- **Rich Todo Management**: Create, update, complete, search, and organize tasks
- **Markdown Support**: Full markdown formatting in todo descriptions

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
- "Create a new todo list called 'Work Projects'"
- "Add a todo to my work list: prepare quarterly presentation"
- "List all my todo lists"

### Managing Tasks
- "Show me all todos in my work projects list"
- "Mark the presentation todo as completed"
- "Update my presentation todo to include slide design"
- "Create a high-priority todo for the client meeting tomorrow"

### Organization & Search
- "Summarize all my active todos"
- "Search for todos containing 'meeting'"
- "Show me all uncompleted tasks"
- "List todos I created today"

### Multiple Lists
- "Create a personal todo list for weekend activities"
- "Move my gym todo from work list to personal list" (by recreating)
- "Delete my old project list and all its todos"

## Available Tools

The server provides these tools for AI clients:

**Todo Management:**
- Create, update, complete, and delete todos
- Search todos by title or date
- List active (incomplete) todos
- Get todo summaries

**List Management:**
- Create and delete todo lists
- List todos within specific lists
- Organize todos across multiple lists

**Data & Search:**
- Full-text search across all todos
- Date-based filtering
- Completion status filtering

## API Specification

### Todo Operations

#### `create-todo`
**Description**: Create a new todo item in a specific list  
**Parameters**:
- `listId` (string, required): UUID of the todo list
- `title` (string, required): Todo title (minimum 1 character)
- `description` (string, required): Todo description (minimum 1 character)

#### `get-todo`
**Description**: Retrieve a specific todo by ID  
**Parameters**:
- `id` (string, required): UUID of the todo item

#### `update-todo`
**Description**: Update a todo's title or description  
**Parameters**:
- `id` (string, required): UUID of the todo item
- `title` (string, optional): New title
- `description` (string, optional): New description

#### `complete-todo`
**Description**: Mark a todo as completed  
**Parameters**:
- `id` (string, required): UUID of the todo item

#### `delete-todo`
**Description**: Delete a todo permanently  
**Parameters**:
- `id` (string, required): UUID of the todo item

#### `list-todos`
**Description**: List all todos across all lists  
**Parameters**: None

#### `list-active-todos`
**Description**: List all non-completed todos  
**Parameters**: None

#### `summarize-active-todos`
**Description**: Generate a summary of all active todos  
**Parameters**: None

### Search Operations

#### `search-todos-by-title`
**Description**: Search todos by title (case-insensitive partial match)  
**Parameters**:
- `title` (string, required): Search term to match in todo titles

#### `search-todos-by-date`
**Description**: Search todos by creation date  
**Parameters**:
- `date` (string, required): Date in YYYY-MM-DD format

### Todo List Operations

#### `create-todo-list`
**Description**: Create a new todo list  
**Parameters**:
- `name` (string, required): Name of the todo list (minimum 1 character)
- `description` (string, required): Description of the todo list (minimum 1 character)

#### `delete-todo-list`
**Description**: Delete a todo list and all its todos  
**Parameters**:
- `id` (string, required): UUID of the todo list

#### `list-todos-by-list`
**Description**: List all todos in a specific todo list  
**Parameters**:
- `listId` (string, required): UUID of the todo list

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

For developers wanting to extend or contribute:

```bash
# Run in development mode
npm run dev

# Run tests
npm run test:integration

# Test the client
npm run test-client

# Debug SQLite database contents
npm run dump-sqlite
```

### Debugging

**SQLite Database Inspection:**
```bash
# Dump SQLite database contents (requires sqlite3 command)
npm run dump-sqlite

# Or specify custom database path
./scripts/dump-sqlite.sh /path/to/custom/database.sqlite
```

The dump script shows:
- Database schema and table structure
- All todo lists and todos with their relationships  
- Statistics (active/completed counts, todos per list)
- Recent activity and advanced queries

## License

MIT