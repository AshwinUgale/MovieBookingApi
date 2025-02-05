const express = require('express');
const router = express.Router();
const { createBooking, getAllBookings, getBookingById } = require('../controllers/bookingController');
const { auth } = require('../middleware/authMiddleware');


router.post('/', auth, createBooking);


router.get('/', auth, getAllBookings);


router.get('/:id', auth, getBookingById);

module.exports = router;
