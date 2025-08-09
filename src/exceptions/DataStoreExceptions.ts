/**
 * DataStoreExceptions.ts
 * 
 * Custom exception types for data store operations.
 * Provides specific error types for better error handling and debugging.
 */

/**
 * Base class for all data store related exceptions
 */
export abstract class DataStoreException extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when there's an issue initializing the data store
 */
export class DataStoreInitializationException extends DataStoreException {
  constructor(message: string, public readonly cause?: Error) {
    super(message, 'INITIALIZATION_FAILED');
  }
}

/**
 * Thrown when the database schema is incompatible with the current version
 */
export class IncompatibleSchemaException extends DataStoreException {
  constructor(
    message: string,
    public readonly expectedSchema: string,
    public readonly actualSchema?: string
  ) {
    super(message, 'INCOMPATIBLE_SCHEMA');
  }
}

/**
 * Thrown when a file operation fails (for file-based stores)
 */
export class FileOperationException extends DataStoreException {
  constructor(
    message: string,
    public readonly operation: 'READ' | 'WRITE' | 'DELETE' | 'CREATE' | 'LOCK',
    public readonly filePath: string,
    public readonly cause?: Error
  ) {
    super(message, 'FILE_OPERATION_FAILED');
  }
}

/**
 * Thrown when a database operation fails (for database-based stores)
 */
export class DatabaseOperationException extends DataStoreException {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message, 'DATABASE_OPERATION_FAILED');
  }
}

/**
 * Thrown when trying to access a resource that doesn't exist
 */
export class ResourceNotFoundException extends DataStoreException {
  constructor(
    resourceType: string,
    resourceId: string
  ) {
    super(`${resourceType} with ID '${resourceId}' not found`, 'RESOURCE_NOT_FOUND');
  }
}

/**
 * Thrown when there's a data validation error
 */
export class DataValidationException extends DataStoreException {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, 'DATA_VALIDATION_FAILED');
  }
}

/**
 * Thrown when there's a constraint violation (e.g., foreign key, unique constraint)
 */
export class ConstraintViolationException extends DataStoreException {
  constructor(
    message: string,
    public readonly constraintType: 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL',
    public readonly constraintName?: string
  ) {
    super(message, 'CONSTRAINT_VIOLATION');
  }
}