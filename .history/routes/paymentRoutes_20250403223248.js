// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

// Route to initiate payment
router.post('/initiate', paymentController.initiatePayment);

// PayPal webhook routes (no auth required as they're called by PayPal)
router.get('/success', paymentController.handlePaymentSuccess);
router.get('/cancel', paymentController.handlePaymentCancel);

// Payment verification and status routes
router.post('/verify', authenticateToken, paymentController.verifyPayment);
router.get('/status/:bookingId', authenticateToken, paymentController.getPaymentStatus);
router.post('/cancel/:bookingId', authenticateToken, paymentController.cancelPayment);

module.exports = router;