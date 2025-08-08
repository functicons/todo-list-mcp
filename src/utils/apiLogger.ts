import { promises as fs } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  tool: string;
  params: any;
  success: boolean;
  response?: string;
  error?: string;
  duration: number;
}

class ApiLogger {
  private logPath: string;

  constructor() {
    this.logPath = join(process.cwd(), 'logs', 'api.log');
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

  async logToolCall(tool: string, params: any, success: boolean, response?: string, error?: string, duration?: number): Promise<void> {
    try {
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
      console.error('Failed to write to log file:', err);
    }
  }
}

export const apiLogger = new ApiLogger();