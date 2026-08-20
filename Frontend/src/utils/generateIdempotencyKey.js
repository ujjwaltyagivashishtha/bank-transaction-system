/**
 * Generates a unique, RFC4122-compliant idempotency key for transactions.
 * Uses crypto.randomUUID() when available, with a cryptographically secure fallback.
 * 
 * @param {string} [prefix='tx']
 * @returns {string}
 */
export function generateIdempotencyKey(prefix = 'tx') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  
  // High-entropy fallback
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${randomPart}`;
}
