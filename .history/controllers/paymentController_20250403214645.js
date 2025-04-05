const Booking = require("../models/Booking");
const sendEmail = require("../utils/emailService");
const User = require("../models/User");
const paypalService = require("../services/paypalservice");

exports.initiatePayment = async (req, res) => {
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

        if (booking.paymentStatus === "paid") {
            return res.status(400).json({ message: "Booking is already paid" });
        }

        // Create PayPal payment
        const paymentData = await paypalService.createPayment(booking);

        // Store PayPal payment ID in booking
        booking.paypalPaymentId = paymentData.paymentId;
        await booking.save();

        // Return the PayPal approval URL
        res.status(200).json({
            message: "Payment initiated",
            approvalUrl: paymentData.approvalUrl
        });

    } catch (error) {
        console.error("🚨 Payment Initiation Error:", error);
        res.status(500).json({ message: "Failed to initiate payment" });
    }
};

exports.handlePaymentSuccess = async (req, res) => {
    try {
        const { bookingId } = req.query;
        const booking = await Booking.findById(bookingId).populate({
            path: "user",
            select: "email"
        });

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Get payment details from PayPal service
        const paymentDetails = await paypalService.getPaymentDetails(booking.paypalPaymentId);

        if (paymentDetails.status === "APPROVED") {
            // Update booking status
            booking.paymentStatus = "paid";
            await booking.save();

            // Send confirmation email
            if (booking.user?.email) {
                let subject = "";
                let message = "";

                if (booking.type === "movie") {
                    subject = "Movie Ticket Payment Confirmation";
                    message = `Your payment for the movie ticket (Booking ID: ${booking._id}) has been received.`;
                } else if (booking.type === "event") {
                    subject = "Event Ticket Payment Confirmation";
                    message = `Your payment for the event ${booking.eventDetails.name} at ${booking.eventDetails.venue} has been received.`;
                }

                sendEmail(booking.user.email, subject, message);
            }

            res.redirect(`${process.env.CLIENT_URL}/bookings/${bookingId}?status=success`);
        } else {
            res.redirect(`${process.env.CLIENT_URL}/bookings/${bookingId}?status=error`);
        }

    } catch (error) {
        console.error("🚨 Payment Success Handler Error:", error);
        res.redirect(`${process.env.CLIENT_URL}/error?message=payment-processing-failed`);
    }
};

exports.handlePaymentCancel = async (req, res) => {
    try {
        const { bookingId } = req.query;
        res.redirect(`${process.env.CLIENT_URL}/bookings/${bookingId}?status=cancelled`);
    } catch (error) {
        console.error("🚨 Payment Cancel Handler Error:", error);
        res.redirect(`${process.env.CLIENT_URL}/error?message=payment-cancellation-failed`);
    }
};