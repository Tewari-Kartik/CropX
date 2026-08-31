/**
 * Standardizes all API responses into the contract shape:
 * { "success": bool, "data": {...}, "error": null | string }
 *
 * @param {boolean} success
 * @param {*} data
 * @param {string|null} error
 */
export function response(success, data = null, error = null) {
  return { success, data, error };
}
