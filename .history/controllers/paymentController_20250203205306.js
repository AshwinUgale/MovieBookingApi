const Booking = require('../models/Booking'); 
const sendEmail = require('../utils/emailService')


exports.mockPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        console.log("🟡 DEBUG: Booking Found:", booking); // Log the entire booking object
        console.log("🟡 DEBUG: User in Booking:", booking.user); // Check if user is populated

        const userEmail = booking.user ? booking.user.email : null;
        console.log("📩 Attempting to send email to:", userEmail); // Debug log
        if (!userEmail) {
            console.error("❌ Error: No recipient email provided.");
            return res.status(400).json({ message: "User email is required." });
        }
        booking.paymentStatus = "paid";
        await booking.save();
        
        sendEmail(userEmail, "Payment Confirmation", `Your payment for booking ${booking._id} has been received.`);
        res.status(200).json({
            message: "Payment successful (mock)",
            bookingId,
            paymentStatus: booking.paymentStatus,
        });

    } catch (error) {
        console.error("Mock Payment Error:", error);
        res.status(500).json({ message: "Mock payment failed" });
    }
};
