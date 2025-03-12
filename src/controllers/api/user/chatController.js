const { Validator } = require('node-input-validator');
const { response } = require('../../../helpers/response');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');
const { Friend } = require('../../../models/Friend');
const { Message } = require('../../../models/Message');

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

        return response(res, messages, 'Messages fetched.', 200);
    } catch (error) {
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

        const message = new Message();
        message.senderId = id;
        message.receiverId = friend.id;
        message.content = content;
        await message.save();

        // Create a Unique Room Name
        const roomName = `room-${id}-${friend.id}`;

        // Emit Message to Both Users in Room
        req.io.emitToRoom(roomName, "receiveMessage", {
            senderId: id,
            receiverId: friend.id,
            message: content
        });

        return response(res, { message : message?.content }, 'Message sent.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
};

module.exports = { 
    chats, 
    store 
};