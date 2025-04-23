/**
 * Socket.io utilities for real-time communication
 */

const { setupMessageStatusHandlers } = require('../controllers/api/user/chatController');
const { setupOnlineStatusHandlers } = require('../controllers/api/user/userController');
const { Message } = require('../models/Message');
const { User } = require('../models/User');
const jwt = require('jsonwebtoken');

module.exports = (io) => {
    const userSockets = {}; // Store user IDs and their connected socket IDs

    io.on('connection', (socket) => {
        console.log('A user connected');

        // Register User with Socket ID
        socket.on('userId', async (userId) => {
            if (!userId) return;
            
            userSockets[userId] = socket.id;
            socket.join(`user-${userId}`); // Join user-specific room
            socket.join(userId); 
            console.log(`User ${userId} connected with socket ID: ${socket.id}`);
            
            // Setup online status handlers
            setupOnlineStatusHandlers(io, socket, userId);
            
            // Setup message status handlers
            setupMessageStatusHandlers(io, socket, userId);
            
            // Mark pending messages as delivered when user connects
            try {
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
            } catch (error) {
                console.error('Error processing pending messages:', error);
            }
        });
        
        // Authentication via token
        socket.on('authenticate', async (data) => {
            try {
                const { token } = data;
                if (!token) return;
                
                // Verify JWT token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                
                // Register user with socket
                userSockets[userId] = socket.id;
                socket.join(`user-${userId}`); // Join user-specific room
                socket.join(userId);
                console.log(`User ${userId} authenticated with socket ID: ${socket.id}`);
                
                // Setup online status handlers
                setupOnlineStatusHandlers(io, socket, userId);
                
                // Setup message status handlers
                setupMessageStatusHandlers(io, socket, userId);
                
                // Mark pending messages as delivered
                try {
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
                } catch (error) {
                    console.error('Error processing pending messages:', error);
                }
            } catch (error) {
                console.error('Authentication error:', error);
            }
        });
        
        // Join a Chat Room
        socket.on("joinChat", ({ room }) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room: ${room}`);
        });

        // Handle Incoming Messages & Broadcast
        socket.on("sendMessage", ({ room, senderId, receiverId, message }) => {
            console.log(`Message from ${senderId} to ${receiverId}: ${message}`);

            // Emit message to the chat room
            io.to(room).emit("receiveMessage", { senderId, receiverId, message });
        });

        // Handle Call Request
        socket.on("callUser", ({ callerId, friendId }) => {
            if (userSockets[friendId]) {
                // Friend is online → Send Call Notification
                io.to(userSockets[friendId]).emit("incomingCall", { callerId });
                console.log(`Sent call notification from ${callerId} to ${friendId}`);
            } else {
                console.log(`User ${friendId} is not connected.`);
            }
        });

        // Handle Call Accepted
        socket.on("acceptCall", ({ callerId, friendId }) => {
            if (userSockets[callerId]) {
                io.to(userSockets[callerId]).emit("callAccepted", { friendId });
                console.log(`User ${friendId} accepted call from ${callerId}`);
            }
        });

        // Handle Call Rejected
        socket.on("rejectCall", ({ callerId, friendId }) => {
            if (userSockets[callerId]) {
                io.to(userSockets[callerId]).emit("callRejected", { friendId });
                console.log(`User ${friendId} rejected call from ${callerId}`);
            }
        });

        socket.on('disconnect', () => {
            const userId = Object.keys(userSockets).find(
                (key) => userSockets[key] === socket.id
            );
            if (userId) {
                delete userSockets[userId];
                console.log(`User ${userId} disconnected`);
            }
            console.log('A user disconnected');
        });
    });

    return {
        emitToUser: (userId, event, data) => {
            if (userSockets[userId]) {
                io.to(userId).emit(event, data);
            } else {
                console.log(`User ${userId} is not connected.`);
            }
        },
        emitToRoom: (room, event, data) => {
            io.to(room).emit(event, data);
        },
        broadcastToAll: (event, data) => {
            io.emit(event, data);
        },
        isUserConnected: (userId) => {
            return !!userSockets[userId];
        },
        getSocketId: (userId) => {
            return userSockets[userId] || null;
        },
        getUserSockets: () => {
            return userSockets;
        }
    };
}; 