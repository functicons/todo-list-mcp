# Build Your First MCP Server

## Introduction

The Model Context Protocol (MCP) is a standardized way for AI agents to interact with external tools and data sources. Rather than just building another todo app, this tutorial focuses on understanding MCP's architecture, the SDK interfaces, and how to properly test and inspect MCP servers.

We'll use a simple todo server example from [todo-list-mcp](https://github.com/functicons/todo-list-mcp) to explore these concepts, but the focus is on the protocol and SDK patterns you can apply to any domain.

## The MCP Protocol

MCP is built on **JSON-RPC 2.0** and uses three core concepts:

### Protocol Architecture
```
┌─────────────┐    JSON-RPC 2.0    ┌─────────────┐
│    Client   │ ◄────────────────► │   Server    │
│  (Claude)   │    over stdio      │ (Your App)  │
└─────────────┘                    └─────────────┘
```

### Core Message Types
- **Tools**: Functions the server exposes (like `create-todo`)
- **Resources**: Data sources the server provides (like file contents)  
- **Prompts**: Template conversations the server offers

### Communication Flow
1. **Initialization**: Client and server exchange capabilities
2. **Discovery**: Client requests available tools/resources/prompts
3. **Execution**: Client invokes server functionality
4. **Response**: Server returns structured results

## MCP SDK Interfaces

The SDK provides clean abstractions over the protocol:

### Server Creation
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "Todo-MCP-Server",
  version: "1.0.0",
});
```

### Tool Definition Pattern
```typescript
server.tool(
  "create-todo",         // Unique identifier
  "Create a new todo item", // Human readable description
  {                      // Parameter schema (Zod)
    listId: z.string().uuid(),
    title: z.string().min(1),
  },
  async ({ listId, title }) => { // Handler function
    // Your logic here
    return {
      content: [{ type: "text", text: `Created todo: "${title}"` }]
    };
  }
);
```

### Response Format
All MCP responses follow this structure:
```typescript
interface MCPResponse {
  content: Array<{
    type: "text" | "image";
    text?: string;        // For text content
    data?: string;        // For image content (base64)
    mimeType?: string;    // For images
  }>;
  isError?: boolean;      // Mark as error response
}
```

### Transport Layer

The SDK supports different transport methods:

```typescript
// Stdio Transport (most common)
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Schema Validation

MCP uses **Zod** for runtime type checking:

```typescript
import { z } from "zod";

// Simple parameter validation
server.tool("get-todos", "Get todos with optional filters", {
  listId: z.string().uuid(),
  seqno: z.number().int().positive().optional(),
  status: z.enum(['pending', 'done', 'canceled']).optional(),
}, async ({ listId, seqno, status }) => {
  // listId is guaranteed to be a valid UUID
  // seqno and status are optional but type-safe
});
```

### Error Handling Pattern

The SDK provides consistent error handling:

```typescript
server.tool("update-todo", "Update a todo's status", {
  listId: z.string().uuid(),
  seqno: z.number().int().positive(),
  status: z.enum(['pending', 'done', 'canceled'])
}, async ({ listId, seqno, status }) => {
  try {
    // Your logic here
    return {
      content: [{ type: "text", text: `Updated todo ${seqno} to ${status}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true  // Important: marks response as error
    };
  }
});
```

## Protocol Message Examples

Understanding the actual JSON-RPC messages helps debug and optimize:

### Tool Discovery Request
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### Tool Discovery Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "create-todo",
        "description": "Create a new todo item",
        "inputSchema": {
          "type": "object",
          "properties": {
            "listId": { "type": "string", "format": "uuid" },
            "title": { "type": "string", "minLength": 1 }
          },
          "required": ["listId", "title"]
        }
      },
      {
        "name": "get-todos",
        "description": "Get todos with optional filters",
        "inputSchema": {
          "type": "object",
          "properties": {
            "listId": { "type": "string", "format": "uuid" },
            "seqno": { "type": "number" },
            "status": { "enum": ["pending", "done", "canceled"] }
          },
          "required": ["listId"]
        }
      }
    ]
  }
}
```

