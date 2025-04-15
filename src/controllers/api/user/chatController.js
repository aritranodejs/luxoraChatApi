const { Validator } = require('node-input-validator');
const { response } = require('../../../helpers/response');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');
const { Friend } = require('../../../models/Friend');
const { Message } = require('../../../models/Message');
const encryptionKeyService = require('../../../services/EncryptionKeyService');
const { encryptMessage, decryptMessage } = require('../../../helpers/encryptionHelper');

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

        if (!isFriend) return response(res, {}, 'You are not friends.', 403);

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

        if (!isFriend) return response(res, {}, 'You are not friends.', 403);

        // Get or create encryption key for this chat
        const encryptionKey = await encryptionKeyService.getOrCreateEncryptionKey(id, friend.id);
        
        // Encrypt the message content
        const encryptedContent = encryptMessage(content, encryptionKey);

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
            message: content
        });

        return response(res, { message: content }, 'Message sent.', 200);
    } catch (error) {
        console.error('Error sending message:', error);
        return response(res, {}, error.message, 500);
    }
};

module.exports = {
    chats,
    store
};