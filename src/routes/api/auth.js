const express = require('express');
const group = require('express-group-routes');

// Helpers
const { response } = require('../../helpers/response');

// Middleware
const { authentication } = require('../../middleware/auth');

// Controllers
const registerController = require('../../controllers/api/auth/registerController');
const loginController = require('../../controllers/api/auth/loginController');

// Router
const router = express.Router();

// Routes
router.get('/', (req, res) => {
    try {
        return response(res, req.body, 'Welcome Auth API', 200);
    } catch (error) {
        return response(res, req.body, error.message, 500);
    }
});

router.group('/', (router) => {
    // Register
    router.post('/register', registerController.register);
    // Login
    router.post('/login', loginController.login);
    router.post('/send-otp', loginController.loginOtp);
    router.post('/verify-otp', loginController.verifyOtp);
    router.get('/me', authentication, loginController.me);
    router.get('/logout', authentication, loginController.logout);
});

module.exports = router;