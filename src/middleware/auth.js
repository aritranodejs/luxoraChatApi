// JWT
const jwt = require('jsonwebtoken');

// Common Response
const { response } = require('../helpers/response');
const accessTokenSecret = process.env.JWT_SECRET || "jwtsecret";

const generateAuthToken = ({ id, role, name, email }) => {
  return jwt.sign({ id, role, name, email }, accessTokenSecret);
};

const authentication = (req, res, next) => {
  const header = req?.headers?.authorization;
  if (!header) {
    return response(res, {}, "Missing authorization token.", 401);
  }
  const token = header.includes(" ") ? header.split(" ")[1] : header;

  if (global.blacklistedTokens.has(token)) {
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
  generateAuthToken,
  authentication,
  roleAuthorization
};
