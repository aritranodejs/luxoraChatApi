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

        const {
            status
        } = req.query;
        
        let friends = await Friend.findAll({
            where: {
                [Op.or]: [
                    { senderId: id },
                    { receiverId: id }
                ],
                status: status || 'accepted'
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

        let friendsData = friends.map(friend => ({
            id: friend.id,
            senderId: friend.senderId,
            receiverId: friend.receiverId,
            status: friend.status,
            friendInfo: friend.senderId === id ? friend.receiver : friend.sender
        }));

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

        // Mail 
        const subject = 'Friend Request From ' + req.user.name;
        const receiver = await User.findOne({
            where: {
                id: receiverId
            }
        });
        const content = `<div>
                            <p> Hello ${receiver?.name},</p>
                            <p> You have received a friend request from ${req.user.name}.</p>
                            <p> Please login to your account to accept or reject the request.</p>
                        </div>`;

        const emailContent = await ejs.renderFile(emailTemplatePath, {
            title: subject,
            content: content
        });
        const mailOptions = {
            ...mailOption,
            to: receiver?.email,
            subject: subject,
            html: emailContent
        };
        await transporter.sendMail(mailOptions);

        return response(res, friend, 'Friend request sent successfully.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const getFriendRequests = async (req, res) => {
    try {
        const { 
            id 
        } = req.user;

        const friendRequests = await Friend.findAll({
            where: {
                receiverId: id,
                status: 'pending'
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

        let friendRequestsData = friendRequests.map(friend => ({
            id: friend.id,
            senderId: friend.senderId,
            receiverId: friend.receiverId,
            status: friend.status,
            friendInfo: friend.sender
        }));

        return response(res, { friendRequests : friendRequestsData }, 'Friend requests.', 200);
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

        return response(res, friend, `Friend request ${status}.`, 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const cancelRequest = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            friendId: 'required'
        });
        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }
        const { 
            id 
        } = req.user;

        const {
            friendId
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
        await friend.destroy();

        return response(res, {}, 'Friend request cancelled.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

module.exports = {
    index,
    store,
    getFriendRequests,
    acceptOrReject,
    cancelRequest
}