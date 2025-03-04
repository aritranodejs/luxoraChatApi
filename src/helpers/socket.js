module.exports = (io) => {
    const userSockets = {}; // Store user IDs and their connected socket IDs

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('userId', (userId) => {
            userSockets[userId] = socket.id;
            socket.join(userId); 
            console.log(`User ${userId} connected with socket ID: ${socket.id}`);
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