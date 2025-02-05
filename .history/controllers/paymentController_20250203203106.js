const Booking = require('../models/Booking'); 


exports.mockPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        booking.paymentStatus = "paid";
        await booking.save();
        
        sendEmail(booking.user.email, "Payment Confirmation", `Your payment for booking ${booking._id} has been received.`);
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
