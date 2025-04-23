const express = require('express');
const group = require('express-group-routes');

// Helpers
const { response } = require('../utils/response.utils');

// Controllers

// Router
const router = express.Router();

// Routes
router.get('/', (req, res) => {
    try {
        return response(res, req.body, 'Welcome Admin API', 200);
    } catch (error) {
        return response(res, req.body, error.message, 500);
    }
});

module.exports = router;