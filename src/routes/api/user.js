const express = require('express');
const group = require('express-group-routes');

// Helpers
const { response } = require('../../utils/response.utils');

// Middleware
const { authentication } = require('../../middleware/auth');

// Controllers
const userController = require('../../controllers/api/user/userController');
const friendController = require('../../controllers/api/user/friendController');
const chatController = require('../../controllers/api/user/chatController');
const settingController = require('../../controllers/api/user/settingController');
const userSettingController = require('../../controllers/api/user/userSettingController');
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
    router.get("/get-friend", friendController.getFriend);    
    router.post("/update-peer-id", friendController.updatePeerId);
});

router.group('/chats', (router) => {
    router.use(authentication);
    router.get('/get-chats', chatController.chats);
    router.post('/send-message', chatController.store);
    router.post('/update-message-status', chatController.updateMessageStatus);
});

router.group('/settings', (router) => {
    router.use(authentication);
    router.get('/:key', settingController.show);
});

router.group('/user-settings', (router) => {
    router.use(authentication);
    router.get('/', userSettingController.index);
    router.post('/update', userSettingController.update);
});

module.exports = router;