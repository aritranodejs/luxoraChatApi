const { response } = require('../../../helpers/response');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');

const index = async (req, res) => {
    try {
        const {
            id
        } = req.query;

        const users = await User.findAll({
            where: {
                ...id ? { id: { [Op.ne]: id } } : {},
                status: 'active',
                role: 'user'
            },
            attributes: {
                exclude: ['password']
            }
        });

        return response(res, users, 'Global Users list.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const updateUserOnlineStatus = async (req, res) => {
    try {
        const {
            userId,
            isOnline
        } = req.body;

        const user = await User.findOne({
            where: {
                id: userId
            }
        });
        if (!user) {
            return response(res, {}, 'User not found.', 404);
        }
        
        user.isOnline = isOnline;
        user.lastSeen = new Date();
        await user.save();

        req.io.emitToUser(userId, 'online-status', { 
            isOnline: user.isOnline 
        });

        return response(res, { isOnline : user?.isOnline, lastSeen : user?.lastSeen }, 'User online status updated.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
};

module.exports = {
    index,
    updateUserOnlineStatus
}