### Tool Call Request
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create-todo",
    "arguments": { 
      "listId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Learn MCP Protocol" 
    }
  }
}
```

### Tool Call Response
```json
{
  "jsonrpc": "2.0", 
  "id": 2,
  "result": {
    "content": [
      { 
        "type": "text", 
        "text": "{\n  \"success\": true,\n  \"message\": \"Todo created successfully\",\n  \"data\": {\n    \"listId\": \"550e8400-e29b-41d4-a716-446655440000\",\n    \"seqno\": 1,\n    \"title\": \"Learn MCP Protocol\",\n    \"status\": \"pending\"\n  }\n}" 
      }
    ]
  }
}
```

## Testing and Inspection

Testing MCP servers requires understanding both the protocol and tooling available:

### MCP Inspector - Visual Testing

The **MCP Inspector** is the primary tool for interactive testing:

```bash
npm install -D @modelcontextprotocol/inspector
npx mcp-inspector node dist/index.js
```

**What the Inspector shows you:**
- **Server Information**: Name, version, capabilities
- **Available Tools**: All registered tools with schemas
- **Interactive Testing**: Call tools with real parameters
- **Protocol Messages**: Raw JSON-RPC request/response pairs
- **Error Details**: Full error context and stack traces

**Inspector Interface:**
```
┌─────────────────────────────────────────────┐
│ MCP Server Inspector                        │
├─────────────────┬───────────────────────────┤
│ Available Tools │ Tool Call Interface       │
│                 │                           │
│ ✓ create-todo   │ Tool: create-todo         │
│ ✓ get-todos     │ Parameters:               │
│ ✓ update-todo   │ ┌─────────────────────┐   │
│ ✓ create-todo-  │ │ listId: "uuid-123" │   │
│   list          │ │ title: "Learn MCP"  │   │
│                 │ └─────────────────────┘   │
│                 │ [Call Tool]               │
└─────────────────┴───────────────────────────┘
```

### Protocol-Level Testing

For deep debugging, inspect the actual JSON-RPC messages:

**Enable verbose logging:**
```bash
DEBUG=mcp:* npx mcp-inspector node dist/index.js
```

**Sample message flow you'll see:**
```
→ {"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}
← {"jsonrpc":"2.0","id":1,"result":{"capabilities":{...}}}
→ {"jsonrpc":"2.0","id":2,"method":"tools/list"}
← {"jsonrpc":"2.0","id":2,"result":{"tools":[...]}}
```

### Client SDK Testing

Create programmatic tests using the client SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testProtocol() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"]
  });
  
  const client = new Client({ name: "test" }, { capabilities: { tools: {} } });
  await client.connect(transport);
  
  // Test tool discovery
  const tools = await client.listTools();
  console.log("Available tools:", tools.tools.map(t => t.name));
  
  // Test tool execution
  const result = await client.callTool({
    name: "create-todo",
    arguments: { 
      listId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Learn MCP Protocol" 
    }
  });
  
  console.log("Result:", result.content);
  await client.close();
}
```

### Validation and Error Testing

**Schema Validation Testing:**
```bash
# Test with invalid parameters
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call", 
  "params": {
    "name": "create-todo",
    "arguments": { 
      "listId": "invalid-uuid",
      "title": "" 
    }
  }
}' | node dist/index.js
```

**Error Response Validation:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "validation_errors": [
        {"path": ["listId"], "message": "Invalid UUID format"},
        {"path": ["title"], "message": "String must contain at least 1 character(s)"}
      ]
    }
  }
}
```

### Debugging with Claude Desktop

When integrating with Claude Desktop:

**Configuration Location:**
- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Basic Configuration:**
```json
{
  "mcpServers": {
    "todo-list": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```

**Debug Configuration:**
```json
{
  "mcpServers": {
    "todo-list": {
      "command": "node", 
      "args": ["/absolute/path/to/dist/index.js"],
      "env": {
        "DEBUG": "mcp:*",
        "DATA_STORE_TYPE": "json"
      }
    }
  }
}
```

**Troubleshooting Common Issues:**
- **Path Problems**: Use absolute paths, not relative ones
- **Permission Issues**: Ensure server file is executable
- **Port Conflicts**: Each server needs unique stdio streams
- **Schema Errors**: Validate Zod schemas match expected inputs

## Building Beyond Tools

MCP supports three main capabilities:

### Resources
Provide data that clients can read:
```typescript
server.resource(
  "config://settings",
  "Application configuration",
  async () => ({
    contents: [{
      uri: "config://settings",
      mimeType: "application/json",
      text: JSON.stringify(config)
    }]
  })
);
```

### Prompts  
Offer conversation templates:
```typescript
server.prompt(
  "analyze-data",
  "Analyze the provided data",
  async ({ data }) => ({
    messages: [{
      role: "user",
      content: `Please analyze this data: ${data}`
    }]
  })
);
```

### Combining Capabilities
Real MCP servers often combine all three:
```typescript
// Tools for actions
server.tool("create-todo", "Create a todo item", {...}, async () => {...});
server.tool("update-todo", "Update todo status", {...}, async () => {...});

// Resources for data access  
server.resource("todos://list", "Current todo lists", async () => {...});

// Prompts for AI interactions
server.prompt("todo-summary", "Summarize todos by status", async () => {...});
```

## Protocol Best Practices

### Performance
- **Batch Operations**: Combine related actions in single tools
- **Lazy Loading**: Only load data when requested  
- **Caching**: Cache frequently accessed resources
- **Stream Large Data**: Use pagination for large datasets

### Security
- **Input Validation**: Always validate with Zod schemas
- **Path Sanitization**: Sanitize file paths and URLs
- **Error Messages**: Don't leak sensitive information in errors
- **Rate Limiting**: Implement rate limiting for expensive operations

### Compatibility
- **Version Your Schema**: Include version in server name/metadata
- **Backward Compatibility**: Maintain compatibility across versions
- **Feature Detection**: Allow clients to discover capabilities
- **Graceful Degradation**: Handle missing client capabilities

## Resources

- **[Todo List MCP Server](https://github.com/functicons/todo-list-mcp)** - Complete implementation example
- **[MCP Specification](https://modelcontextprotocol.io)** - Official protocol documentation  
- **[MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)** - TypeScript SDK reference
- **[MCP Inspector](https://github.com/modelcontextprotocol/inspector)** - Testing and debugging tool
- **[Claude Desktop](https://claude.ai/download)** - AI agent with MCP support

Understanding MCP's protocol-first design helps you build robust, interoperable AI tools that work across different clients and use cases. The SDK abstracts complexity while giving you full control over the underlying JSON-RPC communication.