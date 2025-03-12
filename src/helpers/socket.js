module.exports = (io) => {
    const userSockets = {}; // Store user IDs and their connected socket IDs

    io.on('connection', (socket) => {
        console.log('A user connected');

        // Register User with Socket ID
        socket.on('userId', (userId) => {
            userSockets[userId] = socket.id;
            socket.join(userId); 
            console.log(`User ${userId} connected with socket ID: ${socket.id}`);
        });

        // Handle Sending Messages
        socket.on("sendMessage", ({ senderId, friendId, message }) => {
            if (userSockets[friendId]) {
                io.to(userSockets[friendId]).emit("receiveMessage", { senderId, message });
            }
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
        emitToSocket: (socketId, event, data) => {
            io.to(socketId).emit(event, data);
        },
        getConnectedUsers: () => {
            return Object.keys(userSockets);
        },
        getSocketId: (userId) => {
            return userSockets[userId];
        },
        joinRoom: (socket, room) => {
            socket.join(room);
        },
        leaveRoom: (socket, room) => {
            socket.leave(room);
        },
        emitToRoom: (room, event, data) => {
            io.to(room).emit(event, data);
        }
    };
};