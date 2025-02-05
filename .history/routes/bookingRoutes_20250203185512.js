const express = require('express');
const router = express.Router();
const { createBooking, getAllBookings, getBookingById } = require('../controllers/bookingController');
const { auth } = require('../middleware/authMiddleware');

// ✅ Create a booking
router.post('/', auth, createBooking);

// ✅ Get all bookings (for authorized users)
router.get('/', auth, getAllBookings);

// ✅ Get a single booking by ID
router.get('/:id', auth, getBookingById);

module.exports = router;
