const { Validator } = require('node-input-validator');
const { response } = require('../../../helpers/response');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');
const { Friend } = require('../../../models/Friend');
const { Message } = require('../../../models/Message');
const encryptionKeyService = require('../../../services/EncryptionKeyService');
const { encryptMessage, decryptMessage } = require('../../../helpers/encryptionHelper');
const axios = require('axios');

const chats = async (req, res) => {
    try {
        const {
            id
        } = req.user;
        const {
            friendSlug
        } = req.query;

        const friend = await User.findOne({
            where: {
                slug: friendSlug
            }
        });
        if (!friend) {
            return response(res, {}, 'Friend not found.', 404);
        }

        const isFriend = await Friend.findOne({
            where: {
                [Op.or]: [
                    { senderId: id, receiverId: friend.id },
                    { senderId: friend.id, receiverId: id }
                ]
            }
        });

        if (!friend?.isAI && !isFriend) return response(res, {}, 'You are not friends.', 403);

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderId: id, receiverId: friend.id },
                    { senderId: friend.id, receiverId: id }
                ]
            },
            order: [['createdAt', 'ASC']]
        });

        // Get encryption key for this chat
        const encryptionKey = await encryptionKeyService.getOrCreateEncryptionKey(id, friend.id);

        // Decrypt messages
        const decryptedMessages = messages.map(message => {
            const messageObj = message.toJSON();
            if (messageObj.isEncrypted) {
                try {
                    messageObj.content = decryptMessage(messageObj.content, encryptionKey);
                } catch (err) {
                    console.error('Failed to decrypt message:', err);
                    messageObj.content = '[Encrypted Message]';
                }
            }
            return messageObj;
        });

        return response(res, decryptedMessages, 'Messages fetched.', 200);
    } catch (error) {
        console.error('Error in chat controller:', error);
        return response(res, {}, error.message, 500);
    }
};

const store = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            friendSlug: 'required',
            content: 'required'
        });

        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }

        const {
            id
        } = req.user;
        const {
            friendSlug,
            content
        } = req.body;

        const friend = await User.findOne({
            where: {
                slug: friendSlug
            }
        });

        if (!friend) {
            return response(res, {}, 'Friend not found.', 404);
        }

        const isFriend = await Friend.findOne({
            where: {
                [Op.or]: [
                    { senderId: id, receiverId: friend.id },
                    { senderId: friend.id, receiverId: id }
                ]
            }
        });

        if (!friend?.isAI && !isFriend) return response(res, {}, 'You are not friends.', 403);

        // Get or create encryption key for this chat
        const encryptionKey = await encryptionKeyService.getOrCreateEncryptionKey(id, friend.id);

        // Encrypt the message content
        const encryptedContent = encryptMessage(content, encryptionKey);

        // Store user's message
        const message = new Message();
        message.senderId = id;
        message.receiverId = friend.id;
        message.content = encryptedContent;
        message.isEncrypted = true;
        await message.save();

        // Create a Unique Room Name
        const roomName = `room-${id}-${friend.id}`;

        // Emit Message to Both Users in Room (with original unencrypted content)
        req.io.emitToRoom(roomName, "receiveMessage", {
            senderId: id,
            receiverId: friend.id,
            message: content,
            messageId: message.id
        });

        // Handle AI response if the friend is an AI
        if (friend.isAI) {
            try {
                const aiMessageContent = await handleAIResponse(content);

                if (!aiMessageContent || aiMessageContent instanceof Error) {
                    throw new Error("Invalid AI response");
                }

                const encryptedAiContent = encryptMessage(aiMessageContent, encryptionKey);

                const aiMessage = new Message({
                    senderId: friend.id,
                    receiverId: id,
                    content: encryptedAiContent,
                    isEncrypted: true,
                    status: 'sent'
                });

                await aiMessage.save();

                req.io.emitToRoom(roomName, "receiveMessage", {
                    senderId: friend.id,
                    receiverId: id,
                    message: aiMessageContent,
                    messageId: aiMessage.id
                });

                return response(res, {
                    message: content,
                    aiResponse: aiMessageContent
                }, 'Message sent and AI responded.', 200);

            } catch (error) {
                console.error('AI response error:', error.message || error);

                return response(res, {
                    message: content,
                    aiError: 'AI could not respond at this time.'
                }, 'Message sent but AI could not respond.', 200);
            }
        }

        return response(res, { message: content }, 'Message sent.', 200);
    } catch (error) {
        console.error('Error sending message:', error);
        return response(res, {}, error?.message, 500);
    }
};

