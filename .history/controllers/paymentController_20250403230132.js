const Booking = require("../models/Booking");
const sendEmail = require("../utils/emailService");
const User = require("../models/User");
const paypalService = require("../services/paypalservice");  // correct


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


exports.verifyPayment = async (req, res) => {
    try {
        const { bookingId, paymentId } = req.body;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const paymentDetails = await paypalService.getPaymentDetails(paymentId);
        
        if (paymentDetails.status === "COMPLETED") {
            booking.paymentStatus = "paid";
            await booking.save();
            res.status(200).json({ message: "Payment verified successfully" });
        } else {
            res.status(400).json({ message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("🚨 Payment Verification Error:", error);
        res.status(500).json({ message: "Failed to verify payment" });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.status(200).json({
            paymentStatus: booking.paymentStatus,
            paypalPaymentId: booking.paypalPaymentId
        });
    } catch (error) {
        console.error("🚨 Get Payment Status Error:", error);
        res.status(500).json({ message: "Failed to get payment status" });
    }
};

exports.cancelPayment = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.paymentStatus === "paid") {
            // Initiate refund through PayPal
            await paypalService.refundPayment(booking.paypalPaymentId);
        }

        booking.paymentStatus = "cancelled";
        await booking.save();

        res.status(200).json({ message: "Payment cancelled successfully" });
    } catch (error) {
        console.error("🚨 Cancel Payment Error:", error);
        res.status(500).json({ message: "Failed to cancel payment" });
    }
};




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
        const paymentId = req.query.paymentId;
        const payerId = req.query.PayerID;

        if (!bookingId || !paymentId || !payerId) {
            console.error("Missing required parameters:", { bookingId, paymentId, payerId });
            return res.redirect(`${process.env.CLIENT_URL}/payment/error?message=missing-parameters`);
        }

        const booking = await Booking.findById(bookingId).populate({
            path: "user",
            select: "email"
        });

        if (!booking) {
            console.error("Booking not found:", bookingId);
            return res.redirect(`${process.env.CLIENT_URL}/payment/error?message=booking-not-found`);
        }

        // Execute the payment with PayPal
        console.log("Executing PayPal payment...");
        const executionResult = await paypalService.executePayment(paymentId, payerId);

        if (executionResult.state === "approved") {
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

                await sendEmail(booking.user.email, subject, message);
            }

            console.log("Payment successful, redirecting to success page...");
            return res.redirect(`${process.env.CLIENT_URL}/payment/success?bookingId=${bookingId}&paymentId=${paymentId}`);
        } else {
            console.error("Payment execution failed:", executionResult);
            return res.redirect(`${process.env.CLIENT_URL}/payment/error?message=execution-failed`);
        }

    } catch (error) {
        console.error("🚨 Payment Success Handler Error:", error);
        res.redirect(`${process.env.CLIENT_URL}/payment/error?message=payment-processing-failed`);
    }
};

exports.handlePaymentCancel = async (req, res) => {
    try {
        const { bookingId } = req.query;
        res.redirect(`${process.env.CLIENT_URL}/payment/cancel?bookingId=${bookingId}`);
    } catch (error) {
        console.error("🚨 Payment Cancel Handler Error:", error);
        res.redirect(`${process.env.CLIENT_URL}/error?message=payment-cancellation-failed`);
    }
};