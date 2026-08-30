import { ApiError } from '../utils/ApiError.js';

/**
 * Joi schema validation middleware.
 * @param {import('joi').Schema} schema - Joi validation schema
 * @param {'body'|'query'|'params'} target - Which part of req to validate
 */
export function validate(schema, target = 'body') {
  return (req, _res, next) => {
    const { error } = schema.validate(req[target], { abortEarly: false });
    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new ApiError(422, message));
    }
    next();
  };
}
