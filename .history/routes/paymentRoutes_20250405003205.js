// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

// Route to initiate payment
router.post('/initiate', auth, paymentController.initiatePayment);
router.patch("/update-status/:bookingId", paymentController.updateBookingStatus);

// PayPal webhook routes (no auth required as they're called by PayPal)
router.get('/success', paymentController.handlePaymentSuccess);
router.get('/cancel', paymentController.handlePaymentCancel);

// Payment verification and status routes

router.get('/status/:bookingId', auth, paymentController.getPaymentStatus);
router.post('/cancel/:bookingId', auth, paymentController.cancelPayment);

module.exports = router;