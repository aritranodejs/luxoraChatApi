// Import the setupMessageStatusHandlers function
const { setupMessageStatusHandlers } = require('./controllers/api/user/chatController');

// In your connection handling function, add this new line
// ... existing code ...

// After user authentication in your socket connection
socket.on('authenticate', async (data) => {
    try {
        // ... existing authentication code ...
        
        // After successful authentication
        const userId = user.id;
        
        // Setup message status handlers
        setupMessageStatusHandlers(io, socket, userId);
        
        // Mark pending messages as delivered when user connects
        const pendingMessages = await Message.findAll({
            where: {
                receiverId: userId,
                status: 'sent'
            },
            attributes: ['id']
        });
        
        if (pendingMessages.length > 0) {
            const messageIds = pendingMessages.map(msg => msg.id);
            // Update status to delivered
            await Message.update(
                { status: 'delivered' },
                { where: { id: messageIds } }
            );
            
            // Notify senders
            const messages = await Message.findAll({
                where: { id: messageIds },
                attributes: ['id', 'senderId']
            });
            
            const senderGroups = {};
            messages.forEach(message => {
                if (!senderGroups[message.senderId]) {
                    senderGroups[message.senderId] = [];
                }
                senderGroups[message.senderId].push(message.id);
            });
            
            Object.keys(senderGroups).forEach(senderId => {
                io.to(`user-${senderId}`).emit('messageStatusUpdated', {
                    messageIds: senderGroups[senderId],
                    status: 'delivered'
                });
            });
        }
        
        // ... continue with existing code ...
    } catch (error) {
        // ... error handling ...
    }
}); 