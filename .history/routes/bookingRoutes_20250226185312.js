const express = require('express');
const router = express.Router();
const { createBooking, getAllBookings, getBookingById,getUserBookings,cancelBooking, createEventBooking  } = require('../controllers/bookingController');
const { auth } = require('../middleware/authMiddleware');


router.post('/', auth, createBooking);
router.post("/event", auth, createEventBooking);

router.get('/', auth, getAllBookings);


router.get('/history', auth, getUserBookings);

router.get('/:id', auth, getBookingById);


router.delete('/:id', auth, cancelBooking);



module.exports = router;
