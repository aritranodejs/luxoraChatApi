// JWT
const jwt = require('jsonwebtoken');

// Common Response
const { response } = require('../utils/response.utils');
const { redisClient } = require('../config/redis');
const accessTokenSecret = process.env.JWT_SECRET || "jwtsecret";
// Token expiration durations
const accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refreshsecret';
const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

const generateAccessToken = ({ id, role, name, email }) => {
  return jwt.sign({ id, role, name, email }, accessTokenSecret, { expiresIn: accessTokenExpiry });
};

// Secret and generator for long-lived refresh tokens
const generateRefreshToken = ({ id, role, name, email }) => {
  return jwt.sign({ id, role, name, email }, refreshTokenSecret, { expiresIn: refreshTokenExpiry });
};

const authentication = async (req, res, next) => {
  const header = req?.headers?.authorization;
  if (!header) {
    return response(res, {}, "Missing authorization token.", 401);
  }
  const token = header.includes(" ") ? header.split(" ")[1] : header;

  // Check if token is blacklisted in Redis instead of global memory
  const isBlacklisted = await redisClient.exists(`blacklist:${token}`);
  if (isBlacklisted) {
    return response(res, {}, "Expired authorization token.", 401);
  }

  jwt.verify(token, accessTokenSecret, (error, user) => {
    try {
      if (error) {
        if (error.name === "TokenExpiredError") {
          return response(res, {}, "Expired authorization token.", 401);
        } else if (error.name === "JsonWebTokenError") {
          return response(res, {}, "Invalid authorization token.", 403);
        } else {
          return response(res, {}, "Failed to verify authorization token.", 403);
        }
      }

      req.user = user;
      next();
    } catch (error) {
      return response(res, {}, error.message, 500);
    }
  });
};

const roleAuthorization = (roleString) => (req, res, next) => {
  const { role } = req.user;

  if (role !== roleString) {
    return response(res, req.body, "Access forbidden.", 403);
  }

  next();
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  authentication,
  roleAuthorization
};
