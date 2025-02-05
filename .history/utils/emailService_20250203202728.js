const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        const mailOptions = {
            from: "no-reply@example.com",
            to,
            subject,
            text
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to} - ${subject}`);
        return result;

    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

module.exports = sendEmail;
