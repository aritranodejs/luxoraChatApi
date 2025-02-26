// Nodemailer
const nodemailer = require('nodemailer');

// Path
const path = require('path');

// Read the HTML email template file
const emailTemplatePath = path.join(__dirname, '../views/email/template.ejs');

const mailOption = {
    from: `"${process.env.APP_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to: process.env.MAIL_TO_ADDRESS,
    subject: 'Email Default Subject.'
};

const host = `${process.env.MAIL_ENCRYPTION}://${process.env.MAIL_HOST}`;
const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    host: host,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_ENCRYPTION === 'ssl' ? true : false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

transporter.verify((err, info) => {
    try {
        console.log('Server is ready to take our messages: ', info);
    } catch (error) {
        console.error(error);
    }
});

module.exports = {
    transporter,
    emailTemplatePath,
    mailOption
};
