# Todo List MCP Server: Developer Guide

## Overview

This Todo List MCP Server is a complete implementation of the Model Context Protocol (MCP) specification, providing AI models like Claude with todo list management capabilities. The project serves as both a functional todo system and an educational example of best practices in MCP server development.

### What is MCP?

The Model Context Protocol (MCP) is a specification that enables AI models to interact with external tools and services through a standardized interface. It provides:

- **Extended Capabilities**: AI models can perform actions beyond text generation
- **Standardization**: Consistent tool interface regardless of implementation
- **Controlled Access**: Secure exposure of specific functionality to AI models
- **Real-time Integration**: Access to up-to-date information and real-world actions

## Project Structure

```
todo-list-mcp/
├── src/
│   ├── index.ts                 # Main MCP server entry point
│   ├── config.ts               # Application configuration
│   ├── models/                 # Data models and schemas
│   │   ├── Todo.ts             # Todo model and validation schemas
│   │   └── TodoList.ts         # TodoList model and schemas
│   ├── services/               # Business logic layer
│   │   ├── DataService.ts      # Centralized data store access
│   │   ├── TodoService.ts      # Todo-specific operations
│   │   ├── TodoListService.ts  # TodoList-specific operations
│   │   └── DatabaseService.ts  # Database operations (legacy)
│   ├── stores/                 # Data persistence implementations
│   │   ├── DataStoreFactory.ts # Factory for creating data stores
│   │   ├── JsonFileDataStore.ts# JSON file storage implementation
│   │   └── SqliteDataStore.ts  # SQLite database implementation
│   ├── interfaces/             # Type definitions
│   │   └── DataStore.ts        # Data store interface contract
│   ├── utils/                  # Utility functions
│   │   └── formatters.ts       # Response formatting helpers
│   └── exceptions/             # Custom exceptions
│       └── DataStoreExceptions.ts
├── tests/                      # Test suite
│   ├── run_tests.ts           # Test runner
│   ├── integration_tests.ts   # Integration tests
│   ├── migration_tests.ts     # Data migration tests
│   └── test_framework.ts      # Custom test framework
├── scripts/                   # Utility scripts
│   ├── test_client.ts         # MCP client for testing
│   ├── inspect-mcp-server.sh  # Server inspection utility
│   └── dump-sqlite.sh         # SQLite database dump
├── docs/                      # Documentation
│   └── developer_guide.md     # This file
├── dist/                      # Compiled JavaScript output
├── package.json               # Node.js configuration
└── tsconfig.json              # TypeScript configuration
```

## Architecture & Internal Workings

### Core Architecture

The application follows a layered architecture pattern:

1. **Presentation Layer** (`index.ts`): MCP server definitions and tool implementations
2. **Service Layer** (`services/`): Business logic and data orchestration
3. **Data Access Layer** (`stores/`): Storage implementation abstractions
4. **Model Layer** (`models/`): Data structures and validation

### Data Model

The system uses a simplified, efficient data model:

#### Todo
- `listId` (UUID): Foreign key to TodoList
- `seqno` (number): Sequence number within the list (1, 2, 3...)
- `title` (string): Todo content
- `status` (enum): 'pending', 'completed', or 'canceled'

**Composite Primary Key**: `(listId, seqno)` ensures uniqueness and provides natural ordering.

#### TodoList
- `id` (UUID): Primary key
- `createdAt` (ISO string): Creation timestamp

### Storage Implementations

#### JSON File Store (`JsonFileDataStore.ts`)
- **File Structure**: Single JSON file with nested objects
- **Atomicity**: Uses temp files and atomic moves
- **Performance**: Good for small datasets, human-readable
- **Use Case**: Development, small personal todo lists

#### SQLite Store (`SqliteDataStore.ts`)
- **Schema**: Normalized tables with foreign key constraints
- **Transactions**: ACID compliance for data integrity
- **Performance**: Excellent for larger datasets
- **Use Case**: Production deployments, concurrent access

