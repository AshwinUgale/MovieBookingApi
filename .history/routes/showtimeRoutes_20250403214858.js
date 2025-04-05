const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Route to initiate payment
router.post('/initiate', authenticateToken, paymentController.initiatePayment);

// PayPal webhook routes (no auth required as they're called by PayPal)
router.get('/success', paymentController.handlePaymentSuccess);
router.get('/cancel', paymentController.handlePaymentCancel);

module.exports = router;