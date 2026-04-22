// src/utils/logger.ts
// Logger sederhana dengan timestamp dan warna di terminal.
// Digunakan di seluruh aplikasi (service, middleware, worker) agar
// semua aktivitas server bisa dipantau secara real-time.

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';

const COLORS = {
  INFO:    '\x1b[36m',  // Cyan
  WARN:    '\x1b[33m',  // Yellow
  ERROR:   '\x1b[31m',  // Red
  DEBUG:   '\x1b[35m',  // Magenta
  SUCCESS: '\x1b[32m',  // Green
  RESET:   '\x1b[0m',
  DIM:     '\x1b[2m',
};

const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const log = (level: LogLevel, context: string, message: string, data?: unknown) => {
  const color = COLORS[level];
  const prefix = `${COLORS.DIM}[${timestamp()}]${COLORS.RESET} ${color}[${level}]${COLORS.RESET} ${COLORS.DIM}(${context})${COLORS.RESET}`;
  
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

export const logger = {
  info:    (ctx: string, msg: string, data?: unknown) => log('INFO',    ctx, msg, data),
  warn:    (ctx: string, msg: string, data?: unknown) => log('WARN',    ctx, msg, data),
  error:   (ctx: string, msg: string, data?: unknown) => log('ERROR',   ctx, msg, data),
  debug:   (ctx: string, msg: string, data?: unknown) => log('DEBUG',   ctx, msg, data),
  success: (ctx: string, msg: string, data?: unknown) => log('SUCCESS', ctx, msg, data),
};
