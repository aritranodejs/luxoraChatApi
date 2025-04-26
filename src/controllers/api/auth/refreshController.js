const jwt = require('jsonwebtoken');
const { response } = require('../../../utils/response.utils');
const { generateAccessToken, generateRefreshToken } = require('../../../middleware/auth');
const { 
  getUserIdFromRefreshToken, 
  deleteRefreshToken, 
  storeRefreshToken 
} = require('../../../utils/redis.utils');

const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refreshsecret';

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
        // Also remove from Redis if token is expired
        await deleteRefreshToken(token);
        return response(res, {}, 'Refresh token expired.', 401);
      }
      return response(res, {}, 'Invalid refresh token.', 403);
    }

    // Fetch the user ID associated with the token from Redis
    // Use consistent key format with refresh_token: prefix
    const storedUserId = await getUserIdFromRefreshToken(token);
    
    // If no user ID is found or the token is invalid
    if (!storedUserId) {
      return response(res, {}, 'Refresh token not found or expired in Redis.', 403);
    }

    // Ensure the decoded token's user ID matches the one stored in Redis
    if (decoded.id.toString() !== storedUserId) {
      return response(res, {}, 'Refresh token mismatch.', 403);
    }

    // Generate new access token and refresh token
    const accessToken = generateAccessToken(decoded);
    const newRefreshToken = generateRefreshToken(decoded);

    // Remove the old refresh token from Redis using consistent key format
    await deleteRefreshToken(token);

    // Store the new refresh token with its associated user ID and expiry
    // Using consistent key format with refresh_token: prefix
    await storeRefreshToken(newRefreshToken, decoded.id, process.env.JWT_REFRESH_EXPIRY);

    // Return the new tokens in the response
    return response(res, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed successfully.', 200);
  } catch (error) {
    console.error('Token refresh error:', error);
    // General error handling
    return response(res, {}, error.message || 'An error occurred while refreshing the token.', 500);
  }
};

module.exports = { refreshToken };