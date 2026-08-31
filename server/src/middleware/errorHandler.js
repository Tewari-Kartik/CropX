import { ApiError } from '../utils/ApiError.js';

/**
 * Global error handler. Must be registered last in Express.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof ApiError ? err.message : 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    error: message,
  });
}