### Service Layer Design

#### DataService (Singleton)
Central coordinator that:
- Initializes the configured data store
- Provides unified access interface
- Handles graceful shutdown
- Manages configuration validation

#### TodoService & TodoListService
Domain-specific services that:
- Implement business logic
- Handle data validation
- Coordinate with data stores
- Provide clean APIs for MCP tools

### Error Handling Strategy

The application implements comprehensive error handling:

1. **Input Validation**: Zod schemas catch invalid inputs early
2. **Safe Execution**: `safeExecute()` wrapper prevents crashes
3. **Graceful Degradation**: Meaningful error messages for users
4. **Resource Cleanup**: Proper cleanup in error scenarios

```typescript
// Example error handling pattern
const result = await safeExecute(async () => {
  const validatedData = CreateTodoSchema.parse(input);
  return await todoService.createTodo(validatedData);
}, "Failed to create todo");

if (result instanceof Error) {
  return createErrorResponse(result.message);
}
```

### MCP Tool Implementation Pattern

Each MCP tool follows a consistent pattern:

1. **Registration**: Define name, description, and parameter schema
2. **Validation**: Use Zod schemas for input validation
3. **Execution**: Safe execution with error handling
4. **Formatting**: Consistent response formatting for AI consumption

```typescript
server.tool(
  "tool-name",                    // Unique identifier
  "Tool description for AI",      // Human-readable description
  { /* Zod parameter schema */ }, // Input validation
  async (params) => {             // Implementation
    const result = await safeExecute(/* operation */, "Error context");
    return result instanceof Error 
      ? createErrorResponse(result.message)
      : createSuccessResponse(formatOutput(result));
  }
);
```

## Testing Strategy

### Test Framework (`test_framework.ts`)
Custom lightweight testing framework with:
- Assertion utilities
- Test grouping and reporting
- Error collection and display
- Simple API for quick test writing

### Integration Tests (`integration_tests.ts`)
Comprehensive tests covering:
- **Data Store Operations**: Both JSON and SQLite implementations
- **CRUD Lifecycle**: Complete todo and list management flows
- **Error Scenarios**: Invalid inputs, missing data, constraint violations
- **Data Integrity**: Foreign key relationships, sequence numbering

### Migration Tests (`migration_tests.ts`)
Tests for data store transitions:
- JSON to SQLite migration
- Data integrity verification
- Schema compatibility

### Test Execution

```bash
# Run all tests
npm test

# Run only integration tests
npm run test:integration

# Run MCP client tests
npm run test-client
```

### Test Structure Example

```typescript
// Test group organization
await runTestGroup("Todo Operations", async () => {
  await testCreateTodo();
  await testUpdateTodo();
  await testDeleteTodo();
});

// Individual test with clear assertions
async function testCreateTodo() {
  const list = await createTestList();
  const todo = await todoService.createTodo({
    listId: list.id,
    title: "Test Todo"
  });
  
  assert(todo.seqno === 1, "First todo should have seqno 1");
  assert(todo.status === 'pending', "New todo should be pending");
}
```

## Development Workflow

### Getting Started

1. **Installation**:
   ```bash
   npm install
   npm run build
   ```

2. **Development**:
   ```bash
   npm run dev  # Build and start server
   ```

3. **Testing**:
   ```bash
   npm test     # Run full test suite
   ```

### Adding New Tools

1. **Define Schema** in `models/`:
   ```typescript
   export const NewToolSchema = z.object({
     param: z.string().min(1, "Parameter required")
   });
   ```

2. **Add Service Method** in appropriate service:
   ```typescript
   async newOperation(data: z.infer<typeof NewToolSchema>) {
     // Implementation
   }
   ```

3. **Register MCP Tool** in `index.ts`:
   ```typescript
   server.tool("new-tool", "Description", schema, async (params) => {
     // Implementation following the standard pattern
   });
   ```

