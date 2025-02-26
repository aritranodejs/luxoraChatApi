const { Validator } = require('node-input-validator');
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10); 
const { transporter, emailTemplatePath, mailOption } = require('../../../helpers/mailer');
const ejs = require('ejs');
const { response } = require('../../../helpers/response');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');

const register = async (req, res) => {
    try {
        const validator = new Validator(req.body, {
            name: 'required',
            email: 'required|email',
            password: 'required',
            confirmPassword: 'required|same:password'
        });
        const matched = await validator.check();
        if (!matched) {
            return response(res, validator.errors, 'validation', 422);
        }

        const {
            name,
            email,
            password
        } = req.body;

        const userExists = await User.findOne({
            where: {
                email: { [Op.eq]: email }
            }
        });

        if (userExists) {
            return response(res, req.body, 'User already exists.', 409);
        }

        const hashedPassword = bcrypt.hashSync(password, salt);

        const user = new User();
        user.name = name;
        user.email = email;
        user.password = hashedPassword;
        user.save();

        // Mail 
        const subject = 'Thank You for registering with us.';
        const content = `<div>
                            <p> Hello ${user?.name},</p>
                            <p> Thank you for registering with us.</p>
                            <p> We are very happy to have you on board.</p>
                            <p> Your account has been created successfully.</p>
                            <p> Please find below your login credentials.</p>
                            <p> Email: ${user?.email}</p>
                            <p> Password: ${password}</p>
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

        return response(res, { email : user?.email }, 'User registered successfully.', 201);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

module.exports = {
    register
}