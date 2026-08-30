import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies JWT from Authorization: Bearer <token> header.
 * Attaches decoded payload to req.user.
 */
export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

/**
 * Role-based access guard. Call after authenticate().
 * @param {string} role - Required role (e.g. 'officer', 'farmer')
 */
export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      return next(new ApiError(403, `Access denied. Requires role: ${role}`));
    }
    next();
  };
}
