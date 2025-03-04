const { Validator } = require('node-input-validator');
const bcrypt = require('bcrypt');
const { response } = require('../../../helpers/response');
const { getUniqueCode } = require('../../../helpers/uniqueCode');
const { transporter, emailTemplatePath, mailOption } = require('../../../helpers/mailer');
const ejs = require('ejs');
const { generateAuthToken } = require('../../../middleware/auth');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');

const login = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            email: 'required',
            password: 'required'
        });
        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }

        const {
            email,
            password
        } = req.body;

        const user = await User.findOne({
            where: {
                email: { [Op.eq]: email }
            }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return response(res, {}, 'Invalid email or password.', 401);
        }

        if (user && user.status !== 'active') {
            return response(res, {}, 'User is not active.', 401);
        }

        return response(res, { email : user?.email }, 'User login successfull.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const loginOtp = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            email: 'required|email'
        });
        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }

        const {
            email
        } = req.body;
        const user = await User.findOne({
            where: {
                email: { [Op.eq]: email }
            }
        });
        if (!user) {
            return response(res, req.body, 'User not found.', 404);
        }

        user.otp = getUniqueCode();
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Expire in 10 minutes
        await user.save();

        // Mail OTP
        const subject = 'OTP for login.';
        const content = `<div>
                            <p> Hello ${user?.name},</p>
                            <p> Your OTP is ${user?.otp}</p>
                            <p> OTP will expire in 10 minutes.</p>
                        </div>`;

        const emailContent = await ejs.renderFile(emailTemplatePath, {
            title: subject,
            content: content
        });
        const mailOptions = {
            ...mailOption,
            to: user?.email,
            subject: subject,
            html: emailContent
        };
        await transporter.sendMail(mailOptions);

        return response(res, {}, 'Otp has been sent successfully.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const verifyOtp = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            email: 'required|email',
            otp: 'required'
        });
        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }

        const {
            email,
            otp
        } = req.body;

        const user = await User.findOne({
            where: {
                email: { [Op.eq]: email }
            }
        });

        if (!user) {
            return response(res, req.body, 'User not found.', 404);
        }

        if (user.otp !== otp) {
            return response(res, req.body, 'Invalid otp.', 401);
        }

        if (user.otpExpiry < new Date()) {
            return response(res, req.body, 'Otp expired.', 401);
        }

        user.otp = null;
        user.otpExpired = null;
        user.authToken = generateAuthToken({ ...user.toJSON() });
        user.isOnline = true;
        await user.save();

        let userDetails = await User.findOne({
            where: {
                id: { [Op.eq]: user.id }
            },
            attributes: {
                exclude: ['password']
            }
        });

        return response(res, userDetails, 'Otp verified successfully.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const me = async (req, res) => {
    try {
        const {
            id
        } = req.user;

        const user = await User.findOne({
            where: {
                id: { [Op.eq]: id }
            },
            attributes: {
                exclude: ['password']
            }
        });

        if (!user) {
            return response(res, {}, 'User not found.', 404);
        }

        return response(res, user, 'My details.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const logout = async (req, res) => {
    try {
        const {
            id 
        } = req.user;

        const user = await User.findOne({
            where: {
                id: { [Op.eq]: id }
            }
        });
        if (!user) {
            return response(res, {}, 'User not found.', 404);
        }

        // Add the token to the blacklist
        blacklistedTokens.add(user.authToken);

        user.authToken = null;
        await user.save();

        return response(res, {}, 'User logout successfull.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

module.exports = {
    login,
    loginOtp,
    verifyOtp,
    me,
    logout
}