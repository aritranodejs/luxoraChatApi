/**
 * Token utilities for token management
 */

/**
 * Convert token expiry string like '7d', '15m', '24h' to seconds
 * @param {string} expiryString - Token expiry string (format: number + unit where unit is s, m, h, d)
 * @param {number} defaultSec - Default expiry in seconds if format is not recognized (default: 7 days)
 * @returns {number} - Expiry time in seconds
 */
const getExpiryInSeconds = (expiryString, defaultSec = 7 * 24 * 3600) => {
  const match = expiryString.match(/^(\d+)([smhd])$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2];
    return unit === 'd' ? num * 86400 : 
           unit === 'h' ? num * 3600 : 
           unit === 'm' ? num * 60 : 
           num; // s
  }
  return defaultSec; // Default to 7 days if format is not recognized
};

module.exports = {
  getExpiryInSeconds
}; 