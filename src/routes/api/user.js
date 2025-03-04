const express = require('express');
const group = require('express-group-routes');

// Helpers
const { response } = require('../../helpers/response');

// Middleware
const { authentication } = require('../../middleware/auth');

// Controllers
const userController = require('../../controllers/api/user/userController');
const friendController = require('../../controllers/api/user/friendController');

// Router
const router = express.Router();

// Routes
router.get('/', (req, res) => {
    try {
        return response(res, req.body, 'Welcome User API', 200);
    } catch (error) {
        return response(res, req.body, error.message, 500);
    }
});

router.get('/global-users', authentication, userController.index);

router.group('/friends', (router) => {
    router.use(authentication);
    router.get('/', friendController.index);
    router.post('/send-request', friendController.store);
    router.get('/get-friend-requests', friendController.getFriendRequests);
    router.post('/accept-or-reject', friendController.acceptOrReject);
    router.delete('/cancel-request', friendController.cancelRequest);
});

module.exports = router;