const express = require('express');
const router = express.Router();
const { createBooking } = require('../controllers/bookingController');
const { auth } = require('../middleware/authMiddleware');
const { mockPayment } = require('../controllers/paymentController');

router.post('/', auth, createBooking);
router.post('/pay',mockPayment);

module.exports = router;
