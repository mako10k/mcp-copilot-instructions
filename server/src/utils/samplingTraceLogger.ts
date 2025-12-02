/**
 * samplingTraceLogger.ts
 * Logging functionality for MCP sampling requests and responses
 *
 * Responsibilities:
 * - Log sampling envelopes (request + response) to disk
 * - Provide audit trail for all LLM interactions
 * - Enable reproducibility analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const TRACE_DIR = '.copilot-state/sampling-traces';

/**
 * Sampling trace envelope
 */
export interface SamplingTrace {
  intent: string; // e.g., "analysis-narrative", "proposal-draft"
  timestamp: string; // ISO 8601
  request: {
    prompt: string;
    context?: any;
  };
  response: {
    role: string;
    content: any;
    model?: string;
    stopReason?: string;
  };
}

/**
 * Initialize trace directory
 */
async function ensureTraceDirectory(): Promise<void> {
  await fs.mkdir(TRACE_DIR, { recursive: true });
}

/**
 * Log a sampling trace to disk
 */
export async function logSamplingTrace(trace: SamplingTrace): Promise<void> {
  await ensureTraceDirectory();

  // Generate filename: {timestamp}-{intent}.json
  const timestamp = new Date(trace.timestamp).getTime();
  const safeIntent = trace.intent.replace(/[^a-z0-9-]/gi, '-');
  const filename = `${timestamp}-${safeIntent}.json`;
  const filepath = path.join(TRACE_DIR, filename);

  // Write trace as JSON
  await fs.writeFile(filepath, JSON.stringify(trace, null, 2), 'utf-8');
}

/**
 * List all sampling traces
 */
export async function listSamplingTraces(): Promise<string[]> {
  try {
    await ensureTraceDirectory();
    const files = await fs.readdir(TRACE_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    return [];
  }
}

/**
 * Read a specific sampling trace
 */
export async function readSamplingTrace(filename: string): Promise<SamplingTrace | null> {
  try {
    const filepath = path.join(TRACE_DIR, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Get recent traces (last N)
 */
export async function getRecentTraces(limit: number = 10): Promise<SamplingTrace[]> {
  const filenames = await listSamplingTraces();
  const traces: SamplingTrace[] = [];

  for (const filename of filenames.slice(0, limit)) {
    const trace = await readSamplingTrace(filename);
    if (trace) {
      traces.push(trace);
    }
  }

  return traces;
}

/**
 * Clean up old traces (older than N days)
 */
export async function cleanupOldTraces(daysToKeep: number = 30): Promise<number> {
  const filenames = await listSamplingTraces();
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const filename of filenames) {
    // Extract timestamp from filename
    const timestampMatch = filename.match(/^(\d+)-/);
    if (timestampMatch) {
      const fileTime = parseInt(timestampMatch[1], 10);
      if (fileTime < cutoffTime) {
        const filepath = path.join(TRACE_DIR, filename);
        await fs.unlink(filepath);
        deletedCount++;
      }
    }
  }

  return deletedCount;
}
