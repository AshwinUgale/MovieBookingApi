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
    if (!to) {
        console.error("❌ Error: No recipient email provided.");
        return;
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER, // Ensure this email is configured
            to: to, // ✅ Check that 'to' is correctly assigned
            subject,
            text
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to} - ${subject}`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};


module.exports = sendEmail;
