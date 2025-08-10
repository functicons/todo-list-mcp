import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ToolParams } from '../types/mcp.js';

interface LogEntry {
  timestamp: string;
  tool: string;
  params: ToolParams;
  success: boolean;
  response?: string;
  error?: string;
  duration: number;
}

class ApiLogger {
  private logPath: string;
  private logDirCreated: boolean = false;

  constructor() {
    this.logPath = join(process.cwd(), 'logs', 'api.log');
  }

  private async ensureLogDirectory(): Promise<void> {
    if (!this.logDirCreated) {
      try {
        const logDir = dirname(this.logPath);
        await fs.mkdir(logDir, { recursive: true });
        this.logDirCreated = true;
      } catch {
        // Directory might already exist, that's fine
        this.logDirCreated = true;
      }
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLogEntry(entry: LogEntry): string {
    const status = entry.success ? '✓' : '✗';
    const timestamp = entry.timestamp.split('T')[1].split('.')[0]; // HH:MM:SS format
    const paramsStr = JSON.stringify(entry.params);
    
    let responseStr = '';
    if (entry.error) {
      responseStr = `ERROR: ${entry.error}`;
    } else if (entry.response) {
      const responseText = typeof entry.response === 'string' ? entry.response : JSON.stringify(entry.response);
      responseStr = responseText.length > 100 ? responseText.substring(0, 100) + '...' : responseText;
    }
    
    return `${timestamp} ${status} ${entry.tool} (${entry.duration}ms) | ${paramsStr} → ${responseStr}`;
  }

  async logToolCall(tool: string, params: ToolParams, success: boolean, response?: string, error?: string, duration?: number): Promise<void> {
    try {
      // Ensure the log directory exists before writing
      await this.ensureLogDirectory();
      
      const entry: LogEntry = {
        timestamp: this.formatTimestamp(),
        tool,
        params,
        success,
        response,
        error,
        duration: duration || 0
      };

      const logLine = this.formatLogEntry(entry) + '\n';
      await fs.appendFile(this.logPath, logLine, 'utf8');
    } catch (err) {
      // Silently fail - logging should not break the application
      // Only log to console in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to write to log file:', err);
      }
    }
  }
}

export const apiLogger = new ApiLogger();