/**
 * mcp.ts
 * 
 * Type definitions for MCP (Model Context Protocol) related structures.
 * These types provide better type safety for tool responses and handlers.
 */

/**
 * MCP content item types
 */
export type MCPContentItem = {
  type: 'text';
  text: string;
} | {
  type: 'image';
  data: string;
  mimeType: string;
};

/**
 * MCP tool response structure
 * Note: Includes index signature for compatibility with MCP SDK
 */
export interface MCPToolResponse {
  content: MCPContentItem[];
  isError?: boolean;
  [key: string]: unknown; // Required for MCP SDK compatibility
}

/**
 * MCP handler function type
 */
export type MCPHandler<TParams, TResult> = (params: TParams) => Promise<TResult>;

/**
 * Type for tool parameters (constrains to record types)
 */
export type ToolParams = Record<string, unknown>;

/**
 * Success response data structure
 */
export interface SuccessResponseData<T = unknown> {
  success: true;
  message: string;
  data: T;
}

/**
 * Error response data structure
 */
export interface ErrorResponseData {
  success: false;
  error: string;
}

/**
 * Combined response data type
 */
export type ResponseData<T = unknown> = SuccessResponseData<T> | ErrorResponseData;