/**
 * HTTP response utility functions
 */

/**
 * Standard response formatter for API endpoints
 * @param {Object} res - Express response object
 * @param {Array|Object} data - Data to return in the response
 * @param {String} message - Response message
 * @param {Number} status - HTTP status code
 * @returns {Object} Formatted response
 */
const response = (res, data = [], message = 'success', status = 200) => {
    return res.status(status).json({
        success: status === 200,
        message,
        data,
    });
};

module.exports = {
    response
}; 