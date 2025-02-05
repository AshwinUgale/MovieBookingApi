const express = require('express');
const router = express.Router();
const { createBooking, getAllBookings, getBookingById,getUserBookings,cancelBooking } = require('../controllers/bookingController');
const { auth } = require('../middleware/authMiddleware');


router.post('/', auth, createBooking);


router.get('/', auth, getAllBookings);


router.get('/:id', auth, getBookingById);

router.get('/history', auth, getUserBookings);

router.delete('/:id', auth, cancelBooking);

module.exports = router;
