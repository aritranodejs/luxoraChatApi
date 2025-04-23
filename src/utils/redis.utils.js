/**
 * Redis utilities for token management
 */

const { redisClient } = require('../config/redis');
const { getExpiryInSeconds } = require('./token.utils');

/**
 * Store a refresh token in Redis
 * @param {string} refreshToken - The refresh token to store
 * @param {string} userId - The user ID associated with the token
 * @param {string} expiryString - Optional expiry time string (e.g. '7d')
 * @returns {Promise<boolean>} - Success result
 */
const storeRefreshToken = async (refreshToken, userId, expiryString = '7d') => {
  try {
    const expirySec = getExpiryInSeconds(expiryString);
    await redisClient.set(`refresh_token:${refreshToken}`, userId.toString(), { EX: expirySec });
    return true;
  } catch (error) {
    console.error('Error storing refresh token:', error);
    return false;
  }
};

/**
 * Retrieve a user ID associated with a refresh token
 * @param {string} refreshToken - The refresh token to look up
 * @returns {Promise<string|null>} - The associated user ID or null if not found
 */
const getUserIdFromRefreshToken = async (refreshToken) => {
  try {
    return await redisClient.get(`refresh_token:${refreshToken}`);
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

/**
 * Delete a refresh token from Redis
 * @param {string} refreshToken - The refresh token to delete
 * @returns {Promise<boolean>} - Success result
 */
const deleteRefreshToken = async (refreshToken) => {
  try {
    await redisClient.del(`refresh_token:${refreshToken}`);
    return true;
  } catch (error) {
    console.error('Error deleting refresh token:', error);
    return false;
  }
};

/**
 * Add an access token to the blacklist
 * @param {string} accessToken - The access token to blacklist
 * @param {number} ttlSeconds - Time to live in seconds, or null to use token's expiry
 * @returns {Promise<boolean>} - Success result
 */
const blacklistAccessToken = async (accessToken, ttlSeconds = null) => {
  try {
    // If TTL is provided, use it directly
    if (ttlSeconds) {
      await redisClient.set(`blacklist:${accessToken}`, '1', { EX: ttlSeconds });
      return true;
    }
    
    // Otherwise try to decode the token and use its expiry
    const decoded = require('jsonwebtoken').decode(accessToken);
    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(0, decoded.exp - now);
      await redisClient.set(`blacklist:${accessToken}`, '1', { EX: ttl });
      return true;
    }
    
    // Fallback to 24 hours if we can't determine the expiry
    await redisClient.set(`blacklist:${accessToken}`, '1', { EX: 86400 });
    return true;
  } catch (error) {
    console.error('Error blacklisting access token:', error);
    // Fallback to 24 hours if there's an error
    try {
      await redisClient.set(`blacklist:${accessToken}`, '1', { EX: 86400 });
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * Check if an access token is blacklisted
 * @param {string} accessToken - The access token to check
 * @returns {Promise<boolean>} - True if blacklisted, false otherwise
 */
const isAccessTokenBlacklisted = async (accessToken) => {
  try {
    return !!(await redisClient.exists(`blacklist:${accessToken}`));
  } catch (error) {
    console.error('Error checking blacklisted access token:', error);
    return false;
  }
};

module.exports = {
  storeRefreshToken,
  getUserIdFromRefreshToken,
  deleteRefreshToken,
  blacklistAccessToken,
  isAccessTokenBlacklisted
}; 