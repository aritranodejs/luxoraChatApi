const { Validator } = require('node-input-validator');
const bcrypt = require('bcrypt');
const { response } = require('../../../utils/response.utils');
const { getUniqueCode } = require('../../../utils/unique.utils');
const { transporter, emailTemplatePath, mailOption } = require('../../../utils/mailer.utils');
const ejs = require('ejs');
const { generateAuthToken, generateRefreshToken } = require('../../../middleware/auth');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');
const { redisClient } = require('../../../config/redis');
const { getExpiryInSeconds } = require('../../../utils/token.utils');

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

        // Generate access and refresh tokens
        const accessToken = generateAuthToken(user.toJSON());
        const refreshToken = generateRefreshToken(user.toJSON());
        // Store refresh token in Redis with expiry time
        // Calculate expiry time in seconds
        const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
        const expirySec = getExpiryInSeconds(refreshTokenExpiry);
        await redisClient.set(refreshToken, user.id.toString(), { EX: expirySec });
        return response(res, { email: user.email, accessToken, refreshToken }, 'User login successful.', 200);
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
        // Blacklist previous access token if exists
        if (user.authToken) global.blacklistedTokens.add(user.authToken);
        // Generate new tokens
        const accessToken = generateAuthToken(user.toJSON());
        const refreshToken = generateRefreshToken(user.toJSON());
        // Save new auth token in user for logout tracking
        user.authToken = accessToken;
        user.isOnline = true;
        await user.save();
        // Store refresh token in Redis
        // Calculate expiry time in seconds
        const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
        const expirySec = getExpiryInSeconds(refreshTokenExpiry);
        await redisClient.set(refreshToken, user.id.toString(), { EX: expirySec });
        // Fetch user details without password
        let userDetails = await User.findOne({
            where: { id: { [Op.eq]: user.id } },
            attributes: { exclude: ['password'] }
        });
        // Include tokens in response
        return response(res, { ...userDetails.toJSON(), accessToken, refreshToken }, 'Otp verified successfully.', 200);
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

        const { refreshToken } = req.body;
        // Blacklist access token
        global.blacklistedTokens.add(user.authToken);
        // Remove refresh token from Redis if provided
        if (refreshToken) await redisClient.del(refreshToken);
        user.authToken = null;
        await user.save();
        return response(res, {}, 'User logout successful.', 200);
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