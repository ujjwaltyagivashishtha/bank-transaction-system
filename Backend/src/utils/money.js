/**
 * Financial Precision & Money Utility
 * Ensures all monetary operations avoid floating point drift by calculating in integer paise (1 INR = 100 paise).
 */

const MAX_TRANSACTION_AMOUNT_PAISE = 100000000; // ₹10,00,000 (10 Lakhs max per single transfer)
const MIN_TRANSACTION_AMOUNT_PAISE = 1; // ₹0.01 (1 paisa min)

/**
 * Validates and converts user monetary input into integer paise.
 * Strictly rejects negative, zero, NaN, Infinity, excessive precision (> 2 decimal digits), and non-finite values.
 * NEVER silently rounds invalid precision.
 * 
 * @param {number|string} input - Amount in INR (e.g. 1500 or "1500.50")
 * @param {Object} [options]
 * @param {number} [options.minPaise]
 * @param {number} [options.maxPaise]
 * @returns {number} Amount in integer paise
 */
function parseAmountToPaise(input, options = {}) {
    if (input === null || input === undefined || input === '') {
        throw new Error('Amount is required and cannot be empty');
    }

    let num;
    if (typeof input === 'string') {
        const trimmed = input.trim();
        // Regex strictly enforces integer or up to 2 decimal places. Rejects scientific notation, excessive precision like 10.999
        if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
            throw new Error('Amount must be a positive number with at most 2 decimal places (paise)');
        }
        num = parseFloat(trimmed);
    } else if (typeof input === 'number') {
        if (!Number.isFinite(input)) {
            throw new Error('Amount must be a finite positive number');
        }
        if (input <= 0) {
            throw new Error('Amount must be greater than zero');
        }
        // Check for sub-paise floating representation artifacts (e.g., 10.005)
        const paiseCandidate = input * 100;
        if (Math.abs(paiseCandidate - Math.round(paiseCandidate)) > 1e-4) {
            throw new Error('Amount cannot have fractional sub-paise precision (more than 2 decimal places)');
        }
        num = input;
    } else {
        throw new Error('Invalid amount type. Expected number or string');
    }

    if (isNaN(num) || num <= 0) {
        throw new Error('Amount must be greater than zero');
    }

    const paise = Math.round(num * 100);

    const min = options.minPaise !== undefined ? options.minPaise : MIN_TRANSACTION_AMOUNT_PAISE;
    const max = options.maxPaise !== undefined ? options.maxPaise : MAX_TRANSACTION_AMOUNT_PAISE;

    if (paise < min) {
        throw new Error(`Amount must be at least ₹${(min / 100).toFixed(2)}`);
    }

    if (paise > max) {
        throw new Error(`Amount exceeds maximum allowable transaction limit of ₹${(max / 100).toLocaleString('en-IN')}`);
    }

    return paise;
}

/**
 * Converts integer paise back to INR rupees (decimal number).
 * @param {number} paise
 * @returns {number}
 */
function paiseToRupees(paise) {
    if (typeof paise !== 'number' || !Number.isInteger(paise)) {
        // Fallback if float passed
        return Math.round((paise || 0) * 100) / 10000;
    }
    return paise / 100;
}

/**
 * Format INR amount using the Indian numbering system.
 * @param {number} amountInRupees
 * @param {boolean} [includeSymbol=true]
 * @returns {string} e.g. "₹1,50,000.00"
 */
function formatINR(amountInRupees, includeSymbol = true) {
    const val = Number(amountInRupees) || 0;
    const formatted = val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return includeSymbol ? `₹${formatted}` : formatted;
}

module.exports = {
    parseAmountToPaise,
    paiseToRupees,
    formatINR,
    MAX_TRANSACTION_AMOUNT_PAISE,
    MIN_TRANSACTION_AMOUNT_PAISE
};
