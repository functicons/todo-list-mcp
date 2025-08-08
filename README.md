# Todo List MCP Server

A Model Context Protocol (MCP) server that provides todo list management with multiple lists and session isolation.

## Features

- **Multiple Todo Lists**: Create and manage separate todo lists
- **Session Isolation**: Each AI client gets its own private todo lists
- **Flexible Storage**: Choose between JSON files or SQLite database
- **Rich Todo Management**: Create, update, complete, search, and organize tasks
- **Markdown Support**: Full markdown formatting in todo descriptions

## Installation

```bash
# Clone the repository
git clone https://github.com/RegiByte/todo-list-mcp.git
cd todo-list-mcp

# Build the project (automatically installs dependencies if needed)
npm run build
```

## Configuration

### Claude Code

Add this to your `~/.claude/settings.json`:

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

### Gemini CLI

Add this to your `~/.gemini/settings.json`:

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

The server automatically uses JSON file storage by default. To use SQLite instead:

```json
{
  "mcpServers": {
    "todo-list": {
      "command": "node",
      "args": ["/absolute/path/to/todo-list-mcp/dist/src/index.js"],
      "env": {
        "TODO_DATA_STORE": "sqlite"
      }
    }
  }
}
```

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
```

## License

MIT