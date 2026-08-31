import { ApiError } from '../utils/ApiError.js';

/**
 * 404 handler for unmatched routes.
 */
export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.url}`));
}