const handleAIResponse = async (message) => {
    try {
        // Prepare message history (can be enhanced to include previous messages)
        // const messageHistory = [
        //     { role: "system", content: "You are a helpful assistant." },
        //     { role: "user", content: message }
        // ];

        // // Call OpenAI API
        // const aiResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        //     model: "deepseek/deepseek-chat-v3-0324:free", // or try mistral, claude, etc.
        //     messages: messageHistory
        // }, {
        //     headers: {
        //         "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        //         "Content-Type": "application/json"
        //     }
        // });
        const payload = {
            model: "llama3-8b-8192", // You can also try: mixtral-8x7b-32768
            messages: [
                {
                    role: "user",
                    content: message,
                },
            ],
            temperature: 0.7,
            max_tokens: 300,
        };

        const aiResponse = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, {
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        
        return aiResponse.data?.choices[0]?.message?.content;
    } catch (error) {
        return new Error(error.response?.data || error.message);
    }
};

const updateMessageStatus = async (req, res) => {
    try {
        const { id } = req.user;
        const { messageIds, status } = req.body;

        if (!messageIds || !Array.isArray(messageIds) || !['delivered', 'read'].includes(status)) {
            return response(res, {}, 'Invalid request format', 400);
        }

        await Message.update(
            { status },
            {
                where: {
                    id: messageIds,
                    receiverId: id, // Only recipient can update status
                    status: { [Op.ne]: status } // Don't update if already in this status
                }
            }
        );

        // Notify senders that messages have been read/delivered
        const messages = await Message.findAll({
            where: { id: messageIds }
        });

        // Group messages by sender for efficient socket updates
        const senderGroups = {};
        messages.forEach(message => {
            const senderId = message.senderId;
            if (!senderGroups[senderId]) {
                senderGroups[senderId] = [];
            }
            senderGroups[senderId].push(message.id);
        });

        // Emit events to each sender
        Object.keys(senderGroups).forEach(senderId => {
            const roomName = `user-${senderId}`;
            req.io.emitToRoom(roomName, "messageStatusUpdated", {
                messageIds: senderGroups[senderId],
                status: status
            });
        });

        return response(res, {}, `Messages marked as ${status}`, 200);
    } catch (error) {
        console.error('Error updating message status:', error);
        return response(res, {}, error.message, 500);
    }
};

// Setup socket handlers for message status
const setupMessageStatusHandlers = (io, socket, userId) => {
    // Join user to their personal room for status updates
    const userRoom = `user-${userId}`;
    socket.join(userRoom);

    // Handle delivered status - when user connects or receives messages
    socket.on('markAsDelivered', async (messageIds) => {
        if (!messageIds || !Array.isArray(messageIds)) return;

        await Message.update(
            { status: 'delivered' },
            {
                where: {
                    id: messageIds,
                    receiverId: userId,
                    status: 'sent'
                }
            }
        );

        // Notify senders
        const messages = await Message.findAll({
            where: { id: messageIds }
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
    });

    // Handle read status from socket event
    socket.on('markAsRead', async (messageIds) => {
        if (!messageIds || !Array.isArray(messageIds)) return;

        await Message.update(
            { status: 'read' },
            {
                where: {
                    id: messageIds,
                    receiverId: userId,
                    status: { [Op.ne]: 'read' }
                }
            }
        );

        // Notify senders
        const messages = await Message.findAll({
            where: { id: messageIds }
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
                status: 'read'
            });
        });
    });
};

module.exports = {
    chats,
    store,
    updateMessageStatus,
    setupMessageStatusHandlers
};