4. **Add Tests** in test files:
   ```typescript
   async function testNewTool() {
     // Test implementation
   }
   ```

### Configuration

Configuration is managed in `config.ts`:

```typescript
export const config = {
  dataStore: {
    type: process.env.DATA_STORE_TYPE || 'sqlite',
    path: process.env.DATA_STORE_PATH || './data/todos.db'
  }
};
```

Environment variables:
- `DATA_STORE_TYPE`: 'json' or 'sqlite'
- `DATA_STORE_PATH`: Storage location path

### Debugging & Inspection

#### MCP Inspector
The MCP Inspector provides a web-based interface for debugging and testing the server:

```bash
npm run inspect  # Launch web-based MCP inspector
```

The inspector (`scripts/inspect-mcp-server.sh`) offers:

- **Interactive Testing**: Test all MCP tools with custom parameters
- **Schema Inspection**: View tool definitions and parameter validation
- **Real-time Communication**: Monitor MCP protocol messages
- **Error Debugging**: See detailed error messages and stack traces
- **Web Interface**: Usually accessible at `http://localhost:3000`

**Inspector Features**:
- View all available MCP tools and their descriptions
- Test tool parameters with live validation
- Inspect request/response cycles
- Debug server communication issues
- Configure storage settings before testing

**Environment Configuration**:
The inspector allows you to configure storage settings:
```bash
export TODO_DATA_STORE=sqlite  # or 'json'
export TODO_DATA_PATH=/custom/path/to/data
npm run inspect
```

#### Database Inspection
For SQLite databases:
```bash
npm run dump-sqlite  # View SQLite database contents
```

#### Client Testing
Test with a standalone MCP client:
```bash
npm run test-client  # Test with programmatic MCP client
```

## Performance Considerations

### JSON Store Performance
- **Pros**: Human-readable, version control friendly
- **Cons**: Entire file read/written on each operation
- **Best For**: < 1000 todos, development environments

### SQLite Store Performance
- **Pros**: Efficient queries, ACID transactions, indexes
- **Cons**: Binary format, requires SQLite installation
- **Best For**: Production use, > 1000 todos, concurrent access

### Memory Usage
- **JSON Store**: Keeps full dataset in memory
- **SQLite Store**: Only active queries in memory
- **Both**: Minimal memory footprint for typical usage

## Security Considerations

1. **Input Validation**: All inputs validated with Zod schemas
2. **SQL Injection Prevention**: Parameterized queries only
3. **File System Security**: Proper path validation and sanitization
4. **Error Information**: Errors don't expose internal system details

## Extension Points

The architecture supports several extension patterns:

1. **New Storage Backends**: Implement `DataStore` interface
2. **Additional Todo Fields**: Extend models and schemas
3. **Business Logic**: Add methods to service classes
4. **Response Formats**: Modify formatters for different outputs
5. **Authentication**: Add authentication middleware layer

## Common Patterns Demonstrated

1. **Factory Pattern**: `DataStoreFactory` creates appropriate store implementations
2. **Singleton Pattern**: `DataService` ensures single data store instance
3. **Strategy Pattern**: Multiple data store implementations with common interface
4. **Validation Pattern**: Consistent input validation with Zod
5. **Error Handling Pattern**: Centralized error processing with `safeExecute`
6. **Formatting Pattern**: Consistent output formatting for AI consumption

## Conclusion

This Todo List MCP Server demonstrates production-ready patterns for building MCP servers. The codebase emphasizes:

- **Clarity**: Well-documented, self-explaining code
- **Reliability**: Comprehensive error handling and testing
- **Flexibility**: Multiple storage options and extensible architecture
- **Performance**: Efficient data operations and minimal resource usage
- **Maintainability**: Clear separation of concerns and consistent patterns

The project serves as both a functional todo system and a comprehensive example for learning MCP development best practices.