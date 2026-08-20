/**
 * Formats a MongoDB ObjectId / Account ID into a sleek, masked display format.
 * Example: "65b93d4a2b918f0a" -> "•••• A91F" (using the last 4 characters in uppercase)
 * 
 * @param {string} accountId 
 * @param {boolean} [showDots=true]
 * @returns {string}
 */
export function formatAccountId(accountId, showDots = true) {
  if (!accountId) return '•••• ----';
  const idStr = String(accountId);
  const suffix = idStr.slice(-4).toUpperCase();
  return showDots ? `•••• ${suffix}` : suffix;
}

/**
 * Truncates an ID with ellipsis for compact displays while preserving first and last parts.
 * Example: "65b93d4a2b918f0a" -> "65b9...8f0a"
 * 
 * @param {string} id 
 * @param {number} [startChars=4] 
 * @param {number} [endChars=4] 
 * @returns {string}
 */
export function truncateId(id, startChars = 4, endChars = 4) {
  if (!id) return '';
  const str = String(id);
  if (str.length <= startChars + endChars) return str;
  return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
}
