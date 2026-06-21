/**
 * Zero-dependency structured JSON logger.
 *
 * Product principle: "no human-readable error logs — everything must be
 * readable by an AI". Every line is a single JSON object on stdout/stderr, so
 * logs can be ingested and reasoned over programmatically. We avoid a logging
 * dependency (pino) to keep the edge/runtime surface small and bundle light.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  requestId?: string;
  userId?: string;
  step?: string;
  code?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

/** Serialize an Error into a plain, JSON-safe object. */
function serializeError(err: unknown): Record<string, unknown> | undefined {
  if (err == null) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // Stacks stay machine-parseable; included for AI debugging, not human prose.
      stack: err.stack,
      ...(('code' in err) ? { code: (err as { code: unknown }).code } : {}),
    };
  }
  return { value: String(err) };
}

function emit(level: LogLevel, message: string, fields?: LogFields, err?: unknown): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
    ...(err !== undefined ? { error: serializeError(err) } : {}),
  });
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields, err?: unknown): void;
  error(message: string, fields?: LogFields, err?: unknown): void;
  /** Return a child logger that merges `bound` fields into every line. */
  child(bound: LogFields): Logger;
}

/** Create a logger that always includes `bound` fields (e.g. a requestId). */
export function createLogger(bound: LogFields = {}): Logger {
  return {
    debug: (message, fields) => emit('debug', message, { ...bound, ...fields }),
    info: (message, fields) => emit('info', message, { ...bound, ...fields }),
    warn: (message, fields, err) => emit('warn', message, { ...bound, ...fields }, err),
    error: (message, fields, err) => emit('error', message, { ...bound, ...fields }, err),
    child: (extra) => createLogger({ ...bound, ...extra }),
  };
}

/** Default process-wide logger with no bound fields. */
export const logger = createLogger();
