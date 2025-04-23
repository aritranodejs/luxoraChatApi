const { response } = require('../../../utils/response.utils');
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

// Socket handler for online status updates
const setupOnlineStatusHandlers = (io, socket, userId) => {
    console.log('setupOnlineStatusHandlers', userId);
    // Join user-specific room for targeted events
    socket.join(`user-${userId}`);
    
    // Handle user coming online when socket connects
    updateUserOnlineStatusInternal(io, userId, true);

    // Handle status changes via socket event
    socket.on('updateOnlineStatus', (data) => {
        updateUserOnlineStatusInternal(io, userId, data.isOnline);
    });

    // Handle user going offline when socket disconnects
    socket.on('disconnect', () => {
        updateUserOnlineStatusInternal(io, userId, false);
    });
};

// Internal function to update user online status
const updateUserOnlineStatusInternal = async (io, userId, isOnline) => {
    try {
        const user = await User.findOne({
            where: {
                id: userId
            }
        });
        
        if (!user) return;

        // AI users are always online
        if (user.isAI) {
            user.isOnline = true;
        } else {
            user.isOnline = isOnline;
            user.lastSeen = new Date();
        }
        
        await user.save();

        // Broadcast to all connected clients
        io.emit('userStatusChanged', { 
            userId: user.id,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
        });
        
        // Emit specific event for the user's own status
        io.to(`user-${userId}`).emit('onlineStatus', { 
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
        });
    } catch (error) {
        console.error('Error updating user online status:', error);
    }
};

module.exports = {
    index,
    setupOnlineStatusHandlers
};