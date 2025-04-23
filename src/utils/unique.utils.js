/**
 * Unique code generation utilities
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit number
 * Used for OTP and other verification codes
 * @returns {number} - A random 6-digit number (100000-999999)
 */
const getSecureUniqueCode = () => {
    const randomBuffer = crypto.randomBytes(4); // Generate 4 random bytes
    const randomNumber = randomBuffer.readUInt32BE(0) % 900000; // Restrict to 6-digit range
    return 100000 + randomNumber; // Ensure it's in the range 100000–999999
};

module.exports = {
    getUniqueCode: getSecureUniqueCode
}; 