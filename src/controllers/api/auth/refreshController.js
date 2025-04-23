const jwt = require('jsonwebtoken');
const { redisClient } = require('../../../config/redis');
const { response } = require('../../../utils/response.utils');
const { generateAuthToken, generateRefreshToken } = require('../../../middleware/auth');
const { getExpiryInSeconds } = require('../../../utils/token.utils');

const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refreshsecret';
const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    // Check if the refresh token exists
    if (!token) {
      return response(res, {}, 'Missing refresh token.', 400);
    }

    // Attempt to verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, refreshTokenSecret);
    } catch (err) {
      // Differentiating between invalid or expired refresh token
      if (err.name === 'TokenExpiredError') {
        return response(res, {}, 'Refresh token expired.', 401);
      }
      return response(res, {}, 'Invalid refresh token.', 403);
    }

    // Fetch the user ID associated with the token from Redis
    const storedUserId = await redisClient.get(token);
    
    // If no user ID is found or the token is invalid
    if (!storedUserId) {
      return response(res, {}, 'Refresh token not found or expired in Redis.', 403);
    }

    // Ensure the decoded token's user ID matches the one stored in Redis
    if (decoded.id.toString() !== storedUserId) {
      return response(res, {}, 'Refresh token mismatch.', 403);
    }

    // Generate new access token and refresh token
    const accessToken = generateAuthToken(decoded);
    const newRefreshToken = generateRefreshToken(decoded);

    // Calculate expiry time in seconds
    const expirySec = getExpiryInSeconds(refreshTokenExpiry);

    // Remove the old refresh token from Redis
    await redisClient.del(token);

    // Store the new refresh token with its associated user ID and expiry
    await redisClient.set(newRefreshToken, decoded.id.toString(), { EX: expirySec });

    // Return the new tokens in the response
    return response(res, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed successfully.', 200);
  } catch (error) {
    // General error handling
    return response(res, {}, error.message || 'An error occurred while refreshing the token.', 500);
  }
};

module.exports = { refreshToken };
