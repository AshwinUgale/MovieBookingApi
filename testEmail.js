const sendEmail = require('./utils/emailService'); // Import email service

sendEmail("test@example.com", "Test Email", "This is a test email using Mailtrap!")
    .then(() => console.log("✅ Email sent successfully"))
    .catch(err => console.error("❌ Error:", err));
