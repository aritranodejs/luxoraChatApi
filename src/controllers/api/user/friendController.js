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

        const friendsData = await getFriendsByStatus(id, status);

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

        // Emit Socket Event
        const friendRequests = await Friend.findAll({
            where: {
                receiverId: receiverId,
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

        req.io.emitToUser(receiverId, 'friendRequests', {
            count: friendRequestsData.length,
            friendRequests: friendRequestsData,
        });

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

        const friendRequestsData = await getRequests(id);        

        return response(res, { friendRequests: friendRequestsData, count: friendRequestsData.length }, 'Friend requests.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const getRequests = async (userId) => {
    const id = userId;
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

    return friendRequestsData;
}

const getFriendsByStatus = async (userId, reqStatus = null) => {
    const id = userId;
    const status = reqStatus;

    let friends = await Friend.findAll({
        where: {
            [Op.or]: [
                { senderId: id },
                { receiverId: id }
            ],
            ...(status ? { status } : {})
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

    return friendsData;
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

        // Mail to sender
        const sender = await User.findOne({
            where: {
                id: friend.senderId
            }
        });

        const subject = `${req.user?.name} has ${status} your friend request`;
        const content = `<div>
                            <p> Hello ${sender?.name},</p>
                            <p>${req.user?.name} has ${status} your friend request.</p> 
                        </div>`;

        const emailContent = await ejs.renderFile(emailTemplatePath, {
            title: subject,
            content: content
        });
        const mailOptions = {
            ...mailOption,
            to: sender?.email,
            subject: subject,
            html: emailContent
        };
        await transporter.sendMail(mailOptions); 

        // Emit to socket
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

        req.io.emitToUser(id, 'friendListUpdated', { 
            users,
            friends: await getFriendsByStatus(id, 'accepted'),
            pendingFriends: await getFriendsByStatus(id, 'pending'),
        });

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

        // Emit Socket Event
        const friendRequestsData = await getRequests(id);        

        req.io.emitToUser(friend?.receiverId, 'friendRequests', {
            count: friendRequestsData.length,
            friendRequests: friendRequestsData,
        });

        return response(res, {}, 'Friend request cancelled.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const getFriend = async (req, res) => {
    try {
        const {
            friendSlug
        } = req.query;

        const user = await User.findOne({
            where: {
                slug: { [Op.eq]: friendSlug }
            },
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return response(res, {}, 'Friend not found.', 404);
        }

        return response(res, { friend: user }, 'Friend details.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
};

const updatePeerId = async (req, res) => {
    try {
        const {
            friendSlug,
            peerId
        } = req.body;

        const user = await User.findOne({
            where: {
                slug: { [Op.eq]: friendSlug }
            },
            attributes: ['id', 'name', 'email', 'mobile', 'status', 'isOnline', 'peerId']
        });

        if (!user) {
            return response(res, {}, 'User not found.', 404);
        }

        user.peerId = peerId;
        await user.save();

        return response(res, user, 'User peer id updated.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
};

module.exports = {
    index,
    store,
    getFriendRequests,
    acceptOrReject,
    cancelRequest,
    getFriend,
    updatePeerId
}