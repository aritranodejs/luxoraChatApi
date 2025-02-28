const { Validator } = require('node-input-validator');
const { response } = require('../../../helpers/response');
const { transporter, emailTemplatePath, mailOption } = require('../../../helpers/mailer');
const ejs = require('ejs');
const { Op } = require('sequelize');
const { Friend } = require('../../../models/Friend');
const { User } = require('../../../models/User');

const index = async (req, res) => {
    try {
        const { 
            id 
        } = req.user;
        
        let friends = await Friend.findAll({
            where: {
                [Op.or]: [
                    { senderId: id },
                    { receiverId: id }
                ],
                status: 'accepted'
            },
            include: [
                { 
                    model: User, 
                    as: 'sender',
                    attributes: ['id', 'name', 'email', 'mobile', 'status', 'isOnline'] 
                },
                { 
                    model: User, 
                    as: 'receiver',
                    attributes: ['id', 'name', 'email', 'mobile', 'status', 'isOnline'] 
                }
            ]
        });

        let friendsData = [];

        friends.forEach(friend => {
            if (friend.senderId === id) {
                friendsData.push(friend.receiver);
            } else {
                friendsData.push(friend.sender);
            }
        });

        return response(res, { friends: friendsData }, 'Friends.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const store = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            receiverId: 'required'
        });
        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }
        const { 
            id 
        } = req.user;

        const {
            receiverId
        } = req.body;

        const friend = await Friend.create({
            senderId: id,
            receiverId: receiverId
        });
        return response(res, friend, 'Friend request sent.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const acceptOrReject = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            friendId: 'required',
            status: 'required|in:accepted,rejected'
        });
        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }
        const { 
            id 
        } = req.user;

        const {
            friendId,
            status
        } = req.body;

        const friend = await Friend.findOne({
            where: {
                id: friendId,
                [Op.or]: [
                    { senderId: id },
                    { receiverId: id }
                ]
            }
        });
        if (!friend) {
            return response(res, {}, 'Friend not found.', 404);
        }
        friend.status = status;
        await friend.save();

        return response(res, friend, 'Friend request accepted.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

module.exports = {
    index,
    store,
    acceptOrReject
}