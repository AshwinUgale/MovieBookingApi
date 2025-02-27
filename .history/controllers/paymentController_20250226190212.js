const Booking = require("../models/Booking");
const sendEmail = require("../utils/emailService");
const User = require("../models/User");

exports.mockPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        // Find booking and populate user details
        const booking = await Booking.findById(bookingId).populate({
            path: "user",
            select: "email"
        });

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        console.log("🟡 DEBUG: Booking Found:", booking);
        console.log("🟡 DEBUG: User in Booking:", booking.user);

        // ✅ Ensure user exists and has an email
        if (!booking.user || !booking.user.email) {
            console.error("❌ Error: User email is missing.");
            return res.status(400).json({ message: "User email is required." });
        }

        const userEmail = booking.user.email;
        console.log("📩 Sending email to:", userEmail);

        // ✅ Update payment status
        booking.paymentStatus = "paid";
        await booking.save();

        // ✅ Determine if it's a Movie or an Event
        let subject = "";
        let message = "";

        if (booking.type === "movie") {
            subject = "Movie Ticket Payment Confirmation";
            message = `Your payment for the movie ticket (Booking ID: ${booking._id}) has been received.`;
        } else if (booking.type === "event") {
            subject = "Event Ticket Payment Confirmation";
            message = `Your payment for the event **${booking.eventDetails.name}** at **${booking.eventDetails.venue}** has been received.`;
        } else {
            subject = "Payment Confirmation";
            message = `Your payment for booking ID: ${booking._id} has been processed.`;
        }

        // ✅ Send confirmation email
        sendEmail(userEmail, subject, message);

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
