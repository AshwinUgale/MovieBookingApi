const Booking = require('../models/Booking'); 
const sendEmail = require('../utils/emailService');
const User = require('../models/User');

exports.mockPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

       
        const booking = await Booking.findById(bookingId).populate({
            path: 'user',
            select: 'email' // Only fetch the email field
        });

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        console.log("🟡 DEBUG: Booking Found:", booking); // Debugging
        console.log("🟡 DEBUG: User in Booking:", booking.user); // Check if user is populated

        // ✅ Ensure user exists and has an email
        if (!booking.user || !booking.user.email) {
            console.error("❌ Error: User email is missing.");
            return res.status(400).json({ message: "User email is required." });
        }

        const userEmail = booking.user.email;
        console.log("📩 Sending email to:", userEmail); // Debug log

        booking.paymentStatus = "paid";
        await booking.save();

        sendEmail(userEmail, "Payment Confirmation", `Your payment for booking ${booking._id} has been received.`);

        res.status(200).json({
            message: "Payment successful (mock)",
            bookingId,
            paymentStatus: booking.paymentStatus,
        });

    } catch (error) {
        console.error("🚨 Mock Payment Error:", error);
        res.status(500).json({ message: "Mock payment failed" });
    }
};
